"use client";

import { motion, useScroll, useTransform, useInView } from "framer-motion";
import { useRef, useEffect } from "react";
import Link from "next/link";

// ── Noise texture SVG as data URI ────────────────────────────
const NOISE =
  "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.04'/%3E%3C/svg%3E\")";

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
    <Reveal delay={delay}>
      <div
        className="group relative flex flex-col justify-between rounded-2xl border p-8 h-full overflow-hidden transition-all duration-500"
        style={{
          background: accent
            ? "linear-gradient(135deg, #bef26418 0%, #bef26408 100%)"
            : "rgba(255,255,255,0.02)",
          borderColor: accent ? "#bef26440" : "rgba(255,255,255,0.06)",
          backdropFilter: "blur(12px)",
        }}
      >
        {/* Hover glow */}
        <div
          className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 rounded-2xl"
          style={{
            background: "radial-gradient(400px circle at var(--mx,50%) var(--my,50%), rgba(190,242,100,0.06), transparent 60%)",
          }}
        />

        <div>
          {/* Icon */}
          <div
            className="mb-6 inline-flex items-center justify-center w-11 h-11 rounded-xl"
            style={{
              background: accent ? "rgba(190,242,100,0.15)" : "rgba(255,255,255,0.05)",
              border: accent ? "1px solid rgba(190,242,100,0.3)" : "1px solid rgba(255,255,255,0.08)",
            }}
          >
            {icon}
          </div>

          {/* Label */}
          <p
            className="text-xs tracking-widest uppercase mb-3 font-medium"
            style={{ color: accent ? "#bef264" : "rgba(255,255,255,0.35)" }}
          >
            {label}
          </p>

          {/* Title */}
          <h3 className="text-xl font-bold text-white mb-3 leading-tight"
            style={{ fontFamily: "'DM Sans', sans-serif", letterSpacing: "-0.03em" }}>
            {title}
          </h3>

          {/* Body */}
          <p className="text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.45)" }}>
            {body}
          </p>
        </div>

        {/* Tag pill */}
        <div className="mt-8">
          <span
            className="inline-block text-xs px-3 py-1 rounded-full font-mono"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
              color: "rgba(255,255,255,0.3)",
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
      className="flex flex-col items-center justify-center px-6 py-4 rounded-2xl"
      style={{
        background: "rgba(190,242,100,0.05)",
        border: "1px solid rgba(190,242,100,0.15)",
      }}
    >
      <span
        className="text-3xl font-black"
        style={{ color: "#bef264", fontFamily: "'DM Sans', sans-serif", letterSpacing: "-0.04em" }}
      >
        {value}
      </span>
      <span className="text-xs mt-1 tracking-widest uppercase" style={{ color: "rgba(255,255,255,0.35)" }}>
        {label}
      </span>
    </div>
  );
}

