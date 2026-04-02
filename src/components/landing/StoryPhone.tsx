"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { cn } from "@/lib/utils";

const STORY_DURATION = 5000; // ms

const STORIES = [
  {
    id: 1,
    icon: "💸",
    headline: "Pagos Automáticos",
    caption: "Olvídate de transferir cada mes.\nPoppins lo hace por ti.",
    color: "#4F46E5, #7C3AED", 
    bg: "linear-gradient(155deg, #1e293b 0%, #0f172a 100%)",
    imageUrl: "/images/story-onboarding.png", // Added image
  },
  {
    id: 2,
    icon: "⚖️",
    headline: "Todo Legal",
    caption: "Contratos, imposiciones y leyes\nal día, sin esfuerzo.",
    color: "#EC4899, #DB2777", // Poppins Pink
    bg: "linear-gradient(155deg, #be185d 0%, #9d174d 100%)",
  },
  {
    id: 3,
    icon: "✨",
    headline: "Magia en Casa",
    caption: "Gestión de personal doméstico\ncon total tranquilidad.",
    color: "#06b6d4, #0891b2", // Cyan
    bg: "linear-gradient(155deg, #0891b2 0%, #155e75 100%)",
  },
  {
    id: 4,
    icon: "📱",
    headline: "¿Listo para empezar?",
    caption: "poppins.cl\nTu hogar bajo control.",
    color: "#6366f1, #4f46e5",
    bg: "linear-gradient(155deg, #4f46e5 0%, #312e81 100%)",
  },
];

