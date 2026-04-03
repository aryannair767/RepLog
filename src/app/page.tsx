"use client";

import { motion, useScroll, useTransform, useInView } from "framer-motion";
import { useRef } from "react";
import Link from "next/link";

// ── Reveal wrapper ───────────────────────────────────────────
function Reveal({
  children,
  delay = 0,
  className = "",
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  return (
    <motion.div
      ref={ref}
      className={className}
      initial={{ opacity: 0, y: 28 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

// ── Bento card ───────────────────────────────────────────────
function BentoCard({
  label,
  title,
  body,
  tag,
  icon,
  delay,
  accent = false,
}: {
  label: string;
  title: string;
  body: string;
  tag: string;
  icon: React.ReactNode;
  delay: number;
  accent?: boolean;
}) {
  return (
    <Reveal delay={delay} className="h-full">
      <div
        className="flex flex-col justify-between p-8 md:p-10 h-full transition-all duration-300"
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius)",
          boxShadow: accent ? "var(--glow-primary)" : "none",
        }}
      >
        <div>
          {/* Icon */}
          <div
            className="mb-8 inline-flex items-center justify-center w-12 h-12"
            style={{
              background: accent ? "var(--accent-glow)" : "var(--surface-hover)",
              color: accent ? "var(--accent-color)" : "var(--text-primary)",
              borderRadius: "10px",
            }}
          >
            {icon}
          </div>

          {/* Label */}
          <p
            className="text-xs font-bold tracking-widest uppercase mb-3"
            style={{ color: accent ? "var(--accent-color)" : "var(--text-ghost)" }}
          >
            {label}
          </p>

          {/* Title */}
          <h3 className="text-xl md:text-2xl font-bold mb-4 leading-tight"
            style={{ color: "var(--text-primary)", letterSpacing: "-0.01em" }}>
            {title}
          </h3>

          {/* Body */}
          <p className="text-sm md:text-base leading-relaxed" style={{ color: "var(--text-secondary)" }}>
            {body}
          </p>
        </div>

        {/* Tag pill */}
        <div className="mt-10">
          <span
            className="inline-block text-xs px-4 py-1.5 font-mono font-medium"
            style={{
              background: "var(--surface-hover)",
              border: "1px solid var(--border-hover)",
              color: "var(--text-secondary)",
              borderRadius: "var(--radius)",
            }}
          >
            {tag}
          </span>
        </div>
      </div>
    </Reveal>
  );
}

// ── Metric pill ──────────────────────────────────────────────
function MetricPill({ label, value }: { label: string; value: string }) {
  return (
    <div
      className="flex flex-col items-center justify-center px-6 py-8"
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius)",
      }}
    >
      <span
        className="text-3xl md:text-4xl font-black mb-2"
        style={{ color: "var(--text-primary)", letterSpacing: "-0.04em" }}
      >
        {value}
      </span>
      <span className="text-xs font-bold tracking-widest uppercase text-center" style={{ color: "var(--text-ghost)" }}>
        {label}
      </span>
    </div>
  );
}

