// ============================================================
// src/types/replog.ts
//
// Shared TypeScript types used across the whole app.
// Think of these as "blueprints" — they describe the shape
// of the data flowing between your DB and your UI.
//
// HOW TO MODIFY:
// If you add a column to a table (e.g. "notes" on SetLog),
// add it here first, then update the Prisma schema, then
// use it in your component.
// ============================================================

// ── A single logged set ──────────────────────────────────────
export interface SetLogData {
  id: string;
  setNumber: number;
  weight: number;   // in kg
  reps: number;
  rpe: number;      // 1–10, Rate of Perceived Exertion
  rir: number;      // 0–10, Reps in Reserve
  isCompleted: boolean;
}

// ── One exercise slot inside a session ───────────────────────
export interface WorkoutLogData {
  id: string;
  exerciseId: string;
  orderIndex: number;
  exercise: {
    id: string;
    name: string;
    primaryMuscle: string;
    secondaryMuscle: string | null;
    mechanics: string;
  };
  sets: SetLogData[];
}

// ── A full workout session (the "gym visit") ─────────────────
export interface WorkoutSessionData {
  id: string;
  name: string;
  startTime: string; // ISO string — easier to pass from server to client
  isActive: boolean;
  logs: WorkoutLogData[];
}

// ── Stats shown on the dashboard ─────────────────────────────
export interface DashboardStats {
  avgRpe: number;
  avgRir: number;
  weeklyVolumeKg: number;
  weeklyFrequency: number;
  totalSetsThisWeek: number;
  volumeByDay: { day: string; totalSets: number }[];
  recentPRs: { exerciseName: string; weight: number; date: string }[];
  muscleDistribution: { muscle: string; sets: number }[];
  totalSessionsEver?: number;
  totalCompletedSets: number;
}

// A small, read-only summary for the "Previous Sessions" modal
export interface PreviousSessionSummary {
  id: string;
  name: string;
  startTime: string; // ISO string
  endTime: string | null; // ISO string or null if still active
  logCount: number; // number of exercise slots in the session
  completedSetCount: number; // count of completed sets across all logs
}

// ── An exercise from the library ─────────────────────────────
export interface ExerciseData {
  id: string;
  name: string;
  primaryMuscle: string;
  secondaryMuscle: string | null;
  mechanics: string;
  bodyRegion?: string | null; // "upper" or "lower" — only set for custom muscle groups
}