export const StoryPhone: React.FC = () => {
  const [cur, setCur] = useState(0);
  const [paused, setPaused] = useState(false);
  const [progress, setProgress] = useState<number[]>(new Array(STORIES.length).fill(0));
  
  const rafRef = useRef<number | null>(null);
  const startTsRef = useRef<number | null>(null);
  const spentMsRef = useRef<number>(0);

  const advance = useCallback((dir: number) => {
    setCur((prev) => {
      let next = prev + dir;
      if (next >= STORIES.length) next = 0;
      if (next < 0) next = STORIES.length - 1;
      return next;
    });
    spentMsRef.current = 0;
    startTsRef.current = null;
  }, []);

  const tick = useCallback((ts: number) => {
    if (paused) return;
    if (!startTsRef.current) startTsRef.current = ts;

    const total = spentMsRef.current + (ts - startTsRef.current);
    const pct = Math.min(100, (total / STORY_DURATION) * 100);

    setProgress((prev) => {
      const nextProgress = [...prev];
      nextProgress[cur] = pct;
      return nextProgress;
    });

    if (pct >= 100) {
      advance(1);
    } else {
      rafRef.current = requestAnimationFrame(tick);
    }
  }, [cur, paused, advance]);

  useEffect(() => {
    // Reset progress for context change
    setProgress((prev) => {
      return prev.map((p, i) => (i < cur ? 100 : i > cur ? 0 : p));
    });

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [cur, paused, tick]);

  const handleTap = (e: React.MouseEvent, dir: "prev" | "next") => {
    // Create ripple effect similar to original
    const rect = e.currentTarget.getBoundingClientRect();
    const size = 56;
    const x = e.clientX - rect.left - size / 2;
    const y = e.clientY - rect.top - size / 2;

    const ripple = document.createElement("div");
    ripple.className = "absolute rounded-full bg-white/25 pointer-events-none z-25 animate-ripple";
    ripple.style.width = `${size}px`;
    ripple.style.height = `${size}px`;
    ripple.style.left = `${x}px`;
    ripple.style.top = `${y}px`;

    e.currentTarget.appendChild(ripple);
    setTimeout(() => ripple.remove(), 600);

    advance(dir === "next" ? 1 : -1);
  };

  const togglePause = () => {
    if (!paused) {
      spentMsRef.current += performance.now() - (startTsRef.current || performance.now());
      startTsRef.current = null;
    } else {
      startTsRef.current = null;
    }
    setPaused(!paused);
  };

  const currentColors = STORIES[cur].color.split(",");

  return (
    <div className="relative flex items-center justify-center py-12">
      {/* Ambient Glow */}
      <div 
        className="absolute bottom-[-50px] left-1/2 -translate-x-1/2 w-[260px] height-[100px] rounded-full blur-[36px] opacity-55 transition-all duration-1000 pointer-events-none"
        style={{ background: `radial-gradient(ellipse, ${currentColors[0]} 0%, ${currentColors[1]} 100%)` }}
      />

      <div className="relative w-[300px] h-[616px] z-10 scale-90 sm:scale-100 origin-center">
        {/* Titanium Chassis */}
        <div className="absolute inset-0 rounded-[50px] bg-gradient-to-br from-[#3a3a3c] via-[#1c1c1e] to-[#2a2a2c] shadow-[0_0_0_0.5px_rgba(255,255,255,0.12),inset_0_1px_0_rgba(255,255,255,0.08),0_30px_80px_rgba(0,0,0,0.9),0_8px_20px_rgba(0,0,0,0.6)]" />
        
        {/* Buttons */}
        <div className="absolute right-[-2px] top-[140px] w-[3px] h-[76px] bg-gradient-to-b from-[#3a3a3c] to-[#2a2a2c] rounded-r-sm shadow-[inset_-1px_0_0_rgba(255,255,255,0.06)]" />
        <div className="absolute left-[-2px] top-[106px] w-[3px] h-[28px] bg-gradient-to-b from-[#3a3a3c] to-[#2a2a2c] rounded-l-sm" />
        <div className="absolute left-[-2px] top-[120px] w-[3px] h-[32px] bg-gradient-to-b from-[#3a3a3c] to-[#2a2a2c] rounded-l-sm" />
        <div className="absolute left-[-2px] top-[168px] w-[3px] h-[64px] bg-gradient-to-b from-[#3a3a3c] to-[#2a2a2c] rounded-l-sm" />

        <div className="absolute inset-[6px] rounded-[44px] bg-black overflow-hidden pointer-events-auto">
          {/* Internal Screen */}
          <div className="absolute inset-0 rounded-[44px] overflow-hidden bg-black">
            {/* Dynamic Island */}
            <div className="absolute top-[14px] left-1/2 -translate-x-1/2 w-[118px] h-[34px] bg-black rounded-full z-50 shadow-[0_0_0_1px_rgba(255,255,255,0.05)]" />

            {/* Stories Engine */}
            <div className="absolute inset-0 rounded-[44px] overflow-hidden">
              {STORIES.map((story, i) => (
                <div 
                  key={story.id} 
                  className={cn(
                    "absolute inset-0 transition-opacity duration-300",
                    i === cur ? "opacity-100 z-10" : "opacity-0 z-0"
                  )}
                >
                  <div className="absolute inset-0 flex items-center justify-center overflow-hidden" style={{ background: story.bg }}>
                    {story.imageUrl ? (
                      <div className="relative w-full h-full flex flex-col">
                        <div className="flex-1 relative w-full mt-10">
                          <img 
                            src={story.imageUrl} 
                            alt={story.headline}
                            className="w-full h-full object-contain object-top animate-fade-in"
                          />
                        </div>
                        {/* Overlay text for branding but keeps the app visible */}
                        <div className="absolute bottom-12 inset-x-0 px-6 text-center text-white bg-black/40 backdrop-blur-sm py-4">
                          <h3 className="text-lg font-bold mb-1">{story.headline}</h3>
                          <p className="text-[12px] opacity-90">{story.caption}</p>
                        </div>
                      </div>
                    ) : (
                      <div className="px-6 text-center text-white">
                        <span className="text-7xl block mb-4 drop-shadow-[0_8px_24px_rgba(0,0,0,0.35)]">{story.icon}</span>
                        <h3 className="text-xl font-bold tracking-tight leading-tight mb-2 shadow-black drop-shadow-md">
                          {story.headline}
                        </h3>
                        <p className="text-[13px] opacity-90 leading-relaxed whitespace-pre-line drop-shadow-sm">
                          {story.caption}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* UI Overlay */}
            <div className="absolute inset-0 z-20 pointer-events-none rounded-[44px] overflow-hidden">
              <div className="absolute top-0 inset-x-0 h-40 bg-gradient-to-b from-black/50 to-transparent" />
              <div className="absolute bottom-0 inset-x-0 h-32 bg-gradient-to-t from-black/50 to-transparent" />

              {/* Progress Bars */}
              <div className="absolute top-14 left-3 right-3 flex gap-1 z-30">
                {STORIES.map((_, i) => (
                  <div key={i} className="flex-1 h-[2.5px] bg-white/30 rounded-full overflow-hidden shadow-sm">
                    <div 
                      className="h-full bg-white transition-all duration-100 ease-linear" 
                      style={{ width: `${progress[i]}%` }}
                    />
                  </div>
                ))}
              </div>

              {/* Profile Header */}
              <div className="absolute top-[68px] left-3 right-3 flex items-center gap-2 z-30">
                <div className="w-9 h-9 rounded-full border-2 border-white/90 overflow-hidden flex items-center justify-center font-bold text-white bg-gradient-to-br from-indigo-500 via-pink-500 to-red-500 shadow-md">
                  P
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1">
                    <span className="text-[13px] font-semibold text-white drop-shadow-sm">poppins.cl</span>
                    <div className="w-3.5 h-3.5 bg-blue-500 rounded-full flex items-center justify-center">
                      <svg width="8" height="8" viewBox="0 0 10 10" fill="none">
                        <path d="M2 5.5L4 7.5L8 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                  </div>
                  <span className="text-[10.5px] text-white/70">Ahora</span>
                </div>
                <div className="flex gap-1.5 pointer-events-auto">
                  <button onClick={togglePause} className="w-8 h-8 flex items-center justify-center transition-opacity hover:opacity-70">
                    {paused ? (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    ) : (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                        <circle cx="12" cy="12" r="9" stroke="rgba(255,255,255,.85)" strokeWidth="1.5"/>
                        <path d="M10 8v8M14 8v8" stroke="rgba(255,255,255,.85)" strokeWidth="1.5" strokeLinecap="round"/>
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {/* Pause Icon Overlay */}
              <div className={cn(
                "absolute inset-0 flex items-center justify-center z-40 bg-black/20 backdrop-blur-[2px] transition-opacity duration-200 pointer-events-none",
                paused ? "opacity-100" : "opacity-0"
              )}>
                <div className="w-14 h-14 bg-black/50 backdrop-blur-md rounded-full flex items-center justify-center">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
                    <rect x="6" y="5" width="4" height="14" rx="1.5"/>
                    <rect x="14" y="5" width="4" height="14" rx="1.5"/>
                  </svg>
                </div>
              </div>
            </div>

            {/* Tap Zones */}
            <div className="absolute inset-0 z-30 flex pointer-events-auto">
              <div className="w-[38%] h-full cursor-pointer group" onClick={(e) => handleTap(e, "prev")} />
              <div className="flex-1 h-full cursor-pointer group" onClick={(e) => handleTap(e, "next")} />
            </div>

            {/* Screen Shine */}
            <div className="absolute inset-0 z-40 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
          </div>
        </div>
      </div>
      
      <style jsx global>{`
        @keyframes ripple {
          0% { transform: scale(0); opacity: 0.5; }
          100% { transform: scale(10); opacity: 0; }
        }
        .animate-ripple {
          animation: ripple 0.6s cubic-bezier(0.22, 0.72, 0.36, 1) forwards;
        }
      `}</style>
    </div>
  );
};
