"use client";

import Script from "next/script";
import Link from "next/link";
import { useEffect } from "react";

export default function LandingPage() {
  // Add Google Fonts
  useEffect(() => {
    const link1 = document.createElement("link");
    link1.href = "https://fonts.googleapis.com/css2?family=Inter:wght@100;300;400;700;900&display=swap";
    link1.rel = "stylesheet";
    
    const link2 = document.createElement("link");
    link2.href = "https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap";
    link2.rel = "stylesheet";
    
    document.head.appendChild(link1);
    document.head.appendChild(link2);
    
    return () => {
      document.head.removeChild(link1);
      document.head.removeChild(link2);
    };
  }, []);

  return (
    <div className="font-body selection:bg-primary-fixed selection:text-on-primary-fixed" style={{ backgroundColor: "#131313", color: "#e5e2e1", minHeight: "100vh" }}>
      <Script src="https://cdn.tailwindcss.com?plugins=forms,container-queries" strategy="beforeInteractive" />
      <Script id="tailwind-config" strategy="beforeInteractive">
        {`
          tailwind.config = {
            darkMode: "class",
            theme: {
              extend: {
                colors: {
                  "tertiary-fixed-dim": "#c7c6c6",
                  "tertiary-fixed": "#e3e2e2",
                  "inverse-on-surface": "#313030",
                  "on-background": "#e5e2e1",
                  "on-primary": "#283500",
                  "primary-fixed-dim": "#abd600",
                  "surface": "#131313",
                  "on-secondary": "#2f3131",
                  "secondary-fixed": "#e2e2e2",
                  "primary-fixed": "#c3f400",
                  "surface-container-low": "#1c1b1b",
                  "surface-container": "#201f1f",
                  "primary": "#ffffff",
                  "primary-container": "#c3f400",
                  "on-secondary-container": "#b4b5b5",
                  "surface-dim": "#131313",
                  "surface-tint": "#abd600",
                  "inverse-primary": "#506600",
                  "secondary-fixed-dim": "#c6c6c7",
                  "error": "#ffb4ab",
                  "secondary": "#c6c6c7",
                  "outline": "#8e9379",
                  "surface-variant": "#353534",
                  "on-secondary-fixed": "#1a1c1c",
                  "on-surface-variant": "#c4c9ac",
                  "on-primary-fixed-variant": "#3c4d00",
                  "on-secondary-fixed-variant": "#454747",
                  "surface-bright": "#3a3939",
                  "inverse-surface": "#e5e2e1",
                  "outline-variant": "#444933",
                  "surface-container-lowest": "#0e0e0e",
                  "tertiary": "#ffffff",
                  "on-error-container": "#ffdad6",
                  "on-primary-container": "#556d00",
                  "secondary-container": "#454747",
                  "tertiary-container": "#e3e2e2",
                  "surface-container-highest": "#353534",
                  "on-error": "#690005",
                  "background": "#131313",
                  "on-surface": "#e5e2e1",
                  "on-primary-fixed": "#161e00",
                  "on-tertiary-fixed": "#1b1c1c",
                  "error-container": "#93000a",
                  "surface-container-high": "#2a2a2a",
                  "on-tertiary-container": "#646464",
                  "on-tertiary": "#303031",
                  "on-tertiary-fixed-variant": "#464747"
                },
                borderRadius: {
                  DEFAULT: "0.125rem",
                  lg: "0.25rem",
                  xl: "0.5rem",
                  full: "0.75rem"
                },
                fontFamily: {
                  headline: ["Inter"],
                  body: ["Inter"],
                  label: ["Inter"]
                }
              }
            }
          }
        `}
      </Script>
      <style jsx global>{`
        .material-symbols-outlined { font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24; }
        .glass-nav { background: rgba(19, 19, 19, 0.7); backdrop-filter: blur(20px); }
        .kinetic-gradient { background: linear-gradient(135deg, #c3f400 0%, #abd600 100%); }
      `}</style>
      
      {/* TopAppBar Predicted Component */}
      <header className="fixed top-0 w-full z-50 glass-nav">
        <div className="max-w-7xl mx-auto px-8 py-6 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#CCFF00] text-2xl" data-icon="fitness_center">fitness_center</span>
            <span className="text-xl font-black tracking-tighter text-white uppercase font-headline">REPLOG</span>
          </div>
          <Link href="/dashboard" className="bg-[#CCFF00] text-[#161E00] px-5 py-2 rounded-md font-bold text-[0.6875rem] uppercase tracking-wider hover:opacity-80 transition-all active:scale-95 duration-200">
            START TRAINING
          </Link>
        </div>
      </header>

      <main className="pt-32">
        {/* Hero Section */}
        <section className="px-8 mb-24 md:mb-40 max-w-7xl mx-auto">
          <div className="flex flex-col gap-6">
            <span className="text-[#CCFF00] font-label text-[0.6875rem] font-bold tracking-[0.2em] uppercase">PERFORMANCE REDEFINED</span>
            <h1 className="text-5xl md:text-8xl font-black text-white tracking-tighter leading-[0.9] uppercase max-w-4xl">
              Precision Training.<br/>Bulletproof Data.
            </h1>
            <p className="text-on-surface-variant text-lg md:text-xl font-light max-w-xl leading-relaxed">
              An offline-first, data-driven powerlifting tracker built for athletes who value integrity over bloat.
            </p>
            <div className="mt-4 flex flex-col md:flex-row gap-4">
              <Link href="/dashboard" className="kinetic-gradient text-on-primary-fixed px-8 py-4 rounded-md font-bold uppercase tracking-widest text-sm hover:opacity-90 transition-all flex items-center justify-center gap-2">
                Get Started
                <span className="material-symbols-outlined" data-icon="arrow_forward">arrow_forward</span>
              </Link>
              <Link href="/dashboard?guest=true" className="border border-outline-variant/30 text-white px-8 py-4 rounded-md font-bold uppercase tracking-widest text-sm hover:bg-surface-container-low transition-all flex items-center justify-center">
                View Sample Dashboard
              </Link>
            </div>
          </div>
        </section>

        {/* Kinetic Monolith Display Image */}
        <section className="px-8 mb-32 max-w-7xl mx-auto">
          <div className="relative w-full rounded-xl overflow-hidden bg-surface-container-low aspect-video md:aspect-[21/9] group">
            <img alt="RepLog Dashboard" className="w-full h-full object-cover opacity-60 group-hover:scale-105 transition-transform duration-700" data-alt="Modern high-contrast digital dashboard showing strength training analytics with neon green highlights on a dark obsidian background" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBUrnP0ejIG7M38zoXY2YWr2zB8HUrWq2_hAXzHKqf2_3EXlzsvntXsgvSSEGISdpV3xFmezEX5s0PDfEsqaRlDebhqkuAPFhxRmyjfeJ2ToXPphOhcRWuNSwDMroa4wLiasUhnT0tLbkKOAGxWru-WmpbJ7Av8DIuKZoGf6gx6VDy27tTWFYkB8V8ufUT9JUpPc-VSywXdtU2We3hsPSdx2d74zFe4vGhIBvZ8DWqf5cqWGAaj5Pj5IlgEQgZz0sY9ESyJOA_AVRk"/>
            <div className="absolute inset-0 bg-gradient-to-t from-surface via-transparent to-transparent"></div>
            <div className="absolute bottom-8 left-8">
              <div className="bg-surface-bright/50 backdrop-blur-md px-4 py-2 rounded-full border border-outline-variant/10 inline-flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#CCFF00] animate-pulse"></span>
                <span className="text-[0.6875rem] font-bold uppercase tracking-widest text-white">Live Data Feed</span>
              </div>
            </div>
          </div>
        </section>

        {/* Features Bento Grid */}
        <section className="px-8 mb-40 max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            {/* Feature 1: Offline */}
            <div className="md:col-span-8 bg-surface-container-low rounded-xl p-10 flex flex-col justify-between min-h-[400px] border border-outline-variant/5">
              <div>
                <span className="material-symbols-outlined text-[#CCFF00] mb-6 text-4xl" data-icon="signal_disconnected">signal_disconnected</span>
                <h3 className="text-3xl font-bold text-white uppercase tracking-tight mb-4">Offline First</h3>
                <p className="text-on-surface-variant text-lg leading-relaxed max-w-md">Train in the deepest basements or the most remote garages. RepLog never drops a set. Train anywhere. Sync everywhere.</p>
              </div>
              <div className="mt-8 flex gap-2">
                <span className="bg-surface-bright px-3 py-1 rounded-full text-[0.6rem] font-bold uppercase tracking-widest text-white border border-outline-variant/10">Zero Latency</span>
                <span className="bg-surface-bright px-3 py-1 rounded-full text-[0.6rem] font-bold uppercase tracking-widest text-white border border-outline-variant/10">Local Encryption</span>
              </div>
            </div>

            {/* Feature 2: Sync */}
            <div className="md:col-span-4 bg-surface-container-highest rounded-xl p-10 flex flex-col border border-outline-variant/5">
              <span className="material-symbols-outlined text-[#CCFF00] mb-6 text-4xl" data-icon="cloud_sync">cloud_sync</span>
              <h3 className="text-2xl font-bold text-white uppercase tracking-tight mb-4">Cloud Sync</h3>
              <p className="text-on-surface-variant text-sm leading-relaxed mb-auto">Multi-device performance logging that actually works. Zero compromise on data availability when you hit the platform.</p>
              <img alt="Sync" className="w-full h-32 object-cover rounded-md mt-6 grayscale opacity-50" data-alt="Minimalist abstract representation of data synchronization with flowing light paths on a matte black surface" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCMbu3hNru9ozo-uBytWCpj01SlZ_wGx1Ue9Y8einz_tiR_kAVQDNMJE2qaAP_ku-44q2ltlCR1fAqBkpIKn7GMXp9cNpcBrKB3EV0eIra_GnDbiWhv55i0lod0ZLO832QxiGHuB3fTo8BRjl2fL4P36ASKPhVLnQrq43lftNH_wOkvnea3Z-HzIBD2_EgqhTbjoKg9cvBX7qIMxHH8xcvCLousTuIkmZvf1k2edTNOWzKsmUQTfMkRA3My0gZLL2U0xfqBBGDZ3gg"/>
            </div>

            {/* Feature 3: Insights */}
            <div className="md:col-span-12 bg-surface-container rounded-xl p-10 flex flex-col md:flex-row gap-12 items-center border border-outline-variant/5">
              <div className="flex-1">
                <span className="material-symbols-outlined text-[#CCFF00] mb-6 text-4xl" data-icon="monitoring">monitoring</span>
                <h3 className="text-4xl font-black text-white uppercase tracking-tight mb-4">Deep Insights</h3>
                <p className="text-on-surface-variant text-lg leading-relaxed mb-6">Data science for strength athletes. Analyze RPE trends, volume distribution, and estimated 1RM projections with surgical precision.</p>
                <div className="space-y-4">
                  <div className="flex items-center gap-4 group">
                    <div className="w-12 h-px bg-[#CCFF00] group-hover:w-16 transition-all"></div>
                    <span className="text-[0.6875rem] font-bold uppercase tracking-widest text-white">Advanced Regression Models</span>
                  </div>
                  <div className="flex items-center gap-4 group">
                    <div className="w-12 h-px bg-outline-variant group-hover:w-16 transition-all"></div>
                    <span className="text-[0.6875rem] font-bold uppercase tracking-widest text-on-surface-variant">Fatigue Management Tracking</span>
                  </div>
                </div>
              </div>

              <div className="flex-1 w-full h-full min-h-[300px] bg-surface-container-lowest rounded-lg border border-outline-variant/10 p-6 flex flex-col justify-center">
                {/* Simulated Graph UI */}
                <div className="flex items-end gap-2 h-48">
                  <div className="w-full bg-[#CCFF00]/10 h-[40%] rounded-sm relative group"><div className="absolute bottom-0 w-full h-[100%] bg-[#CCFF00]/20 rounded-sm"></div></div>
                  <div className="w-full bg-[#CCFF00]/10 h-[65%] rounded-sm relative group"><div className="absolute bottom-0 w-full h-[100%] bg-[#CCFF00]/40 rounded-sm"></div></div>
                  <div className="w-full bg-[#CCFF00]/10 h-[50%] rounded-sm relative group"><div className="absolute bottom-0 w-full h-[100%] bg-[#CCFF00]/30 rounded-sm"></div></div>
                  <div className="w-full bg-[#CCFF00]/10 h-[85%] rounded-sm relative group"><div className="absolute bottom-0 w-full h-[100%] bg-[#CCFF00]/70 rounded-sm"></div></div>
                  <div className="w-full bg-[#CCFF00]/10 h-[100%] rounded-sm relative group"><div className="absolute bottom-0 w-full h-[100%] bg-[#CCFF00] rounded-sm shadow-[0_0_15px_rgba(195,244,0,0.5)]"></div></div>
                </div>
                <div className="flex justify-between mt-4">
                  <span className="text-[0.6rem] font-bold text-outline uppercase tracking-widest">WK 01</span>
                  <span className="text-[0.6rem] font-bold text-outline uppercase tracking-widest">WK 05</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Content Area: The Monolith Statement */}
        <section className="py-40 bg-surface-container-low/50">
          <div className="max-w-4xl mx-auto px-8 text-center">
            <h2 className="text-4xl md:text-6xl font-black text-white uppercase tracking-tighter leading-tight mb-12">
              No fluff. No social feeds. Just the numbers that make you <span className="text-[#CCFF00]">stronger</span>.
            </h2>
            <button className="border-b-2 border-[#CCFF00] text-white pb-1 font-bold text-lg uppercase tracking-widest hover:text-[#CCFF00] transition-colors">
              Read the Whitepaper
            </button>
          </div>
        </section>
      </main>

      {/* Footer Predicted Component + Custom Requirements */}
      <footer className="bg-[#131313] w-full py-20 border-t border-[#444933]/15">
        <div className="max-w-7xl mx-auto px-8">
          <div className="flex flex-col md:flex-row justify-between items-start gap-12 mb-20">
            <div>
              <div className="text-lg font-black text-white uppercase mb-4 tracking-tighter font-headline">REPLOG PERFORMANCE</div>
              <p className="text-[#C4C9AC] text-sm max-w-xs leading-relaxed font-light">The definitive strength engineering platform for high-performance athletes.</p>
            </div>
            <div className="grid grid-cols-2 gap-16">
              <div className="flex flex-col gap-4">
                <span className="text-white text-[0.6875rem] font-bold uppercase tracking-[0.2em]">Contact</span>
                <span className="text-[#CCFF00] text-[0.6875rem] uppercase tracking-[0.1em] font-medium">aryannair767@gmail.com</span>
                <span className="text-[#C4C9AC] text-[0.6875rem] uppercase tracking-[0.1em] font-medium">Aryan Nair</span>
              </div>
              <div className="flex flex-col gap-4">
                <span className="text-white text-[0.6875rem] font-bold uppercase tracking-[0.2em]">Platform</span>
                <a className="text-[#C4C9AC] text-[0.6875rem] uppercase tracking-[0.1em] hover:text-white transition-colors" href="#">Privacy</a>
                <a className="text-[#C4C9AC] text-[0.6875rem] uppercase tracking-[0.1em] hover:text-white transition-colors" href="#">Terms</a>
              </div>
            </div>
          </div>
          <div className="flex flex-col md:flex-row justify-between items-center gap-8 border-t border-white/5 pt-12">
            <div className="font-['Inter'] text-[0.6875rem] uppercase tracking-[0.1em] text-[#C4C9AC]">
              © 2024 REPLOG PERFORMANCE. ALL RIGHTS RESERVED.
            </div>
            <div className="flex gap-8">
              <a className="text-[#C4C9AC] hover:text-[#CCFF00] transition-colors text-[0.6875rem] uppercase tracking-widest font-bold" href="#">Twitter / X</a>
              <a className="text-[#C4C9AC] hover:text-[#CCFF00] transition-colors text-[0.6875rem] uppercase tracking-widest font-bold" href="#">Instagram</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
