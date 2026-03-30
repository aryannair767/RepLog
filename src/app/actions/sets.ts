"use server";
// ============================================================
// src/app/actions/sets.ts
//
// Server Actions for adding exercises and logging sets.
//
// HOW TO MODIFY:
// - Add a "notes" field to sets? Add it to the `data` object
//   in createSet() and to the SetLog model in schema.prisma.
// - Change default RPE? Edit the `rpe: 0` line in createSet().
// ============================================================

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getAuthUserId } from "@/lib/auth";

// ── addExerciseToSession ──────────────────────────────────────
// Adds an exercise to a live session and creates the first
// empty set row so the user can start filling it in immediately.
//
// sessionId  — the ID of the active workout session
// exerciseId — the ID of the exercise from the library
export async function addExerciseToSession(
  sessionId: string,
  exerciseId: string
): Promise<{ logId: string, setId: string }> {
  const userId = await getAuthUserId();

  // Run session check and count existing exercise slots in parallel
  const [session, existingCount] = await Promise.all([
    prisma.workoutSession.findUnique({ where: { id: sessionId } }),
    prisma.workoutLog.count({ where: { sessionId } })
  ]);
  
  if (session?.userId !== userId) throw new Error("Unauthorized");

  // Create the workout_log row (the "slot" for this exercise)
  const log = await prisma.workoutLog.create({
    data: {
      sessionId,
      exerciseId,
      orderIndex: existingCount,
      // Also create the first empty set right away
      sets: {
        create: {
          setNumber: 1,
          weight: 0,
          reps: 0,
          rpe: 0,
          rir: 0,
          isCompleted: false,
        },
      },
    },
    include: { sets: true }
  });

  revalidatePath("/");
  return { logId: log.id, setId: log.sets[0].id };
}

// ── updateWorkoutLogExercise ──────────────────────────────────
// Swaps the exercise in a workout log for a different one.
// Keeps all the sets intact, just changes the exercise ID.
export async function updateWorkoutLogExercise(
  workoutLogId: string,
  newExerciseId: string
): Promise<void> {
  const userId = await getAuthUserId();
  await prisma.workoutLog.updateMany({
    where: { id: workoutLogId, session: { userId } },
    data: { exerciseId: newExerciseId },
  });
  revalidatePath("/");
}

// ── addSet ────────────────────────────────────────────────────
// Adds a new empty set row to an existing exercise slot.
// Called when the user clicks "+ Add Set".
//
// workoutLogId — the ID of the workout_log (exercise slot)
export async function addSet(workoutLogId: string): Promise<string> {
  const userId = await getAuthUserId();
  const log = await prisma.workoutLog.findUnique({
    where: { id: workoutLogId },
    select: {
      session: { select: { userId: true } },
      _count: { select: { sets: true } }
    }
  });

  if (log?.session.userId !== userId) throw new Error("Unauthorized");

  const newSet = await prisma.setLog.create({
    data: {
      workoutLogId,
      setNumber: log._count.sets + 1,
      weight: 0,
      reps: 0,
      rpe: 0,
      rir: 0,
      isCompleted: false,
    },
  });

  revalidatePath("/");
  return newSet.id;
}

// ── updateSetField ─────────────────────────────────────────────
// Updates one field (weight, reps, rpe, or rir) on a single set.
// Called whenever the user types into an input box.
// Debounce this in the UI — don't call on every keystroke.
//
// setId  — the ID of the set_log row
// field  — which column to update: "weight" | "reps" | "rpe" | "rir"
// value  — the new number
export async function updateSetField(
  setId: string,
  field: "weight" | "reps" | "rpe" | "rir",
  value: number
): Promise<void> {
  const userId = await getAuthUserId();
  // Validate: rpe and rir can't exceed 10
  const clamped =
    field === "rpe" || field === "rir" ? Math.min(value, 10) : value;

  await prisma.setLog.updateMany({
    where: { id: setId, workoutLog: { session: { userId } } },
    data: { [field]: clamped },
  });
  // Removed revalidatePath("/") to prevent UI input jumping during debounced saves
}

// ── toggleSetComplete ─────────────────────────────────────────
// Marks a set as done (or un-done if you click again).
// This is the "check" button on each set row.
//
// setId       — the ID of the set_log row
// isCompleted — true to mark done, false to unmark
export async function toggleSetComplete(
  setId: string,
  isCompleted: boolean
): Promise<void> {
  const userId = await getAuthUserId();
  await prisma.setLog.updateMany({
    where: { id: setId, workoutLog: { session: { userId } } },
    data: { isCompleted },
  });
  // Removed revalidatePath("/") for optimistic UI
}

// ── removeExercise ────────────────────────────────────────────
// Removes an exercise (and all its sets) from a session.
// Cascade delete handles removing the set_log rows automatically.
export async function removeExercise(workoutLogId: string): Promise<void> {
  const userId = await getAuthUserId();
  await prisma.workoutLog.deleteMany({
    where: { id: workoutLogId, session: { userId } },
  });
  revalidatePath("/");
}

// ── removeSet ─────────────────────────────────────────────────
// Removes a single set from a workout log.
export async function removeSet(setId: string): Promise<void> {
  const userId = await getAuthUserId();
  await prisma.setLog.deleteMany({
    where: { id: setId, workoutLog: { session: { userId } } },
  });
  revalidatePath("/");
}
