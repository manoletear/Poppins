"use client";

import { useState, useRef } from "react";

interface CardData {
  emoji: string;
  title: string;
  resuelve: string;
  evita: string;
  gradient: string;
}

function Card3D({ card }: { card: CardData }) {
  const ref = useRef<HTMLDivElement>(null);
  const [rotation, setRotation] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const x = (e.clientY - rect.top - rect.height / 2) / 12;
    const y = -(e.clientX - rect.left - rect.width / 2) / 12;
    setRotation({ x: Math.max(-15, Math.min(15, x)), y: Math.max(-15, Math.min(15, y)) });
  };

  const handleMouseLeave = () => { setRotation({ x: 0, y: 0 }); setIsHovered(false); };

  return (
    <div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={handleMouseLeave}
      className="group cursor-pointer"
      style={{ perspective: 800 }}
    >
      <div
        className={`rounded-2xl p-6 border border-white/20 shadow-xl transition-all duration-200 ${card.gradient}`}
        style={{
          transform: `rotateX(${rotation.x}deg) rotateY(${rotation.y}deg) ${isHovered ? 'scale(1.03)' : 'scale(1)'}`,
          transformStyle: "preserve-3d",
        }}
      >
        <div style={{ transform: "translateZ(30px)" }}>
          <span className="text-4xl block mb-4">{card.emoji}</span>
          <h3 className="text-lg font-bold text-white mb-3">{card.title}</h3>
          <div className="space-y-2">
            <p className="text-xs text-white/80">
              <span className="inline-block bg-white/20 rounded px-1.5 py-0.5 text-[10px] font-bold mr-1.5">RESUELVE</span>
              {card.resuelve}
            </p>
            <p className="text-xs text-white/70">
              <span className="inline-block bg-red-500/30 rounded px-1.5 py-0.5 text-[10px] font-bold mr-1.5">EVITA</span>
              {card.evita}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

const CARDS: CardData[] = [
  {
    emoji: "📝",
    title: "Contratos y Documentos",
    resuelve: "Contratos digitales en minutos, anexos, finiquitos con firma válida.",
    evita: "Contratos informales, demandas laborales y pérdida de documentos.",
    gradient: "bg-gradient-to-br from-violet-600 to-indigo-700",
  },
  {
    emoji: "💰",
    title: "Pago de Imposiciones",
    resuelve: "Integración con DT y Previred, cálculo automático de AFP, Salud y AFC.",
    evita: "Multas, recargos y juicios por cotizaciones impagas.",
    gradient: "bg-gradient-to-br from-pink-500 to-rose-600",
  },
  {
    emoji: "🔔",
    title: "Recordatorios y Alertas",
    resuelve: "Notificaciones previas a vencimientos y confirmación de pagos.",
    evita: "Atrasos en sueldos e imposiciones, intereses y sanciones.",
    gradient: "bg-gradient-to-br from-emerald-500 to-teal-600",
  },
  {
    emoji: "📊",
    title: "Asistencia y Jornadas",
    resuelve: "Control digital de asistencia, horarios, permisos y vacaciones.",
    evita: "Inconsistencias en horas, conflictos y sanciones legales.",
    gradient: "bg-gradient-to-br from-blue-500 to-cyan-600",
  },
];

export function Interactive3DCards() {
  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
      {CARDS.map((card, i) => (
        <Card3D key={i} card={card} />
      ))}
    </div>
  );
}
