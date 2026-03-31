"use client";
// ============================================================
// src/app/page.tsx — RepLog Main Dashboard
//
// HOW THIS FILE IS ORGANISED:
// 1. IMPORTS          — libraries and server actions we use
// 2. THEME CONSTANTS  — all colors/fonts in one place to edit
// 3. SMALL COMPONENTS — StatCard, SetRow, RestTimer, etc.
// 4. MODALS           — ExerciseLibrary picker
// 5. EXERCISE CARD    — one card per exercise in the logger
// 6. MAIN PAGE        — the full page layout
//
// HOW TO CHANGE COLORS:
// Edit the THEME object below. Every color in this file comes
// from there — you only have to change it in one place.
//
// HOW TO ADD A NEW STAT CARD:
// 1. Add the field to DashboardStats in types/replog.ts
// 2. Calculate it in src/app/actions/stats.ts
// 3. Add a new <StatCard /> below in the "Top Tier Metrics" section
// ============================================================

import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useTransition,
  startTransition,
  type ReactNode,
} from "react";
import { ThemeProvider, useTheme } from "@/components/ThemeProvider";

// Server actions — these run on the server and talk to your DB
import { getActiveSession, createSession, endSession, getPreviousSessions, deleteSession, getSessionDetail } from "@/app/actions/session";
import {
  addExerciseToSession,
  addSet,
  updateSetField,
  toggleSetComplete,
  removeExercise,
  removeSet,
  updateWorkoutLogExercise,
} from "@/app/actions/sets";
import { getDashboardStats, getGeneralExercises, getPersonalExercises, searchExercises, createLoggableExercise } from "@/app/actions/stats";
import { getHistoricalProgress, type ExerciseProgress } from "@/app/actions/progress";
import { getHydrationData } from "@/app/actions/hydration";
import Link from "next/link";
import { signOut, useSession } from "next-auth/react";

// NEW: Resilient sync utility
import { retryWithBackoff } from "@/lib/retry"; 

// IndexedDB — local data layer for offline & instant loading
import { getData, putData, getAllData, clearStore, STORES, initDB } from "@/lib/db";

// TypeScript types
import type {
  WorkoutSessionData,
  WorkoutLogData,
  SetLogData,
  DashboardStats,
  ExerciseData,
  PreviousSessionSummary,
} from "@/types/replog";

// ============================================================
// 1. THEME CONSTANTS
// Change any value here to update it everywhere in the UI.
// ============================================================
const THEME = {
  // --- Colors (all driven by CSS variables for light/dark mode) ---
  lime: "var(--accent-color)",
  limeHover: "var(--accent-glow)",
  black: "var(--bg)",
  surface: "var(--surface)",
  surfaceSolid: "var(--surface-solid)",
  surface2: "var(--surface)",
  surface3: "var(--surface-hover)",
  border: "var(--border)",
  border2: "var(--border-hover)",
  textPrimary: "var(--text-primary)",
  textMuted: "var(--text-secondary)",
  textDim: "var(--text-secondary)",
  textGhost: "var(--text-ghost)",
  danger: "var(--danger)",
  dangerBg: "var(--danger-bg)",
  dangerBorder: "var(--danger-border)",
  doneBorder: "var(--done-border)",
  doneBg: "var(--done-bg)",

  // --- Fonts ---
  fontSans: "var(--font-main)",
  fontMono: "var(--font-main)",

  // --- Spacing ---
  borderRadius: "var(--radius, 12px)",

  // --- Chart Colors ---
  chartPalette: ["var(--accent-color)", "var(--graph-accent)", "#fbbf24", "#f472b6", "#818cf8", "#fb923c", "#2dd4bf", "#f87171", "#c084fc", "#4ade80"],
} as const;

// ============================================================
// 2. INLINE STYLE HELPERS
// Tiny reusable style objects so we don't repeat ourselves.
// ============================================================

// A label that looks like a clean telemetry readout
const monoLabel = (size: number = 9, color: string = THEME.textGhost): React.CSSProperties => ({
  fontSize: size,
  fontFamily: THEME.fontMono,
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  color,
});

// Logo-consistent label styling — used for nav + tab text.
const brandLabel = (size: number = 13, color: string = THEME.textGhost): React.CSSProperties => ({
  fontSize: size,
  fontFamily: THEME.fontSans,
  textTransform: "uppercase",
  letterSpacing: "-0.02em",
  color,
  fontWeight: 800,
  fontStyle: "normal",
});

// A standard card wrapper — glassmorphism
const cardStyle: React.CSSProperties = {
  background: THEME.surface,
  backdropFilter: "blur(12px)",
  WebkitBackdropFilter: "blur(12px)",
  border: `1px solid ${THEME.border}`,
  borderRadius: THEME.borderRadius,
  overflow: "hidden",
  transition: `all var(--transition)`,
};

const brandButton: React.CSSProperties = {
  background: THEME.lime,
  border: "none",
  borderRadius: THEME.borderRadius,
  color: "#000",
  padding: "10px 20px",
  cursor: "pointer",
  fontWeight: 800,
  fontFamily: THEME.fontSans,
  fontSize: 12,
  textTransform: "uppercase",
  transition: `all var(--transition)`,
  boxShadow: "var(--glow-primary)",
};

// ============================================================
// 3. SMALL REUSABLE COMPONENTS
// ============================================================

// ── StatCard ──────────────────────────────────────────────────
// The three metric cards at the top of the dashboard.
// Props:
//   label    — card title (e.g. "Intensity Score")
//   value    — big number to display
//   sub      — unit label (e.g. "/ 10 RPE")
//   trend    — small text next to the bar (e.g. "+12.4%")
//   barPct   — how full the progress bar is (0–100)
//   icon     — an SVG element
function StatCard({
  label, value, sub, trend, barPct, icon,
}: {
  label: string;
  value: string | number;
  sub: string;
  trend: string;
  barPct: number;
  icon: ReactNode;
}) {
  return (
    <div style={cardStyle}>
      {/* Card title row */}
      <div style={{
        borderBottom: `1px solid ${THEME.border}`,
        padding: "7px 14px",
        background: "var(--card-header-bg)",
        minHeight: 52,
        display: "flex",
        alignItems: "center",
      }}>
        <span style={brandLabel(12)}>{label}</span>
      </div>

      <div style={{ padding: 16 }}>
        {/* Icon (Centered) */}
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}>
          <span style={{ color: THEME.lime }}>{icon}</span>
        </div>

        {/* Big number */}
        <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
          <span style={{
            fontSize: 36, fontWeight: 900, letterSpacing: "-0.04em",
            color: THEME.textPrimary, lineHeight: 1,
          }}>
            {value}
          </span>
          <span style={monoLabel(11, THEME.textGhost)}>{sub}</span>
        </div>

        {/* Progress bar + trend label */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 14 }}>
          <div style={{ flex: 1, height: 2, background: THEME.border, overflow: "hidden" }}>
            {/* The green fill — width is controlled by barPct prop */}
            <div style={{
              height: "100%", background: THEME.lime,
              width: `${Math.min(barPct, 100)}%`,
              transition: "width 0.8s ease",
            }} />
          </div>
          <span style={monoLabel(9, THEME.lime)}>{trend}</span>
        </div>
      </div>
    </div>
  );
}

// ── SVG Icons ─────────────────────────────────────────────────
// Simple inline SVG icons. To swap one out, replace the path/polygon data.
const ZapIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={THEME.lime} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
  </svg>
);
const ActivityIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={THEME.lime} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
  </svg>
);
const CalendarIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={THEME.lime} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="0" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);
const CheckIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--accent-contrast)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);
const PlusIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={THEME.lime} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);
const TrashIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
  </svg>
);

// ── RestTimer ─────────────────────────────────────────────────
// Persistent countdown timer shown inside each exercise card.
// Resets automatically when you complete a set.
// Props:
//   triggerReset — a number that increments each time a set is completed.
//                  When this changes, the timer resets.
function RestTimer({ triggerReset }: { triggerReset: number }) {
  // target = how many seconds to count down from (default 90s = 1:30)
  const [target, setTarget] = useState(90);
  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // When a set is completed, reset and start the timer automatically
  useEffect(() => {
    // IMPORTANT FIX: Don't trigger if it's the initial render OR 
    // if the user hasn't actually completed a set yet (restTrigger === 0)
    if (triggerReset === 0) return;
    setElapsed(0);
    setRunning(true);
  }, [triggerReset]); // Only depend on triggerReset to avoid auto-starting on toggle

  // The countdown tick
  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setElapsed((e) => {
          if (e >= target) {
            clearInterval(intervalRef.current!);
            setRunning(false);
            return e;
          }
          return e + 1;
        });
      }, 1000);
    } else {
      clearInterval(intervalRef.current!);
    }
    return () => clearInterval(intervalRef.current!);
  }, [running, target]);

  const remaining = Math.max(target - elapsed, 0);
  const pct = Math.min((elapsed / target) * 100, 100);
  const isDone = remaining === 0 && elapsed > 0;

  useEffect(() => {
    if (isDone) {
      if (typeof navigator !== "undefined" && navigator.vibrate) {
        navigator.vibrate([200, 100, 200]);
      }
      try {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        if (audioCtx.state === "suspended") audioCtx.resume();
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        oscillator.type = "sine";
        oscillator.frequency.setValueAtTime(880, audioCtx.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(440, audioCtx.currentTime + 0.3);
        gainNode.gain.setValueAtTime(0.5, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 0.3);
      } catch (e) {
        // Fallback for strict browsers
        console.log("Audio blocked by browser");
      }
    }
  }, [isDone]);

  // Format as MM:SS
  const display = `${String(Math.floor(remaining / 60)).padStart(2, "0")}:${String(remaining % 60).padStart(2, "0")}`;

  return (
    <div style={{
      borderTop: `1px solid ${THEME.border}`,
      padding: "9px 14px",
      display: "flex", alignItems: "center", gap: 10,
      background: THEME.surface,
    }}>
      <span style={monoLabel(9, THEME.textGhost)}>REST</span>

      {/* Progress bar — turns lime when done */}
      <div style={{ flex: 1, height: 2, background: THEME.border, position: "relative", overflow: "hidden" }}>
        <div style={{
          position: "absolute", left: 0, top: 0, height: "100%",
          width: `${pct}%`,
          background: isDone ? THEME.lime : THEME.textGhost,
          transition: "width 1s linear, background 0.3s",
        }} />
      </div>

      {/* Countdown display */}
      <span style={{
        ...monoLabel(13),
        color: isDone ? THEME.lime : THEME.textPrimary,
        minWidth: 40, textAlign: "right", letterSpacing: "-0.02em",
      }}>
        {running || isDone ? display : "--:--"}
      </span>

      {/* Duration selector — to change rest time */}
      <select
        value={target}
        onChange={(e) => { setTarget(Number(e.target.value)); setElapsed(0); }}
        style={{
          background: "transparent", border: "none",
          borderBottom: `1px solid ${THEME.border2}`,
          color: THEME.textDim, ...monoLabel(9), cursor: "pointer",
          padding: "1px 0", borderRadius: THEME.borderRadius,
        }}
      >
        {[60, 90, 120, 180, 300].map((s) => (
          <option key={s} value={s}>{`${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`}</option>
        ))}
      </select>

      {/* Start/Reset button */}
      <button
        onClick={() => { setElapsed(0); setRunning(true); }}
        style={{
          background: "transparent",
          border: `1px solid ${THEME.border2}`,
          color: THEME.lime, ...monoLabel(9),
          padding: "3px 9px", cursor: "pointer",
          borderRadius: THEME.borderRadius,
        }}
      >
        {running ? "RESET" : "START"}
      </button>
    </div>
  );
}

// ── SetRow ─────────────────────────────────────────────────────
// [SENIOR ENGINEER AUDIT]
// OLD RISK: SetRow previously used `0` as the default for all fields including RIR.
// This caused silent data corruption — a user who left RIR blank would get `0` saved,
// which means "absolute failure" — completely wrong for an untouched field.
// FIX: RIR now uses `null` as its empty-state sentinel. The DB column is NULLABLE.
// Weight/Reps/RPE still use `0` because those are safe "not entered" values.
const SetRow = React.memo(function SetRow({
  set, index, onToggle, onFieldChange, onRemoveSet, isSavingSet,
}: {
  set: SetLogData;
  index: number;
  onToggle: (id: string, current: boolean) => void;
  onFieldChange: (id: string, field: "weight" | "reps" | "rpe" | "rir", value: number | null) => void;
  onRemoveSet: (id: string) => void;
  isSavingSet: string | null;
}) {
  // [SENIOR ENGINEER AUDIT]
  // OLD RISK: Local state was initialised from server state on every rerender,
  // which caused flickering during rapid typing (keystrokes lost to revalidation).
  // FIX: Local state is seeded ONCE from the set prop. Server sync is debounced
  // and writes go through `pendingSaveRef` to guarantee flush on unmount.
  const [localValues, setLocalValues] = useState({
    weight: set.weight === 0 ? "" : set.weight,
    reps: set.reps === 0 ? "" : set.reps,
    rpe: set.rpe === 0 ? "" : set.rpe,
    rir: set.rir === null ? "" : set.rir,  // NULL sentinel — not 0
  });
  
  const [saveStatus, setSaveStatus] = useState<"idle" | "pending" | "saved">("idle");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const statusTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const pendingSaveRef = useRef<{ field: "weight" | "reps" | "rpe" | "rir"; value: number | null } | null>(null);

  // [SENIOR ENGINEER AUDIT]
  // FLUSH GUARD: If the component unmounts while a debounced save is pending,
  // we immediately flush the pending write to the server. Without this,
  // navigating away mid-edit would silently drop the user's last keystroke.
  useEffect(() => {
    return () => {
      if (pendingSaveRef.current) {
         if (debounceRef.current) clearTimeout(debounceRef.current);
         onFieldChange(set.id, pendingSaveRef.current.field, pendingSaveRef.current.value);
      }
    };
  }, [set.id, onFieldChange]);

  const weightRef = useRef<HTMLInputElement>(null);
  const repsRef = useRef<HTMLInputElement>(null);
  const rpeRef = useRef<HTMLInputElement>(null);
  const rirRef = useRef<HTMLInputElement>(null);

  // [MODULE 3: KEYBOARD FLOW]
  // Enter key progression: Reps → Weight → RIR → Toggle Complete
  // RPE is intentionally skipped because most users don't fill it per-set.
  // The flow is designed for mobile numeric keyboard speed:
  //   1. User enters reps, hits Enter → cursor jumps to weight
  //   2. User enters weight, hits Enter → cursor jumps to RIR
  //   3. User enters RIR, hits Enter → set is toggled complete
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, field: string) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (field === "reps") weightRef.current?.focus();
      else if (field === "weight") rirRef.current?.focus();
      else if (field === "rir") onToggle(set.id, set.isCompleted);
      // RPE Enter → also advance to RIR for users who tab into it
      else if (field === "rpe") rirRef.current?.focus();
    }
  };

  const getFieldRef = (field: string) => {
    switch (field) {
      case "weight": return weightRef;
      case "reps": return repsRef;
      case "rpe": return rpeRef;
      case "rir": return rirRef;
      default: return null;
    }
  };

  const handleLocalChange = (field: "weight" | "reps" | "rpe" | "rir", raw: string) => {
    setLocalValues(prev => ({ ...prev, [field]: raw }));
    
    const numValue = field === "rir" 
      ? (raw === "" ? null : Math.min(Math.max(0, parseFloat(raw) || 0), 10)) 
      : (raw === "" ? 0 : Math.min(Math.max(0, parseFloat(raw) || 0), field === "rpe" ? 10 : 999));
    
    setSaveStatus("pending");
    pendingSaveRef.current = { field, value: numValue };
    
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (statusTimerRef.current) clearTimeout(statusTimerRef.current);
    
    debounceRef.current = setTimeout(() => {
       onFieldChange(set.id, field, numValue);
       pendingSaveRef.current = null;
       setSaveStatus("saved");
       statusTimerRef.current = setTimeout(() => setSaveStatus("idle"), 1500);
    }, 400);
  };

  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "20px 1fr 60px",
      alignItems: "center",
      padding: "6px 8px",
      gap: 8,
      border: `1px solid ${set.isCompleted ? THEME.doneBorder : "transparent"}`,
      background: set.isCompleted ? THEME.doneBg : "transparent",
      transition: "border-color 0.15s, background 0.15s, opacity 0.5s ease-in-out",
      opacity: saveStatus === "pending" || isSavingSet === set.id ? 0.6 : 1, // Pulse effect
    }}>
      <span style={{ ...monoLabel(11, THEME.textMuted), textAlign: "center" }}>{index + 1}</span>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 6 }}>
        {(["weight", "reps", "rpe", "rir"] as const).map((field) => (
          <input
            key={field}
            ref={getFieldRef(field)}
            type="number"
            step={field === "weight" || field === "rpe" || field === "rir" ? "any" : "1"}
            inputMode={field === "weight" || field === "rpe" || field === "rir" ? "decimal" : "numeric"}
            value={localValues[field]}
            placeholder="—"
            disabled={isSavingSet === set.id}
            onChange={(e) => handleLocalChange(field, e.target.value)}
            onKeyDown={(e) => {
              handleKeyDown(e, field);
              const allowed = ["Backspace", "Delete", "ArrowLeft", "ArrowRight", "Tab"];
              if (field === "weight" || field === "rpe") allowed.push(".", ",");
              if (!allowed.includes(e.key) && !/^[0-9]$/.test(e.key)) {
                e.preventDefault();
              }
            }}
            style={{
              display: "block",
              width: "100%",
              background: "rgba(128, 128, 128, 0.05)",
              border: `1.5px solid ${THEME.border}`,
              borderRadius: 6,
              color: THEME.textPrimary,
              fontSize: 13,
              fontFamily: THEME.fontMono,
              padding: "4px 0",
              textAlign: "center",
              outline: "none",
              transition: "border-color 0.2s, background 0.2s",
            }}
          />
        ))}
      </div>

      <div style={{ display: "flex", gap: 6, alignItems: "center", position: "relative" }}>
        {/* SILENT OPERATOR: Success/Saving text labels permanently removed */}
        {!set.isCompleted && (
          <button
            onClick={() => onRemoveSet(set.id)}
            style={{
              width: 18, height: 18, padding: 0,
              background: "transparent", border: "none",
              color: THEME.textGhost, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 12,
            }}
          >
            ✕
          </button>
        )}

        <button
          onClick={() => onToggle(set.id, set.isCompleted)}
          disabled={isSavingSet === set.id}
          style={{
            marginLeft: "auto",
            width: 24, height: 24,
            display: "flex", alignItems: "center", justifyContent: "center",
            border: `1px solid ${set.isCompleted ? THEME.lime : THEME.border2}`,
            background: set.isCompleted ? THEME.lime : "transparent",
            cursor: isSavingSet === set.id ? "not-allowed" : "pointer",
            transition: "all 0.15s",
            borderRadius: THEME.borderRadius,
            opacity: isSavingSet === set.id ? 0.5 : 1,
          }}
        >
          {isSavingSet === set.id ? (
            <span style={{ fontSize: 10 }}>⋯</span>
          ) : (
            set.isCompleted && <CheckIcon />
          )}
        </button>
      </div>
    </div>
  );
});

