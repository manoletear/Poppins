'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth/context';
import {
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Circle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';


interface Tarea {
  id: string;
  titulo: string;
  descripcion: string;
  hora_inicio: string;
  hora_fin: string;
  prioridad: 'alta' | 'media' | 'baja';
  categoria: string;
  estado: 'pendiente' | 'en_progreso' | 'completada';
  trabajador_id: string;
  fecha: string;
}

const PRIORITY_BORDER: Record<string, string> = {
  alta: 'border-l-red-500',
  media: 'border-l-amber-500',
  baja: 'border-l-green-500',
};

const CATEGORY_COLORS: Record<string, string> = {
  Aseo: 'bg-blue-100 text-blue-700',
  Cocina: 'bg-orange-100 text-orange-700',
  Mascotas: 'bg-purple-100 text-purple-700',
  Jardín: 'bg-green-100 text-green-700',
  Compras: 'bg-pink-100 text-pink-700',
  Lavado: 'bg-cyan-100 text-cyan-700',
  Planchado: 'bg-yellow-100 text-yellow-700',
  Otro: 'bg-gray-100 text-gray-600',
};

function formatDate(date: Date): string {
  const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  const months = [
    'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
  ];
  return `${days[date.getDay()]} ${date.getDate()} de ${months[date.getMonth()]}, ${date.getFullYear()}`;
}

function toDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export default function MisTareasPage() {
  const { profile } = useAuth();
  const trabajadorId = profile?.trabajador_id || '';
  const supabase = createClient();
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [tareas, setTareas] = useState<Tarea[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCompleted, setShowCompleted] = useState(true);

  const today = toDateString(currentDate);

  const fetchTareas = useCallback(async () => {
    if (!trabajadorId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('tareas')
      .select('*')
      .eq('trabajador_id', trabajadorId)
      .eq('fecha', today)
      .order('hora_inicio');

    if (!error && data) {
      setTareas(data as Tarea[]);
    }
    setLoading(false);
  }, [trabajadorId, today]);

  useEffect(() => {
    fetchTareas();
  }, [fetchTareas]);

  const toggleTarea = async (tarea: Tarea) => {
    const newEstado = tarea.estado === 'completada' ? 'pendiente' : 'completada';
    // Optimistic update
    setTareas((prev) =>
      prev.map((t) => (t.id === tarea.id ? { ...t, estado: newEstado } : t))
    );
    await supabase
      .from('tareas')
      .update({ estado: newEstado })
      .eq('id', tarea.id);
  };

  const changeDate = (delta: number) => {
    setCurrentDate((prev) => {
      const next = new Date(prev);
      next.setDate(next.getDate() + delta);
      return next;
    });
  };

  const pendientes = tareas.filter((t) => t.estado !== 'completada');
  const completadas = tareas.filter((t) => t.estado === 'completada');
  const enProgreso = tareas.filter((t) => t.estado === 'en_progreso').length;
  const totalTareas = tareas.length;
  const pctCompletadas = totalTareas > 0 ? Math.round((completadas.length / totalTareas) * 100) : 0;

  // SVG circle progress
  const radius = 28;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (pctCompletadas / 100) * circumference;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mis Tareas</h1>
          <div className="flex items-center gap-3 mt-1">
            <button
              onClick={() => changeDate(-1)}
              className="p-1 rounded-md hover:bg-gray-200 transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-gray-500" />
            </button>
            <p className="text-sm text-gray-500 capitalize">{formatDate(currentDate)}</p>
            <button
              onClick={() => changeDate(1)}
              className="p-1 rounded-md hover:bg-gray-200 transition-colors"
            >
              <ChevronRight className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Stats bar */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex items-center gap-5">
          <div className="relative w-16 h-16 shrink-0">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 64 64">
              <circle cx="32" cy="32" r={radius} fill="none" stroke="#f3f4f6" strokeWidth="5" />
              <circle
                cx="32"
                cy="32"
                r={radius}
                fill="none"
                stroke="#22c55e"
                strokeWidth="5"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-xs font-bold text-gray-900">{pctCompletadas}%</span>
            </div>
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-800">
              {completadas.length}/{totalTareas} completadas
            </p>
            <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
                {completadas.length} completadas
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />
                {enProgreso} en progreso
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
                {pendientes.length} pendientes
              </span>
            </div>
          </div>
        </div>

        {/* Task list */}
        {loading ? (
          <div className="text-sm text-gray-400 text-center py-10">Cargando tareas...</div>
        ) : tareas.length === 0 ? (
          <div className="text-sm text-gray-400 text-center py-10">
            No hay tareas para este día.
          </div>
        ) : (
          <div className="space-y-5">
            {/* Pending / In-progress tasks */}
            {pendientes.length > 0 && (
              <div className="space-y-3">
                {pendientes.map((tarea) => (
                  <TaskCard key={tarea.id} tarea={tarea} onToggle={toggleTarea} />
                ))}
              </div>
            )}

            {/* Completed tasks (collapsible) */}
            {completadas.length > 0 && (
              <div>
                <button
                  onClick={() => setShowCompleted(!showCompleted)}
                  className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors mb-3"
                >
                  {showCompleted ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                  Completadas ({completadas.length})
                </button>
                {showCompleted && (
                  <div className="space-y-3">
                    {completadas.map((tarea) => (
                      <TaskCard key={tarea.id} tarea={tarea} onToggle={toggleTarea} />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function TaskCard({
  tarea,
  onToggle,
}: {
  tarea: Tarea;
  onToggle: (t: Tarea) => void;
}) {
  const done = tarea.estado === 'completada';
  const borderColor = PRIORITY_BORDER[tarea.prioridad] || 'border-l-gray-300';
  const categoryStyle = CATEGORY_COLORS[tarea.categoria] || CATEGORY_COLORS['Otro'];

  return (
    <div
      className={`bg-white rounded-xl shadow-sm border border-gray-100 border-l-4 ${borderColor} p-4 flex items-start gap-3 transition-opacity ${
        done ? 'opacity-60' : ''
      }`}
    >
      <button
        onClick={() => onToggle(tarea)}
        className="mt-0.5 shrink-0 focus:outline-none"
        aria-label={done ? 'Marcar como pendiente' : 'Marcar como completada'}
      >
        {done ? (
          <CheckCircle2 className="w-5 h-5 text-green-500" />
        ) : (
          <Circle className="w-5 h-5 text-gray-300 hover:text-green-400 transition-colors" />
        )}
      </button>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium text-gray-800 ${done ? 'line-through text-gray-400' : ''}`}>
          {tarea.titulo}
        </p>
        {tarea.descripcion && (
          <p className={`text-xs text-zinc-400 mt-0.5 ${done ? 'line-through' : ''}`}>
            {tarea.descripcion}
          </p>
        )}
        <div className="flex items-center gap-2 mt-2 flex-wrap">
          <span className="text-xs text-gray-400">
            {tarea.hora_inicio?.slice(0, 5)} - {tarea.hora_fin?.slice(0, 5)}
          </span>
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${categoryStyle}`}>
            {tarea.categoria}
          </span>
        </div>
      </div>
    </div>
  );
}
