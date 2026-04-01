"use server";

import { prisma } from "@/lib/prisma";
import { startOfWeek, endOfWeek, subDays, format } from "date-fns";
import { getAuthUserId } from "@/lib/auth";
import { unstable_noStore } from "next/cache";

export interface ProgressPoint {
  date: string; // ISO or formatted
  weight: number;
  reps: number;
  score: number;
}

export interface ExerciseProgress {
  exerciseId: string;
  exerciseName: string;
  muscle: string;
  category: "Upper" | "Lower";
  points: ProgressPoint[];
}

/**
 * Calculates a Weight-Prioritized Performance Score.
 * Rank = Weight + (Reps / 100)
 */
function calculateScore(weight: number, reps: number, rpe: number = 8) {
  // Intensity Rule: Give weight absolute priority while keeping reps meaningful.
  // This ensures 72.5kg x 5 > 70kg x 10, but 40kg x 7 > 40kg x 6.
  // Formula: Weight + (Reps / 3)
  return weight + (reps / 3);
}

/**
 * Categorizes an exercise as Upper or Lower body based on its primary muscle.
 * Falls back to the exercise's saved bodyRegion if the muscle is not in the hardcoded list.
 * Defaults to "Upper" if neither resolves.
 */
function getCategory(muscle: string, bodyRegion?: string | null): "Upper" | "Lower" {
  const lowerMuscles = ["Quadriceps", "Hamstrings", "Glutes", "Calves", "Legs"];
  const normalized = muscle.charAt(0) + muscle.slice(1).toLowerCase();
  if (lowerMuscles.some(m => normalized.includes(m))) {
    return "Lower";
  }
  // Fallback: check the database-stored bodyRegion for custom muscle groups
  if (bodyRegion === "lower") {
    return "Lower";
  }
  return "Upper";
}

/**
 * Fetches historical progress for all exercises.
 * Aggregates the BEST set (highest weight-priority score) per exercise per session.
 */
export async function getHistoricalProgress(): Promise<ExerciseProgress[]> {
  unstable_noStore();
  const userId = await getAuthUserId();
  // 1. Fetch all completed sets with their exercise data and session date
  const allSets = await prisma.setLog.findMany({
    where: { 
      isCompleted: true,
      workoutLog: {
        session: {
          userId,
        },
      },
    },
    include: {
      workoutLog: {
        include: {
          exercise: true,
          session: true,
        },
      },
    },
    orderBy: {
      workoutLog: {
        session: {
          startTime: "asc",
        },
      },
    },
  });

  // 2. Group by Exercise -> Session
  // Map<ExerciseId, Map<SessionId, BestSet>>
  const registry: Record<string, { name: string; muscle: string; bodyRegion?: string | null; points: Record<string, ProgressPoint> }> = {};

  (allSets as any).forEach((set: any) => {
    const ex = set.workoutLog.exercise;
    const session = set.workoutLog.session;
    // Use full timestamps for session-level granularity (multiple sessions per day supported)
    const dateStr = session.startTime.toISOString();
    const weightNum = Number(set.weight);

    if (!registry[ex.id]) {
      registry[ex.id] = {
        name: ex.name,
        muscle: ex.primaryMuscle,
        bodyRegion: ex.bodyRegion,
        points: {},
      };
    }

    const currentScore = calculateScore(weightNum, set.reps);
    const existingPoint = registry[ex.id].points[dateStr];

    if (!existingPoint || currentScore > existingPoint.score) {
      registry[ex.id].points[dateStr] = {
        date: dateStr,
        weight: weightNum,
        reps: set.reps,
        score: currentScore,
      };
    }
  });

  // 3. Convert to final structure
  const result: ExerciseProgress[] = Object.entries(registry).map(([id, data]) => {
    return {
      exerciseId: id,
      exerciseName: data.name,
      muscle: data.muscle,
      category: getCategory(data.muscle, data.bodyRegion),
      // Sort points by date
      points: Object.values(data.points).sort((a, b) => a.date.localeCompare(b.date)),
    };
  });

  return result;
}