// ============================================================
// 4. EXERCISE CARD
// One card per exercise added to the current session.
//
// [SENIOR ENGINEER AUDIT — OPTIMISTIC vs PESSIMISTIC STRATEGY]
// This component uses a HYBRID approach:
//   • Field edits (weight/reps/RPE/RIR) → OPTIMISTIC (instant local state + debounced server write)
//     - Safe because the user can see and correct their own input immediately.
//   • Set completion toggle → OPTIMISTIC with rollback on error
//     - The checkbox flips immediately; if the server rejects it, we revert.
//   • Add Set → PESSIMISTIC (server-first via useTransition)
//     - We wait for the server to return a real ID before rendering the new row.
//     - OLD RISK: Optimistic add-set used temp IDs that could collide or orphan.
//   • Add Exercise → PESSIMISTIC (handled in parent via pendingTx / VaultSkeleton)
//     - OLD RISK: Double-clicking "Add Exercise" created duplicate DB rows.
// ============================================================
const ExerciseCard = React.memo(function ExerciseCard({
  log,
  onRemove,
  onEdit,
  showTimer = true,
  onStatsRefresh,
}: {
  log: WorkoutLogData;
  onRemove: (id: string) => void;
  onEdit: (logId: string) => void;
  showTimer?: boolean;
  onStatsRefresh: () => void;
}) {
  // Local copy of sets — allows instant UI updates without waiting for DB
  const [sets, setSets] = useState<SetLogData[]>(log.sets);
  // Reset key — forces SetRow remount when inputs are cleared
  const [resetKey, setResetKey] = useState(0);

  useEffect(() => {
    // 1. Detect if the server log suddenly provides REAL IDs for our TEMP sets
    let hasIdUpgrades = false;

    const upgradedSets = sets.map((s, i) => {
      const serverSet = log.sets[i];
      if (serverSet && serverSet.id !== s.id && s.id.startsWith("temp-")) {
        hasIdUpgrades = true;
        return { ...s, id: serverSet.id };
      }
      return s;
    });

    if (hasIdUpgrades) {
      setSets(upgradedSets);
      return; 
    }
  }, [sets, log.sets]);

  // Error message shown in red if a DB save fails
  const [error, setError] = useState<string | null>(null);
  // Track when sets are being saved to prevent double-clicks
  const [isSaving, setIsSaving] = useState<string | null>(null);
  // Increments each time a set is completed — triggers the rest timer
  const [restTrigger, setRestTrigger] = useState(0);
  // Controls the RPE/RIR info popup
  const [activeInfo, setActiveInfo] = useState<"RPE" | "RIR" | null>(null);
  const [isPendingSetTransaction, startSetTransaction] = useTransition();

  // ── handleToggle ────────────────────────────────────────────
  const handleToggle = useCallback(async (setId: string, current: boolean) => {
    const newVal = !current;

    // Optimistic UI state update immediately
    setSets((prev) => prev.map((s) => s.id === setId ? { ...s, isCompleted: newVal } : s));

    // Optimistic IDB Update
    try {
      const localSession = await getData(STORES.SESSIONS, "active") as WorkoutSessionData;
      if (localSession) {
        const updatedLogs = localSession.logs.map(l => {
          if (l.id === log.id) {
            return { ...l, sets: l.sets.map(s => s.id === setId ? { ...s, isCompleted: newVal } : s) };
          }
          return l;
        });
        await putData(STORES.SESSIONS, { ...localSession, logs: updatedLogs, id: "active" });
      }
    } catch {}

    // Trigger rest timer
    if (newVal) setRestTrigger((t) => t + 1);

    // Make the backend call in the background
    try {
      await retryWithBackoff(() => toggleSetComplete(setId, newVal), `toggle-${setId}`);
      onStatsRefresh();
    } catch (e) {
      console.error("Failed to toggle set completion:", e);
      alert("Sync failed after 3 attempts. Please check your connection.");
      // Revert local UI state if it throws
      setSets((prev) => prev.map((s) => s.id === setId ? { ...s, isCompleted: current } : s));
    }
  }, [log.id]);

  // ── handleFieldChange ────────────────────────────────────────
  const handleFieldChange = useCallback(
    async (setId: string, field: "weight" | "reps" | "rpe" | "rir", numValue: number | null) => {
      // Instant local React state update
      setSets((prev) => prev.map((s) => s.id === setId ? { ...s, [field]: numValue } : s));

      // IDB update
      try {
        const localSession = await getData(STORES.SESSIONS, "active") as WorkoutSessionData;
        if (localSession) {
          const updatedLogs = localSession.logs.map(l => {
            if (l.id === log.id) {
              return { ...l, sets: l.sets.map(s => s.id === setId ? { ...s, [field]: numValue } : s) };
            }
            return l;
          });
          await putData(STORES.SESSIONS, { ...localSession, logs: updatedLogs, id: "active" });
        }
      } catch {}

      if (setId.startsWith("temp-")) return; 

      // Server write (debouncing already handled by SetRow)
      try {
        await retryWithBackoff(() => updateSetField(setId, field, numValue ?? 0), `update-${field}-${setId}`);
      } catch {
        setError("Sync failed after 3 attempts. Please check your connection.");
      }
    },
    [log.id]
  );

  // ── handleAddSet ─────────────────────────────────────────────
  // [SENIOR ENGINEER AUDIT — PESSIMISTIC ADD-SET]
  // OLD RISK: Optimistic add-set generated a temp ID client-side and immediately
  // rendered the row. If the server call failed or produced a different ID,
  // the row would orphan (edits saved against a non-existent ID).
  // FIX: We now use `startSetTransaction` (React useTransition) to wait for
  // the server to return the real Postgres UUID before rendering the new row.
  // The "Add Set" button shows "⋯ Saving..." during the transaction.
  const handleAddSet = () => {
    startSetTransaction(async () => {
      try {
        // Step 1: Save to server FIRST (pessimistic approach) with resilient backoff
        const realId = await retryWithBackoff(() => addSet(log.id), `addSet-${log.id}`);

        // Step 2: Create the new set with the REAL ID from server
        // [SENIOR ENGINEER AUDIT] RIR defaults to NULL, not 0.
        // 0 means "trained to absolute failure" — wrong for a blank field.
        const newSet: SetLogData = {
          id: realId,
          setNumber: sets.length + 1,
          weight: 0, reps: 0, rpe: 0, rir: null, 
          isCompleted: false,
        };
        
        // Step 3: Update local state AFTER server confirms
        const updatedSets = [...sets, newSet];
        setSets(updatedSets);

        // Step 4: Update IndexedDB for offline persistence
        const localSession = await getData(STORES.SESSIONS, "active") as WorkoutSessionData;
        if (localSession) {
          const updatedLogs = localSession.logs.map(l => {
            if (l.id === log.id) {
              return { ...l, sets: updatedSets };
            }
            return l;
          });
          await putData(STORES.SESSIONS, { ...localSession, logs: updatedLogs, id: "active" });
        }
      } catch (e) {
        console.error("Failed to add set:", e);
        setError("Failed to add set. Please try again.");
      }
    });
  };

  // ── handleRemoveSet ──────────────────────────────────────────
  const handleRemoveSet = async (setId: string) => {
    const currentSet = sets.find(s => s.id === setId);
    const hasInput = currentSet && (
      currentSet.weight !== 0 ||
      currentSet.reps !== 0 ||
      currentSet.rpe !== 0 ||
      currentSet.rir !== 0
    );

    // CASE 1: Only 1 set exists
    if (sets.length === 1) {
      if (hasInput) {
        // Clear inputs first — reset all fields to 0
        setSets([{ ...currentSet!, weight: 0, reps: 0, rpe: 0, rir: null }]);
        setResetKey(k => k + 1);
        // Do NOT remove the exercise yet
        return;
      } else {
        // No input — remove entire exercise immediately, no confirmation
        onRemove(log.id);
        return;
      }
    }

    // CASE 2: Multiple sets — always just remove that set as before
    const updatedSets = sets.filter((s) => s.id !== setId);
    setSets(updatedSets);

    const localSession = await getData(STORES.SESSIONS, "active") as WorkoutSessionData;
    if (localSession) {
      const updatedLogs = localSession.logs.map(l => {
        if (l.id === log.id) {
          return { ...l, sets: updatedSets };
        }
        return l;
      });
      await putData(STORES.SESSIONS, { ...localSession, logs: updatedLogs, id: "active" });
    }

    try {
      await retryWithBackoff(() => removeSet(setId), `removeSet-${setId}`);
      onStatsRefresh();
    } catch {
      setError("Sync failed after 3 attempts. Please check your connection.");
    }
  };

  return (
    <div
      id={`exercise-card-${log.id}`}
      style={{
        border: `1px solid ${THEME.border}`,
        background: THEME.surface2,
        marginBottom: 14,
        borderRadius: THEME.borderRadius,
      }}>
      {/* Header: Exercise Name + Mechanics + Actions */}
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "flex-start",
        padding: "16px 16px 12px",
      }}>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <div>
            <h3 style={{ fontSize: 14, fontWeight: 900, textTransform: "uppercase", margin: 0, fontStyle: "" }}>
              {log.exercise.name}
            </h3>
            <span style={{ ...monoLabel(9, THEME.textMuted), textTransform: "uppercase" }}>
              {log.exercise.mechanics} • {log.exercise.primaryMuscle}
            </span>
          </div>

          <button
            onClick={() => onEdit(log.id)}
            title="Edit / Swap Exercise"
            style={{
              background: "transparent", border: "none", cursor: "pointer",
              padding: 4, display: "flex", alignItems: "center", justifyContent: "center",
              color: THEME.textGhost,
            }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
          </button>
        </div>
        {/* Remove exercise from session */}
        <button
          onClick={() => onRemove(log.id)}
          title="Remove exercise"
          style={{
            background: "transparent", border: "none",
            color: THEME.textGhost, cursor: "pointer", fontSize: 16,
          }}
        >
          ✕
        </button>
      </div>

      {/* Error banner — only shown if something fails */}
      {error && (
        <div style={{
          background: THEME.dangerBg,
          borderBottom: `1px solid ${THEME.dangerBorder}`,
          padding: "6px 14px",
          display: "flex", justifyContent: "space-between", alignItems: "center",
        }}>
          <span style={monoLabel(9, THEME.danger)}>{error}</span>
          <button
            onClick={() => setError(null)}
            style={{ background: "none", border: "none", color: THEME.danger, cursor: "pointer" }}
          >✕</button>
        </div>
      )}

      {/* Column headers: Weight | Reps | RPE | RIR | Done */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "20px 1fr 60px",
        padding: "7px 8px", gap: 8,
        position: "relative",
      }}>
        <span style={monoLabel()}>&nbsp;</span>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 6 }}>
          {["Weight", "Reps", "RPE", "RIR"].map((h) => (
            <div
              key={h}
              onClick={() => (h === "RPE" || h === "RIR") && setActiveInfo(h)}
              style={{
                display: "flex", alignItems: "center", justifyContent: "center", gap: 3,
                cursor: (h === "RPE" || h === "RIR") ? "pointer" : "default"
              }}
            >
              <span style={{ ...monoLabel(), textAlign: "center" }}>{h}</span>
              {(h === "RPE" || h === "RIR") && (
                <div
                  style={{
                    width: 11, height: 11, borderRadius: 6,
                    background: THEME.surface3, border: `1px solid ${THEME.border}`,
                    color: THEME.textMuted, fontSize: 8, fontFamily: THEME.fontMono,
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}
                >i</div>
              )}
            </div>
          ))}
        </div>
        <span style={{ ...monoLabel(), textAlign: "right" }}>Done</span>

        {/* Floating Info Popup */}
        {activeInfo && (
          <>
            {/* Transparent catch-all to close on click outside */}
            <div
              onClick={() => setActiveInfo(null)}
              style={{ position: "fixed", inset: 0, zIndex: 100 }}
            />
            <div style={{
              position: "absolute",
              top: "100%",
              left: activeInfo === "RPE" ? "50%" : "75%",
              transform: "translateX(-50%)",
              zIndex: 101,
              background: THEME.surfaceSolid,
              border: `1px solid ${THEME.lime}`,
              borderRadius: THEME.borderRadius,
              padding: "12px 16px",
              width: 200,
              boxShadow: "var(--glow-primary)",
              marginTop: 4,
            }}>
              <div style={{ ...brandLabel(10, THEME.lime), marginBottom: 8, borderBottom: `1px solid ${THEME.border}`, paddingBottom: 4 }}>
                {activeInfo} INFO
              </div>
              <p style={{ ...monoLabel(10, THEME.textPrimary), textTransform: "none", letterSpacing: "normal", margin: 0, lineHeight: 1.4 }}>
                {activeInfo === "RPE"
                  ? "Rate of Perceived Exertion (0-10): 0 = Least effort, 10 = Absolute Maximum effort."
                  : "Reps in Reserve: 0 = Absolute failure, 5 = You could have done 5 more reps."}
              </p>
            </div>
          </>
        )}
      </div>

      {/* Set rows */}
      <div style={{ padding: "6px 8px", display: "flex", flexDirection: "column", gap: 3 }}>
        {sets.map((set, i) => (
          <SetRow
            key={`${set.id}-${resetKey}`}
            set={set}
            index={i}
            onToggle={handleToggle}
            onFieldChange={handleFieldChange}
            onRemoveSet={handleRemoveSet}
            isSavingSet={isSaving}
          />
        ))}
      </div>

      {/* Rest timer — auto-starts when a set is completed */}
      {showTimer && <RestTimer triggerReset={restTrigger} />}

      {/* Add Set button */}
      <button
        onClick={handleAddSet}
        disabled={isPendingSetTransaction}
        style={{
          width: "100%", padding: 8,
          ...monoLabel(9, isPendingSetTransaction ? THEME.textMuted : THEME.textGhost),
          background: "transparent", border: "none",
          borderTop: `1px solid ${THEME.border}`,
          cursor: isPendingSetTransaction ? "not-allowed" : "pointer", 
          display: "flex", alignItems: "center", justifyContent: "center", gap: 4,
          borderRadius: THEME.borderRadius,
          transition: "color 0.15s, background 0.15s",
          opacity: isPendingSetTransaction ? 0.5 : 1,
        }}
        onMouseEnter={(e) => {
          if (!isPendingSetTransaction) {
            (e.currentTarget as HTMLButtonElement).style.color = THEME.textPrimary;
            (e.currentTarget as HTMLButtonElement).style.background = THEME.surface3;
          }
        }}
        onMouseLeave={(e) => {
          if (!isPendingSetTransaction) {
            (e.currentTarget as HTMLButtonElement).style.color = THEME.textGhost;
            (e.currentTarget as HTMLButtonElement).style.background = "transparent";
          }
        }}
      >
        {isPendingSetTransaction ? (
          <>⋯ Saving...</>
        ) : (
          <>
            <PlusIcon /> Add Set
          </>
        )}
      </button>
    </div>
  );
});