// ── Tech badge ───────────────────────────────────────────────
function TechBadge({ name, sub }: { name: string; sub: string }) {
  return (
    <div
      className="flex flex-col items-center gap-1 px-5 py-4 rounded-xl transition-all duration-300 hover:scale-105"
      style={{
        background: "rgba(255,255,255,0.02)",
        border: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      <span className="text-sm font-bold text-white" style={{ letterSpacing: "-0.02em" }}>{name}</span>
      <span className="text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>{sub}</span>
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────
export default function LandingPage() {
  const heroRef = useRef(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const heroY = useTransform(scrollYProgress, [0, 1], ["0%", "20%"]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.6], [1, 0]);

  // Mouse glow on bento cards
  useEffect(() => {
    const cards = document.querySelectorAll<HTMLElement>(".group");
    const move = (e: MouseEvent) => {
      cards.forEach((card) => {
        const rect = card.getBoundingClientRect();
        card.style.setProperty("--mx", `${e.clientX - rect.left}px`);
        card.style.setProperty("--my", `${e.clientY - rect.top}px`);
      });
    };
    window.addEventListener("mousemove", move);
    return () => window.removeEventListener("mousemove", move);
  }, []);

  return (
    <main
      className="min-h-screen overflow-x-hidden"
      style={{
        background: "#09090b",
        color: "#fff",
        fontFamily: "'DM Sans', sans-serif",
      }}
    >
      {/* Google font import */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,700;0,9..40,900;1,9..40,300&family=DM+Mono:wght@400;500&display=swap');
        * { box-sizing: border-box; }
        ::selection { background: rgba(190,242,100,0.3); }
      `}</style>

      {/* ── Noise overlay ─────────────────────────────────── */}
      <div
        className="pointer-events-none fixed inset-0 z-0"
        style={{ backgroundImage: NOISE, opacity: 0.4 }}
      />

      {/* ── Grid lines ────────────────────────────────────── */}
      <div
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)",
          backgroundSize: "80px 80px",
        }}
      />

      {/* ── Ambient glow ──────────────────────────────────── */}
      <div
        className="pointer-events-none fixed top-0 left-1/2 -translate-x-1/2 w-[900px] h-[500px] z-0"
        style={{
          background: "radial-gradient(ellipse at center, rgba(190,242,100,0.07) 0%, transparent 70%)",
          filter: "blur(40px)",
        }}
      />

      {/* ── NAV ───────────────────────────────────────────── */}
      <motion.nav
        className="relative z-20 flex items-center justify-between px-6 md:px-12 py-6"
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      >
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: "#bef264" }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="#000">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
            </svg>
          </div>
          <span
            className="text-base font-bold tracking-tight text-white uppercase"
            style={{ letterSpacing: "-0.02em" }}
          >
            RepLog
          </span>
        </div>

        {/* Nav links */}
        <div className="hidden md:flex items-center gap-8">
          {["Features", "Stack", "Metrics"].map((item) => (
            <a
              key={item}
              href={`#${item.toLowerCase()}`}
              className="text-sm transition-colors duration-200 hover:text-white"
              style={{ color: "rgba(255,255,255,0.4)", letterSpacing: "-0.01em" }}
            >
              {item}
            </a>
          ))}
        </div>

        {/* CTA */}
        <Link
          href="/dashboard"
          className="text-sm font-semibold px-4 py-2 rounded-lg transition-all duration-200 hover:scale-105"
          style={{
            background: "#bef264",
            color: "#000",
            letterSpacing: "-0.01em",
          }}
        >
          Get Started
        </Link>
      </motion.nav>

      {/* ── HERO ──────────────────────────────────────────── */}
      <section
        ref={heroRef}
        className="relative z-10 flex flex-col items-center text-center px-6 pt-16 pb-32 md:pt-24 md:pb-40"
      >
        <motion.div style={{ y: heroY, opacity: heroOpacity }}>
          {/* Badge */}
          <motion.div
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-10"
            style={{
              background: "rgba(190,242,100,0.08)",
              border: "1px solid rgba(190,242,100,0.2)",
            }}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-lime-300 animate-pulse" />
            <span
              className="text-xs font-mono tracking-widest uppercase"
              style={{ color: "#bef264" }}
            >
              Offline-First · Data-Driven · Open Beta
            </span>
          </motion.div>

          {/* Headline */}
          <motion.h1
            className="text-5xl md:text-7xl lg:text-8xl font-black leading-none tracking-tight mb-6 max-w-5xl"
            style={{ letterSpacing: "-0.04em" }}
            initial={{ opacity: 0, y: 32 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
          >
            Precision Training.{" "}
            <span
              className="italic font-light"
              style={{ color: "#bef264" }}
            >
              Bulletproof
            </span>{" "}
            Data.
          </motion.h1>

          {/* Sub-headline */}
          <motion.p
            className="text-base md:text-lg max-w-xl mx-auto leading-relaxed mb-12"
            style={{ color: "rgba(255,255,255,0.45)", letterSpacing: "-0.01em" }}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.35, ease: [0.22, 1, 0.36, 1] }}
          >
            An offline-first, data-driven powerlifting tracker built for
            athletes who value integrity over bloat.
          </motion.p>

          {/* CTAs */}
          <motion.div
            className="flex flex-col sm:flex-row items-center justify-center gap-3"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
          >
            <Link
              href="/dashboard"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl font-bold text-sm transition-all duration-200 hover:scale-105 hover:shadow-lg"
              style={{
                background: "#bef264",
                color: "#000",
                letterSpacing: "-0.01em",
                boxShadow: "0 0 30px rgba(190,242,100,0.25)",
              }}
            >
              Get Started
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
              </svg>
            </Link>

            <Link
              href="/dashboard?guest=true"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl font-semibold text-sm transition-all duration-200 hover:scale-105"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.1)",
                color: "rgba(255,255,255,0.7)",
                letterSpacing: "-0.01em",
              }}
            >
              View Demo
            </Link>
          </motion.div>
        </motion.div>

        {/* Scroll indicator */}
        <motion.div
          className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
        >
          <span className="text-xs tracking-widest uppercase" style={{ color: "rgba(255,255,255,0.2)" }}>
            Scroll
          </span>
          <motion.div
            className="w-px h-10"
            style={{ background: "linear-gradient(to bottom, rgba(190,242,100,0.4), transparent)" }}
            animate={{ scaleY: [0.3, 1, 0.3] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          />
        </motion.div>
      </section>

      {/* ── METRICS STRIP ─────────────────────────────────── */}
      <section id="metrics" className="relative z-10 px-6 md:px-12 pb-24">
        <Reveal>
          <div
            className="max-w-4xl mx-auto rounded-2xl p-8"
            style={{
              background: "rgba(255,255,255,0.02)",
              border: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            <p className="text-xs tracking-widest uppercase text-center mb-8" style={{ color: "rgba(255,255,255,0.25)" }}>
              Metrics that matter
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <MetricPill value="RPE" label="Perceived Exertion" />
              <MetricPill value="RIR" label="Reps in Reserve" />
              <MetricPill value="7d" label="Volume Distribution" />
              <MetricPill value="0ms" label="Offline Latency" />
            </div>
          </div>
        </Reveal>
      </section>

      {/* ── BENTO GRID ────────────────────────────────────── */}
      <section id="features" className="relative z-10 px-6 md:px-12 pb-32">
        <Reveal>
          <p className="text-xs tracking-widest uppercase text-center mb-4" style={{ color: "rgba(255,255,255,0.25)" }}>
            Built different
          </p>
          <h2
            className="text-3xl md:text-5xl font-black text-center mb-16 max-w-2xl mx-auto"
            style={{ letterSpacing: "-0.04em" }}
          >
            The infrastructure your{" "}
            <span style={{ color: "#bef264" }}>training deserves.</span>
          </h2>
        </Reveal>

        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-4">
          <BentoCard
            delay={0}
            accent
            label="Offline First"
            title="Train anywhere. Sync everywhere."
            body="Powered by Service Workers and IndexedDB, RepLog works in basement gyms with zero signal. Your data never waits for a network."
            tag="Service Workers · IndexedDB · 0ms latency"
            icon={
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#bef264" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
              </svg>
            }
          />

          <BentoCard
            delay={0.1}
            label="Cloud Sync"
            title="Multi-device. Zero compromise."
            body="A hardened PostgreSQL backbone via Supabase keeps your training history safe, versioned, and instantly available across every device."
            tag="Supabase · PostgreSQL · Prisma ORM"
            icon={
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <ellipse cx="12" cy="5" rx="9" ry="3" /><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" /><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
              </svg>
            }
          />

          <BentoCard
            delay={0.2}
            label="Deep Insights"
            title="Data science for strength athletes."
            body="Track RPE, RIR, and volume per muscle group. Visualise weekly distribution and detect strength trends before plateaus happen."
            tag="RPE · RIR · Volume · Frequency"
            icon={
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" />
              </svg>
            }
          />
        </div>
      </section>

      {/* ── TECH STACK ────────────────────────────────────── */}
      <section id="stack" className="relative z-10 px-6 md:px-12 pb-32">
        <Reveal>
          <p
            className="text-xs tracking-widest uppercase text-center mb-10"
            style={{ color: "rgba(255,255,255,0.25)" }}
          >
            Powered by
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 max-w-2xl mx-auto">
            <TechBadge name="Next.js 14" sub="App Router" />
            <TechBadge name="Prisma" sub="ORM" />
            <TechBadge name="Supabase" sub="PostgreSQL" />
            <TechBadge name="NextAuth" sub="Google OAuth" />
            <TechBadge name="IndexedDB" sub="Offline Cache" />
            <TechBadge name="Vercel" sub="Edge Deploy" />
          </div>
        </Reveal>
      </section>

      {/* ── FINAL CTA ─────────────────────────────────────── */}
      <section className="relative z-10 px-6 md:px-12 pb-32">
        <Reveal>
          <div
            className="max-w-3xl mx-auto rounded-3xl p-12 md:p-16 text-center relative overflow-hidden"
            style={{
              background: "linear-gradient(135deg, rgba(190,242,100,0.08) 0%, rgba(190,242,100,0.03) 100%)",
              border: "1px solid rgba(190,242,100,0.2)",
            }}
          >
            {/* Corner glow */}
            <div
              className="absolute -top-20 -right-20 w-64 h-64 rounded-full pointer-events-none"
              style={{
                background: "radial-gradient(circle, rgba(190,242,100,0.12) 0%, transparent 70%)",
                filter: "blur(20px)",
              }}
            />

            <h2
              className="text-3xl md:text-5xl font-black mb-4"
              style={{ letterSpacing: "-0.04em" }}
            >
              Start logging with{" "}
              <span style={{ color: "#bef264" }}>precision.</span>
            </h2>
            <p className="mb-10 text-sm md:text-base" style={{ color: "rgba(255,255,255,0.4)" }}>
              Free to use. No credit card. Works offline from day one.
            </p>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-xl font-bold text-sm transition-all duration-200 hover:scale-105"
              style={{
                background: "#bef264",
                color: "#000",
                letterSpacing: "-0.01em",
                boxShadow: "0 0 40px rgba(190,242,100,0.3)",
              }}
            >
              Get Started Free
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
              </svg>
            </Link>
          </div>
        </Reveal>
      </section>

      {/* ── FOOTER ────────────────────────────────────────── */}
      <footer
        className="relative z-10 px-6 md:px-12 py-12 flex flex-col md:flex-row items-center justify-between gap-8"
        style={{ borderTop: "1px solid rgba(255,255,255,0.08)", background: "rgba(0,0,0,0.2)" }}
      >
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <div
              className="w-5 h-5 rounded flex items-center justify-center"
              style={{ background: "#bef264" }}
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="#000">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
              </svg>
            </div>
            <span className="text-xs font-bold uppercase tracking-tight text-white" style={{ letterSpacing: "-0.01em" }}>
              RepLog
            </span>
          </div>
          <p className="text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>
            © {new Date().getFullYear()} RepLog. Built for athletes who mean business.
          </p>
        </div>

        <div className="flex flex-col md:items-end gap-1.5 text-center md:text-right w-full md:w-auto">
          <span className="text-xs tracking-widest uppercase" style={{ color: "rgba(255,255,255,0.3)" }}>
            Designed & Developed By
          </span>
          <p className="text-base font-bold text-white tracking-tight" style={{ letterSpacing: "-0.02em" }}>
            Aryan Nair
          </p>
          <a
            href="mailto:aryannair767@gmail.com"
            className="text-sm font-medium transition-colors duration-200"
            style={{ color: "#bef264" }}
          >
            aryannair767@gmail.com
          </a>
        </div>
      </footer>
    </main>
  );
}
