"use client";

import React from "react";
import Link from "next/link";
import { ThemeProvider } from "@/components/ThemeProvider";

export default function OfflinePage() {
  return (
    <ThemeProvider>
      <div style={{
        minHeight: "100vh",
        background: "var(--bg)",
        color: "var(--text-primary)",
        fontFamily: "var(--font-main)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
        textAlign: "center"
      }}>
        {/* Offline Icon */}
        <div style={{ marginBottom: 24, color: "var(--accent-color)" }}>
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="1" y1="1" x2="23" y2="23" />
            <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55" />
            <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39" />
            <path d="M10.71 5.05A16 16 0 0 1 22.58 9" />
            <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88" />
            <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
            <line x1="12" y1="20" x2="12.01" y2="20" />
          </svg>
        </div>

        <h1 style={{ fontSize: "24px", fontWeight: 800, marginBottom: "8px", textTransform: "uppercase", letterSpacing: "-0.02em" }}>
          You are currently offline
        </h1>
        
        <p style={{ color: "var(--text-secondary)", fontSize: "14px", maxWidth: "300px", marginBottom: "32px", lineHeight: 1.5 }}>
          It looks like you've lost your connection. 
          Your background workouts are secured in the <b>Shadow Backup</b> database.
        </p>

        <Link href="/" style={{
          background: "var(--accent-color)",
          color: "#000",
          padding: "12px 24px",
          borderRadius: "var(--radius, 12px)",
          textDecoration: "none",
          fontWeight: 800,
          textTransform: "uppercase",
          fontSize: "13px",
          boxShadow: "var(--glow-primary)"
        }}>
          Try Again
        </Link>
      </div>
    </ThemeProvider>
  );
}
