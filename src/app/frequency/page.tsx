"use client";

import { getWeeklyMuscleFrequency } from "@/app/actions/stats";
import { getData, putData, STORES } from "@/lib/local-backup";
import Link from "next/link";
import React, { useState, useEffect } from "react";

// ============================================================
// THEME CONSTANTS (Copied for consistency)
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

function monoLabel(size = 9, color = THEME.textMuted): React.CSSProperties {
  return {
    fontFamily: THEME.fontMono,
    fontSize: size,
    color,
    textTransform: "uppercase",
    letterSpacing: "0.04em",
  };
}

export default function FrequencyPage() {
  const [data, setData] = useState<{ muscle: string; frequency: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const isGuest = typeof window !== "undefined" && new URLSearchParams(window.location.search).get("guest") === "true";
      if (isGuest) {
        setData([
          { muscle: "Quadriceps", frequency: 2 },
          { muscle: "Hamstrings", frequency: 1 },
          { muscle: "Calves", frequency: 1 },
          { muscle: "Chest", frequency: 2 },
          { muscle: "Back", frequency: 2 },
          { muscle: "Shoulders", frequency: 1 },
          { muscle: "Arms", frequency: 2 }
        ]);
        setLoading(false);
        return;
      }

      // 1. Fetch fresh data from server first
      if (typeof navigator !== "undefined" && navigator.onLine) {
        try {
          const res = await getWeeklyMuscleFrequency();
          setData(res);
          putData(STORES.STATS, { id: "freq_breakdown", data: res }).catch(() => {});
          setLoading(false);
          return; // Done
        } catch(e) {
          // Fallback to cache on error
        }
      }
      
      // 2. Fallback to IndexedDB cache (Offline or server fail)
      const cached = await getData(STORES.STATS, "freq_breakdown").catch(() => null);
      if (cached) {
        setData((cached as any).data);
      }
      setLoading(false);
    }
    load();
  }, []);

  const LOWER_BODY_MUSCLES = ["Quadriceps", "Hamstrings", "Calves", "Glutes", "Legs"];

  const isLower = (d: any) => LOWER_BODY_MUSCLES.includes(d.muscle) || d.bodyRegion === "lower";
  const lowerData = data.filter(d => isLower(d));
  const upperData = data.filter(d => (!isLower(d) && d.muscle !== "Custom"));

  // The maximum frequency any muscle could be hit in a week is 7 days
  const maxFreq = 7;

  if (loading) {
    return (
      <div style={{ 
        minHeight: "100vh", 
        background: "var(--bg)", 
        display: "flex", 
        alignItems: "center", 
        justifyContent: "center" 
      }}>
        <span style={{ 
          fontFamily: "var(--font-main)", 
          fontSize: 12, 
          color: "var(--accent-color)", 
          textTransform: "uppercase", 
          letterSpacing: "0.08em" 
        }}>
          Analyzing frequency data...
        </span>
      </div>
    );
  }

  // Helper to render a chart given data and title
  const renderChart = (title: string, chartData: { muscle: string; frequency: number }[]) => (
    <div style={{
      background: "var(--surface)",
      backdropFilter: "blur(12px)",
      WebkitBackdropFilter: "blur(12px)",
      border: `1px solid var(--border)`,
      borderRadius: "var(--radius)",
      padding: "32px 24px 24px",
      marginBottom: 32,
    }}>
      <h2 style={{ ...monoLabel(12), marginBottom: 40, borderBottom: `1px solid ${THEME.border}`, paddingBottom: 12 }}>
        {title} [Days / Week]
      </h2>

      {chartData.length === 0 ? (
        <div style={{ textAlign: "center", padding: "40px 0", color: THEME.textGhost, ...monoLabel(12) }}>
          No frequency data recorded for this zone yet.
        </div>
      ) : (
        <div style={{ 
          position: "relative",
          height: 340, 
          paddingTop: 20,
          paddingLeft: 40,
        }}>
          {/* Y-AXIS LABELS */}
          <div style={{ 
            position: "absolute", 
            left: 0, top: 20, 
            height: 280,
            display: "flex", flexDirection: "column", justifyContent: "space-between", 
            ...monoLabel(9, THEME.textGhost),
            width: 30, textAlign: "right",
            paddingRight: 10,
          }}>
            <span>7</span>
            <span>4</span>
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
            {chartData.map((item) => {
              const heightPct = Math.max((item.frequency / maxFreq) * 100, 2); 
              return (
                <div key={item.muscle} style={{ 
                  flex: 1, 
                  display: "flex", 
                  flexDirection: "column", 
                  alignItems: "center", 
                  gap: 8,
                  height: "100%",
                  justifyContent: "flex-end",
                  maxWidth: 80,
                  position: "relative",
                }}>
                  {/* Count above bar */}
                  <span style={{ ...monoLabel(10, THEME.textPrimary), marginBottom: 2 }}>
                    {item.frequency}
                  </span>

                  {/* Vertical Bar */}
                  <div style={{
                    width: "70%",
                    height: `${heightPct}%`,
                    background: "var(--accent-color)",
                    borderRadius: "4px 4px 0 0",
                    transition: "height 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)",
                    position: "relative",
                  }}>
                    <div 
                      title={`${item.frequency} days of ${item.muscle}`}
                      style={{ position: "absolute", inset: 0, cursor: "crosshair" }} 
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
                       whiteSpace: "nowrap",
                       transformOrigin: "center center",
                       // Only rotate if there are many labels
                       transform: chartData.length > 5 ? "rotate(-45deg) translate(-8px, -6px)" : "none",
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
  );

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
        background: "var(--header-bg)", backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(16px)",
        transition: "background var(--transition), border-color var(--transition)",
        borderBottom: `1px solid ${THEME.border}`,
        padding: "16px 24px",
        display: "flex", alignItems: "center", gap: 16,
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
        <span style={{ fontSize: 16, fontWeight: 900, letterSpacing: "-0.02em" }}>FREQUENCY BREAKDOWN</span>
      </header>

      <main style={{ padding: "32px 24px", maxWidth: 900, margin: "0 auto" }}>
        
        {/* TOP STAT */}
        <div style={{ marginBottom: 40 }}>
          <p style={monoLabel(11, THEME.textGhost)}>Muscle Engagement Distribution</p>
          <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
            <h1 style={{ fontSize: 48, fontWeight: 900, margin: 0, lineHeight: 1, letterSpacing: "-0.04em" }}>
              {(data.reduce((sum, item) => sum + item.frequency, 0) / (data.length || 1)).toFixed(1)}
            </h1>
            <span style={monoLabel(14, THEME.lime)}>AVG DAYS/WK PER MUSCLE</span>
          </div>
        </div>

        {/* CHARTS */}
        {renderChart("Upper Body Matrix", upperData)}
        {renderChart("Lower Body Matrix", lowerData)}

      </main>
    </div>
  );
}
