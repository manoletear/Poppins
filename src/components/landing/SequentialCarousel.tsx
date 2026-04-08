"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface Slide {
  emoji: string;
  title: string;
  desc: string;
  gradient: string;
  isPlan?: boolean;
  bullets?: string[];
}

const SLIDES: Slide[] = [
  {
    emoji: "💰",
    title: "Sueldos Automáticos",
    desc: "Paga sueldos y cotizaciones sin mover un dedo. AFP, FONASA, AFC — todo calculado.",
    gradient: "from-violet-600 to-indigo-700",
  },
  {
    emoji: "📝",
    title: "Contratos al Día",
    desc: "Contratos digitales, anexos y finiquitos con firma electrónica válida.",
    gradient: "from-pink-500 to-rose-600",
  },
  {
    emoji: "🏠",
    title: "Tu Casa Bajo Control",
    desc: "Luz, agua, gas, internet — centraliza y paga todos los servicios del hogar.",
    gradient: "from-emerald-500 to-teal-600",
  },
  {
    emoji: "📊",
    title: "Liquidaciones Legales",
    desc: "Liquidaciones perfectas con PREVIRED y Dirección del Trabajo integrados.",
    gradient: "from-blue-500 to-cyan-600",
  },
  {
    emoji: "✨",
    title: "Plan Poppins — $24.770/mes",
    desc: "Todo lo indispensable para formalizar, pagar y administrar tu servicio doméstico con tranquilidad y en regla.",
    gradient: "from-poppins-pink to-rose-600",
    isPlan: true,
    bullets: [
      "Contrato digital y firma electrónica.",
      "Gestión automática de sueldos e imposiciones.",
      "Registro de asistencia y licencias.",
      "Emisión de finiquitos y documentos legales.",
      "Soporte experto (virtual y humano).",
    ],
  },
];

export function SequentialCarousel() {
  const [current, setCurrent] = useState(0);
  const [direction, setDirection] = useState(1);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const advance = useCallback(() => {
    setDirection(1);
    setCurrent(prev => (prev + 1) % SLIDES.length);
  }, []);

  const goBack = useCallback(() => {
    setDirection(-1);
    setCurrent(prev => (prev - 1 + SLIDES.length) % SLIDES.length);
  }, []);

  useEffect(() => {
    intervalRef.current = setInterval(advance, 4000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [advance]);

  const resetTimer = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(advance, 4000);
  };

  return (
    <div className="relative w-full max-w-[400px] mx-auto" style={{ height: 480 }}>
      {/* Cards stack */}
      <div className="relative w-full h-full flex items-center justify-center" style={{ perspective: 1200 }}>
        <AnimatePresence mode="popLayout" custom={direction}>
          {SLIDES.map((slide, i) => {
            const offset = ((i - current + SLIDES.length) % SLIDES.length);
            const isActive = offset === 0;
            const isBehind = offset >= 1 && offset <= 3;
            if (!isActive && !isBehind) return null;

            return (
              <motion.div
                key={i}
                custom={direction}
                initial={{ opacity: 0, y: direction > 0 ? 60 : -60, scale: 0.9 }}
                animate={{
                  opacity: isActive ? 1 : Math.max(0.3, 1 - offset * 0.25),
                  y: offset * 24,
                  scale: 1 - offset * 0.06,
                  rotateX: offset * -3,
                }}
                exit={{ opacity: 0, y: direction > 0 ? -60 : 60, scale: 0.9 }}
                transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
                className={`absolute inset-x-4 bg-gradient-to-br ${slide.gradient} rounded-3xl shadow-2xl`}
                style={{
                  height: 340,
                  zIndex: SLIDES.length - offset,
                  transformStyle: "preserve-3d",
                }}
              >
                {slide.isPlan ? (
                  <div className="h-full flex flex-col justify-between p-6 text-white">
                    <div>
                      <h3 className="text-xl font-bold mb-1">{slide.title}</h3>
                      <p className="text-white/80 text-xs leading-relaxed mb-3">{slide.desc}</p>
                      <ul className="space-y-1.5">
                        {slide.bullets!.map((b, j) => (
                          <li key={j} className="flex items-start gap-2 text-xs text-white/90">
                            <span className="mt-0.5">✓</span>
                            <span>{b}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="flex items-center justify-between">
                      <a href="/auth/login" className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-white text-poppins-pink font-bold text-sm hover:bg-white/90 transition-all active:scale-95 shadow-lg">
                        Elegir Plan →
                      </a>
                      <span className="text-xs text-white/50">{i + 1}/{SLIDES.length}</span>
                    </div>
                  </div>
                ) : (
                  <div className="h-full flex flex-col justify-between p-8 text-white">
                    <div>
                      <span className="text-5xl mb-4 block">{slide.emoji}</span>
                      <h3 className="text-2xl font-bold mb-3">{slide.title}</h3>
                      <p className="text-white/80 text-sm leading-relaxed">{slide.desc}</p>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex gap-1.5">
                        {SLIDES.map((_, j) => (
                          <div key={j} className={`w-2 h-2 rounded-full transition-all ${j === current ? 'bg-white w-6' : 'bg-white/30'}`} />
                        ))}
                      </div>
                      <span className="text-xs text-white/50">{i + 1}/{SLIDES.length}</span>
                    </div>
                  </div>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Navigation */}
      <button onClick={() => { goBack(); resetTimer(); }}
        className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-3 w-10 h-10 rounded-full bg-white/90 shadow-lg flex items-center justify-center hover:bg-white transition z-20">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6" /></svg>
      </button>
      <button onClick={() => { advance(); resetTimer(); }}
        className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-3 w-10 h-10 rounded-full bg-white/90 shadow-lg flex items-center justify-center hover:bg-white transition z-20">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6" /></svg>
      </button>
    </div>
  );
}
