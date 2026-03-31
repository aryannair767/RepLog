"use server";
// ============================================================
// src/app/actions/session.ts
//
// Server Actions for creating/ending workout sessions.
//
// WHAT IS A SERVER ACTION?
// It's a function that runs on the SERVER (not in the browser).
// You call it from a client component like a normal function,
// but it actually goes to your database. Next.js handles the
// network request automatically.
//
// HOW TO MODIFY:
// - Change session name format? Edit the `name` string in createSession().
// - Want to auto-end after X hours? Add a cron job that calls endSession().
// ============================================================

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { unstable_noStore } from "next/cache";
import type { PreviousSessionSummary, WorkoutSessionData } from "@/types/replog";
import { getAuthUserId } from "@/lib/auth";

// ── getActiveSession ─────────────────────────────────────────
// Fetches the currently active session for the user,
// including all exercises and their sets.
// Returns null if no session is active (e.g. first-time user).
export async function getActiveSession(): Promise<WorkoutSessionData | null> {
  unstable_noStore();
  const userId = await getAuthUserId();
  // prisma.workoutSession maps to the "workout_sessions" table
  const session = await prisma.workoutSession.findFirst({
    where: {
      userId,
      isActive: true, // only the live session
    },
    orderBy: { startTime: "desc" },
    include: {
      // Pull in all exercise slots for this session
      logs: {
        orderBy: { orderIndex: "asc" },
        include: {
          exercise: true, // join to the exercises table
          sets: { orderBy: { setNumber: "asc" } }, // join to set_logs
        },
      },
    },
  });

  // No active session — this is fine, the UI will show a welcome screen
  if (!session) return null;

  // Convert Prisma's Decimal type to plain numbers the client can use
  return {
    id: session.id,
    name: session.name,
    startTime: session.startTime.toISOString(),
    isActive: session.isActive,
    logs: session.logs.map((log) => ({
      id: log.id,
      exerciseId: log.exerciseId,
      orderIndex: log.orderIndex,
      exercise: {
        id: log.exercise.id,
        name: log.exercise.name,
        primaryMuscle: log.exercise.primaryMuscle,
        secondaryMuscle: log.exercise.secondaryMuscle,
        mechanics: log.exercise.mechanics,
      },
      sets: log.sets.map((s) => ({
        id: s.id,
        setNumber: s.setNumber,
        weight: Number(s.weight), // Decimal → number
        reps: s.reps,
        rpe: s.rpe,
        rir: s.rir,
        isCompleted: s.isCompleted,
      })),
    })),
  };
}

// ── createSession ─────────────────────────────────────────────
// Starts a new workout session.
// Closes any previous active sessions first (safety net).
export async function createSession(): Promise<WorkoutSessionData> {
  const userId = await getAuthUserId();
  // Close any sessions that were left open accidentally
  await prisma.workoutSession.updateMany({
    where: { userId, isActive: true },
    data: { isActive: false, endTime: new Date() },
  });

  // Generate a human-readable session name based on today's date
  const name = `Session — ${new Date().toLocaleDateString("en-GB", {
    weekday: "short",
    day: "2-digit",
    month: "short",
  })}`;

  const session = await prisma.workoutSession.create({
    data: {
      userId,
      name,
      isActive: true,
    },
  });

  // Tells Next.js to re-fetch the page data
  revalidatePath("/");

  return {
    id: session.id,
    name: session.name,
    startTime: session.startTime.toISOString(),
    isActive: true,
    logs: [],
  };
}

import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";

// ── endSession ────────────────────────────────────────────────
// Marks a session as finished and records the end time.
export async function endSession(sessionId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const userId = await getAuthUserId();
    
    // First verify the session belongs to this user
    const session = await prisma.workoutSession.findFirst({
      where: { id: sessionId, userId },
    });
    
    if (!session) {
      throw new Error(`Session ${sessionId} not found for user ${userId}`);
    }
    
    // Use update (not updateMany) so it throws if the row 
    // doesn't exist instead of silently doing nothing
    const updatedSession = await prisma.workoutSession.update({
      where: { id: sessionId },
      data: {
        isActive: false,
        endTime: new Date(),
      },
    });

    // We removed revalidatePath("/") here to prevent the 
    // "Server Components render" crash on mobile during transitions.
    // Client will handle the routing/state updates locally.
    
    return { success: true };
    
  } catch (error: any) {
    if (error instanceof PrismaClientKnownRequestError) {
      console.error("DEBUG_SESSION_ERROR_PRISMA:", error.code, error.message, error.stack);
    } else {
      console.error("DEBUG_SESSION_ERROR:", error.message, error.stack);
    }
    
    return { success: false, error: error.message };
  }
}

// ── deleteSession ─────────────────────────────────────────────
// Permanently removes a workout session and all its data.
export async function deleteSession(sessionId: string): Promise<void> {
  const userId = await getAuthUserId();
  await prisma.workoutSession.deleteMany({
    where: { id: sessionId, userId },
  });

  revalidatePath("/");
}

// ── getPreviousSessions ──────────────────────────────────────
// Returns a read-only list of the user's past sessions (with date).
export async function getPreviousSessions(): Promise<PreviousSessionSummary[]> {
  unstable_noStore();
  const userId = await getAuthUserId();
  const sessions = await prisma.workoutSession.findMany({
    where: {
      userId,
      isActive: false,
      // FIXED: Show all completed sessions, not just those with completed sets
      // Previously: logs: { some: { sets: { some: { isCompleted: true } } } }
      // Now: Just check that session is inactive (completed)
    },
    orderBy: { startTime: "desc" },
    take: 20,
    include: {
      logs: {
        include: {
          sets: true, // Just fetch the sets safely
        }
      },
      _count: { select: { logs: true } }
    },
  });

  return sessions.map((s) => ({
    id: s.id,
    name: s.name,
    startTime: s.startTime.toISOString(),
    endTime: s.endTime?.toISOString() || null,
    logCount: s._count.logs,
    completedSetCount: s.logs.reduce(
      (sum, log) => sum + log.sets.filter(set => set.isCompleted).length, 0
    ),
  }));
}

// ── getSessionDetail ─────────────────────────────────────────
// Fetches a full session by ID with all exercises and sets.
// Used for the read-only session detail view in History.
export async function getSessionDetail(sessionId: string): Promise<WorkoutSessionData | null> {
  unstable_noStore();
  const userId = await getAuthUserId();
  const session = await prisma.workoutSession.findFirst({
    where: {
      id: sessionId,
      userId, // ensure user owns this session
    },
    include: {
      logs: {
        orderBy: { orderIndex: "asc" },
        include: {
          exercise: true,
          sets: { orderBy: { setNumber: "asc" } },
        },
      },
    },
  });

  if (!session) return null;

  return {
    id: session.id,
    name: session.name,
    startTime: session.startTime.toISOString(),
    isActive: session.isActive,
    logs: session.logs.map((log) => ({
      id: log.id,
      exerciseId: log.exerciseId,
      orderIndex: log.orderIndex,
      exercise: {
        id: log.exercise.id,
        name: log.exercise.name,
        primaryMuscle: log.exercise.primaryMuscle,
        secondaryMuscle: log.exercise.secondaryMuscle,
        mechanics: log.exercise.mechanics,
      },
      sets: log.sets.map((s) => ({
        id: s.id,
        setNumber: s.setNumber,
        weight: Number(s.weight),
        reps: s.reps,
        rpe: s.rpe,
        rir: s.rir,
        isCompleted: s.isCompleted,
      })),
    })),
  };
}
