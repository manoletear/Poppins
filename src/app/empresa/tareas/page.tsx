'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { useAuth } from '@/lib/auth/context';
import { getTareasHoy, updateTareaEstado, createTarea } from '@/lib/supabase/employer-queries';

type TaskStatus = 'completada' | 'en_progreso' | 'pendiente';
type FilterTab = 'all' | 'pendiente' | 'en_progreso' | 'completada';

interface Task {
  id: string;
  titulo: string;
  descripcion?: string;
  categoria?: string;
  prioridad?: string;
  hora_inicio?: string;
  hora_fin?: string;
  estado: string;
  trabajadores?: { nombre: string; apellido_paterno: string } | null;
}

const priorityBorderColor: Record<string, string> = {
  alta: 'border-l-red-500',
  media: 'border-l-amber-500',
  baja: 'border-l-green-500',
};

const categoryColors: Record<string, string> = {
  Aseo: 'bg-emerald-100 text-emerald-700',
  Cocina: 'bg-orange-100 text-orange-700',
  Lavado: 'bg-violet-100 text-violet-700',
  Jardinería: 'bg-lime-100 text-lime-700',
  Piscina: 'bg-cyan-100 text-cyan-700',
  Mascotas: 'bg-pink-100 text-pink-700',
};

const filterTabs: { label: string; value: FilterTab }[] = [
  { label: 'All', value: 'all' },
  { label: 'Pendientes', value: 'pendiente' },
  { label: 'En Progreso', value: 'en_progreso' },
  { label: 'Completadas', value: 'completada' },
];

