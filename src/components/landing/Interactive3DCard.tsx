"use client";

import { useState, useRef } from "react";
import { FileText, CreditCard, Bell, BarChart3 } from "lucide-react";

interface CardData {
  icon: any;
  title: string;
  resuelve: string;
  evita: string;
}

function Card3D({ card }: { card: CardData }) {
  const ref = useRef<HTMLDivElement>(null);
  const [rotation, setRotation] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);
  const Icon = card.icon;

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const x = (e.clientY - rect.top - rect.height / 2) / 15;
    const y = -(e.clientX - rect.left - rect.width / 2) / 15;
    setRotation({ x: Math.max(-10, Math.min(10, x)), y: Math.max(-10, Math.min(10, y)) });
  };

  return (
    <div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => { setRotation({ x: 0, y: 0 }); setIsHovered(false); }}
      className="cursor-pointer"
      style={{ perspective: 800 }}
    >
      <div
        className="bg-white rounded-2xl p-6 border border-zinc-100 shadow-sm hover:shadow-xl transition-shadow duration-300"
        style={{
          transform: `rotateX(${rotation.x}deg) rotateY(${rotation.y}deg) ${isHovered ? 'scale(1.02)' : ''}`,
          transformStyle: "preserve-3d",
          transition: "transform 0.15s ease-out, box-shadow 0.3s ease",
        }}
      >
        <div style={{ transform: "translateZ(20px)" }}>
          <div className="w-12 h-12 rounded-xl bg-pink-50 flex items-center justify-center mb-4">
            <Icon className="w-6 h-6 text-poppins-pink" />
          </div>
          <h3 className="text-base font-bold text-poppins-navy mb-3">{card.title}</h3>
          <p className="text-xs text-poppins-navy/70 mb-2">
            <strong className="text-poppins-pink">Resuelve:</strong> {card.resuelve}
          </p>
          <p className="text-xs text-poppins-navy/60">
            <strong className="text-red-400">Evita:</strong> {card.evita}
          </p>
        </div>
      </div>
    </div>
  );
}

const CARDS: CardData[] = [
  {
    icon: FileText,
    title: "Contratos y Documentos",
    resuelve: "Contratos digitales en minutos, anexos, finiquitos con firma válida y almacenamiento en la nube.",
    evita: "Contratos informales, demandas laborales y pérdida de documentos.",
  },
  {
    icon: CreditCard,
    title: "Pago de Imposiciones",
    resuelve: "Nos integramos con la DT y Previred, calcula y paga automático de AFP, Salud y AFC.",
    evita: "Multas, recargos y juicios por cotizaciones impagas.",
  },
  {
    icon: Bell,
    title: "Recordatorios y Alertas",
    resuelve: "Notificaciones previas a vencimientos y confirmación de pagos exitosos.",
    evita: "Atrasos en sueldos e imposiciones, intereses y sanciones.",
  },
  {
    icon: BarChart3,
    title: "Asistencia y Jornadas",
    resuelve: "Control digital de asistencia, horarios, permisos, vacaciones y licencias.",
    evita: "Inconsistencias en horas, conflictos por vacaciones y sanciones legales.",
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
