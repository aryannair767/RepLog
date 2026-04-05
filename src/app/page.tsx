"use client";

import { motion, useScroll, useTransform, useInView } from "framer-motion";
import { useRef } from "react";
import Link from "next/link";
import Script from "next/script";
import { Dumbbell, ArrowRight, Cloud, BarChart2, TrendingUp } from "lucide-react";

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
}: {
  label: string;
  title: string;
  body: string;
  tag: string;
  icon: React.ReactNode;
  delay: number;
}) {
  return (
    <Reveal delay={delay} className="h-full">
      <div className="flex flex-col justify-between p-6 sm:p-10 h-full min-h-[400px] border border-white/5 bg-[#1c1b1b] rounded-xl transition-all duration-300 hover:border-[#84cc16]/20">
        <div>
          {/* Icon */}
          <div className="mb-6 text-[#84cc16]">
            {icon}
          </div>

          <h3 className="text-3xl font-bold text-white uppercase tracking-tight mb-4 leading-tight">
            {title}
          </h3>

          <p className="text-[#c4c9ac] text-lg leading-relaxed max-w-md">
            {body}
          </p>
        </div>

        {/* Tag pill */}
        <div className="mt-8 flex gap-2">
          <span className="bg-[#3a3939] px-3 py-1 rounded-full text-[0.6rem] font-bold uppercase tracking-widest text-white border border-white/10">
            {tag}
          </span>
        </div>
      </div>
    </Reveal>
  );
}

