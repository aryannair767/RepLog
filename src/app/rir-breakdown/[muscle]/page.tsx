"use client";

import { getExerciseRirForMuscle } from "@/app/actions/stats";
import { getData, putData, STORES } from "@/lib/local-backup";
import Link from "next/link";
import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";

// ============================================================
// THEME CONSTANTS
// ============================================================
const THEME = {
  lime:       "var(--accent-color)",
  limeHover:  "var(--accent-glow)",
  black:      "var(--bg)",
  surface:    "var(--surface)",
  surfaceSolid: "var(--surface-solid)",
  surface3:   "var(--surface-hover)",
  border:     "var(--border)",
  textPrimary:"var(--text-primary)",
  textMuted:  "var(--text-secondary)",
  textGhost:  "var(--text-ghost)",
  danger:     "var(--danger)",
  fontMono:   "var(--font-main)",
  fontSans:   "var(--font-main)",
  borderRadius: "var(--radius, 12px)",
};

function monoLabel(size = 9, color = THEME.textMuted): React.CSSProperties {
  return {
    fontFamily: THEME.fontMono,
    fontSize: size,
    color,
    textTransform: "uppercase",
    letterSpacing: "0.08em",
  };
}

function brandLabel(size = 13, color = THEME.textGhost): React.CSSProperties {
  return {
    fontSize: size,
    fontFamily: THEME.fontSans,
    textTransform: "uppercase",
    letterSpacing: "-0.02em",
    color,
    fontWeight: 800,
  };
}

function getRirColor(rir: number): string {
  if (rir <= 1) return "var(--danger)";
  if (rir <= 3) return "var(--accent-color)";
  return "var(--text-ghost)";
}

function getRirLabel(rir: number): string {
  if (rir <= 1) return "NEAR FAILURE";
  if (rir <= 3) return "OPTIMAL";
  return "EASY";
}

type ExerciseRirData = { exerciseName: string; avgRir: number; totalSets: number };

export default function MuscleExerciseRirPage() {
  const params = useParams();
  const muscle = decodeURIComponent(params.muscle as string);

  const [data, setData] = useState<ExerciseRirData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const cacheKey = `rir_muscle_${muscle}`;
      
      // 1. Fetch fresh data from server first
      if (typeof navigator !== "undefined" && navigator.onLine) {
        try {
          const res = await getExerciseRirForMuscle(muscle);
          setData(res);
          putData(STORES.STATS, { id: cacheKey, data: res }).catch(() => {});
          setLoading(false);
          return;
        } catch(e) {}
      }
      
      // 2. Fallback to IndexedDB cache
      const cached = await getData(STORES.STATS, cacheKey).catch(() => null);
      if (cached) setData((cached as any).data);
      setLoading(false);
    }
    load();
  }, [muscle]);

  const overallRir = data.length > 0
    ? Math.round(
        (data.reduce((sum, d) => sum + d.avgRir * d.totalSets, 0) /
        data.reduce((sum, d) => sum + d.totalSets, 0)) * 10
      ) / 10
    : 0;

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: THEME.black, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={monoLabel(12, THEME.lime)}>Analyzing {muscle} data...</span>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: "100vh",
      background: THEME.black,
      color: THEME.textPrimary,
      fontFamily: THEME.fontSans,
    }}>
      {/* HEADER */}
      <header style={{
        position: "sticky", top: 0, zIndex: 10,
        background: "var(--header-bg)", backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        borderBottom: `1px solid var(--border)`,
        padding: "16px 24px",
        display: "flex", alignItems: "center", gap: 16,
        transition: "background var(--transition), border-color var(--transition)",
      }}>
        <Link href="/rir-breakdown" style={{ textDecoration: "none", color: THEME.textPrimary, display: "flex", alignItems: "center" }}>
          <div style={{
            width: 32, height: 32, borderRadius: 16,
            background: THEME.surface3, border: `1px solid ${THEME.border}`,
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer", transition: "all 0.15s"
          }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = THEME.textMuted; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = THEME.border; }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </div>
        </Link>
        <span style={{ fontSize: 16, fontWeight: 900, letterSpacing: "-0.02em" }}>
          {muscle.toUpperCase()} — RIR
        </span>
      </header>

      <main style={{ padding: "32px 24px", maxWidth: 800, margin: "0 auto" }}>

        {/* TOP STAT */}
        <div style={{ marginBottom: 40 }}>
          <p style={monoLabel(11, THEME.textGhost)}>{muscle} — Average RIR</p>
          <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
            <h1 style={{
              fontSize: 56, fontWeight: 900, margin: 0, lineHeight: 1,
              letterSpacing: "-0.04em", color: getRirColor(overallRir),
            }}>
              {overallRir}
            </h1>
            <span style={monoLabel(14, getRirColor(overallRir))}>
              RIR · {getRirLabel(overallRir)}
            </span>
          </div>
          <p style={{ ...monoLabel(10, THEME.textGhost), marginTop: 8 }}>
            {data.reduce((sum, d) => sum + d.totalSets, 0)} total sets across {data.length} exercises
          </p>
        </div>

        {/* EXERCISE LIST */}
        {data.length === 0 ? (
          <div style={{
            background: THEME.surface,
            border: `1px solid ${THEME.border}`,
            borderRadius: THEME.borderRadius,
            padding: "40px 20px",
            textAlign: "center",
          }}>
            <p style={monoLabel(12, THEME.textGhost)}>No exercise data found for {muscle}.</p>
          </div>
        ) : (
          <div style={{
            background: THEME.surface,
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            border: `1px solid ${THEME.border}`,
            borderRadius: THEME.borderRadius,
            overflow: "hidden",
          }}>
            <div style={{
              borderBottom: `1px solid ${THEME.border}`,
              padding: "7px 14px",
              background: "var(--card-header-bg)",
            }}>
              <span style={brandLabel(12)}>Exercise RIR</span>
            </div>

            {data.map((item, i) => {
              const rirColor = getRirColor(item.avgRir);
              return (
                <div
                  key={item.exerciseName}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "14px 16px",
                    borderBottom: i < data.length - 1
                      ? `1px solid ${THEME.surface3}` : "none",
                    transition: "background 0.15s",
                  }}
                >
                  {/* Left: exercise name + set count */}
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{
                      width: 8, height: 8, borderRadius: "50%",
                      background: rirColor,
                      boxShadow: `0 0 6px ${rirColor}`,
                    }} />
                    <div>
                      <div style={{
                        fontSize: 12, fontWeight: 800,
                        textTransform: "uppercase",
                        color: THEME.textPrimary,
                        letterSpacing: "-0.02em",
                      }}>
                        {item.exerciseName}
                      </div>
                      <div style={monoLabel(9, THEME.textGhost)}>
                        {item.totalSets} sets
                      </div>
                    </div>
                  </div>

                  {/* Right: avg RIR badge */}
                  <div style={{
                    background: `${rirColor}15`,
                    border: `1px solid ${rirColor}40`,
                    borderRadius: 6,
                    padding: "4px 10px",
                    display: "flex",
                    alignItems: "baseline",
                    gap: 4,
                  }}>
                    <span style={{
                      fontSize: 16, fontWeight: 900,
                      color: rirColor,
                      fontFamily: THEME.fontMono,
                      letterSpacing: "-0.03em",
                    }}>
                      {item.avgRir}
                    </span>
                    <span style={monoLabel(8, rirColor)}>RIR</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