// ============================================================
// 5. EXERCISE LIBRARY MODAL
// Shown when the user clicks "+ Add Exercise".
// Searches the exercises table in real time.
// ============================================================
// ============================================================
// 5. PROGRESS MATRIX & LINE CHART
// ============================================================

function ProgressMatrixView({ refreshKey, onNavigate }: { refreshKey: number; onNavigate: (tab: "dashboard" | "logger" | "progress" | "library") => void }) {
  const [data, setData] = useState<ExerciseProgress[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let hasCache = false;
    // 1. Instantly load from IndexedDB
    getData(STORES.STATS, "historical_progress").then((cached) => {
      if (cached) {
        setData((cached as any).data);
        hasCache = true;
        setLoading(false);
      }
    }).catch(() => { });

    // 2. Fetch fresh data from server
    if (typeof navigator !== "undefined" && navigator.onLine) {
      getHistoricalProgress().then((res) => {
        setData(res);
        setLoading(false);
        putData(STORES.STATS, { id: "historical_progress", data: res }).catch(() => { });
      }).catch(() => { if (!hasCache) setLoading(false); });
    } else {
      if (!hasCache) setLoading(false);
    }
  }, [refreshKey]);

  if (loading && data.length === 0) return <div style={{ padding: 40, textAlign: "center", ...monoLabel(12) }}>Analyzing history...</div>;

  if (data.length === 0) {
    return (
      <div style={{
        padding: "80px 20px", textAlign: "center",
        border: `1px dashed ${THEME.border}`,
        borderRadius: THEME.borderRadius,
        background: "rgba(163,230,53,0.01)"
      }}>
        <div style={{ marginBottom: 20, opacity: 0.4 }}>
          <ActivityIcon />
        </div>
        <h2 style={brandLabel(20, THEME.textPrimary)}>Strength Engine Offline</h2>
        <p style={{ ...monoLabel(11, THEME.textMuted), maxWidth: 420, margin: "14px auto", lineHeight: 1.6 }}>
          Your performance matrices are currently empty. These graphs track your weight and rep progress over time.
          To see your strength trends, start a session and log completed exercises.
        </p>
        <button
          onClick={() => onNavigate("logger")}
          style={{
            ...monoLabel(11, THEME.black),
            background: THEME.lime,
            border: "none",
            padding: "10px 28px",
            cursor: "pointer",
            marginTop: 18,
            fontWeight: 900,
            textTransform: "uppercase"
          }}
        >
          START FIRST SESSION
        </button>
      </div>
    );
  }

  const upper = data.filter(d => d.category === "Upper");
  const lower = data.filter(d => d.category === "Lower");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
      <section>
        <h2 style={{ ...brandLabel(12, THEME.textPrimary), marginBottom: 16, borderLeft: `3px solid ${THEME.lime}`, paddingLeft: 12, fontSize: "clamp(10px, 2vw, 14px)" }}>
          Upper Body Performance Matrix
        </h2>
        <LineChart data={upper} />
      </section>

      <section>
        <h2 style={{ ...brandLabel(12, THEME.textPrimary), marginBottom: 16, borderLeft: `3px solid ${THEME.lime}`, paddingLeft: 12, fontSize: "clamp(10px, 2vw, 14px)" }}>
          Lower Body Performance Matrix
        </h2>
        <LineChart data={lower} />
      </section>

      <div style={{ marginTop: 20, textAlign: "center", borderTop: `1px solid ${THEME.border}`, paddingTop: 20 }}>
        <p style={monoLabel(9, THEME.textGhost)}>Metric: Intensity Balanced — Weight + (Reps / 3)</p>
      </div>
    </div>
  );
}

