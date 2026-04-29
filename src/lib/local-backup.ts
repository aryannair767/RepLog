// ============================================================
// src/lib/local-backup.ts — Shadow Backup System (Dexie.js)
//
// PURPOSE:
// A silent, browser-only backup layer that mirrors workout data
// into a separate IndexedDB database ("RepLogShadowBackup").
// If the Supabase server ever returns empty but this shadow DB
// has data, the app can offer one-tap recovery.
//
// ARCHITECTURE:
// - Uses Dexie.js for a clean IndexedDB wrapper.
// - Completely separate from the existing RepLogDB (src/lib/db.ts).
// - All exports are SSR-safe: they no-op when `window` is undefined.
// - Rolling Window: keeps current active + 3 most recent completed sessions.
//
// SCHEMA MIRRORS:
//   shadowSessions  → Prisma WorkoutSession
//   shadowLogs      → Prisma WorkoutLog
//   shadowSets      → Prisma SetLog
// ============================================================

import Dexie, { type Table } from "dexie";

// ── Types (mirrors src/types/replog.ts for shadow storage) ───
// We re-declare lean interfaces here to avoid coupling the backup
// module to the main app's type imports. These match the shapes
// that flow through WorkoutSessionData / WorkoutLogData / SetLogData.

export interface ShadowSession {
  id: string;
  name: string;
  startTime: string;   // ISO string
  isActive: boolean;
  userId?: string;     // optional — for multi-user isolation
}

export interface ShadowLog {
  id: string;
  sessionId: string;
  exerciseId: string;
  orderIndex: number;
  exerciseName: string;
  primaryMuscle: string;
  secondaryMuscle: string | null;
  mechanics: string;
}

export interface ShadowSet {
  id: string;
  workoutLogId: string;
  setNumber: number;
  weight: number;
  reps: number;
  rpe: number | null;
  rir: number | null;
  isCompleted: boolean;
}

export const STORES = {
  EXERCISES: 'exercises',
  SESSIONS: 'sessions',
  STATS: 'stats',
  SYNC_QUEUE: 'sync_queue',
};

class RepLogShadowDB extends Dexie {
  shadowSessions!: Table<ShadowSession>;
  shadowLogs!: Table<ShadowLog>;
  shadowSets!: Table<ShadowSet>;
  
  // Cache Stores replacing db.ts
  cacheExercises!: Table<any>;
  cacheSessions!: Table<any>;
  cacheStats!: Table<any>;
  cacheSyncQueue!: Table<any, number>;

  constructor() {
    super("RepLogShadowBackup");

    this.version(1).stores({
      shadowSessions: "id, isActive, startTime",
      shadowLogs:     "id, sessionId",
      shadowSets:     "id, workoutLogId",
    });

    this.version(2).stores({
      shadowSessions: "id, isActive, startTime",
      shadowLogs:     "id, sessionId",
      shadowSets:     "id, workoutLogId",
      cacheExercises: "id",
      cacheSessions: "id",
      cacheStats: "id",
      cacheSyncQueue: "++id",
    });
  }
}

// ── Singleton Instance ───────────────────────────────────────
// Only instantiate in the browser. Server-side imports get `null`.
let shadowDb: RepLogShadowDB | null = null;

function getDb(): RepLogShadowDB | null {
  if (typeof window === "undefined") return null;
  if (!shadowDb) {
    shadowDb = new RepLogShadowDB();
  }
  return shadowDb;
}

// ── Rolling Window Constant ──────────────────────────────────
const MAX_COMPLETED_SESSIONS = 3;

// ── syncToShadow ─────────────────────────────────────────────
// Upserts a full WorkoutSessionData (with nested logs & sets)
// into the shadow database. Called from the debounced useEffect
// in RepLogPage whenever `session` state changes.
//
// Also enforces the rolling window: keeps the active session
// plus the 3 most recent completed sessions. Older ones are pruned.

