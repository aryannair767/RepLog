"use server";
// ============================================================
// src/app/actions/stats.ts
//
// Fetches all the numbers shown on the dashboard:
// RPE average, weekly volume, frequency, muscle distribution.
//
// HOW TO MODIFY:
// - Change "this week" to "last 14 days"? Edit the weekStart
//   calculation below.
// - Add a new stat card? Add the calculation here and add the
//   new field to the DashboardStats type in types/replog.ts.
// ============================================================

import { prisma } from "@/lib/prisma";
import type { DashboardStats } from "@/types/replog";
import { getAuthUserId } from "@/lib/auth";

// Helper: returns 7 days ago at midnight to prevent "data loss" on Monday reset.
function getWeekStart(): Date {
  const now = new Date();
  const weekAgo = new Date(now);
  weekAgo.setDate(now.getDate() - 7);
  weekAgo.setHours(0, 0, 0, 0);
  return weekAgo;
}

export async function getDashboardStats(): Promise<DashboardStats> {
  unstable_noStore();
  const userId = await getAuthUserId();
  const weekStart = getWeekStart();
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  // ── Parallel DB fetching ──
  const [thisWeekSets, heavySets, totalSessionsEver, totalCompletedSets] = await Promise.all([
    prisma.setLog.findMany({
      where: {
        isCompleted: true,
        workoutLog: { session: { userId, startTime: { gte: weekStart } } },
      },
      select: {
        weight: true,
        reps: true,
        rpe: true,
        rir: true,
        workoutLog: {
          select: {
            exercise: { select: { name: true, primaryMuscle: true } },
            session: { select: { startTime: true } },
          },
        },
      },
    }),
    prisma.setLog.findMany({
      where: {
        isCompleted: true,
        createdAt: { gte: thirtyDaysAgo },
        workoutLog: { session: { userId } },
      },
      orderBy: { weight: "desc" },
      include: { workoutLog: { include: { exercise: { select: { name: true } } } } },
      take: 40,
    }),
    prisma.workoutSession.count({ where: { userId, isActive: false } }),
    prisma.setLog.count({
      where: {
        isCompleted: true,
        workoutLog: { session: { userId } }
      }
    }),
  ]);
  // Calculations
  const loggedRpeSets = thisWeekSets.filter(s => s.rpe !== null && s.rpe !== undefined && s.rpe > 0);
  const validSets = thisWeekSets.filter(
    s => Number(s.weight) > 0 && s.reps > 0
  );
  const avgRpe = loggedRpeSets.length > 0 ? (loggedRpeSets.reduce((sum, s) => sum + s.rpe!, 0) / loggedRpeSets.length) : 0;

  const loggedRirSets = thisWeekSets.filter(s => s.rir !== null && s.rir !== undefined);
  const avgRir = loggedRirSets.length > 0 ? (loggedRirSets.reduce((sum, s) => sum + s.rir!, 0) / loggedRirSets.length) : 0;

  const weeklyVolumeKg = validSets.reduce((sum, s) => sum + Number(s.weight) * s.reps, 0);

  const sessionDays = new Set(validSets.map(s => new Date(s.workoutLog.session.startTime).toDateString()));
  const weeklyFrequency = sessionDays.size;

  const muscleCounts: Record<string, number> = {};
  for (const s of validSets) {
    const muscle = s.workoutLog.exercise.primaryMuscle;
    muscleCounts[muscle] = (muscleCounts[muscle] ?? 0) + 1;
  }
  const muscleDistribution = Object.entries(muscleCounts)
    .sort(([, a], [, b]) => b - a)
    .map(([muscle, sets]) => ({ muscle, sets }));

  const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  const volumeByDay = DAY_LABELS.map((day, i) => {
    const target = new Date();
    // i=0 is Monday, i=6 is Sunday
    const dayOfWeek = (i + 1) % 7; // Mon=1...Sun=0
    const diff = (target.getDay() - dayOfWeek + 7) % 7;
    target.setDate(target.getDate() - diff);
    target.setHours(0, 0, 0, 0);
    const targetEnd = new Date(target);
    targetEnd.setDate(target.getDate() + 1);

    return {
      day,
      totalSets: validSets.filter(s => {
        const sessionDate = new Date(s.workoutLog.session.startTime);
        return sessionDate >= target && sessionDate < targetEnd;
      }).length
    };
  });

  const prMap = new Map<string, { weight: number; date: string }>();
  for (const s of heavySets) {
    const name = s.workoutLog.exercise.name;
    if (!prMap.has(name)) prMap.set(name, { weight: Number(s.weight), date: s.createdAt.toISOString().split("T")[0] });
  }
  const recentPRs = Array.from(prMap.entries()).slice(0, 3).map(([exerciseName, { weight, date }]) => ({ exerciseName, weight, date }));

  return {
    avgRpe: Math.round(avgRpe * 10) / 10,
    avgRir: Math.round(avgRir * 10) / 10,
    weeklyVolumeKg: Math.round(weeklyVolumeKg),
    weeklyFrequency,
    totalSetsThisWeek: validSets.length,
    volumeByDay,
    recentPRs,
    muscleDistribution,
    totalSessionsEver,
    totalCompletedSets,
  };
}