// ── Main page ────────────────────────────────────────────────
export default function LandingPage() {
  const heroRef = useRef(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const heroY = useTransform(scrollYProgress, [0, 1], ["0%", "20%"]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.6], [1, 0]);

  return (
    <div className="min-h-screen bg-[#131313] text-[#e5e2e1] font-sans selection:bg-[#84cc16] selection:text-[#161e00]">
      {/* ── Tailwind CDN ────────────────────────────────────── */}
      <Script src="https://cdn.tailwindcss.com?plugins=forms,container-queries" strategy="beforeInteractive" />
      <script dangerouslySetInnerHTML={{
        __html: `
          tailwind.config = {
            darkMode: "class",
            theme: {
              extend: {
                colors: {
                  primary: "#84cc16",
                  surface: "#131313",
                  "surface-container": "#201f1f",
                  "surface-container-low": "#1c1b1b",
                  "surface-container-lowest": "#0e0e0e",
                  "on-surface-variant": "#c4c9ac",
                },
                fontFamily: {
                  headline: ["Inter", "sans-serif"],
                  body: ["Inter", "sans-serif"],
                },
                screens: {
                  xs: "450px",
                },
              },
            },
          }
        `
      }} />

      {/* ── NAV ───────────────────────────────────────────── */}
      <header className="fixed top-0 w-full z-50 glass-nav landing-page-header">
        <div className="w-full px-6 md:px-8 py-4 md:py-6 flex justify-start items-center">
          <Link
            href="/dashboard"
            className="flex items-center gap-4 group transition-all"
          >
            <img
              alt="REPLOG Logo"
              className="h-6 md:h-7 w-auto transition-transform group-hover:scale-110"
              src="https://lh3.googleusercontent.com/aida/ADBb0uiX027Yh7B3M8gDteRcC8KQU0Kr35tODYFxXlNDp4XQy-vD-oiqLUVpD9wXKPDQFj3Erm62gji-P8-6106OUxXoOCj5uNQK35DbRgBRGxoOz60kwJBi2JpF7xyn_OYbmSuCQgJAqf7ULY9XD5IPZvQaDhdNybMXOGlxAmILSZCPR9vQW2yJ8Hndc84RK8HB0hT7lGuhnn-ExAHnPw0FvCj0Ouaq8BL0M-bHv8omA-kKIRTSMzPyvcFBDbRT_LNIpQx5AivLf02gfw"
            />
            <span className="text-xl font-black tracking-tighter text-white uppercase font-headline group-hover:text-[#84cc16] transition-colors">
              REPLOG
            </span>
          </Link>
        </div>
      </header>

      <main className="landing-page-main pt-24 md:pt-32">
        {/* ── HERO ──────────────────────────────────────────── */}
        <section ref={heroRef} className="px-6 md:px-8 mb-24 md:mb-40 max-w-7xl mx-auto">
          <motion.div style={{ y: heroY, opacity: heroOpacity }} className="flex flex-col gap-6">
            <Reveal delay={0.1}>
              <span className="text-[#84cc16] font-bold text-[0.6875rem] tracking-[0.2em] uppercase">
                QUANTIFIED HYPERTROPHY
              </span>
            </Reveal>

            <Reveal delay={0.2}>
              <h1 className="text-3xl xs:text-4xl sm:text-6xl md:text-8xl font-black text-white tracking-tighter leading-[0.9] uppercase max-w-4xl">
                Build Muscle<br />By The Numbers.
              </h1>
            </Reveal>

            <Reveal delay={0.3}>
              <p className="text-[#c4c9ac] text-lg md:text-xl font-light max-w-xl leading-relaxed">
                Stop guessing and start tracking. RepLog is a precision lifting ledger that maps your volume, tracks progressive overload, and guarantees your next PR.
              </p>
            </Reveal>

            <Reveal delay={0.4}>
              <div className="mt-4 flex flex-col sm:flex-row gap-4">
                <Link
                  href="/dashboard"
                  className="bg-[#84cc16] text-[#161e00] px-8 py-4 rounded-md font-bold uppercase tracking-widest text-sm hover:opacity-90 transition-all flex items-center justify-center gap-2"
                >
                  Get Started
                  <ArrowRight size={18} strokeWidth={3} />
                </Link>
                <Link
                  href="/dashboard?guest=true"
                  className="border border-[#444933] text-white px-8 py-4 rounded-md font-bold uppercase tracking-widest text-sm hover:bg-[#1c1b1b] transition-all flex items-center justify-center"
                >
                  View Sample Dashboard
                </Link>
              </div>
            </Reveal>
          </motion.div>
        </section>


        {/* ── Features Bento Grid ─────────────────────────────── */}
        <section className="px-6 md:px-8 mb-40 max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            {/* Feature 1: Insights */}
            <div className="md:col-span-12 bg-[#201f1f] rounded-xl p-6 sm:p-10 flex flex-col md:flex-row gap-12 items-center border border-white/5 transition-all hover:border-[#84cc16]/20">
              <Reveal className="flex-1 w-full" delay={0.2}>
                <BarChart2 className="text-[#84cc16] mb-6" size={40} strokeWidth={2} />
                <h3 className="text-4xl font-black text-white uppercase tracking-tight mb-4">Deep Insights</h3>
                <p className="text-[#c4c9ac] text-lg leading-relaxed mb-6">
                  Track progressive overload, analyze RPE trends, track frequency, volume distribution, and estimated Set projections with surgical precision.
                </p>
                <div className="space-y-4">
                  <div className="flex items-center gap-4 group">
                    <div className="w-12 h-px bg-[#84cc16] group-hover:w-16 transition-all"></div>
                    <span className="text-[0.6875rem] font-bold uppercase tracking-widest text-white">Advanced Progression Models</span>
                  </div>
                  <div className="flex items-center gap-4 group">
                    <div className="w-12 h-px bg-[#84cc16] group-hover:w-16 transition-all"></div>
                    <span className="text-[0.6875rem] font-bold uppercase tracking-widest text-white">Weekly Volume Tracking</span>
                  </div>
                </div>
              </Reveal>

              <Reveal className="flex-1 w-full h-full min-h-[250px] md:min-h-[300px] bg-[#0e0e0e] rounded-lg border border-white/5 p-6 flex flex-col justify-end" delay={0.3}>
                <span className="text-[0.6875rem] font-bold text-[#8e9379] uppercase tracking-widest mb-auto">VOLUME DISTRIBUTION</span>

                <div className="flex items-end justify-between gap-1 sm:gap-2 h-40 mt-8">
                  <div className="w-full bg-[#84cc16] h-[60%] rounded-sm transition-all hover:bg-[#96e61a]"></div>
                  <div className="w-full bg-[#84cc16] h-[45%] rounded-sm transition-all hover:bg-[#96e61a]"></div>
                  <div className="w-full bg-[#84cc16] h-[30%] rounded-sm transition-all hover:bg-[#96e61a]"></div>
                  <div className="w-full bg-[#84cc16] h-[70%] rounded-sm transition-all hover:bg-[#96e61a]"></div>
                  <div className="w-full bg-[#84cc16] h-[100%] rounded-sm transition-all hover:bg-[#96e61a]"></div>
                  <div className="w-full bg-[#84cc16] h-[50%] rounded-sm transition-all hover:bg-[#96e61a]"></div>
                  <div className="w-full bg-[#84cc16] h-[40%] rounded-sm transition-all hover:bg-[#96e61a]"></div>
                </div>

                <div className="flex justify-between mt-3 mb-1">
                  {['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'].map((day) => (
                    <span key={day} className="text-[0.6rem] font-bold text-[#8e9379] uppercase tracking-widest flex-1 text-center">{day}</span>
                  ))}
                </div>
              </Reveal>
            </div>

            {/* Feature 2: Sync */}
            <div className="md:col-span-4 bg-[#353534] rounded-xl p-6 sm:p-10 flex flex-col border border-white/5 transition-all hover:border-[#84cc16]/20">
              <Reveal delay={0.1} className="h-full flex flex-col">
                <Cloud className="text-[#84cc16] mb-6" size={40} strokeWidth={2} />
                <h3 className="text-2xl font-bold text-white uppercase tracking-tight mb-4">Cloud Sync</h3>
                <p className="text-[#c4c9ac] text-sm leading-relaxed mb-auto">
                  Multi-device performance logging that actually works. Zero compromise on data availability when you hit the platform.
                </p>
                <img
                  src="/sync-graphic.png"
                  alt="Sync"
                  className="w-full h-auto object-cover rounded-md mt-6 block border border-white/5"
                />
              </Reveal>
            </div>

            {/* Feature 3: Progress Trajectory */}
            <div className="md:col-span-8 bg-[#1c1b1b] rounded-xl p-6 sm:p-10 flex flex-col border border-white/5 transition-all hover:border-[#84cc16]/20 min-h-[400px]">
              <Reveal delay={0} className="h-full">
                <div className="flex flex-col md:flex-row gap-8 h-full">
                  <div className="flex-1 flex flex-col justify-between">
                    <div>
                      <TrendingUp className="text-[#84cc16] mb-6" size={40} strokeWidth={2} />
                      <h3 className="text-3xl font-bold text-white uppercase tracking-tight mb-4 leading-tight">
                        Progress Over Time
                      </h3>
                      <p className="text-[#c4c9ac] text-lg leading-relaxed max-w-md">
                        Watch your strength compound. Track 1RM trends, volume ceilings, and lift histories with dynamic line graphs to visualize your biological investments.
                      </p>
                    </div>

                    <div className="mt-8 flex gap-2">
                      <span className="bg-[#3a3939] px-3 py-1 rounded-full text-[0.6rem] font-bold uppercase tracking-widest text-white border border-white/10">
                        Visualized Gains
                      </span>
                    </div>
                  </div>

                  {/* Graph Image Container */}
                  <div className="flex-1 w-full min-h-[250px] bg-[#0e0e0e] rounded-lg border border-white/5 p-4 flex flex-col justify-center overflow-hidden">
                    {/* Update this src to match your uploaded line graph image */}
                    <img
                      src="/progress-graph.png"
                      alt="Progress Line Graph"
                      className="w-full h-auto object-contain rounded-md border border-white/5"
                    />
                  </div>
                </div>
              </Reveal>
            </div>
          </div>
        </section>

        {/* ── Content Area: The Monolith Statement & Final CTA ──────────────── */}
        <section className="py-24 md:py-40 bg-[#1c1b1b]/50">
          <Reveal>
            <div className="max-w-4xl mx-auto px-6 md:px-8 text-center">
              <h2 className="text-3xl sm:text-4xl md:text-6xl font-black text-white uppercase tracking-tighter leading-tight mb-8 md:mb-12">
                Eliminate the <span className="text-[#84cc16]">Noise</span>. <br />
                Quantify your <span className="text-[#84cc16]">Progress</span>. <br />
                Force the <span className="text-[#84cc16]">Growth</span>.
              </h2>

              <p className="text-[#c4c9ac] text-lg md:text-xl font-light max-w-2xl mx-auto mb-10 leading-relaxed">
                Your next PR is a mathematical certainty. Start tracking today.
              </p>

              <div className="flex justify-center">
                <Link
                  href="/dashboard"
                  className="bg-[#84cc16] text-[#161e00] px-8 py-4 rounded-md font-bold uppercase tracking-widest text-sm hover:opacity-90 transition-all flex items-center justify-center gap-2"
                >
                  Get Started
                  <ArrowRight size={18} strokeWidth={3} />
                </Link>
              </div>
            </div>
          </Reveal>
        </section>
      </main>

      {/* ── FOOTER ────────────────────────────────────────────── */}
      <footer className="bg-[#131313] w-full py-16 md:py-20 border-t border-[#444933]/15">
        <div className="max-w-7xl mx-auto px-6 md:px-8">
          <div className="flex flex-col md:flex-row justify-between items-start gap-12 mb-16 md:mb-20">
            <div>
              <div className="text-lg font-black text-white uppercase mb-4 tracking-tighter font-headline">REPLOG PERFORMANCE</div>
              <p className="text-[#c4c9ac] text-sm max-w-xs leading-relaxed font-light">The definitive strength engineering platform for high-performance athletes.</p>
            </div>
            <div className="grid grid-cols-2 gap-12 md:gap-16">
              <div className="flex flex-col gap-4">
                <span className="text-white text-[0.6875rem] font-bold uppercase tracking-[0.2em]">Contact</span>
                <span className="text-[#84cc16] text-[0.6875rem] lowercase tracking-[0.1em] font-medium">aryannair767@gmail.com</span>
                <span className="text-[#c4c9ac] text-[0.6875rem] uppercase tracking-[0.1em] font-medium">Aryan Nair</span>
                <div className="flex gap-6 mt-2">
                  <a className="text-[#c4c9ac] hover:text-[#84cc16] transition-colors text-[0.6875rem] uppercase tracking-widest font-bold" href="https://www.linkedin.com/in/aryannair767/">LinkedIn</a>
                  <a className="text-[#c4c9ac] hover:text-[#84cc16] transition-colors text-[0.6875rem] uppercase tracking-widest font-bold" href="https://github.com/aryannair767/replog-v2">GitHub</a>
                </div>
              </div>
              <div className="flex flex-col gap-4">
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}