interface SessionPayload {
  id: string;
  name: string;
  startTime: string;
  isActive: boolean;
  logs: Array<{
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
    sets: Array<{
      id: string;
      setNumber: number;
      weight: number;
      reps: number;
      rpe: number | null;
      rir: number | null;
      isCompleted: boolean;
    }>;
  }>;
}

export async function syncToShadow(session: SessionPayload): Promise<void> {
  const db = getDb();
  if (!db) return;

  try {
    await db.transaction("rw", [db.shadowSessions, db.shadowLogs, db.shadowSets], async () => {
      // 1. Upsert the session record
      await db.shadowSessions.put({
        id: session.id,
        name: session.name,
        startTime: session.startTime,
        isActive: session.isActive,
      });

      // 2. Clear existing logs & sets for this session, then re-insert
      //    (full replace is simpler and avoids orphan detection)
      const existingLogIds = await db.shadowLogs
        .where("sessionId")
        .equals(session.id)
        .primaryKeys();

      if (existingLogIds.length > 0) {
        // Delete sets belonging to those logs
        await db.shadowSets
          .where("workoutLogId")
          .anyOf(existingLogIds)
          .delete();
        // Delete the logs themselves
        await db.shadowLogs
          .where("sessionId")
          .equals(session.id)
          .delete();
      }

      // 3. Insert fresh logs & sets
      for (const log of session.logs) {
        await db.shadowLogs.put({
          id: log.id,
          sessionId: session.id,
          exerciseId: log.exerciseId,
          orderIndex: log.orderIndex,
          exerciseName: log.exercise.name,
          primaryMuscle: log.exercise.primaryMuscle,
          secondaryMuscle: log.exercise.secondaryMuscle,
          mechanics: log.exercise.mechanics,
        });

        for (const set of log.sets) {
          await db.shadowSets.put({
            id: set.id,
            workoutLogId: log.id,
            setNumber: set.setNumber,
            weight: set.weight,
            reps: set.reps,
            rpe: set.rpe ?? null,
            rir: set.rir ?? null,
            isCompleted: set.isCompleted,
          });
        }
      }
    });

    // 4. Enforce rolling window — prune old completed sessions
    await pruneOldSessions(db);
  } catch (e) {
    // Silent failure — shadow backup is best-effort, never blocks the UI
    console.warn("[ShadowBackup] Sync failed:", e);
  }
}

// ── pruneOldSessions ─────────────────────────────────────────
// Keeps active session + MAX_COMPLETED_SESSIONS most recent completed.
async function pruneOldSessions(db: RepLogShadowDB): Promise<void> {
  try {
    const completed = await db.shadowSessions
      .where("isActive")
      .equals(0) // Dexie stores booleans as 0/1 in indexes
      .toArray();

    // Also catch any that might be stored as literal `false`
    const completedAlt = await db.shadowSessions
      .filter(s => s.isActive === false)
      .toArray();

    // Merge & dedupe
    const allCompleted = [...completed, ...completedAlt]
      .filter((s, i, arr) => arr.findIndex(x => x.id === s.id) === i);

    if (allCompleted.length <= MAX_COMPLETED_SESSIONS) return;

    // Sort by startTime descending — keep the newest N
    allCompleted.sort((a, b) =>
      new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
    );

    const toDelete = allCompleted.slice(MAX_COMPLETED_SESSIONS);

    for (const session of toDelete) {
      // Delete sets → logs → session (cascade)
      const logIds = await db.shadowLogs
        .where("sessionId")
        .equals(session.id)
        .primaryKeys();

      if (logIds.length > 0) {
        await db.shadowSets
          .where("workoutLogId")
          .anyOf(logIds)
          .delete();
      }

      await db.shadowLogs.where("sessionId").equals(session.id).delete();
      await db.shadowSessions.delete(session.id);
    }
  } catch (e) {
    console.warn("[ShadowBackup] Prune failed:", e);
  }
}