import { unstable_noStore } from "next/cache";

// ── getGeneralExercises ─────────────────────────────────────────
// Returns the full standard exercise library for the search modal.
export async function getGeneralExercises() {
  unstable_noStore(); // Prevents Next.js from permanently caching the empty build-time DB state
  return prisma.exercise.findMany({
    where: { primaryMuscle: { not: "Custom" } },
    orderBy: [{ primaryMuscle: "asc" }, { name: "asc" }],
  });
}

// ── getPersonalExercises ────────────────────────────────────────
// Returns all exercises the user created themselves.
export async function getPersonalExercises() {
  unstable_noStore();
  const userId = await getAuthUserId();
  return prisma.exercise.findMany({
    where: { mechanics: "Custom", userId },
    orderBy: { name: "asc" },
  });
}

// ── searchExercises ───────────────────────────────────────────
// Filters the exercise library by name or muscle group.
// Called as the user types in the search box.
export async function searchExercises(query: string) {
  return prisma.exercise.findMany({
    where: {
      OR: [
        { name: { contains: query, mode: "insensitive" } },
        { primaryMuscle: { contains: query, mode: "insensitive" } },
      ],
    },
    orderBy: { name: "asc" },
    take: 20,
  });
}

// ── createLoggableExercise ──────────────────────────────────────
// Creates a new custom exercise securely associated with the user.
export async function createLoggableExercise(name: string, primaryMuscle: string, bodyRegion?: string): Promise<string> {
  const userId = await getAuthUserId();

  // First check if a general exercise or a personal exercise already exists with this exact name
  const existing = await prisma.exercise.findFirst({
    where: {
      name: { equals: name, mode: "insensitive" },
      OR: [
        { userId: null },   // General exercise
        { userId: userId }  // Personal exercise for this exact user
      ]
    },
  });
  if (existing) return existing.id;

  const newEx = await prisma.exercise.create({
    data: {
      name,
      primaryMuscle,
      mechanics: "Custom",
      userId,
      bodyRegion: bodyRegion || null,
    },
  });
  return newEx.id;
}

// ── getWeeklyMuscleVolume ───────────────────────────────────────
// Returns an array of { muscle: string, sets: number } for the past 7 days.
export async function getWeeklyMuscleVolume() {
  unstable_noStore();
  const userId = await getAuthUserId();
  const weekStart = getWeekStart();

  const thisWeekSets = await prisma.setLog.findMany({
    where: {
      isCompleted: true,
      workoutLog: {
        session: {
          userId,
          startTime: { gte: weekStart },
        },
      },
    },
    include: {
      workoutLog: {
        include: {
          exercise: { select: { primaryMuscle: true } },
        },
      },
    },
  });

  const muscleCounts: Record<string, number> = {};
  for (const s of thisWeekSets) {
    const muscle = s.workoutLog.exercise.primaryMuscle;
    muscleCounts[muscle] = (muscleCounts[muscle] ?? 0) + 1;
  }
  return Object.entries(muscleCounts)
    .sort(([, a], [, b]) => b - a)
    .map(([muscle, sets]) => ({ muscle, sets }));
}