function formatDate(date: Date): string {
  return date.toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

function formatDateShort(date: Date): string {
  return date.toLocaleDateString('es-CL', { day: 'numeric', month: 'short', year: 'numeric' });
}

function toISODate(date: Date): string {
  return date.toISOString().split('T')[0];
}

export default function TareasPage() {
  const { profile } = useAuth();
  const [activeFilter, setActiveFilter] = useState<FilterTab>('all');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [showNewForm, setShowNewForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newCategoria, setNewCategoria] = useState('');
  const [newPrioridad, setNewPrioridad] = useState('media');
  const [saving, setSaving] = useState(false);

  const empleadorId = profile?.empleador_id;

  const loadTareas = useCallback(async () => {
    if (!empleadorId) return;
    setLoading(true);
    const data = await getTareasHoy(empleadorId, toISODate(currentDate));
    setTasks(data || []);
    setLoading(false);
  }, [empleadorId, currentDate]);

  useEffect(() => { loadTareas(); }, [loadTareas]);

  const filteredTasks = activeFilter === 'all'
    ? tasks
    : tasks.filter((t) => t.estado === activeFilter);

  const completadas = tasks.filter((t) => t.estado === 'completada').length;
  const enProgreso = tasks.filter((t) => t.estado === 'en_progreso').length;
  const pendientes = tasks.filter((t) => t.estado === 'pendiente').length;

  async function toggleTask(id: string, currentEstado: string) {
    const nuevoEstado = currentEstado === 'completada' ? 'pendiente' : 'completada';
    setTasks((prev) => prev.map((t) => t.id === id ? { ...t, estado: nuevoEstado } : t));
    await updateTareaEstado(id, nuevoEstado);
  }

  async function handleCreateTarea(e: React.FormEvent) {
    e.preventDefault();
    if (!empleadorId || !newTitle.trim()) return;
    setSaving(true);
    await createTarea(empleadorId, {
      titulo: newTitle.trim(),
      categoria: newCategoria || undefined,
      prioridad: newPrioridad,
      fecha: toISODate(currentDate),
    });
    setNewTitle('');
    setNewCategoria('');
    setNewPrioridad('media');
    setShowNewForm(false);
    setSaving(false);
    loadTareas();
  }

  function changeDate(delta: number) {
    setCurrentDate((prev) => {
      const d = new Date(prev);
      d.setDate(d.getDate() + delta);
      return d;
    });
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Tareas del Día</h1>
          <p className="text-zinc-500 text-sm mt-1 capitalize">{formatDate(currentDate)}</p>
        </div>
        <button
          onClick={() => setShowNewForm(!showNewForm)}
          className="inline-flex items-center gap-2 rounded-lg bg-zinc-900 text-white px-4 py-2 text-sm font-medium hover:bg-zinc-800 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Nueva Tarea
        </button>
      </div>

      {/* New task form */}
      {showNewForm && (
        <form onSubmit={handleCreateTarea} className="rounded-xl border border-zinc-200 bg-white p-4 mb-6 space-y-3">
          <input
            type="text"
            placeholder="Título de la tarea"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-300"
            autoFocus
          />
          <div className="flex gap-3">
            <select value={newCategoria} onChange={(e) => setNewCategoria(e.target.value)} className="rounded-lg border border-zinc-200 px-3 py-2 text-sm flex-1">
              <option value="">Categoría</option>
              {Object.keys(categoryColors).map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <select value={newPrioridad} onChange={(e) => setNewPrioridad(e.target.value)} className="rounded-lg border border-zinc-200 px-3 py-2 text-sm flex-1">
              <option value="alta">Alta</option>
              <option value="media">Media</option>
              <option value="baja">Baja</option>
            </select>
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={saving || !newTitle.trim()} className="rounded-lg bg-zinc-900 text-white px-4 py-2 text-sm font-medium hover:bg-zinc-800 disabled:opacity-50">
              {saving ? 'Guardando...' : 'Crear'}
            </button>
            <button type="button" onClick={() => setShowNewForm(false)} className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium hover:bg-zinc-50">
              Cancelar
            </button>
          </div>
        </form>
      )}

      {/* Date selector */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => changeDate(-1)} className="p-1.5 rounded-lg border border-zinc-200 hover:bg-zinc-50 transition-colors">
          <ChevronLeft className="w-4 h-4 text-zinc-600" />
        </button>
        <span className="text-sm font-medium text-zinc-700">{formatDateShort(currentDate)}</span>
        <button onClick={() => changeDate(1)} className="p-1.5 rounded-lg border border-zinc-200 hover:bg-zinc-50 transition-colors">
          <ChevronRight className="w-4 h-4 text-zinc-600" />
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-2 mb-4">
        {filterTabs.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setActiveFilter(tab.value)}
            className={
              activeFilter === tab.value
                ? 'bg-zinc-900 text-white rounded-full px-4 py-1.5 text-sm font-medium transition-colors'
                : 'text-zinc-500 hover:text-zinc-700 rounded-full px-4 py-1.5 text-sm font-medium transition-colors'
            }
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Stats bar */}
      <div className="flex items-center gap-4 text-sm text-zinc-500 mb-5">
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
          {completadas} completadas
        </span>
        <span className="text-zinc-300">·</span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />
          {enProgreso} en progreso
        </span>
        <span className="text-zinc-300">·</span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-zinc-400 inline-block" />
          {pendientes} pendientes
        </span>
      </div>

      {/* Task list */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-zinc-400" />
        </div>
      ) : (
        <div className="space-y-2">
          {filteredTasks.map((task) => {
            const assigneeName = task.trabajadores
              ? `${task.trabajadores.nombre} ${task.trabajadores.apellido_paterno || ''}`.trim()
              : null;
            const timeRange = [task.hora_inicio, task.hora_fin].filter(Boolean).join(' - ');

            return (
              <div
                key={task.id}
                className={`rounded-xl border border-zinc-200 bg-white px-5 py-4 border-l-4 ${priorityBorderColor[task.prioridad || 'media']} flex items-start gap-4 transition-colors ${
                  task.estado === 'completada' ? 'opacity-75' : ''
                }`}
              >
                <button
                  onClick={() => toggleTask(task.id, task.estado)}
                  className={`mt-0.5 w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors ${
                    task.estado === 'completada'
                      ? 'bg-emerald-500 border-emerald-500 text-white'
                      : 'border-zinc-300 hover:border-zinc-400'
                  }`}
                >
                  {task.estado === 'completada' && (
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>

                <div className="flex-1 min-w-0">
                  <span className={`text-sm font-medium ${task.estado === 'completada' ? 'line-through text-zinc-400' : 'text-zinc-900'}`}>
                    {task.titulo}
                  </span>
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    {assigneeName && (
                      <span className="rounded-full bg-blue-100 text-blue-700 px-2 py-0.5 text-xs font-medium">
                        {assigneeName}
                      </span>
                    )}
                    {task.categoria && (
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${categoryColors[task.categoria] || 'bg-zinc-100 text-zinc-700'}`}>
                        {task.categoria}
                      </span>
                    )}
                    {timeRange && <span className="text-xs text-zinc-400">{timeRange}</span>}
                  </div>
                </div>

                {task.estado === 'en_progreso' && (
                  <span className="rounded-full bg-blue-100 text-blue-700 px-2.5 py-0.5 text-xs font-medium whitespace-nowrap">
                    En Progreso
                  </span>
                )}
              </div>
            );
          })}

          {filteredTasks.length === 0 && (
            <div className="text-center py-12 text-zinc-400 text-sm">
              No hay tareas para este día.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