// ── Tech badge ───────────────────────────────────────────────
function TechBadge({ name, sub }: { name: string; sub: string }) {
  return (
    <div
      className="flex flex-col items-center gap-1 px-6 py-5 transition-all duration-300 hover:scale-[1.03]"
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius)",
      }}
    >
      <span className="text-sm font-bold" style={{ color: "var(--text-primary)", letterSpacing: "-0.02em" }}>{name}</span>
      <span className="text-xs" style={{ color: "var(--text-secondary)" }}>{sub}</span>
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────
export default function LandingPage() {
  const heroRef = useRef(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const heroY = useTransform(scrollYProgress, [0, 1], ["0%", "20%"]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.6], [1, 0]);

  return (
    <main
      className="min-h-screen overflow-x-hidden font-sans"
      style={{
        background: "var(--bg)",
        color: "var(--text-primary)",
        fontFamily: "var(--font-main)",
      }}
    >
      <style>{`
        * { box-sizing: border-box; }
        ::selection { background: var(--accent-glow); color: var(--text-primary); }
      `}</style>

      {/* ── NAV ───────────────────────────────────────────── */}
      <motion.nav
        className="relative z-20 flex items-center justify-between px-6 md:px-12 py-8"
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      >
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: "var(--accent-color)" }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="var(--bg)">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
            </svg>
          </div>
          <span
            className="text-base font-bold tracking-tight uppercase"
            style={{ color: "var(--text-primary)", letterSpacing: "-0.02em" }}
          >
            RepLog
          </span>
        </div>

        {/* CTA */}
        <Link
          href="/dashboard"
          className="text-sm font-bold px-5 py-2.5 transition-all duration-200 hover:scale-105"
          style={{
            background: "var(--accent-color)",
            color: "var(--bg)",
            borderRadius: "var(--radius)",
            letterSpacing: "-0.01em",
            boxShadow: "var(--glow-primary)",
          }}
        >
          Get Started
        </Link>
      </motion.nav>

      {/* ── HERO ──────────────────────────────────────────── */}
      <section
        ref={heroRef}
        className="relative z-10 flex flex-col items-center text-center px-6 pt-24 pb-32 md:pt-32 md:pb-40"
      >
        <motion.div style={{ y: heroY, opacity: heroOpacity }}>
          {/* Badge */}
          <motion.div
            className="inline-flex items-center gap-2 px-5 py-2.5 mb-12"
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: "40px",
            }}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <span
              className="text-xs font-mono font-medium tracking-widest uppercase"
              style={{ color: "var(--text-primary)" }}
            >
              Offline-First · Data-Driven · Open Beta
            </span>
          </motion.div>

          {/* Headline */}
          <motion.h1
            className="text-5xl md:text-7xl lg:text-8xl font-black leading-none tracking-tight mb-8 max-w-5xl"
            style={{ letterSpacing: "-0.04em", color: "var(--text-primary)" }}
            initial={{ opacity: 0, y: 32 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
          >
            Precision Training.{" "}
            <span
              className="italic font-light"
              style={{ color: "var(--text-secondary)" }}
            >
              Bulletproof
            </span>{" "}
            Data.
          </motion.h1>

          {/* Sub-headline */}
          <motion.p
            className="text-lg md:text-xl max-w-2xl mx-auto leading-relaxed mb-16"
            style={{ color: "var(--text-secondary)", letterSpacing: "-0.01em" }}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.35, ease: [0.22, 1, 0.36, 1] }}
          >
            An offline-first, data-driven powerlifting tracker built for
            athletes who value integrity over bloat.
          </motion.p>

          {/* CTAs */}
          <motion.div
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
          >
            <Link
              href="/dashboard"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 font-bold text-sm transition-all duration-200 hover:scale-105"
              style={{
                background: "var(--accent-color)",
                color: "var(--bg)",
                borderRadius: "var(--radius)",
                letterSpacing: "-0.01em",
                boxShadow: "var(--glow-primary)",
              }}
            >
              Get Started
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
              </svg>
            </Link>

            <Link
              href="/dashboard?guest=true"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 font-bold text-sm transition-all duration-200 hover:scale-105"
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                color: "var(--text-primary)",
                borderRadius: "var(--radius)",
                letterSpacing: "-0.01em",
              }}
            >
              View Demo
            </Link>
          </motion.div>
        </motion.div>
      </section>

      {/* ── METRICS STRIP ─────────────────────────────────── */}
      <section id="metrics" className="relative z-10 px-6 md:px-12 pb-32">
        <Reveal>
          <div
            className="max-w-5xl mx-auto p-8 md:p-12"
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius)",
            }}
          >
            <p className="text-xs font-bold tracking-widest uppercase text-center mb-10" style={{ color: "var(--text-ghost)" }}>
              Metrics that matter
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <MetricPill value="RPE" label="Perceived Exertion" />
              <MetricPill value="RIR" label="Reps in Reserve" />
              <MetricPill value="7d" label="Volume Distribution" />
              <MetricPill value="0ms" label="Offline Latency" />
            </div>
          </div>
        </Reveal>
      </section>

      {/* ── BENTO GRID ────────────────────────────────────── */}
      <section id="features" className="relative z-10 px-6 md:px-12 pb-40">
        <Reveal>
          <h2
            className="text-3xl md:text-5xl font-black text-center mb-16 max-w-2xl mx-auto"
            style={{ letterSpacing: "-0.04em", color: "var(--text-primary)" }}
          >
            The infrastructure your{" "}
            <span style={{ color: "var(--text-secondary)", fontStyle: "italic", fontWeight: 300 }}>training deserves.</span>
          </h2>
        </Reveal>

        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
          <BentoCard
            delay={0}
            accent
            label="Offline First"
            title="Train anywhere. Sync everywhere."
            body="Powered by Service Workers and IndexedDB, RepLog works in basement gyms with zero signal. Your data never waits for a network."
            tag="Service Workers · IndexedDB"
            icon={
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
              </svg>
            }
          />

          <BentoCard
            delay={0.1}
            label="Cloud Sync"
            title="Multi-device. Zero compromise."
            body="A hardened PostgreSQL backbone via Supabase keeps your training history safe, versioned, and instantly available across every device."
            tag="Supabase · PostgreSQL"
            icon={
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <ellipse cx="12" cy="5" rx="9" ry="3" /><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" /><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
              </svg>
            }
          />

          <BentoCard
            delay={0.2}
            label="Deep Insights"
            title="Data science for strength athletes."
            body="Track RPE, RIR, and volume per muscle group. Visualise weekly distribution and detect strength trends before plateaus happen."
            tag="RPE · RIR · Volume"
            icon={
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" />
              </svg>
            }
          />
        </div>
      </section>

      {/* ── TECH STACK ────────────────────────────────────── */}
      <section id="stack" className="relative z-10 px-6 md:px-12 pb-40">
        <Reveal>
          <p
            className="text-xs font-bold tracking-widest uppercase text-center mb-10"
            style={{ color: "var(--text-ghost)" }}
          >
            Powered by
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4 max-w-3xl mx-auto">
            <TechBadge name="Next.js 14" sub="App Router" />
            <TechBadge name="Prisma" sub="ORM" />
            <TechBadge name="Supabase" sub="PostgreSQL" />
            <TechBadge name="NextAuth" sub="Google OAuth" />
            <TechBadge name="IndexedDB" sub="Offline Cache" />
            <TechBadge name="Vercel" sub="Edge Deploy" />
          </div>
        </Reveal>
      </section>

      {/* ── FOOTER ────────────────────────────────────────── */}
      <footer
        className="relative z-10 px-6 md:px-12 py-16 flex flex-col md:flex-row items-center justify-between gap-10"
        style={{ borderTop: "1px solid var(--border)", background: "var(--bg)" }}
      >
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <div
              className="w-6 h-6 flex items-center justify-center"
              style={{ background: "var(--accent-color)", borderRadius: "6px" }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="var(--bg)">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
              </svg>
            </div>
            <span className="text-sm font-bold tracking-tight uppercase" style={{ color: "var(--text-primary)", letterSpacing: "-0.01em" }}>
              RepLog
            </span>
          </div>
          <p className="text-xs" style={{ color: "var(--text-ghost)" }}>
            © {new Date().getFullYear()} RepLog. Built for athletes who mean business.
          </p>
        </div>

        <div className="flex flex-col md:items-end gap-2 text-center md:text-right w-full md:w-auto">
          <span className="text-xs font-bold tracking-widest uppercase" style={{ color: "var(--text-ghost)" }}>
            Designed & Developed By
          </span>
          <p className="text-lg font-black tracking-tight" style={{ color: "var(--text-primary)", letterSpacing: "-0.02em" }}>
            Aryan Nair
          </p>
          <a
            href="mailto:aryannair767@gmail.com"
            className="text-sm font-bold transition-opacity duration-200 hover:opacity-80"
            style={{ color: "var(--accent-color)" }}
          >
            aryannair767@gmail.com
          </a>
        </div>
      </footer>
    </main>
  );
}