// ── getWeeklyMuscleFrequency ────────────────────────────────────
// Returns an array of { muscle: string, frequency: number, bodyRegion?: string } for this week.
// Frequency = number of distinct days the muscle was trained.
export async function getWeeklyMuscleFrequency() {
  unstable_noStore();
  const userId = await getAuthUserId();
  const weekStart = getWeekStart();

  const thisWeekSets = await prisma.setLog.findMany({
    where: {
      isCompleted: true,
      workoutLog: {
        session: {
          userId,
          startTime: { gte: weekStart },
        },
      },
    },
    include: {
      workoutLog: {
        include: {
          exercise: { select: { primaryMuscle: true, bodyRegion: true } },
          session: { select: { startTime: true } },
        },
      },
    },
  });

  const muscleDays: Record<string, Set<string>> = {};
  const muscleRegion: Record<string, string | null> = {};
  for (const s of thisWeekSets) {
    const muscle = s.workoutLog.exercise.primaryMuscle;
    const dateStr = new Date(s.workoutLog.session.startTime).toDateString();

    if (!muscleDays[muscle]) {
      muscleDays[muscle] = new Set();
      muscleRegion[muscle] = s.workoutLog.exercise.bodyRegion;
    }
    muscleDays[muscle].add(dateStr);
  }

  return Object.entries(muscleDays)
    .sort(([, a], [, b]) => b.size - a.size)
    .map(([muscle, days]) => ({ muscle, frequency: days.size, bodyRegion: muscleRegion[muscle] || null }));
}

// ── getAvgRirByMuscle ──────────────────────────────────────────
// Returns all muscles with their average RIR: { muscle, avgRir, totalSets }[]
export async function getAvgRirByMuscle() {
  unstable_noStore();
  const userId = await getAuthUserId();

  const allCompletedSets = await prisma.setLog.findMany({
    where: {
      isCompleted: true,
      workoutLog: { session: { userId } },
    },
    include: {
      workoutLog: {
        include: {
          exercise: { select: { primaryMuscle: true } },
        },
      },
    },
  });

  const muscleData: Record<string, { totalRir: number; count: number }> = {};
  for (const s of allCompletedSets) {
    const muscle = s.workoutLog.exercise.primaryMuscle;
    if (!muscleData[muscle]) muscleData[muscle] = { totalRir: 0, count: 0 };
    muscleData[muscle].totalRir += s.rir;
    muscleData[muscle].count += 1;
  }

  return Object.entries(muscleData)
    .map(([muscle, { totalRir, count }]) => ({
      muscle,
      avgRir: Math.round((totalRir / count) * 10) / 10,
      totalSets: count,
    }))
    .sort((a, b) => a.avgRir - b.avgRir); // lowest RIR first (hardest trained)
}

// ── getExerciseRirForMuscle ────────────────────────────────────
// Drill-down: returns exercises for a specific muscle with their avg RIR.
export async function getExerciseRirForMuscle(muscle: string) {
  unstable_noStore();
  const userId = await getAuthUserId();

  const sets = await prisma.setLog.findMany({
    where: {
      isCompleted: true,
      workoutLog: {
        session: { userId },
        exercise: { primaryMuscle: { equals: muscle, mode: "insensitive" } },
      },
    },
    include: {
      workoutLog: {
        include: {
          exercise: { select: { name: true, primaryMuscle: true } },
        },
      },
    },
  });

  const exerciseData: Record<string, { totalRir: number; count: number }> = {};
  for (const s of sets) {
    const name = s.workoutLog.exercise.name;
    if (!exerciseData[name]) exerciseData[name] = { totalRir: 0, count: 0 };
    exerciseData[name].totalRir += s.rir;
    exerciseData[name].count += 1;
  }

  return Object.entries(exerciseData)
    .map(([exerciseName, { totalRir, count }]) => ({
      exerciseName,
      avgRir: Math.round((totalRir / count) * 10) / 10,
      totalSets: count,
    }))
    .sort((a, b) => a.avgRir - b.avgRir);
}
