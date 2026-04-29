"use client";

import { getWeeklyMuscleVolume } from "@/app/actions/stats";
import { getData, putData, STORES } from "@/lib/db";
import Link from "next/link";
import React, { useState, useEffect } from "react";

// ============================================================
// THEME CONSTANTS (Copied from page.tsx for consistency)
// ============================================================
const THEME = {
  lime:       "var(--accent-color)",
  limeHover:  "var(--accent-glow)",
  black:      "var(--bg)",
  surface:    "var(--surface)",
  surface2:   "var(--surface)",
  surface3:   "var(--surface-hover)",
  border:     "var(--border)",
  textPrimary:"var(--text-primary)",
  textMuted:  "var(--text-secondary)",
  textGhost:  "var(--text-ghost)",
  fontMono:   "var(--font-main)",
  fontSans:   "var(--font-main)",
  borderRadius: "var(--radius, 12px)",
  graphAccent:"var(--accent-color)",
};

function monoLabel(size = 10, color = THEME.textMuted): React.CSSProperties {
  return {
    fontFamily: THEME.fontMono,
    fontSize: size,
    color,
    textTransform: "uppercase",
    letterSpacing: "0.04em",
  };
}

export default function VolumePage() {
  const [data, setData] = useState<{ muscle: string; sets: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const isGuest = typeof window !== "undefined" && new URLSearchParams(window.location.search).get("guest") === "true";
      if (isGuest) {
        setData([
          { muscle: "Quadriceps", sets: 12 },
          { muscle: "Chest", sets: 10 },
          { muscle: "Back", sets: 8 },
          { muscle: "Hamstrings", sets: 6 },
          { muscle: "Shoulders", sets: 5 },
          { muscle: "Arms", sets: 4 }
        ]);
        setLoading(false);
        return;
      }

      if (typeof navigator !== "undefined" && navigator.onLine) {
        try {
          const res = await getWeeklyMuscleVolume();
          setData(res);
          putData(STORES.STATS, { id: "volume_breakdown", data: res }).catch(() => {});
          setLoading(false);
          return;
        } catch(e) {}
      }
      
      const cached = await getData(STORES.STATS, "volume_breakdown").catch(() => null);
      if (cached) setData((cached as any).data);
      setLoading(false);
    }
    load();
  }, []);
  
  // Find the max sets to scale the bar chart properly
  const maxSets = data.length > 0 ? Math.max(...data.map(d => d.sets)) : 1;

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ fontFamily: "var(--font-main)", fontSize: 12, color: "var(--accent-color)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
          Analyzing volume data...
        </span>
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
        <Link href="/" style={{ textDecoration: "none", color: THEME.textPrimary, display: "flex", alignItems: "center" }}>
          <div style={{
            width: 32, height: 32, borderRadius: 16,
            background: THEME.surface3, border: `1px solid ${THEME.border}`,
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer", transition: "all 0.15s"
          }} 
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = THEME.textMuted; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = THEME.border; }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6"></polyline>
            </svg>
          </div>
        </Link>
        <span style={{ fontSize: 16, fontWeight: 900, letterSpacing: "-0.02em" }}>VOLUME BREAKDOWN</span>
      </header>

      <main style={{ padding: "32px 24px", maxWidth: 800, margin: "0 auto" }}>
        
        {/* TOP STAT */}
        <div style={{ marginBottom: 40 }}>
          <p style={monoLabel(11, THEME.textGhost)}>Past 7 Days</p>
          <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
            <h1 style={{ fontSize: 48, fontWeight: 900, margin: 0, lineHeight: 1, letterSpacing: "-0.04em" }}>
              {data.reduce((sum, item) => sum + item.sets, 0)}
            </h1>
            <span style={monoLabel(14, THEME.lime)}>TOTAL SETS</span>
          </div>
        </div>

        {/* BAR CHART */}
        <div style={{
          background: "var(--surface)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          border: `1px solid var(--border)`,
          borderRadius: "var(--radius)",
          padding: "32px 24px 24px",
        }}>
          <h2 style={{ ...monoLabel(12), marginBottom: 40, borderBottom: `1px solid ${THEME.border}`, paddingBottom: 12 }}>
            Sets per Muscle Group
          </h2>

          {data.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 0", color: THEME.textGhost, ...monoLabel(12) }}>
              No sets completed this week.
            </div>
          ) : (
            <div style={{ 
              position: "relative",
              height: 340, // Total container height
              paddingTop: 20,
              paddingLeft: 40,
            }}>
              {/* Y-AXIS LABELS */}
              <div style={{ 
                position: "absolute", 
                left: 0, top: 20, 
                height: 280, // Matches the height of the bars container
                display: "flex", flexDirection: "column", justifyContent: "space-between", 
                ...monoLabel(9, THEME.textGhost),
                width: 30, textAlign: "right",
                paddingRight: 10,
              }}>
                <span>{maxSets}</span>
                <span>{Math.round(maxSets / 2)}</span>
                <span>0</span>
              </div>

              {/* CHART AREA */}
              <div style={{ 
                display: "flex", 
                alignItems: "flex-end", 
                justifyContent: "space-around",
                gap: 12, 
                height: 280,
                borderLeft: `1px solid ${THEME.border}`,
                borderBottom: `1px solid ${THEME.border}`,
              }}>
                {data.map((item) => {
                  const heightPct = Math.max((item.sets / maxSets) * 100, 2); 
                  return (
                    <div key={item.muscle} style={{ 
                      flex: 1, 
                      display: "flex", 
                      flexDirection: "column", 
                      alignItems: "center", 
                      gap: 8,
                      height: "100%",
                      justifyContent: "flex-end",
                      maxWidth: 60,
                      position: "relative",
                    }}>
                      {/* Count above bar */}
                      <span style={{ ...monoLabel(10, THEME.textPrimary), marginBottom: 2 }}>
                        {item.sets}
                      </span>

                      {/* Vertical Bar */}
                      <div style={{
                        width: "70%",
                        height: `${heightPct}%`,
                        background: "var(--accent-color)",
                        borderRadius: "2px 2px 0 0",
                        transition: "height 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)",
                        position: "relative",
                      }}>
                        <div 
                          title={`${item.sets} sets of ${item.muscle}`}
                          style={{ position: "absolute", inset: 0, cursor: "pointer" }} 
                        />
                      </div>
                      
                      {/* Muscle Label (X-Axis) */}
                      <div style={{ 
                        position: "absolute", 
                        bottom: -30, 
                        width: "120%",
                        textAlign: "center"
                      }}>
                         <div style={{
                           ...monoLabel(9, THEME.textMuted),
                           transform: data.length > 6 ? "rotate(-45deg)" : "none",
                           whiteSpace: "nowrap",
                           transformOrigin: "center center",
                         }}>
                           {item.muscle.toUpperCase()}
                         </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