// ── getShadowSessions ────────────────────────────────────────
// Returns all shadow sessions with their nested logs and sets,
// reconstructed into the same shape as WorkoutSessionData.
// Used by the recovery check on app load.

export interface ShadowRecoveryData {
  sessions: Array<SessionPayload>;
}

export async function getShadowData(): Promise<ShadowRecoveryData | null> {
  const db = getDb();
  if (!db) return null;

  try {
    const sessions = await db.shadowSessions.toArray();
    if (sessions.length === 0) return null;

    const result: SessionPayload[] = [];

    for (const session of sessions) {
      const logs = await db.shadowLogs
        .where("sessionId")
        .equals(session.id)
        .toArray();

      const logsWithSets = await Promise.all(
        logs.map(async (log) => {
          const sets = await db.shadowSets
            .where("workoutLogId")
            .equals(log.id)
            .toArray();

          return {
            id: log.id,
            exerciseId: log.exerciseId,
            orderIndex: log.orderIndex,
            exercise: {
              id: log.exerciseId,
              name: log.exerciseName,
              primaryMuscle: log.primaryMuscle,
              secondaryMuscle: log.secondaryMuscle,
              mechanics: log.mechanics,
            },
            sets: sets.map(s => ({
              id: s.id,
              setNumber: s.setNumber,
              weight: s.weight,
              reps: s.reps,
              rpe: s.rpe,
              rir: s.rir,
              isCompleted: s.isCompleted,
            })),
          };
        })
      );

      result.push({
        id: session.id,
        name: session.name,
        startTime: session.startTime,
        isActive: session.isActive,
        logs: logsWithSets,
      });
    }

    // Only return if there's meaningful data (at least one session with sets)
    const hasData = result.some(s =>
      s.logs.some(l => l.sets.length > 0)
    );

    return hasData ? { sessions: result } : null;
  } catch (e) {
    console.warn("[ShadowBackup] Read failed:", e);
    return null;
  }
}

// ── clearShadow ──────────────────────────────────────────────
// Wipes the entire shadow database. Called after a successful
// restore to avoid showing the recovery prompt again.

export async function clearShadow(): Promise<void> {
  const db = getDb();
  if (!db) return;

  try {
    await db.transaction("rw", [db.shadowSessions, db.shadowLogs, db.shadowSets], async () => {
      await db.shadowSessions.clear();
      await db.shadowLogs.clear();
      await db.shadowSets.clear();
    });
  } catch (e) {
    console.warn("[ShadowBackup] Clear failed:", e);
  }
}

// ── Legacy Cache Adapters ────────────────────────────────────
// Replaces the old raw IndexedDB db.ts with Dexie.

function getStoreTable(storeName: string, db: RepLogShadowDB) {
  switch (storeName) {
    case STORES.EXERCISES: return db.cacheExercises;
    case STORES.SESSIONS: return db.cacheSessions;
    case STORES.STATS: return db.cacheStats;
    case STORES.SYNC_QUEUE: return db.cacheSyncQueue;
    default: throw new Error("Unknown store: " + storeName);
  }
}

export async function putData(storeName: string, data: any) {
  const db = getDb();
  if (!db) return;
  const table = getStoreTable(storeName, db);
  await table.put(data);
}

export async function getData(storeName: string, key: string) {
  const db = getDb();
  if (!db) return null;
  const table = getStoreTable(storeName, db);
  return await table.get(key);
}

export async function getAllData(storeName: string) {
  const db = getDb();
  if (!db) return [];
  const table = getStoreTable(storeName, db);
  return await table.toArray();
}

export async function deleteData(storeName: string, key: string) {
  const db = getDb();
  if (!db) return;
  const table = getStoreTable(storeName, db);
  await table.delete(key);
}

export async function clearStore(storeName: string) {
  const db = getDb();
  if (!db) return;
  const table = getStoreTable(storeName, db);
  await table.clear();
}
