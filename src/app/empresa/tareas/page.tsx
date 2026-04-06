'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { useAuth } from '@/lib/auth/context';
import { getTareasHoy, updateTareaEstado, createTarea } from '@/lib/supabase/employer-queries';
import { createClient } from '@/lib/supabase/client';

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
  fecha?: string;
  aprobada_por_empleador?: boolean;
  calificacion?: number;
  nota_calificacion?: string;
  trabajadores?: { nombre: string; apellido_paterno: string } | null;
}

const priorityBorderColor: Record<string, string> = {
  alta: 'border-l-red-500',
  media: 'border-l-amber-500',
  baja: 'border-l-green-500',
};

const CATEGORIAS = [
  { value: 'aseo', label: 'Aseo', color: 'bg-emerald-100 text-emerald-700' },
  { value: 'cocina', label: 'Cocina', color: 'bg-orange-100 text-orange-700' },
  { value: 'lavado_planchado', label: 'Lavado y Planchado', color: 'bg-violet-100 text-violet-700' },
  { value: 'jardineria', label: 'Jardinería', color: 'bg-lime-100 text-lime-700' },
  { value: 'piscina', label: 'Piscina', color: 'bg-cyan-100 text-cyan-700' },
  { value: 'mascotas', label: 'Mascotas', color: 'bg-pink-100 text-pink-700' },
  { value: 'cuidado_ninos', label: 'Cuidado Niños', color: 'bg-amber-100 text-amber-700' },
  { value: 'compras', label: 'Compras', color: 'bg-blue-100 text-blue-700' },
  { value: 'orden', label: 'Orden', color: 'bg-zinc-100 text-zinc-700' },
  { value: 'otro', label: 'Otro', color: 'bg-gray-100 text-gray-700' },
];
const categoryColors: Record<string, string> = Object.fromEntries(CATEGORIAS.map(c => [c.value, c.color]));
const categoryLabels: Record<string, string> = Object.fromEntries(CATEGORIAS.map(c => [c.value, c.label]));

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
  const [showHistorico, setShowHistorico] = useState(false);
  const [historicoTareas, setHistoricoTareas] = useState<Task[]>([]);
  const [historicoFilter, setHistoricoFilter] = useState('');
  const [loadingHistorico, setLoadingHistorico] = useState(false);

  const empleadorId = profile?.empleador_id;

  const loadTareas = useCallback(async () => {
    if (!empleadorId) return;
    setLoading(true);
    const data = await getTareasHoy(empleadorId, toISODate(currentDate));
    setTasks(data || []);
    setLoading(false);
  }, [empleadorId, currentDate]);

  useEffect(() => { loadTareas(); }, [loadTareas]);

  // Auto-load histórico para resumen y filtros globales
  useEffect(() => {
    if (empleadorId && historicoTareas.length === 0) loadHistorico();
  }, [empleadorId]);

  // Combinar: histórico tiene todas las tareas incluyendo las de hoy
  const allTareas = historicoTareas.length > 0 ? historicoTareas : tasks;

  // Filtro: 'all' muestra tareas del día; otros estados filtran desde TODAS
  const filteredTasks = activeFilter === 'all'
    ? tasks
    : allTareas.filter((t) => t.estado === activeFilter);

  const completadas = allTareas.filter((t) => t.estado === 'completada').length;
  const enProgreso = allTareas.filter((t) => t.estado === 'en_progreso').length;
  const pendientes = allTareas.filter((t) => t.estado === 'pendiente').length;

  // Sincronizar toggles: actualizar ambos arrays
  function syncTaskUpdate(id: string, updates: Partial<Task>) {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
    setHistoricoTareas(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
  }

  const [ratingTask, setRatingTask] = useState<string | null>(null);
  const [ratingValue, setRatingValue] = useState(5);
  const [ratingNota, setRatingNota] = useState('');

  async function toggleTask(id: string, currentEstado: string) {
    const nuevoEstado = currentEstado === 'completada' ? 'pendiente' : 'completada';
    syncTaskUpdate(id, { estado: nuevoEstado });
    await updateTareaEstado(id, nuevoEstado);
  }

  async function aprobarTarea(id: string) {
    const supabase = createClient();
    await supabase.from('tareas').update({ aprobada_por_empleador: true, fecha_aprobacion: new Date().toISOString() }).eq('id', id);
    syncTaskUpdate(id, { aprobada_por_empleador: true });
    setRatingTask(id);
  }

  async function calificarTarea(id: string) {
    const supabase = createClient();
    await supabase.from('tareas').update({ calificacion: ratingValue, nota_calificacion: ratingNota || null }).eq('id', id);
    syncTaskUpdate(id, { calificacion: ratingValue, nota_calificacion: ratingNota });
    setRatingTask(null);
    setRatingValue(5);
    setRatingNota('');
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

  async function loadHistorico() {
    if (!empleadorId) return;
    setLoadingHistorico(true);
    const supabase = createClient();
    const { data } = await supabase.from('tareas').select('*, trabajadores(nombre, apellido_paterno)')
      .eq('empleador_id', empleadorId).order('fecha', { ascending: false }).limit(100);
    setHistoricoTareas(data || []);
    setLoadingHistorico(false);
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
              {CATEGORIAS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
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
              <div key={task.id}>
              <div
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
                        {categoryLabels[task.categoria] || task.categoria}
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
                {task.estado === 'completada' && !task.aprobada_por_empleador && (
                  <button onClick={(e) => { e.stopPropagation(); aprobarTarea(task.id); }}
                    className="rounded-lg bg-emerald-600 text-white px-3 py-1 text-xs font-medium hover:bg-emerald-700 transition whitespace-nowrap">
                    Aprobar
                  </button>
                )}
                {task.aprobada_por_empleador && !task.calificacion && (
                  <button onClick={(e) => { e.stopPropagation(); setRatingTask(task.id); }}
                    className="rounded-lg bg-amber-100 text-amber-700 px-3 py-1 text-xs font-medium hover:bg-amber-200 transition whitespace-nowrap">
                    Calificar
                  </button>
                )}
                {task.aprobada_por_empleador && task.calificacion && (
                  <span className="flex items-center gap-1 text-xs text-amber-600">
                    {'★'.repeat(task.calificacion)}{'☆'.repeat(5 - task.calificacion)}
                  </span>
                )}
              </div>
              {/* Rating modal inline */}
              {ratingTask === task.id && (
                <div className="mx-7 mb-3 p-3 rounded-lg bg-zinc-50 border border-zinc-200">
                  <p className="text-xs font-medium text-zinc-700 mb-2">Calificar tarea (solo visible para el administrador de Poppins)</p>
                  <div className="flex gap-1 mb-2">
                    {[1,2,3,4,5].map(v => (
                      <button key={v} onClick={() => setRatingValue(v)}
                        className={`text-lg ${v <= ratingValue ? 'text-amber-500' : 'text-zinc-300'}`}>★</button>
                    ))}
                  </div>
                  <input value={ratingNota} onChange={e => setRatingNota(e.target.value)} placeholder="Nota privada (opcional)"
                    className="w-full rounded-lg border border-zinc-200 px-3 py-1.5 text-xs mb-2" />
                  <div className="flex gap-2">
                    <button onClick={() => calificarTarea(task.id)} className="rounded-lg bg-zinc-900 text-white px-3 py-1 text-xs font-medium">Guardar</button>
                    <button onClick={() => setRatingTask(null)} className="text-xs text-zinc-500">Cancelar</button>
                  </div>
                </div>
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

      {/* Histórico */}
      <div className="mt-8 border-t border-zinc-200 pt-6">
        <button onClick={() => { setShowHistorico(!showHistorico); if (!showHistorico) loadHistorico(); }}
          className="text-sm font-medium text-zinc-600 hover:text-zinc-900 transition">
          {showHistorico ? '▼' : '▶'} Histórico de Tareas
        </button>

        {showHistorico && (
          <div className="mt-4 space-y-3">
            <input value={historicoFilter} onChange={e => setHistoricoFilter(e.target.value)} placeholder="Buscar tareas anteriores..."
              className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-300" />

            {loadingHistorico ? <Loader2 className="w-5 h-5 animate-spin text-zinc-400 mx-auto" /> : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {historicoTareas
                  .filter(t => !historicoFilter || t.titulo.toLowerCase().includes(historicoFilter.toLowerCase()) || (t.categoria || '').toLowerCase().includes(historicoFilter.toLowerCase()))
                  .map(t => (
                    <div key={t.id} className="flex items-center gap-3 rounded-lg border border-zinc-100 bg-white px-4 py-2.5 text-sm">
                      <span className={`w-2 h-2 rounded-full shrink-0 ${t.estado === 'completada' ? 'bg-emerald-500' : t.estado === 'en_progreso' ? 'bg-blue-500' : 'bg-zinc-300'}`} />
                      <span className={`flex-1 ${t.estado === 'completada' ? 'line-through text-zinc-400' : 'text-zinc-800'}`}>{t.titulo}</span>
                      {t.categoria && <span className="text-xs text-zinc-400">{categoryLabels[t.categoria] || t.categoria}</span>}
                      <span className="text-xs text-zinc-400">{t.fecha ? new Date(t.fecha + 'T12:00:00').toLocaleDateString('es-CL') : ''}</span>
                      {t.calificacion && <span className="text-xs text-amber-500">{'★'.repeat(t.calificacion)}</span>}
                    </div>
                  ))
                }
                {historicoTareas.length === 0 && <p className="text-sm text-zinc-400 text-center">Sin historial</p>}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
