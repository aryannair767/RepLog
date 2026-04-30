"use client";
// ============================================================
// src/app/login/page.tsx — RepLog Login Page
// ============================================================

import { useSession, signIn } from "next-auth/react";
import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";

function LoginContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const error = searchParams.get("error");

  useEffect(() => {
    if (status === "authenticated") {
      if ((session?.user as any)?.isProfileComplete) {
        window.location.href = "/dashboard"; // Force a full refresh to lock in mobile scaling
      } else {
        router.push("/complete-profile");
      }
    }
  }, [status, session, router]);

  if (status === "loading" || status === "authenticated") {
    // Show a clean loading state (pulsing logo)
    return (
      <div style={{ minHeight: "100vh", width: "100%", maxWidth: "100vw", overflowX: "hidden", background: "#ffffff", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: 48, height: 48, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "12px", animation: "pulse 1.5s infinite" }}>
          <img src="/ReplogIcon.png" alt="RepLog Logo" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
        </div>
        <style>{`
          @keyframes pulse {
            0% { transform: scale(0.95); opacity: 0.5; }
            50% { transform: scale(1.05); opacity: 1; }
            100% { transform: scale(0.95); opacity: 0.5; }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: "100vh",
      background: "#ffffff",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: 12, // Mobile-first default
      fontFamily: "var(--font-main), sans-serif",
    }}>
      <div style={{
        width: "100%",
        maxWidth: 400,
        minWidth: 280, // Safe for iPhone SE
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
      }}>
        <div style={{
          width: 48, height: 48,
          marginBottom: 24,
        }}>
          <img src="/ReplogIcon.png" alt="RepLog Logo" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
        </div>
        <h1 style={{
          fontSize: 28,
          fontWeight: 900,
          letterSpacing: "-0.04em",
          color: "#000",
          marginBottom: 8,
          textTransform: "uppercase"
        }}>
          RepLog
        </h1>
        <p style={{
          fontSize: 14,
          color: "#6b7280",
          marginBottom: error ? 16 : 48,
          textAlign: "center"
        }}>
          Sign in to start logging your workouts and tracking progress.
        </p>

        {error && (
          <div style={{
            width: "100%",
            padding: "12px",
            background: "#fef2f2",
            border: "1px solid #fee2e2",
            color: "#dc2626",
            borderRadius: "8px",
            fontSize: 13,
            marginBottom: 24,
            textAlign: "center",
            fontWeight: 500
          }}>
            Authentication Error: {error}
          </div>
        )}

        <button
          onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
          style={{
            width: "100%",
            padding: "16px",
            background: "#ffffff",
            color: "#000",
            border: "1px solid #e5e7eb",
            borderRadius: "12px",
            fontSize: 14,
            fontWeight: 700,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "12px",
            cursor: "pointer",
            transition: "all 0.2s ease",
            boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "var(--surface-hover)";
            e.currentTarget.style.borderColor = "var(--accent-color)";
            e.currentTarget.style.transform = "translateY(-1px)";
            e.currentTarget.style.boxShadow = "var(--glow-primary)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "#ffffff";
            e.currentTarget.style.borderColor = "#e5e7eb";
            e.currentTarget.style.transform = "none";
            e.currentTarget.style.boxShadow = "0 1px 2px rgba(0,0,0,0.05)";
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
          </svg>
          Continue with Google
        </button>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: "100vh", background: "#fff" }} />}>
      <LoginContent />
    </Suspense>
  );
}