function LineChart({ data }: { data: ExerciseProgress[] }) {
  const [hoveredEx, setHoveredEx] = useState<string | null>(null);
  const [lockedEx, setLockedEx] = useState<string | null>(null);
  const [removedExs, setRemovedExs] = useState<string[]>([]);
  const [confirmDelete, setConfirmDelete] = useState<{ id: string, name: string } | null>(null);
  const [tooltip, setTooltip] = useState<{ x: number, y: number, text: string } | null>(null);

  if (data.length === 0) return (
    <div style={{ ...cardStyle, width: "100%", maxWidth: "100%", margin: "0 auto", overflowX: "hidden" }}>
      <div style={{ padding: 40, textAlign: "center", ...monoLabel(10, THEME.textDim) }}>
        No data captured for this kinetic chain.
      </div>
    </div>
  );

  // 1. Find all shared dates for the X-axis
  const allDates = Array.from(new Set(data.flatMap(d => d.points.map(p => p.date)))).sort();
  const dateMap = Object.fromEntries(allDates.map((d, i) => [d, i]));
  const xMax = Math.max(allDates.length - 1, 1);

  // 2. Process data for baseline visualization & breaks
  const filteredData = data.filter(ex => !removedExs.includes(ex.exerciseId));

  const processedData = filteredData.map(ex => {
    // Sort points chronologically
    const sortedPoints = [...ex.points].sort((a, b) => a.date.localeCompare(b.date));
    const initialScore = sortedPoints.length > 0 ? sortedPoints[0].score : 0;

    // Simply connect the actual data points
    const timelinePoints = sortedPoints.map(p => ({
      date: p.date,
      relativeScore: p.score - initialScore,
      weight: p.weight,
      reps: p.reps
    }));

    const lastPoint = sortedPoints[sortedPoints.length - 1];

    return {
      ...ex,
      timelinePoints,
      initialStats: { weight: sortedPoints[0]?.weight ?? 0, reps: sortedPoints[0]?.reps ?? 0 },
      latestStats: { weight: lastPoint?.weight ?? 0, reps: lastPoint?.reps ?? 0 },
      totalProgress: lastPoint ? lastPoint.score - initialScore : 0
    };
  });

  // 3. Find global min/max relative score for Y-axis scale
  const allRelScores = processedData.flatMap(d => d.timelinePoints.map(p => p.relativeScore));
  const maxRelScore = Math.max(...allRelScores, 0.1);
  const minRelScore = Math.min(...allRelScores, 0); // User wants 0 as baseline bottom

  const W = 360; // Shortened from 800 to fit mobile better and tighten the graph
  const H = 260; // Slightly shorter height to match proportion
  const P = 40; // padding

  const getX = (dateIndex: number) => P + (dateIndex / xMax) * (W - 2 * P);
  const getY = (relScore: number) => (H - P) - ((relScore - minRelScore) / (maxRelScore - minRelScore)) * (H - 2 * P);

  const getExerciseColor = (name: string) => {
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return THEME.chartPalette[Math.abs(hash) % THEME.chartPalette.length];
  };

  const activeExId = lockedEx || hoveredEx;
  const activeExData = processedData.find(d => d.exerciseId === activeExId);

  return (
    <div style={{ ...cardStyle, padding: "24px 16px 16px", width: "95%", maxWidth: "100%", margin: "0 auto", overflowX: "hidden" }}>
      {/* Search/Stats Overlay when an exercise is selected */}
      {/* Wrapper fixed height prevents layout shift glitch on hover */}
      <div style={{ minHeight: 64, marginBottom: 16 }}>
        {activeExId && activeExData && (
          <div style={{
            paddingBottom: 12, borderBottom: `1px dashed ${THEME.border}`,
            display: "flex", justifyContent: "space-between", alignItems: "flex-end",
            height: "100%"
          }}>
            <div>
              <div style={{ ...monoLabel(9, THEME.lime), textTransform: "uppercase", letterSpacing: "0.1em" }}>
                Active Focus: {activeExData.exerciseName}
              </div>
              <div style={{ display: "flex", gap: 20, marginTop: 4 }}>
                <div>
                  <span style={monoLabel(8, THEME.textGhost)}>START</span>
                  <div style={monoLabel(11, THEME.textPrimary)}>{activeExData.initialStats.weight}kg x {activeExData.initialStats.reps}</div>
                </div>
                <div>
                  <span style={monoLabel(8, THEME.textGhost)}>LATEST</span>
                  <div style={monoLabel(11, THEME.textPrimary)}>{activeExData.latestStats.weight}kg x {activeExData.latestStats.reps}</div>
                </div>
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <span style={monoLabel(8, THEME.textGhost)}>NET PROGRESS</span>
              <div style={{
                fontSize: 18, fontWeight: 900, color: activeExData.totalProgress >= 0 ? THEME.lime : THEME.danger,
                fontFamily: THEME.fontMono
              }}>
                {activeExData.totalProgress >= 0 ? "+" : ""}{activeExData.totalProgress.toFixed(2)}
              </div>
            </div>
          </div>
        )}
      </div>

      <div style={{ position: "relative", width: "95%", maxWidth: "100%", margin: "0 auto", overflowX: "hidden" }}>
        <svg width="100%" height="auto" viewBox={`0 0 ${W} ${H}`} style={{ display: "block" }} role="img" aria-label="Exercise progress line chart">
          {/* Grid Lines */}
          <line x1={P} y1={H - P} x2={W - P} y2={H - P} stroke={THEME.border} />
          {/* Baseline Indicator */}
          <line x1={P} y1={getY(0)} x2={W - P} y2={getY(0)} stroke={THEME.border} strokeDasharray="4 4" opacity={0.3} />

          <line x1={P} y1={P} x2={P} y2={H - P} stroke={THEME.border} />

          {/* Lines */}
          {processedData.map((ex) => {
            const color = getExerciseColor(ex.exerciseName);
            const isActive = activeExId === ex.exerciseId;
            const isVisible = !lockedEx || isActive;

            if (!isVisible) return null;

            return (
              <g
                key={ex.exerciseId}
                style={{ opacity: activeExId && !isActive ? 0.1 : 1, transition: "opacity 0.2s" }}
              >
                <polyline
                  points={ex.timelinePoints.map((p, i) => {
                    // Use local point index normalized to the global time window size (xMax)
                    // or simply normalize to 0...1 based on its own length? 
                    // To make them all "start from the corner" and end at the same place, 
                    // we usually normalize by its own length. 
                    // But if they have different number of points, they might look stretched. 
                    // The user said "start from the corner", so I will use (i / (ex.timelinePoints.length - 1))
                    const localX = ex.timelinePoints.length > 1 ? (i / (ex.timelinePoints.length - 1)) * xMax : 0;
                    return `${getX(localX)},${getY(p.relativeScore)}`;
                  }).join(" ")}
                  fill="none"
                  stroke={color}
                  strokeWidth={isActive ? 3 : 1.5}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />

                {ex.timelinePoints.map((p, i) => {
                  const localX = ex.timelinePoints.length > 1 ? (i / (ex.timelinePoints.length - 1)) * xMax : 0;
                  const x = getX(localX);
                  const y = getY(p.relativeScore);
                  return (
                    <circle
                      key={i}
                      cx={x}
                      cy={y}
                      r={isActive ? 5 : 3}
                      fill={color}
                      style={{ cursor: "pointer", pointerEvents: "all" }}
                      onTouchStart={() => {
                        setLockedEx(lockedEx === ex.exerciseId ? null : ex.exerciseId);
                        setTooltip({ x, y, text: `${p.weight}kg x ${p.reps}` });
                      }}
                      onMouseEnter={() => {
                        setHoveredEx(ex.exerciseId);
                        setTooltip({ x, y, text: `${p.weight}kg x ${p.reps}` });
                      }}
                      onMouseLeave={() => {
                        setHoveredEx(null);
                        setTooltip(null);
                      }}
                      onClick={() => {
                        setLockedEx(lockedEx === ex.exerciseId ? null : ex.exerciseId);
                        setTooltip({ x, y, text: `${p.weight}kg x ${p.reps}` });
                      }}
                    />
                  );
                })}
              </g>
            );
          })}
        </svg>

        {/* Hover Tooltip Rendered over SVG */}
        {tooltip && (
          <div style={{
            position: "absolute",
            left: `${Math.min(Math.max((tooltip.x / W) * 100, 5), 95)}%`,
            top: `${Math.min(Math.max((tooltip.y / H) * 100, 5), 95)}%`,
            transform: "translate(-50%, -100%)",
            marginTop: -8, // Add some offset above the cursor
            background: THEME.surface,
            border: `1px solid ${THEME.lime}`,
            color: THEME.textPrimary,
            padding: "4px 8px",
            borderRadius: 4,
            ...monoLabel(10),
            pointerEvents: "none",
            whiteSpace: "nowrap",
            zIndex: 10,
            boxShadow: "var(--glow-primary)",
          }}>
            {tooltip.text}
          </div>
        )}

        {/* Legend */}
        <div style={{
          marginTop: 20,
          display: "flex",
          flexWrap: "wrap",
          gap: 12,
          padding: "0 10px",
          overflowY: "auto",
          maxHeight: processedData.length > 5 ? 160 : "none",
          paddingRight: processedData.length > 5 ? 4 : 10,
        }}>
          {processedData.map((ex) => {
            const color = getExerciseColor(ex.exerciseName);
            const isLocked = lockedEx === ex.exerciseId;
            const isActive = activeExId === ex.exerciseId;

            return (
              <button
                key={ex.exerciseId}
                onClick={() => setLockedEx(isLocked ? null : ex.exerciseId)}
                onMouseEnter={() => setHoveredEx(ex.exerciseId)}
                onMouseLeave={() => setHoveredEx(null)}
                style={{
                  background: isLocked ? `${color}22` : "transparent",
                  border: `1px solid ${isLocked ? color : THEME.border2}`,
                  padding: "6px 4px 6px 10px", borderRadius: THEME.borderRadius, cursor: "pointer",
                  display: "flex", alignItems: "center", gap: 8, transition: "all 0.2s",
                  opacity: lockedEx && !isLocked ? 0.3 : 1
                }}
              >
                <div style={{ width: 8, height: 8, background: color, borderRadius: "50%" }} />
                <span style={{
                  ...monoLabel(9, isLocked ? THEME.textPrimary : THEME.textMuted),
                  textTransform: "uppercase"
                }}>
                  {ex.exerciseName}
                </span>
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    setConfirmDelete({ id: ex.exerciseId, name: ex.exerciseName });
                  }}
                  style={{
                    padding: 4, visibility: isLocked ? "visible" : "hidden",
                    opacity: 0.6, color: THEME.danger
                  }}
                >
                  <TrashIcon />
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Confirmation Modal */}
      {confirmDelete && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          background: "rgba(0,0,0,0.8)", backdropFilter: "blur(4px)",
          display: "flex", alignItems: "center", justifyContent: "center",
          zIndex: 1000
        }}>
          <div style={{ ...cardStyle, maxWidth: 320, width: "90%", padding: 24, textAlign: "center" }}>
            <h3 style={{ ...brandLabel(14, THEME.textPrimary), marginBottom: 12 }}>Remove Exercise?</h3>
            <p style={{ ...monoLabel(10, THEME.textMuted), marginBottom: 24 }}>
              Are you sure you want to remove "{confirmDelete.name}" from the graph visualization?
            </p>
            <div style={{ display: "flex", gap: 12 }}>
              <button
                onClick={() => setConfirmDelete(null)}
                style={{ ...brandButton, flex: 1, background: THEME.surface, border: `1px solid ${THEME.border}`, color: THEME.textPrimary }}
              >
                CANCEL
              </button>
              <button
                onClick={() => {
                  setRemovedExs(prev => [...prev, confirmDelete.id]);
                  setConfirmDelete(null);
                  setLockedEx(null);
                }}
                style={{ ...brandButton, flex: 1, background: THEME.danger, color: THEME.textPrimary }}
              >
                REMOVE
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

type ExerciseLibraryModalProps = {
  onSelect: (id: string) => Promise<void> | void;
  onClose: () => void;
  title?: string;
  isPage?: boolean;
  libTab: "general" | "personal";
  setLibTab: (tab: "general" | "personal") => void;
  onExerciseCreated?: (ex: ExerciseData) => void;
};

function ExerciseLibraryModal({
  onSelect,
  onClose,
  title = "Select Exercise",
  isPage = false,
  libTab,
  setLibTab,
  onExerciseCreated,
}: ExerciseLibraryModalProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ExerciseData[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [allExercises, setAllExercises] = useState<ExerciseData[]>([]); // Added for caching

  // Creation sub-steps: "search" | "select-muscle" | "custom-muscle"
  const [step, setStep] = useState<"search" | "select-muscle" | "custom-muscle">("search");
  const [customMuscle, setCustomMuscle] = useState("");

  const MUSCLES = ["Chest", "Back", "Shoulders", "Traps", "Quadriceps", "Hamstrings", "Calves", "Biceps", "Triceps", "Abs", "Glutes", "Legs", "Forearms"];

  // ── Swipe between General / Personal ─────────────────────────
  const libTouchStartRef = useRef<number | null>(null);
  const libTouchEndRef = useRef<number | null>(null);
  const handleLibSwipe = () => {
    if (!libTouchStartRef.current || !libTouchEndRef.current) return;
    const distance = libTouchStartRef.current - libTouchEndRef.current;
    
    // Swipe left: general -> personal
    if (distance > 60 && libTab === "general") {
      setLibTab("personal");
    }
    // Swipe right: personal -> general
    else if (distance < -60 && libTab === "personal") {
      setLibTab("general");
    }
    
    libTouchStartRef.current = null;
    libTouchEndRef.current = null;
  };

  // Fetch library initially
  useEffect(() => {
    // 1. Instantly load from IndexedDB
    getData(STORES.EXERCISES, "library_cache").then((cached) => {
      if (cached && !query) {
        // We need to ensure results is updated too if currently showing library
        setResults((cached as any).data);
        setAllExercises((cached as any).data); // Ensure allExercises is also populated from cache
        setLoading(false);
      }
    }).catch(() => { });
  }, []);

  // Re-run search whenever the query or libTab changes
  useEffect(() => {
    // Provide instant UI feedback when switching to "personal" tab
    if (libTab === "personal" && !query) {
      setResults([]);
      setLoading(true);
    }
    
    const t = setTimeout(async () => {
      if (!query) {
        // FIXED: Empty query guard - return ALL exercises instead of empty array
        if (libTab === "general") {
          // If we already have the full list cached in memory, show it instantly
          if (allExercises.length > 0) {
            setResults(allExercises);
            // Background refresh from server
            getGeneralExercises().then((all) => {
              setResults(all);
              setAllExercises(all);
              putData(STORES.EXERCISES, { id: "library_cache", data: all }).catch(() => { });
            }).catch(() => { });
            setLoading(false); // FIXED: Ensure loading state is reset
            return;
          }
          setLoading(true);
          try {
            const all = await getGeneralExercises();
            setResults(all);
            setAllExercises(all);
            putData(STORES.EXERCISES, { id: "library_cache", data: all }).catch(() => { });
          } catch (e) {
            console.error("Failed to load general exercises:", e);
            setResults([]); // FIXED: Don't leave undefined
          } finally {
            setLoading(false); // FIXED: Ensure loading is always reset
          }
        } else {
          setLoading(true);
          try {
            const personal = await getPersonalExercises();
            setResults(personal);
          } catch (e) {
            console.error("Failed to load personal exercises:", e);
            setResults([]); // FIXED: Don't leave undefined
          } finally {
            setLoading(false); // FIXED: Ensure loading is always reset
          }
        }
      } else {
        // Query typed: use client-side filtering if we have the full list
        if (allExercises.length > 0 && libTab === "general") {
          const q = query.toLowerCase();
          const filtered = allExercises.filter(
            (ex) =>
              // FIXED: Added null checks to prevent vanishing cards
              (ex.name && ex.name.toLowerCase().includes(q)) ||
              (ex.primaryMuscle && ex.primaryMuscle.toLowerCase().includes(q))
          );
          setResults(filtered);
          setLoading(false); // FIXED: Ensure loading is reset
          return;
        }
        // Fallback to server search
        setLoading(true);
        try {
          const res = await searchExercises(query);
          setResults(res);
        } catch (e) {
          console.error("Search failed:", e);
          setResults([]); // FIXED: Ensure results don't disappear on error
        } finally {
          setLoading(false); // FIXED: Ensure loading is always reset
        }
      }
      setLoading(false);
    }, 150); // reduced debounce since client-side filtering is instant
    return () => clearTimeout(t);
  }, [query, libTab]);

  const exactMatchExists = results.some(
    (r) => r.name.toLowerCase().trim() === query.toLowerCase().trim()
  );

  const handleCreate = async (muscleName: string) => {
    if (!query.trim() || creating) return;
    setCreating(true);
    try {
      const id = await createLoggableExercise(query.trim(), muscleName);
      const newEx: ExerciseData = {
        id,
        name: query.trim(),
        primaryMuscle: muscleName,
        secondaryMuscle: null,
        mechanics: "Custom",
      };
      if (onExerciseCreated) onExerciseCreated(newEx);
      await onSelect(id);
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setCreating(false);
    }
  };

  const renderLibraryContent = () => (
    <>
      {/* Results list or Muscle Selection Grid */}
      <div style={{ overflowY: "auto", flex: 1 }}>
        {step === "search" && (
          <>
            {loading && results.length === 0 && (
              <div style={{ padding: "8px 14px", display: "flex", flexDirection: "column", gap: 8 }}>
                {[1, 2, 3].map((i) => (
                  <div key={i} style={{
                    height: 44, borderRadius: 8,
                    background: `linear-gradient(90deg, ${THEME.surface} 25%, ${THEME.surface3} 50%, ${THEME.surface} 75%)`,
                    backgroundSize: "200% 100%",
                    animation: "shimmer 1.5s infinite",
                  }} />
                ))}
                <style>{`@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }`}</style>
              </div>
            )}

            {/* Create Button */}
            {!loading && query.trim() !== "" && !exactMatchExists && (
              <button
                onClick={() => setStep("select-muscle")}
                disabled={creating}
                style={{
                  width: "100%", background: "rgba(163,230,53,0.05)", border: "none",
                  borderBottom: `1px dashed ${THEME.lime}`, padding: "11px 14px",
                  cursor: "pointer", textAlign: "left", display: "flex", alignItems: "center", gap: 12
                }}
              >
                <div style={{ width: 20, height: 20, borderRadius: 10, border: `1px solid ${THEME.lime}`, display: "flex", alignItems: "center", justifyContent: "center", color: THEME.lime }}>+</div>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", color: THEME.lime, letterSpacing: "-0.02em" }}>
                    Create "{query.trim()}"
                  </div>
                  <div style={monoLabel(9, THEME.limeHover)}>Assign muscle group next</div>
                </div>
              </button>
            )}

            {!loading && results.length === 0 && (
              <div style={{ padding: 16, textAlign: "center", ...monoLabel(10, THEME.textDim) }}>
                No exercises found. Type a name to create it.
              </div>
            )}
            {results.map((ex) => (
              <button
                key={ex.id}
                onClick={async () => {
                  await onSelect(ex.id);
                  onClose();
                }}
                style={{
                  width: "100%", background: "transparent", border: "none",
                  borderBottom: `1px solid ${THEME.border}`,
                  padding: "11px 14px", cursor: "pointer",
                  textAlign: "left", display: "flex",
                  justifyContent: "space-between", alignItems: "center",
                  borderRadius: THEME.borderRadius,
                  transition: "background 0.13s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = THEME.surface3)}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                <div>
                  <div style={{
                    fontSize: 12, fontWeight: 700,
                    textTransform: "uppercase", color: THEME.textPrimary,
                    letterSpacing: "-0.02em",
                  }}>
                    {ex.name}
                  </div>
                  <div style={{ ...monoLabel(9, THEME.textGhost), marginTop: 2 }}>
                    {ex.primaryMuscle} · {ex.mechanics}
                  </div>
                </div>
                <PlusIcon />
              </button>
            ))}
          </>
        )}

        {step === "select-muscle" && (
          <div style={{ padding: 16 }}>
            <p style={{ ...monoLabel(10, THEME.textPrimary), marginBottom: 16, textAlign: "center" }}>
              SELECT MUSCLE GROUP FOR "{query.trim()}"
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {MUSCLES.map(m => (
                <button
                  key={m}
                  onClick={() => handleCreate(m)}
                  style={{
                    background: THEME.surface3, border: `1px solid ${THEME.border}`,
                    color: THEME.textPrimary, padding: "10px", borderRadius: THEME.borderRadius,
                    cursor: "pointer", ...monoLabel(10), textAlign: "center",
                    transition: "all 0.15s"
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = THEME.lime; e.currentTarget.style.color = THEME.lime; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = THEME.border; e.currentTarget.style.color = THEME.textPrimary; }}
                >
                  {m}
                </button>
              ))}
            </div>
            <button
              onClick={() => setStep("custom-muscle")}
              style={{
                width: "100%", marginTop: 12, background: "transparent",
                border: `1px dashed ${THEME.textDim}`, color: THEME.textDim,
                padding: "10px", borderRadius: THEME.borderRadius, cursor: "pointer",
                ...monoLabel(10), transition: "all 0.15s"
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = THEME.textPrimary; e.currentTarget.style.color = THEME.textPrimary; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = THEME.textDim; e.currentTarget.style.color = THEME.textDim; }}
            >
              + ADD NEW MUSCLE GROUP
            </button>

            <button
              onClick={() => setStep("search")}
              style={{
                width: "100%", marginTop: 24, background: "transparent", border: "none",
                color: THEME.textGhost, ...monoLabel(9), cursor: "pointer", textDecoration: "underline"
              }}
            >
              BACK TO SEARCH
            </button>
          </div>
        )}

        {step === "custom-muscle" && (
          <div style={{ padding: 24, textAlign: "center" }}>
            <p style={{ ...monoLabel(10, THEME.textPrimary), marginBottom: 16 }}>
              ENTER NEW MUSCLE GROUP NAME
            </p>
            <input
              autoFocus
              value={customMuscle}
              onChange={(e) => setCustomMuscle(e.target.value)}
              placeholder="e.g. Obliques"
              onKeyDown={(e) => e.key === "Enter" && customMuscle.trim() && handleCreate(customMuscle.trim())}
              style={{
                width: "100%", background: "transparent", border: "none",
                borderBottom: `2.5px solid ${THEME.lime}`, padding: "8px 0",
                color: THEME.textPrimary, fontSize: 16, fontFamily: THEME.fontMono,
                textAlign: "center", outline: "none", marginBottom: 20
              }}
            />
            <button
              disabled={!customMuscle.trim() || creating}
              onClick={() => handleCreate(customMuscle.trim())}
              style={{
                width: "100%", background: THEME.lime, color: THEME.black,
                fontWeight: 900, padding: "12px", border: "none",
                borderRadius: THEME.borderRadius, cursor: "pointer",
                ...monoLabel(12, THEME.black)
              }}
            >
              {creating ? "CREATING..." : "CONFIRM & CREATE"}
            </button>
            <button
              onClick={() => setStep("select-muscle")}
              style={{
                width: "100%", marginTop: 16, background: "transparent", border: "none",
                color: THEME.textGhost, ...monoLabel(9), cursor: "pointer"
              }}
            >
              CANCEL
            </button>
          </div>
        )}
      </div>
    </>
  );

  if (isPage) {
    return (
      <div style={{
        background: THEME.surface,
        border: `1px solid ${THEME.border}`,
        borderRadius: THEME.borderRadius,
        width: "100%",
        display: "flex", flexDirection: "column",
        minHeight: "70vh",
      }}>
        {/* Page Content: Tabs + Search + Results */}
        <div style={{ padding: "20px 24px", borderBottom: `1px solid ${THEME.border}` }}>
          <h2 style={{ fontSize: 24, fontWeight: 900, textTransform: "uppercase", margin: "0 0 20px" }}>
            Exercise Library
          </h2>
          <div style={{ display: "flex", gap: 20 }}>
            {(["general", "personal"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setLibTab(t)}
                style={{
                  ...brandLabel(13, libTab === t ? THEME.lime : THEME.textGhost),
                  background: "transparent", border: "none",
                  borderBottom: `2px solid ${libTab === t ? THEME.lime : "transparent"}`,
                  padding: "0 0 10px", cursor: "pointer", marginBottom: -1,
                  transition: "color 0.2s, border-color 0.2s",
                }}
              >
                {t.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {step === "search" && (
          <div style={{ padding: "16px 24px", borderBottom: `1px solid ${THEME.border}`, background: "var(--card-header-bg)" }}>
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name or muscle group..."
              style={{
                width: "100%", background: "transparent", border: "none",
                fontSize: 15, color: THEME.textPrimary, fontFamily: THEME.fontSans,
                outline: "none",
              }}
            />
          </div>
        )}

        <div
          style={{ flex: 1, padding: "8px 0" }}
          onTouchStart={(e) => { libTouchEndRef.current = null; libTouchStartRef.current = e.touches[0].clientX; }}
          onTouchMove={(e) => { libTouchEndRef.current = e.touches[0].clientX; }}
          onTouchEnd={handleLibSwipe}
        >
          {renderLibraryContent()}
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0,
        background: "rgba(0,0,0,0.88)",
        zIndex: 50, display: "flex",
        alignItems: "center", justifyContent: "center",
        padding: 20,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: THEME.surfaceSolid,
          border: `1px solid ${THEME.border}`,
          borderRadius: THEME.borderRadius,
          width: "100%", maxWidth: 480,
          maxHeight: "85vh",
          display: "flex", flexDirection: "column",
          boxShadow: "var(--glow-primary)",
        }}>
        {/* Modal header & Tab switch */}
        <div style={{
          padding: "12px 14px 0",
          borderBottom: `1px solid ${THEME.border}`,
        }}>
          {/* Title */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
            <h2 style={{ fontSize: 18, fontWeight: 900, textTransform: "uppercase", fontStyle: "", margin: 0 }}>
              {title}
            </h2>
            <button
              onClick={onClose}
              style={{ background: "none", border: "none", color: THEME.textMuted, cursor: "pointer", ...monoLabel(14) }}
            >✕</button>
          </div>
          <div style={{ display: "flex", gap: 16 }}>
            {(["general", "personal"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setLibTab(t)}
                style={{
                  ...monoLabel(9, libTab === t ? THEME.lime : THEME.textGhost),
                  background: "transparent", border: "none", alignSelf: "flex-end",
                  borderBottom: `2px solid ${libTab === t ? THEME.lime : "transparent"}`,
                  padding: "0 0 8px", cursor: "pointer", marginBottom: -1,
                }}
              >
                {t.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Search input (only in search step) */}
        {step === "search" && (
          <div style={{ padding: "9px 14px", borderBottom: `1px solid ${THEME.border}` }}>
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name or muscle..."
              style={{
                width: "100%",
                background: "transparent", border: "none",
                borderBottom: `1.5px solid ${THEME.lime}`,
                borderRadius: THEME.borderRadius,
                color: THEME.textPrimary, fontSize: 13,
                fontFamily: THEME.fontMono, padding: "4px 0", outline: "none",
              }}
            />
          </div>
        )}

        {/* Results list or Muscle Selection Grid */}
        <div
          style={{ overflowY: "auto", flex: 1 }}
          onTouchStart={(e) => { libTouchEndRef.current = null; libTouchStartRef.current = e.touches[0].clientX; }}
          onTouchMove={(e) => { libTouchEndRef.current = e.touches[0].clientX; }}
          onTouchEnd={handleLibSwipe}
        >
          {renderLibraryContent()}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// SESSION DETAIL VIEW
// Read-only view of a past session's exercises and sets.
// ============================================================
function SessionDetailView({
  sessionId,
  onBack,
  btnTextColor,
}: {
  sessionId: string;
  onBack: () => void;
  btnTextColor: string;
}) {
  const [sessionData, setSessionData] = useState<WorkoutSessionData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getSessionDetail(sessionId)
      .then((data) => { setSessionData(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [sessionId]);

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString("en-GB", { weekday: "long", year: "numeric", month: "long", day: "2-digit" });

  if (loading) {
    return (
      <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.88)", zIndex: 60, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ ...monoLabel(12), color: THEME.textDim }}>Loading session...</div>
      </div>
    );
  }

  if (!sessionData) {
    return (
      <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.88)", zIndex: 60, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 16 }}>
        <div style={{ ...monoLabel(12), color: THEME.danger }}>Session not found</div>
        <button onClick={onBack} style={{ ...brandButton }}>BACK</button>
      </div>
    );
  }

  return (
    <div
      onClick={onBack}
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.88)", zIndex: 60, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ background: THEME.surface2, border: `1px solid ${THEME.border}`, borderRadius: THEME.borderRadius, width: "100%", maxWidth: 600, maxHeight: "85vh", display: "flex", flexDirection: "column" }}
      >
        {/* Header */}
        <div style={{ padding: "14px 18px", borderBottom: `1px solid ${THEME.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 900, textTransform: "uppercase", margin: 0 }}>{sessionData.name}</h2>
            <div style={{ ...monoLabel(9, THEME.lime), marginTop: 4 }}>{formatDate(sessionData.startTime)}</div>
          </div>
          <button onClick={onBack} style={{
            ...brandButton,
            padding: "6px 16px",
            display: "flex",
            alignItems: "center",
            gap: 6,
            color: btnTextColor,
          }}>
            ← BACK
          </button>
        </div>

        {/* Exercise list */}
        <div style={{ overflowY: "auto", flex: 1, padding: "12px 18px" }}>
          {sessionData.logs.length === 0 && (
            <div style={{ padding: 20, textAlign: "center", ...monoLabel(10, THEME.textDim) }}>No exercises in this session</div>
          )}
          {sessionData.logs.map((log) => (
            <div key={log.id} style={{ marginBottom: 16, border: `1px solid ${THEME.border}`, borderRadius: THEME.borderRadius, overflow: "hidden" }}>
              <div style={{ padding: "10px 14px", background: "var(--card-header-bg)", borderBottom: `1px solid ${THEME.border}` }}>
                <h3 style={{ fontSize: 13, fontWeight: 900, textTransform: "uppercase", margin: 0 }}>{log.exercise.name}</h3>
                <span style={{ ...monoLabel(9, THEME.textMuted), textTransform: "uppercase" }}>{log.exercise.mechanics} • {log.exercise.primaryMuscle}</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "40px repeat(4, 1fr)", padding: "6px 10px", gap: 6 }}>
                {["Set", "Weight", "Reps", "RPE", "RIR"].map((h) => (
                  <span key={h} style={{ ...monoLabel(8), textAlign: "center" }}>{h}</span>
                ))}
              </div>
              {log.sets.filter((s) => s.isCompleted).map((set) => (
                <div key={set.id} style={{ display: "grid", gridTemplateColumns: "40px repeat(4, 1fr)", padding: "5px 10px", gap: 6, borderTop: `1px solid ${THEME.border}`, background: THEME.doneBg }}>
                  <span style={{ ...monoLabel(11, THEME.textMuted), textAlign: "center" }}>{set.setNumber}</span>
                  <span style={{ ...monoLabel(11, THEME.textPrimary), textAlign: "center" }}>{set.weight}kg</span>
                  <span style={{ ...monoLabel(11, THEME.textPrimary), textAlign: "center" }}>{set.reps}</span>
                  <span style={{ ...monoLabel(11, THEME.textPrimary), textAlign: "center" }}>{set.rpe}</span>
                  <span style={{ ...monoLabel(11, THEME.textPrimary), textAlign: "center" }}>{set.rir}</span>
                </div>
              ))}
              {log.sets.filter((s) => s.isCompleted).length === 0 && (
                <div style={{ padding: "8px 14px", ...monoLabel(9, THEME.textGhost), textAlign: "center" }}>No completed sets</div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function PreviousSessionsModal({
  sessions, loading, onClose, onDelete, onViewDetail,
}: {
  sessions: PreviousSessionSummary[];
  loading: boolean;
  onClose: () => void;
  onDelete: (id: string) => void;
  onViewDetail: (id: string) => void;
}) {
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingIds, setDeletingIds] = useState<string[]>([]);

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString("en-GB", {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "2-digit",
    });
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.88)",
        zIndex: 60,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: THEME.surface2,
          border: `1px solid ${THEME.border}`,
          borderRadius: THEME.borderRadius,
          width: "100%",
          maxWidth: 400,
          minWidth: 280, // Safe for narrow mobile
          maxHeight: "78vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        <div
          style={{
            padding: "12px 14px",
            borderBottom: `1px solid ${THEME.border}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-start",
          }}
        >
          <h2
            style={{
              fontSize: 18,
              fontWeight: 900,
              textTransform: "uppercase",
              fontStyle: "",
              margin: 0,
            }}
          >
            Previous Sessions
          </h2>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              color: THEME.textMuted,
              cursor: "pointer",
              marginLeft: "auto",
              paddingLeft: 24,
              ...monoLabel(14),
            }}
          >
            ✕
          </button>
        </div>

        <div style={{ padding: 14, overflowY: "auto", flex: 1 }}>
          {loading ? (
            <div style={{ padding: 20, textAlign: "center", ...monoLabel(10, THEME.textDim) }}>
              Loading sessions...
            </div>
          ) : sessions.length === 0 ? (
            <div style={{ padding: 20, textAlign: "center", ...monoLabel(10, THEME.textDim) }}>
              No previous sessions found
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column" }}>
              {sessions.filter(s => !deletingIds.includes(s.id)).map((s) => (
                <div key={s.id}>
                  <div
                    onClick={() => onViewDetail(s.id)}
                    style={{
                      padding: "12px 10px",
                      borderBottom: confirmDeleteId === s.id ? "none" : `1px solid ${THEME.surface3}`,
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 12,
                      cursor: "pointer",
                      transition: "background 0.13s",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = THEME.surface3)}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    <div>
                      <div style={{ ...monoLabel(9, THEME.lime) }}>{formatDate(s.startTime)}</div>
                      <div style={{ ...monoLabel(10, THEME.textPrimary), marginTop: 3, textTransform: "none" }}>
                        {s.name}
                      </div>
                    </div>
                    <div style={{ textAlign: "right", display: "flex", alignItems: "center", gap: 14 }}>
                      <div>
                        <div style={{ ...monoLabel(9, THEME.textGhost) }}>
                          {s.logCount} exercises
                        </div>
                        <div style={{ ...monoLabel(9, THEME.textGhost) }}>
                          {s.completedSetCount} completed sets
                        </div>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(confirmDeleteId === s.id ? null : s.id); }}
                        style={{
                          background: "none",
                          border: "none",
                          color: confirmDeleteId === s.id ? THEME.danger : THEME.textGhost,
                          cursor: "pointer",
                          padding: 4,
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.color = THEME.danger)}
                        onMouseLeave={(e) => {
                          if (confirmDeleteId !== s.id) e.currentTarget.style.color = THEME.textGhost;
                        }}
                      >
                        <TrashIcon />
                      </button>
                    </div>
                  </div>

                  {/* Inline delete confirmation */}
                  {confirmDeleteId === s.id && (
                    <div style={{
                      padding: "10px 14px",
                      background: THEME.dangerBg,
                      borderBottom: `1px solid ${THEME.surface3}`,
                      borderLeft: `3px solid ${THEME.danger}`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 12,
                    }}>
                      <span style={{ ...monoLabel(10, THEME.danger) }}>
                        Are you sure you want to delete session?
                      </span>
                      <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                        <button
                          onClick={() => {
                            setDeletingIds(prev => [...prev, s.id]);
                            onDelete(s.id);
                            setConfirmDeleteId(null);
                          }}
                          style={{
                            background: THEME.danger,
                            border: "none",
                            color: "#000",
                            padding: "4px 14px",
                            cursor: "pointer",
                            ...monoLabel(10, "#000"),
                            fontWeight: 900,
                          }}
                        >
                          YES
                        </button>
                        <button
                          onClick={() => setConfirmDeleteId(null)}
                          style={{
                            background: "transparent",
                            border: `1px solid ${THEME.border2}`,
                            color: THEME.textGhost,
                            padding: "4px 14px",
                            cursor: "pointer",
                            ...monoLabel(10, THEME.textGhost),
                          }}
                        >
                          NO
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ padding: 14, borderTop: `1px solid ${THEME.border}`, textAlign: "right" }}>
          <button
            onClick={onClose}
            style={{
              background: "transparent",
              border: `1px solid ${THEME.border2}`,
              color: THEME.textGhost,
              padding: "6px 12px",
              cursor: "pointer",
              ...monoLabel(10, THEME.textGhost),
            }}
          >
            CLOSE
          </button>
        </div>
      </div>
    </div>
  );
}

// ── VAULT SKELETON: Transactional Guard UI ─────────────────────
// [SENIOR ENGINEER AUDIT — PESSIMISTIC EXERCISE CREATION]
// OLD RISK: Optimistic exercise creation would render a card with a temp ID
// immediately. If the user typed data into it before the server returned,
// those edits would be lost (writing against a non-existent log ID).
// FIX: While `pendingTx` is active, we show this skeleton placeholder
// instead of a real exercise card. The server must confirm before the
// real ExerciseCard renders. This prevents:
//   1. Duplicate exercises from double-clicks
//   2. Data loss from typing into orphaned temp IDs
//   3. State corruption from race conditions between temp and real IDs
const VaultSkeleton = React.memo(function VaultSkeleton() {
  return (
    <>
      {/* Keyframe animations for skeleton */}
      <style>{`
        @keyframes vault-spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes vault-pulse {
          0%, 100% { opacity: 0.5; }
          50% { opacity: 1; }
        }
        @keyframes vault-shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
      <div style={{
        ...cardStyle,
        width: "100%",
        maxWidth: "100%",
        marginBottom: 14,
        overflowX: "hidden",
        background: "var(--surface, rgba(30,30,30,0.6))",
        border: `1.5px solid var(--accent-color)`,
        boxShadow: "var(--glow-primary)",
      }}>
        {/* Shimmer header bar — mimics exercise card header */}
        <div style={{
          padding: "16px 16px 12px",
          borderBottom: `1px solid var(--border)`,
          display: "flex",
          alignItems: "center",
          gap: 12,
        }}>
          <div style={{
            width: 120,
            height: 14,
            borderRadius: 4,
            background: `linear-gradient(90deg, var(--surface) 25%, var(--surface-hover) 50%, var(--surface) 75%)`,
            backgroundSize: "200% 100%",
            animation: "vault-shimmer 1.5s infinite",
          }} />
          <div style={{
            width: 80,
            height: 10,
            borderRadius: 4,
            background: `linear-gradient(90deg, var(--surface) 25%, var(--surface-hover) 50%, var(--surface) 75%)`,
            backgroundSize: "200% 100%",
            animation: "vault-shimmer 1.5s infinite 0.2s",
          }} />
        </div>

        {/* Centered spinner + status */}
        <div style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100px",
          gap: 14,
          padding: "20px 16px",
        }}>
          {/* CSS-only spinner ring */}
          <div style={{
            width: 28,
            height: 28,
            border: `2.5px solid var(--border)`,
            borderTop: `2.5px solid var(--accent-color)`,
            borderRadius: "50%",
            animation: "vault-spin 0.8s linear infinite",
          }} />

          <div style={{
            ...monoLabel(9, THEME.textMuted),
            letterSpacing: "0.12em",
            textAlign: "center",
            animation: "vault-pulse 1.5s ease-in-out infinite",
          }}>
            SYNCING EXERCISE...
          </div>
        </div>

        {/* Shimmer set rows — mimics the input grid */}
        <div style={{ padding: "6px 8px", borderTop: `1px solid var(--border)` }}>
          {[1, 2].map(i => (
            <div key={i} style={{
              display: "grid",
              gridTemplateColumns: "20px 1fr 60px",
              alignItems: "center",
              padding: "6px 8px",
              gap: 8,
            }}>
              <div style={{
                width: 14, height: 14, borderRadius: 4,
                background: `linear-gradient(90deg, var(--surface) 25%, var(--surface-hover) 50%, var(--surface) 75%)`,
                backgroundSize: "200% 100%",
                animation: `vault-shimmer 1.5s infinite ${i * 0.1}s`,
              }} />
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 6 }}>
                {[1,2,3,4].map(j => (
                  <div key={j} style={{
                    height: 28, borderRadius: 6,
                    background: `linear-gradient(90deg, var(--surface) 25%, var(--surface-hover) 50%, var(--surface) 75%)`,
                    backgroundSize: "200% 100%",
                    animation: `vault-shimmer 1.5s infinite ${(i * 4 + j) * 0.08}s`,
                  }} />
                ))}
              </div>
              <div style={{
                width: 24, height: 24, borderRadius: 8,
                background: `linear-gradient(90deg, var(--surface) 25%, var(--surface-hover) 50%, var(--surface) 75%)`,
                backgroundSize: "200% 100%",
                animation: `vault-shimmer 1.5s infinite ${i * 0.15}s`,
                marginLeft: "auto",
              }} />
            </div>
          ))}
        </div>
      </div>
    </>
  );
});

// ============================================================
// 6. MAIN PAGE COMPONENT
// This is the top-level component that renders the whole page.
// It manages the big-picture state: active session, stats, tabs.
// ============================================================
export default function RepLogPage() {
  // ── Page state ───────────────────────────────────────────────
  // activeTab: controls which section is visible
  const [activeTab, setActiveTab] = useState<"dashboard" | "logger" | "progress" | "library">("dashboard");
  // session: the current workout session data (null = no active session)
  const [session, setSession] = useState<WorkoutSessionData | null>(null);
  // stats: dashboard numbers fetched from the DB
  const [stats, setStats] = useState<DashboardStats | null>(null);
  // showRestTimer: user preference for the timer
  const [showRestTimer, setShowRestTimer] = useState(true);
  // showLibrary: whether the exercise picker modal is open
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
  const [swapTargetLogId, setSwapTargetLogId] = useState<string | null>(null);
  // loading states for async actions
  const [sessionLoading, setSessionLoading] = useState(false);
  const [statsLoading, setStatsLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [showPreviousSessions, setShowPreviousSessions] = useState(false);
  const [previousSessions, setPreviousSessions] = useState<PreviousSessionSummary[]>([]);
  const [previousSessionsLoading, setPreviousSessionsLoading] = useState(false);
  const [progressRefreshKey, setProgressRefreshKey] = useState(0);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [activeBarIndex, setActiveBarIndex] = useState<number | null>(null);
  const [barDismissTimer, setBarDismissTimer] = useState<ReturnType<typeof setTimeout> | null>(null);
  const [libTab, setLibTab] = useState<"general" | "personal">("general");
  const lastStatsFetchRef = useRef<number>(0);
  const statsRefreshDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const liftedExercisesRef = useRef<ExerciseData[]>([]);
  const newLogIdRef = useRef<string | null>(null);

  // ── PESSIMISTIC TRANSACTIONAL GUARD ────────────────────────────
  // [SENIOR ENGINEER AUDIT]
  // OLD RISK: Optimistic exercise creation allowed the user to interact with
  // a phantom card backed by a temp ID. Any field edits during that window
  // wrote to a non-existent DB row and were silently lost.
  // FIX: `pendingTx` acts as a UI lock. While non-null, a VaultSkeleton
  // replaces the "Add Exercise" slot, and all add-exercise actions are blocked.
  // The lock is released only after the server confirms the new log ID.
  const [pendingTx, setPendingTx] = useState<{ id: string; timestamp: number } | null>(null);

  // ── Swipe Navigation for Mobile ──────────────────────────────
  // Detects horizontal swipes to switch between Dashboard, Logger, Progress, Library
  const touchStartRef = useRef<number | null>(null);
  const touchEndRef = useRef<number | null>(null);
  const minSwipeDistance = 110; // min pixels to trigger a swipe

  useEffect(() => {
    const onTouchStart = (e: TouchEvent) => {
      touchEndRef.current = null;
      touchStartRef.current = e.targetTouches[0].clientX;
    };

    const onTouchMove = (e: TouchEvent) => {
      touchEndRef.current = e.targetTouches[0].clientX;
    };

    const onTouchEnd = () => {
      if (activeTab === "library") {
        if (!touchStartRef.current || !touchEndRef.current) return;
        const distance = touchStartRef.current - touchEndRef.current;
        const isLeftSwipe = distance > minSwipeDistance;
        const isRightSwipe = distance < -minSwipeDistance;

        if (isLeftSwipe) {
          // Left swipe: General → Personal, Personal → do nothing
          if (libTab === "general") setLibTab("personal");
          // if already on personal, do nothing
        } else if (isRightSwipe) {
          // Right swipe: Personal → General, General → exit to Progress
          if (libTab === "personal") setLibTab("general");
          else if (libTab === "general") setActiveTab("progress");
        }
        return; // Always return early — never fall through to the global handler
      }
      if (!touchStartRef.current || !touchEndRef.current) return;

      const distance = touchStartRef.current - touchEndRef.current;
      const isLeftSwipe = distance > minSwipeDistance;
      const isRightSwipe = distance < -minSwipeDistance;

      if (isLeftSwipe || isRightSwipe) {
        const tabs: ("dashboard" | "logger" | "progress" | "library")[] = ["dashboard", "logger", "progress", "library"];
        const currentIndex = tabs.indexOf(activeTab);

        // Left swipe: move to next tab
        if (isLeftSwipe && currentIndex < tabs.length - 1) {
          setActiveTab(tabs[currentIndex + 1]);
        } else if (isRightSwipe && currentIndex > 0) {
          // Right swipe: move to previous tab, with special case for Progress → Logger
          if (activeTab === "progress") {
            setActiveTab("logger"); // Allow Progress → Logger specifically
          } else {
            setActiveTab(tabs[currentIndex - 1]); // Normal right swipe behavior
          }
        }
      }
    };

    window.addEventListener("touchstart", onTouchStart);
    window.addEventListener("touchmove", onTouchMove);
    window.addEventListener("touchend", onTouchEnd);

    return () => {
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, [activeTab, libTab]);
  const { accentColor, setAccentColor, mode, toggleMode, ACCENTS } = useTheme();
  const startBtnTextColor = accentColor.toLowerCase() === "#ffffff" ? "#000000" : "#ffffff";
  const [isThemeMenuOpen, setIsThemeMenuOpen] = useState(false);
  const [isHamburgerOpen, setIsHamburgerOpen] = useState(false);

  const { data: authSession } = useSession();
  const userName = authSession?.user?.name?.split(" ")[0] || "Athlete";
  const userEmail = authSession?.user?.email || "";

  // Helper for dynamic text color based on accent color
  const accentIsDark = ["#000000", "#000", "#1e293b", "#334155", "#64748b", "#475569"].some(
    dark => accentColor.toLowerCase() === dark.toLowerCase()
  );
  const sessionBtnTextColor = accentIsDark ? "#ffffff" : "#000000";

  // ── Data Isolation: clear local caches when user changes ───
  useEffect(() => {
    const currentUserId = authSession?.user?.email;
    if (!currentUserId) return;
    const lastUserId = localStorage.getItem("replog_last_user");
    if (lastUserId && lastUserId !== currentUserId) {
      // User changed — clear all cached data
      clearStore(STORES.SESSIONS).catch(() => { });
      clearStore(STORES.STATS).catch(() => { });
      clearStore(STORES.EXERCISES).catch(() => { });
      setSession(null);
      setStats(null);
    }
    localStorage.setItem("replog_last_user", currentUserId);
  }, [authSession?.user?.email]);

  // ── Load data on page mount ───────────────────────────────────
  useEffect(() => {
    // Check localStorage for timer preference
    const saved = localStorage.getItem("replog_show_timer");
    if (saved !== null) setShowRestTimer(saved === "true");

    const loadInitialData = async () => {
      // 1. Try to load from IndexedDB first for instant UI
      try {
        const [localSession, localStats, localExercises] = await Promise.all([
          getData(STORES.SESSIONS, "active"),
          getData(STORES.STATS, "current"),
          getData(STORES.EXERCISES, "library_cache"),
        ]);

        if (localExercises) {
          liftedExercisesRef.current = (localExercises as any).data || [];
        }
        if (localSession && (localSession as WorkoutSessionData).isActive) {
          setSession(localSession as WorkoutSessionData);
          setSessionLoading(false);
        } else {
          setSessionLoading(false);
        }
        if (localStats) {
          setStats(localStats as DashboardStats);
          setStatsLoading(false);
        }
      } catch (e) {
        console.error("Local DB load failed:", e);
      }

      // 2. Fetch from server in a single' hydration' batch
      try {
        const data = await getHydrationData();

        if (data.activeSession) {
          setSession(data.activeSession);
          putData(STORES.SESSIONS, { ...data.activeSession, id: "active" });
        } else {
          setSession(null);
          putData(STORES.SESSIONS, { id: "active", isActive: false });
        }
        setSessionLoading(false);

        if (data.stats) {
          setStats(data.stats);
          putData(STORES.STATS, { ...data.stats, id: "current" });
        }
        setStatsLoading(false);

        if (data.previousSessions) {
          setPreviousSessions(data.previousSessions);
        }

        if (data.allExercises) {
          liftedExercisesRef.current = data.allExercises;
          putData(STORES.EXERCISES, { id: "library_cache", data: data.allExercises });
        }
      } catch (e) {
        console.error("Hydration fetch failed:", e);
        setSessionLoading(false);
        setStatsLoading(false);
      }
    };

    loadInitialData();
  }, []);

  // Refresh stats whenever switching to Dashboard or Progress tab (with staleness check)
  useEffect(() => {
    if (activeTab === "dashboard" || activeTab === "progress") {
      (async () => {
        const newerStats = await getDashboardStats();
        setStats(newerStats);
        putData(STORES.STATS, { ...newerStats, id: "current" }).catch(() => { });
      })();
    }
  }, [activeTab]);

  useEffect(() => {
    if (!newLogIdRef.current || !session?.logs) return;
    setTimeout(() => {
      const el = document.getElementById(`exercise-card-${newLogIdRef.current}`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
        
        // Focus the first reps input after 60ms delay (smooth-entry)
        const repsInput = el.querySelector('input[data-set-id*="-set-0"]') as HTMLInputElement;
        if (repsInput) {
          setTimeout(() => {
            repsInput.focus();
            repsInput.select();
          }, 60);
        }
        
        newLogIdRef.current = null;
      }
    }, 100);
  }, [session?.logs]);

  useEffect(() => {
    if (!showPreviousSessions) return;

    let cancelled = false;

    // 1. Instant Cache Load
    getData(STORES.SESSIONS, "history").then((cached) => {
      if (cached && !cancelled) setPreviousSessions((cached as any).data);
    }).catch(() => { });

    // 2. Background Server Sync
    if (typeof navigator !== "undefined" && navigator.onLine) {
      getPreviousSessions()
        .then((sessions) => {
          if (!cancelled) {
            setPreviousSessions(sessions);
            putData(STORES.SESSIONS, { id: "history", data: sessions }).catch(() => { });
          }
        })
        .catch(() => {
          if (!cancelled) setPreviousSessions([]);
        });
    }

    return () => {
      cancelled = true;
    };
  }, [showPreviousSessions]);

  // ── SILENT RECONCILIATION LOOP ──────────────────────────────
  // Polls every 60s strictly when app is visible to catch sync drift
  const activeSessionIdRef = useRef(session?.id);
  useEffect(() => { activeSessionIdRef.current = session?.id; }, [session?.id]);

  useEffect(() => {
    const syncInterval = setInterval(async () => {
      if (typeof document !== "undefined" && document.visibilityState === "visible" && activeSessionIdRef.current) {
        try {
          const freshServerSession = await getActiveSession();
          if (freshServerSession) {
            setSession((prev) => {
              if (JSON.stringify(freshServerSession) !== JSON.stringify(prev)) {
                console.log("[SYNC] Silent reconciliation recovered drifting data.");
                putData(STORES.SESSIONS, { ...freshServerSession, id: "active" }).catch(() => {});
                return freshServerSession;
              }
              return prev;
            });
          }
        } catch (e) { /* Completely silent failure */ }
      }
    }, 60000);
    return () => clearInterval(syncInterval);
  }, []);

  const toggleTimer = () => {
    const newVal = !showRestTimer;
    setShowRestTimer(newVal);
    localStorage.setItem("replog_show_timer", String(newVal));
  };

  // ── handleStartSession ────────────────────────────────────────
  const handleStartSession = async () => {
    setActionLoading(true);
    try {
      const newSession = await createSession();
      setSession(newSession);
      // Cache in IndexedDB for offline access
      await putData(STORES.SESSIONS, { ...newSession, id: "active" });
      setActiveTab("logger"); // jump to logger tab after starting
    } catch (e) {
      console.error("Failed to start session:", e);
    } finally {
      setActionLoading(false);
    }
  };

  // ── handleEndSession ──────────────────────────────────────────
  const handleEndSession = async () => {
    if (!session) {
      console.error("No session found to end");
      alert("No active session found to end.");
      return;
    }
    
    // Validate session structure
    if (!session.id) {
      console.error("Session ID is missing:", session);
      alert("Invalid session data. Please refresh the page and try again.");
      return;
    }
    
    console.log("Session validation passed:", {
      id: session.id,
      name: session.name,
      isActive: session.isActive,
      logsCount: session.logs?.length || 0
    });
    
    setActionLoading(true);
    try {
      console.log("Attempting to end session:", session.id);
      const result = await endSession(session.id);
      
      if (!result.success) {
        throw new Error(result.error || "Server rejected session close");
      }

      setSession(null);
      // Remove from active cache but could store in history if needed
      await putData(STORES.SESSIONS, { id: "active", isActive: false });

      // Refresh stats now that the session is complete
      const newStats = await getDashboardStats();
      setStats(newStats);
      await putData(STORES.STATS, { ...newStats, id: "current" });
      lastStatsFetchRef.current = Date.now();

      // Refresh the Progress view so newly-completed sessions appear immediately
      setProgressRefreshKey((k) => k + 1);
      
      // Refresh previous sessions list to include the newly completed session
      const updated = await getPreviousSessions();
      setPreviousSessions(updated);
      
      console.log("Session ended successfully and saved to previous sessions");
      
      // Navigate cleanly
      setActiveTab("dashboard");
      
    } catch (e) {
      console.error("Failed to end session - full error:", e);
      
      // Show more specific error feedback to user
      const errorMessage = e instanceof Error ? e.message : 'Unknown error occurred';
      alert(`Failed to end session: ${errorMessage}. Please try again.`);
    } finally {
      setActionLoading(false);
    }
  };

  // ── TEST FUNCTION: Verify End Session Works ───────────────────────
  // This function can be called from browser console to test the functionality
  const testEndSession = async () => {
    console.log("=== TESTING END SESSION FUNCTIONALITY ===");
    
    // Test 1: Check if we have an active session
    if (!session) {
      console.log("❌ No active session to test");
      alert("No active session found. Start a session first.");
      return;
    }
    
    console.log("✅ Active session found:", {
      id: session.id,
      name: session.name,
      isActive: session.isActive
    });
    
    // Test 2: Check if getPreviousSessions works
    try {
      const previousSessions = await getPreviousSessions();
      console.log("✅ getPreviousSessions works, found:", previousSessions.length, "previous sessions");
      console.log("Previous sessions:", previousSessions.map(s => ({ id: s.id, name: s.name, endTime: s.endTime })));
    } catch (e) {
      console.error("❌ getPreviousSessions failed:", e);
    }
    
    // Test 3: Check if we can call endSession (but don't actually end it)
    console.log("📝 Ready to test endSession - click END SESSION button to complete the test");
    alert("Test complete! Check console for details. Now click END SESSION to test the actual functionality.");
  };

  // ── DIRECT VERIFICATION: Check Session in Database ─────────────────
  const verifySessionInDB = async () => {
    if (!session) {
      alert("No active session to verify");
      return;
    }
    
    try {
      console.log("=== VERIFYING SESSION IN DATABASE ===");
      
      // This would require a new server action, but let's simulate it
      const previousSessions = await getPreviousSessions();
      const currentSession = previousSessions.find(s => s.id === session.id);
      
      if (currentSession) {
        console.log("✅ Session found in previous sessions (already ended):", currentSession);
        alert("Session is already in previous sessions!");
      } else {
        console.log("📝 Session not found in previous sessions (still active)");
        alert("Session is still active - click END SESSION to test.");
      }
    } catch (e) {
      console.error("❌ Verification failed:", e);
      alert("Verification failed: " + (e instanceof Error ? e.message : 'Unknown error'));
    }
  };

  // Make test functions available in browser console for debugging
  if (typeof window !== 'undefined') {
    (window as any).testEndSession = testEndSession;
    (window as any).verifySessionInDB = verifySessionInDB;
    (window as any).currentSession = session;
  }

  // ── handleStatsRefresh ───────────────────────────────────────
  const handleStatsRefresh = useCallback(() => {
    if (statsRefreshDebounceRef.current) clearTimeout(statsRefreshDebounceRef.current);
    statsRefreshDebounceRef.current = setTimeout(async () => {
      try {
        const newStats = await getDashboardStats();
        setStats(newStats);
        await putData(STORES.STATS, { ...newStats, id: "current" });
      } catch (e) { }
    }, 1500); // 1.5s debounce to stop DB spam
  }, []);

  // ── handleAddExercise: PESSIMISTIC TRANSACTIONAL GUARD ─────────────
  // Replaces optimistic UI with server-first approach for 100% data integrity
  const handleAddExercise = async (exerciseId: string) => {
    // ── SWAP MODE: replacing an existing exercise ──
    if (swapTargetLogId) {
      try {
        await updateWorkoutLogExercise(swapTargetLogId, exerciseId);
        setSwapTargetLogId(null);
        const updated = await getActiveSession();
        setSession(updated);
        if (updated) await putData(STORES.SESSIONS, {
          ...updated, id: "active"
        });
      } catch (e) {
        console.error("Failed to swap exercise:", e);
      }
      setIsLibraryOpen(false);
      return;
    }

    if (!session) {
      console.error("No active session to add exercise to");
      return;
    }

    // Prevent duplicate transactions
    if (pendingTx !== null) {
      console.log("Transaction already in progress, ignoring add exercise request");
      return;
    }

    // Generate stable UUID immediately for transaction tracking
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // STEP 1: Set pending transaction state immediately (BLOCKS UI)
    setPendingTx({ id: tempId, timestamp: Date.now() });
    newLogIdRef.current = tempId;

    // STEP 2: 12-second timeout guard for safety
    const timeoutGuard = setTimeout(() => {
      if (pendingTx?.id === tempId) {
        console.warn("Transaction timeout - clearing pending state");
        setPendingTx(null);
        alert("Sync taking longer than expected. You can continue editing locally.");
      }
    }, 12000);

    try {
      // STEP 3: Execute server call (pessimistic - wait for confirmation)
      console.log("Starting pessimistic transaction for exercise:", exerciseId);
      
      const newLog = await retryWithBackoff(() => addExerciseToSession(session.id, exerciseId), `addEx-${session.id}`);
      
      // STEP 4: Clear timeout guard on success
      clearTimeout(timeoutGuard);
      
      // STEP 5: Get complete server session data
      const serverSession = await getActiveSession();
      
      if (serverSession) {
        // STEP 6: Update session with server-confirmed data (pessimistic)
        setSession(serverSession);
        
        // STEP 7: Update IndexedDB for offline persistence
        await putData(STORES.SESSIONS, { ...serverSession, id: "active" });
      }
      
      // STEP 8: Clear pending transaction state (RELEASES UI LOCK)
      setPendingTx(null);
      
      // STEP 9: Switch to logger tab and close library
      setActiveTab("logger");
      setIsLibraryOpen(false);
      
      // STEP 10: Refresh stats
      const newerStats = await getDashboardStats();
      setStats(newerStats);
      await putData(STORES.STATS, { ...newerStats, id: "current" });
      
      console.log("Pessimistic transaction completed successfully");
      
    } catch (error) {
      // STEP 11: Clear timeout guard on error
      clearTimeout(timeoutGuard);
      
      console.error("Pessimistic transaction failed:", error);
      
      // STEP 12: Fail-safe - clear pending state to release UI lock
      setPendingTx(null);
      
      // Show error but don't block UI
      alert("Failed to add exercise. Please try again.");
    }
  };

  const handleDeleteSession = async (sessionId: string) => {
    setActionLoading(true);
    try {
      await deleteSession(sessionId);

      // If the deleted session was the active one, clear local cache
      if (session?.id === sessionId) {
        setSession(null);
        await putData(STORES.SESSIONS, { id: "active", isActive: false });
      }

      // Refresh previous sessions list
      const updated = await getPreviousSessions();
      setPreviousSessions(updated);

      // Also refresh dashboard stats in case the deleted session affected them
      const newStats = await getDashboardStats();
      setStats(newStats);
      await putData(STORES.STATS, { ...newStats, id: "current" });

      setProgressRefreshKey((k) => k + 1);
    } catch (e) {
      console.error("Failed to delete session:", e);
    } finally {
      setActionLoading(false);
    }
  };

  // ── handleRemoveExercise ──────────────────────────────────────
  const handleRemoveExercise = async (workoutLogId: string) => {
    // Optimistic UI for faster feel
    if (session) {
      const updatedLogs = session.logs.filter(l => l.id !== workoutLogId);
      const updatedSession = { ...session, logs: updatedLogs };
      setSession(updatedSession);
      await putData(STORES.SESSIONS, { ...updatedSession, id: "active" });
    }

    // Background server sync — completely instant
    removeExercise(workoutLogId)
      .then(() => {
        handleStatsRefresh(); // Batched debounced stats refresh
        setProgressRefreshKey((k) => k + 1);
      })
      .catch((e) => console.error("Failed to remove exercise:", e));
  };

  // ── Derived stats for the stat cards ─────────────────────────
  // Optional chaining (?.) prevents crashes when stats is null
  const maxDayVolume = Math.max(...(stats?.volumeByDay?.map((d) => d.totalSets) ?? [1]), 1);

  // ============================================================
  // RENDER
  // ============================================================
  return (
    <div style={{
      minHeight: "100vh",
      background: "var(--bg)",
      color: "var(--text-primary)",
      fontFamily: "var(--font-main)",
      transition: "background var(--transition), color var(--transition)",
    }}>
      {/* Global overlay for hamburger menu click-outside */}
      {isHamburgerOpen && (
        <div
          onClick={() => setIsHamburgerOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 39,
            background: "transparent",
          }}
        />
      )}

      {/* ── HEADER ───────────────────────────────────────────── */}
      <header style={{
        borderBottom: `1px solid var(--border)`,
        background: "var(--header-bg)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        padding: "10px 14px", // Mobile-first default
        display: "flex", justifyContent: "space-between", alignItems: "center",
        position: "sticky", top: 0, zIndex: 40,
        transition: "background var(--transition), border-color var(--transition)",
      }}>
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{
            width: 32, height: 32, background: THEME.lime,
            borderRadius: 8,
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "var(--glow-primary)",
            transition: "background var(--transition), box-shadow var(--transition)",
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill={mode === 'dark' && accentColor.toLowerCase() === '#ffffff' ? '#000000' : '#ffffff'}>
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
            </svg>
          </div>
          <div>
            <h1 style={{
              fontSize: 16, fontWeight: 900, letterSpacing: "-0.02em",
              textTransform: "uppercase", fontStyle: "normal",
              color: THEME.textPrimary, margin: 0,
            }}>
              RepLog
            </h1>
          </div>
        </div>

        {/* Header Actions */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, position: "relative" }}>
          {/* Main Action Button (Start or End Session) */}
          <button
            onClick={session?.isActive ? handleEndSession : handleStartSession}
            disabled={actionLoading}
            style={{
              background: THEME.lime,
              color: THEME.black,
              border: "none",
              padding: "7px 20px",
              ...brandLabel(10, THEME.black),
              cursor: "pointer",
              borderRadius: "var(--radius)",
              opacity: actionLoading ? 0.6 : 1,
              transition: "transform 0.1s, opacity 0.2s",
              boxShadow: "var(--glow-primary)",
            }}
            onMouseDown={(e) => (e.currentTarget.style.transform = "scale(0.96)")}
            onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
          >
            {actionLoading ? "..." : (session?.isActive ? "END SESSION" : "NEW SESSION")}
          </button>

          {/* TEST BUTTON - Only visible in development */}
          {process.env.NODE_ENV === "development" && (
            <>
              <button
                onClick={testEndSession}
                style={{
                  background: THEME.danger,
                  color: THEME.textPrimary,
                  border: "none",
                  padding: "7px 12px",
                  ...brandLabel(9, THEME.textPrimary),
                  cursor: "pointer",
                  borderRadius: "var(--radius)",
                  fontSize: "10px",
                  opacity: 0.8,
                }}
                title="Test end session functionality (dev only)"
              >
                TEST
              </button>
              <button
                onClick={verifySessionInDB}
                style={{
                  background: THEME.surface,
                  color: THEME.textPrimary,
                  border: `1px solid ${THEME.border}`,
                  padding: "7px 12px",
                  ...brandLabel(9, THEME.textPrimary),
                  cursor: "pointer",
                  borderRadius: "var(--radius)",
                  fontSize: "10px",
                  opacity: 0.8,
                }}
                title="Verify session in database (dev only)"
              >
                VERIFY
              </button>
            </>
          )}

          {/* Hamburger Button (3 lines) */}
          <button
            onClick={() => setIsHamburgerOpen(!isHamburgerOpen)}
            style={{
              background: "transparent",
              border: "none",
              cursor: "pointer",
              padding: 8,
              display: "flex",
              flexDirection: "column",
              gap: 4,
              color: THEME.textPrimary,
              alignItems: "center",
              justifyContent: "center",
            }}
            title="Menu"
          >
            <div style={{ width: 18, height: 2, background: "currentColor", borderRadius: 1 }}></div>
            <div style={{ width: 18, height: 2, background: "currentColor", borderRadius: 1 }}></div>
            <div style={{ width: 18, height: 2, background: "currentColor", borderRadius: 1 }}></div>
          </button>

          {/* Hamburger Dropdown Menu - Solid Background (No Transparency) */}
          {isHamburgerOpen && (
            <div
              style={{
                position: "absolute",
                top: "100%",
                right: 0,
                marginTop: 12,
                background: THEME.surfaceSolid, // Fully opaque solid background
                border: `1px solid ${THEME.border}`,
                borderRadius: "var(--radius)",
                padding: "20px",
                width: 260,
                zIndex: 100,
                boxShadow: "var(--glow-primary)", // Solid shadow
              }}
            >
              {/* User Profile Section */}
              <div style={{ marginBottom: 16, paddingBottom: 14, borderBottom: `1px solid ${THEME.border}` }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: THEME.textPrimary, letterSpacing: "-0.02em", textTransform: "uppercase" }}>
                  {authSession?.user?.name || "Athlete"}
                </div>
                {userEmail && (
                  <div style={{ ...monoLabel(9, THEME.textDim), marginTop: 4 }}>
                    {userEmail}
                  </div>
                )}
              </div>

              {/* Mode Toggle Section */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18, paddingBottom: 12, borderBottom: `1px solid ${THEME.border}` }}>
                <span style={monoLabel(10, THEME.textDim)}>APPEARANCE</span>
                <button
                  onClick={toggleMode}
                  style={{
                    background: "transparent", border: `1px solid ${THEME.border}`,
                    color: THEME.textPrimary, padding: "5px 10px", borderRadius: 4, cursor: "pointer",
                    display: "flex", alignItems: "center", gap: 6, ...monoLabel(9)
                  }}
                >
                  {mode === "dark" ? (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>
                  ) : (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>
                  )}
                  {mode === "dark" ? "DARK" : "LIGHT"}
                </button>
              </div>

              {/* Accent Selection Grid */}
              <div style={{ ...monoLabel(10, THEME.textDim), marginBottom: 12 }}>ACCENT COLOR</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 20 }}>
                {ACCENTS.map(a => (
                  <button
                    key={a.name}
                    onClick={() => setAccentColor(a.color)}
                    style={{
                      display: "flex", alignItems: "center", gap: 8,
                      background: "transparent",
                      border: `1px solid ${accentColor === a.color ? THEME.lime : THEME.border}`,
                      color: THEME.textPrimary,
                      padding: "7px 10px", borderRadius: 4, cursor: "pointer",
                      ...monoLabel(8), textAlign: "left", transition: "all 0.1s",
                    }}
                  >
                    <div style={{ width: 10, height: 10, borderRadius: "50%", background: a.color }} />
                    {a.name.toUpperCase()}
                  </button>
                ))}
              </div>

              {/* Logout Button */}
              <button
                onClick={async () => {
                  const displayEmail = authSession?.user?.email || "your account";
                  if (!window.confirm(`Are you sure you want to log out of ${displayEmail}?`)) {
                    return;
                  }

                  try {
                    await clearStore(STORES.SESSIONS);
                    await clearStore(STORES.EXERCISES);
                    await clearStore(STORES.STATS);
                    await clearStore(STORES.SYNC_QUEUE);
                  } catch (e) {
                    // Ignore DB errors on logout
                  }
                  signOut({ callbackUrl: "/" });
                }}
                style={{
                  width: "100%", textAlign: "left", background: "transparent", border: `1px solid ${THEME.dangerBorder}`,
                  color: THEME.danger, padding: "10px 14px", borderRadius: 4, cursor: "pointer",
                  ...monoLabel(10), transition: "all 0.1s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = THEME.dangerBg)}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                LOG OUT
              </button>
            </div>
          )}
        </div>
      </header>

      <main style={{
        padding: 12, // Mobile-first default
        maxWidth: 1100,
        width: "100%",
        margin: "0 auto",
        minHeight: "calc(100vh - 64px)", // Ensure it fills the screen
      }}>

        {/* ── TAB BAR ──────────────────────────────────────────── */}
        {/* To add a tab: add a button here and a matching section below */}
        <div style={{
          display: "flex", gap: 8,
          borderBottom: `1px solid ${THEME.border}`,
          marginBottom: 22,
          paddingBottom: 0,
        }}>
          {(["dashboard", "logger", "progress", "library"] as const).map((tab) => {
            const isActive = activeTab === tab;
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  ...brandLabel(13, isActive ? THEME.lime : THEME.textGhost),
                  background: "transparent",
                  border: "none",
                  padding: "10px 16px",
                  cursor: "pointer",
                  position: "relative",
                  transition: "all 0.2s ease",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                }}
              >
                {tab.toUpperCase()}
                {/* Fixed Active Indicator - specifically rendered only for active tab */}
                {isActive && (
                  <div style={{
                    position: "absolute",
                    bottom: -1,
                    left: 0,
                    right: 0,
                    height: 3,
                    background: THEME.lime,
                    borderRadius: "3px 3px 0 0",
                    boxShadow: `0 -2px 10px ${THEME.limeHover}`, // Sublte glow
                  }} />
                )}
              </button>
            );
          })}
        </div>

        {/* ══════════════════════════════════════════════════════
            TAB: DASHBOARD
            Shows stats, volume chart, PRs, and muscle distribution.
        ══════════════════════════════════════════════════════ */}
        {activeTab === "dashboard" && (
          <div>
            {/* Welcome message strictly for brand new users */}
            {!statsLoading && (stats?.totalCompletedSets ?? 0) === 0 && (
              <div style={{
                background: "var(--done-bg)",
                border: `1px solid var(--accent-color)`,
                padding: "20px",
                marginBottom: "22px",
                borderRadius: "var(--radius)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                textAlign: "center"
              }}>
                <h2 style={brandLabel(16, THEME.lime)}>Welcome to RepLog, {userName}!</h2>
                <p style={{ ...monoLabel(10, THEME.textPrimary), marginTop: 8, maxWidth: 450 }}>
                  Your dashboard is ready. Once you complete your first workout session,
                  your intensity, volume, and frequency metrics will populate here.
                </p>
                <button
                  onClick={() => setActiveTab("logger")}
                  style={{
                    marginTop: 14,
                    background: THEME.lime,
                    color: THEME.black,
                    border: "none",
                    padding: "6px 16px",
                    ...monoLabel(10, THEME.black),
                    fontWeight: 900,
                    cursor: "pointer"
                  }}
                >
                  GO TO LOGGER
                </button>
              </div>
            )}

            {/* ── Top 4 Stat Cards ──────────────────────────── */}
            {/* Order: Weekly Volume → Frequency → Avg RIR → Intensity Score */}
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, 1fr)",
              gap: 18, marginBottom: 22,
            }}>
              <Link href="/volume" style={{ textDecoration: "none" }}>
                <StatCard
                  label="Weekly Volume"
                  value={statsLoading ? "—" : (stats?.totalSetsThisWeek ?? 0)}
                  sub="SETS"
                  trend="View Breakdown"
                  barPct={Math.min(((stats?.totalSetsThisWeek ?? 0) / 100) * 100, 100)}
                  icon={<ActivityIcon />}
                />
              </Link>
              <Link href="/frequency" style={{ textDecoration: "none" }}>
                <StatCard
                  label="Frequency"
                  value={statsLoading ? "—" : (stats?.weeklyFrequency ?? 0)}
                  sub="DAYS/WK"
                  trend="View Breakdown"
                  barPct={((stats?.weeklyFrequency ?? 0) / 7) * 100}
                  icon={<CalendarIcon />}
                />
              </Link>
              <Link href="/rir-breakdown" style={{ textDecoration: "none" }}>
                <StatCard
                  label="Avg Reps in Reserve"
                  value={statsLoading ? "—" : (stats?.avgRir ?? 0)}
                  sub="RIR"
                  trend="View Breakdown"
                  barPct={((stats?.avgRir ?? 0) / 10) * 100}
                  icon={
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={THEME.lime} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                    </svg>
                  }
                />
              </Link>
              <StatCard
                label="Intensity Score"
                value={statsLoading ? "—" : (stats?.avgRpe ?? 0)}
                sub="RPE"
                trend={stats && stats.avgRpe > 8 ? "High" : "Optimal"}
                barPct={(stats?.avgRpe ?? 0) / 10 * 100}
                icon={<ZapIcon />}
              />
            </div>

            {/* ── Volume Distribution ─────────────────────────── */}
            <div style={{ marginBottom: 22 }}>
              {/* 7-day volume bar chart */}
              <div
                style={cardStyle}
                onClick={(e) => {
                  // If the click target is not a bar, dismiss
                  if (!(e.target as HTMLElement).closest('[data-bar="true"]')) {
                    setActiveBarIndex(null);
                  }
                }}
              >
                <div style={{
                  borderBottom: `1px solid ${THEME.border}`,
                  padding: "7px 14px",
                  background: "var(--card-header-bg)",
                }}>
                  <span style={brandLabel(12)}>Volume Distribution</span>
                </div>
                <div style={{ padding: 16 }}>
                  <div style={{
                    display: "flex",
                    alignItems: "stretch",
                    height: 160,
                    gap: 6,
                    paddingTop: 16,
                  }}>
                    {/* If no stats yet, render 7 empty bars */}
                    {(stats?.volumeByDay ?? Array.from({ length: 7 }, (_, i) => ({
                      day: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][i],
                      totalSets: 0,
                    }))).map((d, i) => (
                      <div
                        key={i}
                        style={{
                          flex: 1,
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          justifyContent: "flex-end",
                          gap: 6,
                          height: "100%", // important: so child height% can resolve
                        }}
                      >
                        <div
                          data-bar="true"
                          style={{
                            width: "70%",
                            height: `${Math.max(3, (d.totalSets / maxDayVolume) * 100)}%`,
                            background: THEME.lime, cursor: "crosshair",
                            transition: "height 0.6s ease, background 0.15s",
                            borderRadius: "2px 2px 0 0",
                            position: "relative",
                          }}
                          onPointerDown={() => {
                            // Clear any existing dismiss timer
                            if (barDismissTimer) clearTimeout(barDismissTimer);
                            // Show label immediately on press
                            setActiveBarIndex(i);
                          }}
                          onPointerUp={() => {
                            // On release: dismiss after 3 seconds
                            const t = setTimeout(() => setActiveBarIndex(null), 3000);
                            setBarDismissTimer(t);
                          }}
                          onPointerLeave={() => {
                            // If user drags off: dismiss after 3 seconds
                            const t = setTimeout(() => setActiveBarIndex(null), 3000);
                            setBarDismissTimer(t);
                          }}
                        >
                          {activeBarIndex === i && (
                            <div style={{
                              position: "absolute",
                              ...(i >= 4
                                ? { right: "calc(100% + 6px)" }
                                : { left: "calc(100% + 6px)" }
                              ),
                              top: "50%",
                              transform: "translateY(-50%)",
                              background: "var(--surface-solid, var(--surface))",
                              border: "1px solid var(--accent-color)",
                              borderRadius: 4,
                              padding: "2px 7px",
                              whiteSpace: "nowrap",
                              fontSize: 9,
                              fontFamily: "var(--font-main)",
                              color: "var(--accent-color)",
                              fontWeight: 900,
                              letterSpacing: "-0.01em",
                              zIndex: 10,
                              pointerEvents: "none",
                            }}>
                              {d.totalSets} Sets
                            </div>
                          )}
                        </div>
                        <span style={monoLabel(9)}>{d.day}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* ── Critical Benchmarks ─────────────────────────── */}
            <div style={{ marginBottom: 22 }}>
              <div style={cardStyle}>
                <div style={{
                  borderBottom: `1px solid ${THEME.border}`,
                  padding: "7px 14px",
                  background: "var(--card-header-bg)",
                }}>
                  <span style={brandLabel(12)}>Critical Benchmarks</span>
                </div>
                <div style={{ padding: 4 }}>
                  {/* Empty state: no PRs yet */}
                  {(stats?.recentPRs?.length ?? 0) === 0 ? (
                    <div style={{ padding: "20px 12px", textAlign: "center" }}>
                      <p style={monoLabel(10, THEME.textDim)}>No PRs logged yet</p>
                      <p style={{ ...monoLabel(9), marginTop: 6 }}>Complete sets to see records here</p>
                    </div>
                  ) : (
                    stats!.recentPRs.map((pr, i) => (
                      <div key={i} style={{
                        display: "flex", justifyContent: "space-between",
                        alignItems: "center",
                        padding: "10px 12px",
                        borderBottom: i < stats!.recentPRs.length - 1 ? `1px solid ${THEME.surface3}` : "none",
                      }}>
                        <div>
                          <p style={monoLabel(9)}>{pr.date}</p>
                          <h4 style={{
                            fontWeight: 900, textTransform: "uppercase",
                            fontStyle: "", color: THEME.textPrimary,
                            fontSize: 12, margin: "2px 0 0",
                          }}>
                            {pr.exerciseName}
                          </h4>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <p style={{
                            fontSize: 14, fontWeight: 900, color: THEME.textPrimary,
                            fontFamily: THEME.fontMono, letterSpacing: "-0.03em",
                          }}>
                            {pr.weight}kg
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* ── Muscle Distribution ───────────────────────── */}
            <div style={{ ...cardStyle, marginBottom: 22 }}>
              <div style={{
                borderBottom: `1px solid ${THEME.border}`,
                padding: "7px 14px",
                background: "var(--card-header-bg)",
              }}>
                <span style={brandLabel(12)}>Muscle Distribution </span>
              </div>
              {/* Empty state */}
              {(stats?.muscleDistribution?.length ?? 0) === 0 ? (
                <div style={{ padding: "16px", textAlign: "center" }}>
                  <p style={monoLabel(10, THEME.textDim)}>Start logging sets to see your muscle balance</p>
                </div>
              ) : (
                stats!.muscleDistribution.map((m, i) => {
                  const maxSets = stats!.muscleDistribution[0].sets;
                  return (
                    <div key={i} style={{
                      display: "flex", alignItems: "center", gap: 12,
                      padding: "8px 14px",
                      borderBottom: i < stats!.muscleDistribution.length - 1
                        ? `1px solid ${THEME.surface3}` : "none",
                    }}>
                      <span style={{
                        fontWeight: 900, textTransform: "uppercase",
                        color: THEME.textPrimary, fontSize: 12.5,
                        minWidth: 110
                      }}>
                        {m.muscle}
                      </span>
                      <div style={{ flex: 1, height: 2, background: THEME.border }}>
                        <div style={{
                          height: "100%", background: THEME.lime,
                          width: `${(m.sets / maxSets) * 100}%`,
                          transition: "width 0.8s ease",
                        }} />
                      </div>
                      <span style={{
                        fontSize: 15, fontWeight: 900, color: THEME.textPrimary,
                        fontFamily: THEME.fontMono, letterSpacing: "-0.03em",
                        minWidth: 52, textAlign: "right"
                      }}>
                        {m.sets} sets
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )
        }

        {/* ══════════════════════════════════════════════════════
            TAB: PROGRESS
            The Performance Matrix area. Two multi-line graphs.
        ══════════════════════════════════════════════════════ */}
        {
          activeTab === "progress" && (
            <ProgressMatrixView refreshKey={progressRefreshKey} onNavigate={setActiveTab} />
          )
        }

        {/* ══════════════════════════════════════════════════════
            TAB: LOGGER
            The live workout tracker. Shows exercise cards.
        ══════════════════════════════════════════════════════ */}
        {
          activeTab === "logger" && (
            <div>
              <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 14 }}>
                <button
                  onClick={() => setShowPreviousSessions(true)}
                  style={{
                    background: "transparent",
                    border: `1px solid ${THEME.border}`,
                    color: THEME.lime,
                    padding: "4px 12px",
                    cursor: "pointer",
                    borderRadius: THEME.borderRadius,
                    ...monoLabel(9, THEME.lime),
                  }}
                >
                  Previous Sessions
                </button>
              </div>
              {/* No session: show "Beginner's Guide" welcome screen */}
              {!session && !sessionLoading && (
                <div>
                  {/* Welcome / first-time user message */}
                  <div style={{
                    border: `1px solid var(--border)`,
                    borderLeft: `4px solid var(--accent-color)`,
                    padding: "20px 24px",
                    marginBottom: 20,
                    background: "var(--done-bg)",
                    borderRadius: "var(--radius)",
                  }}>
                    <h2 style={{
                      fontSize: 18, fontWeight: 900, textTransform: "uppercase",
                      letterSpacing: "-0.03em", color: THEME.textPrimary, margin: "0 0 8px",
                    }}>
                      {(stats?.totalCompletedSets ?? 0) === 0 ? "Start Your First Session" : "Start Another Session"}
                    </h2>
                    <p style={{ ...monoLabel(10, THEME.textDim), marginBottom: 16 }}>
                      Click &quot;New Session&quot; in the header to begin logging.
                      Your sets will save automatically as you check them off.
                    </p>
                    {/* Quick-start guide */}
                    <div style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(3,1fr)",
                      gap: 12,
                    }}>
                      {[
                        { step: "01", title: "Start Session", desc: "Hit 'New Session' in the top-right header." },
                        { step: "02", title: "Add Exercise", desc: "Click '+ Add Exercise' and search the library." },
                        { step: "03", title: "Log Your Sets", desc: "Enter weight, reps, RPE & RIR, then check off each set." },
                      ].map((s) => (
                        <div key={s.step} style={{
                          border: `1px solid var(--border)`,
                          padding: "12px 14px",
                          background: "var(--surface)",
                          borderRadius: "var(--radius)",
                        }}>
                          <p style={{ ...monoLabel(9, THEME.lime), marginBottom: 4 }}>{s.step}</p>
                          <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: THEME.textPrimary, marginBottom: 4 }}>{s.title}</p>
                          <p style={monoLabel(9, THEME.textGhost)}>{s.desc}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Big start button */}
                  <button
                    onClick={handleStartSession}
                    disabled={actionLoading}
                    style={{
                      width: "100%", padding: "14px",
                      background: "var(--accent-color)", color: startBtnTextColor,
                      border: "none", ...monoLabel(11, startBtnTextColor),
                      fontWeight: 900, cursor: "pointer",
                      borderRadius: "var(--radius)",
                      fontSize: 13, letterSpacing: "0.15em",
                      transition: "var(--transition)",
                    }}

                    onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.01)")}
                    onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
                  >
                    {actionLoading ? "STARTING SESSION..." : ((stats?.totalCompletedSets ?? 0) === 0 ? "START FIRST SESSION" : "START NEW SESSION")}
                  </button>
                </div>
              )}

              {/* Active session: show exercise cards */}
              {session?.isActive && (
                <div>
                  {/* Session header bar */}
                  <div style={{
                    display: "flex", justifyContent: "space-between",
                    alignItems: "center", marginBottom: 14,
                  }}>
                    <span style={monoLabel(9)}>
                      {session.name}
                    </span>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button
                        onClick={toggleTimer}
                        style={{
                          background: "transparent",
                          border: `1px solid var(--border)`,
                          color: showRestTimer ? "var(--accent-color)" : "var(--text-ghost)", padding: "4px 12px",
                          ...monoLabel(9, showRestTimer ? "var(--accent-color)" : "var(--text-ghost)"),
                          cursor: "pointer",
                          borderRadius: "var(--radius)",
                          transition: "var(--transition)",
                        }}
                      >
                        {showRestTimer ? "TIMER ON" : "TIMER OFF"}
                      </button>
                      <button
                        onClick={() => setIsLibraryOpen(true)}
                        style={{
                          background: "transparent",
                          border: `1px solid var(--border)`,
                          color: "var(--accent-color)", padding: "4px 12px",
                          ...monoLabel(9, "var(--accent-color)"),
                          cursor: "pointer",
                          borderRadius: "var(--radius)",
                          display: "flex", alignItems: "center", gap: 4,
                          transition: "var(--transition)",
                        }}
                      >
                        <PlusIcon /> Add Exercise
                      </button>
                    </div>
                  </div>

                  {/* Empty session state */}
                  {session.logs.length === 0 && (
                    <div style={{
                      border: `1px dashed var(--border)`,
                      padding: "32px", textAlign: "center",
                      borderRadius: "var(--radius)"
                    }}>
                      <p style={monoLabel(11, "var(--text-secondary)")}>No exercises yet</p>
                      <p style={{ ...monoLabel(9), marginTop: 6 }}>
                        Click &quot;+ Add Exercise&quot; to pick from the library
                      </p>
                    </div>
                  )}

                  {/* One ExerciseCard per workout_log row */}
                  {session.logs
                    .sort((a, b) => a.orderIndex - b.orderIndex)
                    .map((log) => (
                        <ExerciseCard
                          key={log.id}
                          log={log}
                          onRemove={() => handleRemoveExercise(log.id)}
                          onEdit={(logId) => {
                            setSwapTargetLogId(logId);
                            setIsLibraryOpen(true);
                          }}
                          showTimer={showRestTimer}
                          onStatsRefresh={handleStatsRefresh}
                        />
                    ))}

                  {/* VAULT SKELETON: Pessimistic Transactional Guard */}
                  {/* [SENIOR ENGINEER AUDIT]
                      Renders BELOW all real cards when a new exercise is being
                      written to the server. The skeleton shows shimmer + spinner
                      to indicate that the server hasn't confirmed yet.
                      OLD RISK: The previous check `pendingTx?.id === log.id`
                      never matched because pendingTx.id is a temp UUID while
                      log.id is a real Postgres UUID. The skeleton never showed.
                      FIX: Render the skeleton as a standalone element when
                      pendingTx is non-null, independent of any log ID matching.
                  */}
                  {pendingTx !== null && <VaultSkeleton />}
                </div>
              )}
            </div>
          )
        }

        {/* ══════════════════════════════════════════════════════
            TAB: LIBRARY
            Browse the full exercise database.
        ══════════════════════════════════════════════════════ */}
        {
          activeTab === "library" && (
            <div style={{ marginBottom: 40 }}>
              <ExerciseLibraryModal
                isPage
                libTab={libTab}
                setLibTab={setLibTab}
                onExerciseCreated={(ex) => {
                  liftedExercisesRef.current = [
                    ...liftedExercisesRef.current,
                    ex
                  ];
                }}
                onSelect={async (id) => {
                  if (pendingTx !== null) {
                    console.log("Add exercise blocked - transaction in progress");
                    return;
                  }
                  await handleAddExercise(id);
                }}
                onClose={() => setIsLibraryOpen(false)}
              />
            </div>
          )
        }

      </main >

      {/* Background grid overlay — the subtle trellis pattern */}
      {/* To remove it: delete this div */}
      <div style={{
        position: "fixed", inset: 0, pointerEvents: "none",
        opacity: 0.03, zIndex: -1,
        backgroundImage: "linear-gradient(to right,#808080 1px,transparent 1px),linear-gradient(to bottom,#808080 1px,transparent 1px)",
        backgroundSize: "40px 40px",
      }} />

      {/* Previous Sessions Modal */}
      {
        showPreviousSessions && !selectedSessionId && (
          <PreviousSessionsModal
            sessions={previousSessions}
            loading={previousSessionsLoading}
            onClose={() => setShowPreviousSessions(false)}
            onDelete={handleDeleteSession}
            onViewDetail={(id) => setSelectedSessionId(id)}
          />
        )
      }

      {/* Session Detail View */}
      {
        selectedSessionId && (
          <SessionDetailView
            sessionId={selectedSessionId}
            onBack={() => setSelectedSessionId(null)}
            btnTextColor={startBtnTextColor}
          />
        )
      }

      {/* Exercise Library Modal */}
      {
        isLibraryOpen && (
          <ExerciseLibraryModal
            libTab={libTab}
            setLibTab={setLibTab}
            onExerciseCreated={(ex) => {
              liftedExercisesRef.current = [
                ...liftedExercisesRef.current,
                ex
              ];
            }}
            onSelect={async (id) => {
              if (pendingTx !== null) {
                console.log("Add exercise blocked - transaction in progress");
                return;
              }
              await handleAddExercise(id);
              setActiveTab("logger");
            }}
            onClose={() => {
              setIsLibraryOpen(false);
              setSwapTargetLogId(null);
            }}
            title={swapTargetLogId ? "Change Exercise" : "Add Exercise"}
          />
        )
      }
    </div >
  );
}
