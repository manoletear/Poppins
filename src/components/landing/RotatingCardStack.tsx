"use client";

import { useState, useEffect, useRef, useCallback } from "react";

const ITEMS = [
  { label: "Sueldos y cotizaciones al día",     color: "#7c3aed", icon: "💰" },
  { label: "Contratos legales automáticos",      color: "#ec4899", icon: "📝" },
  { label: "Pagos de servicios del hogar",       color: "#2563eb", icon: "🏠" },
  { label: "Liquidaciones y PREVIRED",           color: "#16a34a", icon: "📊" },
  { label: "Control total desde tu celular",     color: "#f59e0b", icon: "📱" },
];

const N = ITEMS.length;
const INTERVAL = 2200;
const EXIT_HOLD = 1000;
const TRANS_DUR = 0.7;
const EASING = "cubic-bezier(0.34, 0.0, 0.15, 1)";
const CARD_GAP = 90;
const DEPTH = 300;
const ROTATE_X = -8;
const SCALE_STEP = 0.10;
const BLUR_STEP = 1.2;
const OVERLAY_MAX = 0.5;
const OVERLAY_STEP = 0.10;
const STAGGER = ["0.2s", "0.4s", "0.6s"];

function getDelay(v: number): string {
  return STAGGER[v] ?? "0s";
}

export function RotatingCardStack() {
  const [activeIdx, setActiveIdx] = useState(0);
  const [exitingIdx, setExitingIdx] = useState<number | null>(null);
  const [instant, setInstant] = useState(true);
  const exitTimer = useRef<NodeJS.Timeout | null>(null);
  const cycleTimer = useRef<NodeJS.Timeout | null>(null);

  const cycle = useCallback(() => {
    setActiveIdx((prev) => {
      const next = (prev + 1) % N;
      setExitingIdx(prev);
      if (exitTimer.current) clearTimeout(exitTimer.current);
      exitTimer.current = setTimeout(() => setExitingIdx(null), EXIT_HOLD);
      return next;
    });
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setInstant(false), 50);
    cycleTimer.current = setInterval(cycle, INTERVAL);
    return () => {
      clearTimeout(t);
      if (cycleTimer.current) clearInterval(cycleTimer.current);
      if (exitTimer.current) clearTimeout(exitTimer.current);
    };
  }, [cycle]);

  const maxAbove = Math.min(3, Math.floor((N - 1) / 2));
  const maxBelow = Math.min(3, N - 1 - maxAbove);

  return (
    <div className="w-full max-w-[560px] mx-auto">
      <div
        className="relative overflow-hidden flex items-center justify-center"
        style={{
          background: "transparent",
          height: "560px",
          padding: "40px 20px",
          perspective: "2000px",
        }}
      >
        <div className="relative w-full h-full flex flex-col items-center justify-center">
          {ITEMS.map((item, n) => {
            if (n === exitingIdx) return null;

            const s = (n - activeIdx + N) % N;
            const v = s - maxAbove;
            const visible = v >= -(maxAbove + 1) && v <= maxBelow + 1;
            if (!visible) return null;

            const translateY = v * CARD_GAP;
            const translateZ = -Math.abs(v) * DEPTH;
            const rotateX = v * ROTATE_X;
            const scale = 1 - Math.abs(v) * SCALE_STEP;
            const opacity = v > 0 && v >= maxBelow ? 0 : 1;
            const blurPx = Math.abs(v) * BLUR_STEP;
            const overlayOp = Math.min(OVERLAY_MAX, Math.abs(v) * OVERLAY_STEP);
            const transDelay = instant ? "0s" : getDelay(Math.abs(v));
            const trans = instant
              ? "none"
              : `all ${TRANS_DUR}s ${EASING} ${transDelay}`;

            return (
              <div
                key={n}
                className="absolute flex items-center gap-5"
                style={{
                  width: "90%",
                  background: "#fff",
                  borderRadius: "24px",
                  padding: "40px 36px",
                  minHeight: "120px",
                  boxShadow: "0 12px 32px rgba(0,0,0,.10)",
                  willChange: "transform, opacity, filter",
                  transform: `perspective(2000px) translateY(${translateY}px) translateZ(${translateZ}px) rotateX(${rotateX}deg) scale(${scale})`,
                  opacity,
                  filter: `blur(${blurPx}px)`,
                  zIndex: N - Math.abs(v),
                  transition: trans,
                }}
              >
                {/* Overlay */}
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    background: "#000",
                    borderRadius: "24px",
                    pointerEvents: "none",
                    zIndex: 10,
                    opacity: overlayOp,
                    transition: instant ? "none" : `opacity ${TRANS_DUR}s ${EASING}`,
                  }}
                />
                {/* Icon */}
                <div
                  className="flex-shrink-0 flex items-center justify-center"
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: 14,
                    background: item.color + "18",
                    fontSize: 26,
                  }}
                >
                  {item.icon}
                </div>
                {/* Label */}
                <div
                  className="flex-1"
                  style={{
                    fontSize: "18px",
                    fontWeight: 700,
                    color: "#0a0a0a",
                    letterSpacing: "-0.02em",
                    lineHeight: 1.35,
                  }}
                >
                  {item.label}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
