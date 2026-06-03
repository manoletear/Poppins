'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { useAuth } from '@/lib/auth/context';
import { getTareasHoy, updateTareaEstado, createTarea } from '@/lib/supabase/employer-queries';
import { createClient } from '@/lib/supabase/client';

type TaskStatus = 'completada' | 'en_progreso' | 'pendiente';

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

const COLUMNS: { estado: TaskStatus; label: string; dot: string }[] = [
  { estado: 'pendiente', label: 'Pendientes', dot: 'bg-zinc-400' },
  { estado: 'en_progreso', label: 'En Progreso', dot: 'bg-blue-500' },
  { estado: 'completada', label: 'Completadas', dot: 'bg-emerald-500' },
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
  const [trabajadores, setTrabajadores] = useState<{ id: string; nombre: string }[]>([]);
  const [newTrabajadorId, setNewTrabajadorId] = useState('');
  const [newRecordar, setNewRecordar] = useState(false);
  const [newRecFecha, setNewRecFecha] = useState('');
  const [newRecHora, setNewRecHora] = useState('08:00');
  const [dragOverCol, setDragOverCol] = useState<string | null>(null);
  const [ratingTask, setRatingTask] = useState<string | null>(null);
  const [ratingValue, setRatingValue] = useState(5);
  const [ratingNota, setRatingNota] = useState('');

  const empleadorId = profile?.empleador_id;

  const loadTareas = useCallback(async () => {
    if (!empleadorId) return;
    setLoading(true);
    const data = await getTareasHoy(empleadorId, toISODate(currentDate));
    setTasks(data || []);
    setLoading(false);
  }, [empleadorId, currentDate]);

  useEffect(() => { loadTareas(); }, [loadTareas]);

  const loadHistorico = useCallback(async () => {
    if (!empleadorId) return;
    setLoadingHistorico(true);
    const supabase = createClient();
    const { data } = await supabase.from('tareas').select('*, trabajadores(nombre, apellido_paterno)')
      .eq('empleador_id', empleadorId).order('fecha', { ascending: false }).limit(100);
    setHistoricoTareas(data || []);
    setLoadingHistorico(false);
  }, [empleadorId]);

  // Load trabajadores for assignment select
  useEffect(() => {
    if (!empleadorId) return;
    const supabase = createClient();
    supabase.from('contratos').select('trabajador_id, trabajadores(id, nombre, apellido_paterno)')
      .eq('empleador_id', empleadorId).eq('estado', 'activo')
      .then(({ data }: any) => {
        const workers = (data || []).map((c: any) => ({
          id: c.trabajador_id,
          nombre: `${c.trabajadores?.nombre || ''} ${c.trabajadores?.apellido_paterno || ''}`.trim(),
        })).filter((w: any) => w.id);
        setTrabajadores(workers);
        if (workers.length === 1) setNewTrabajadorId(workers[0].id);
      });
  }, [empleadorId]);

  const completadas = tasks.filter((t) => t.estado === 'completada').length;
  const enProgreso = tasks.filter((t) => t.estado === 'en_progreso').length;
  const pendientes = tasks.filter((t) => t.estado === 'pendiente').length;

  function syncTaskUpdate(id: string, updates: Partial<Task>) {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
    setHistoricoTareas(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
  }

  async function moveTask(id: string, nuevoEstado: TaskStatus) {
    setDragOverCol(null);
    const current = tasks.find(t => t.id === id);
    if (!current || current.estado === nuevoEstado) return;
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
      trabajador_id: newTrabajadorId || undefined,
      fecha: toISODate(currentDate),
    });
    // Recordatorio opcional con fecha/hora (avisa por correo el día indicado)
    if (newRecordar && newRecFecha) {
      const supabase = createClient();
      await supabase.from('recordatorios').insert({
        empleador_id: empleadorId, titulo: newTitle.trim(), tipo: 'tarea',
        fecha: newRecFecha, hora: newRecHora, activo: true,
      });
    }
    setNewTitle('');
    setNewCategoria('');
    setNewPrioridad('media');
    setNewRecordar(false);
    setNewRecFecha('');
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
    <div className="max-w-6xl mx-auto px-4 py-8">
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
          {trabajadores.length > 0 && (
            <select value={newTrabajadorId} onChange={(e) => setNewTrabajadorId(e.target.value)} className="rounded-lg border border-zinc-200 px-3 py-2 text-sm w-full">
              <option value="">Asignar a...</option>
              {trabajadores.map((w) => <option key={w.id} value={w.id}>{w.nombre}</option>)}
            </select>
          )}
          <label className="flex items-center gap-2 text-sm text-zinc-700">
            <input type="checkbox" checked={newRecordar} onChange={(e) => { setNewRecordar(e.target.checked); if (e.target.checked && !newRecFecha) setNewRecFecha(toISODate(currentDate)); }} className="rounded border-zinc-300" />
            🔔 Recordármelo por correo
          </label>
          {newRecordar && (
            <div className="flex gap-3 items-center pl-6">
              <input type="date" value={newRecFecha} onChange={(e) => setNewRecFecha(e.target.value)} className="rounded-lg border border-zinc-200 px-3 py-2 text-sm" />
              <input type="time" value={newRecHora} onChange={(e) => setNewRecHora(e.target.value)} className="rounded-lg border border-zinc-200 px-3 py-2 text-sm" />
            </div>
          )}
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

      {/* Kanban board */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-zinc-400" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {COLUMNS.map((col) => {
            const colTasks = tasks.filter((t) => (t.estado || 'pendiente') === col.estado);
            return (
              <div
                key={col.estado}
                onDragOver={(e) => { e.preventDefault(); setDragOverCol(col.estado); }}
                onDragLeave={() => setDragOverCol((c) => (c === col.estado ? null : c))}
                onDrop={(e) => {
                  e.preventDefault();
                  const id = e.dataTransfer.getData('text/plain');
                  if (id) moveTask(id, col.estado);
                }}
                className={`rounded-xl border p-3 min-h-[240px] transition-colors ${
                  dragOverCol === col.estado ? 'border-zinc-400 bg-zinc-100' : 'border-zinc-200 bg-zinc-50/60'
                }`}
              >
                <div className="flex items-center gap-2 mb-3 px-1">
                  <span className={`w-2 h-2 rounded-full ${col.dot}`} />
                  <span className="text-sm font-semibold text-zinc-700">{col.label}</span>
                  <span className="ml-auto text-xs text-zinc-400">{colTasks.length}</span>
                </div>

                <div className="space-y-2">
                  {colTasks.map((task) => {
                    const assigneeName = task.trabajadores
                      ? `${task.trabajadores.nombre} ${task.trabajadores.apellido_paterno || ''}`.trim()
                      : null;
                    return (
                      <div key={task.id}>
                        <div
                          draggable
                          onDragStart={(e) => e.dataTransfer.setData('text/plain', task.id)}
                          className={`rounded-lg border border-zinc-200 bg-white px-3 py-2.5 border-l-4 ${priorityBorderColor[task.prioridad || 'media']} cursor-grab active:cursor-grabbing shadow-sm hover:shadow transition-shadow`}
                        >
                          <p className={`text-sm font-medium ${task.estado === 'completada' ? 'text-zinc-400 line-through' : 'text-zinc-900'}`}>
                            {task.titulo}
                          </p>
                          <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                            {assigneeName && (
                              <span className="rounded-full bg-blue-100 text-blue-700 px-2 py-0.5 text-[11px] font-medium">{assigneeName}</span>
                            )}
                            {task.categoria && (
                              <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${categoryColors[task.categoria] || 'bg-zinc-100 text-zinc-700'}`}>
                                {categoryLabels[task.categoria] || task.categoria}
                              </span>
                            )}
                          </div>
                          {task.estado === 'completada' && (
                            <div className="mt-2 flex items-center gap-2">
                              {!task.aprobada_por_empleador && (
                                <button onClick={() => aprobarTarea(task.id)} className="rounded bg-emerald-600 text-white px-2 py-0.5 text-[11px] font-medium hover:bg-emerald-700">Aprobar</button>
                              )}
                              {task.aprobada_por_empleador && !task.calificacion && (
                                <button onClick={() => setRatingTask(task.id)} className="rounded bg-amber-100 text-amber-700 px-2 py-0.5 text-[11px] font-medium hover:bg-amber-200">Calificar</button>
                              )}
                              {task.calificacion && (
                                <span className="text-[11px] text-amber-500">{'★'.repeat(task.calificacion)}{'☆'.repeat(5 - task.calificacion)}</span>
                              )}
                            </div>
                          )}
                        </div>
                        {ratingTask === task.id && (
                          <div className="mt-2 p-3 rounded-lg bg-white border border-zinc-200">
                            <p className="text-[11px] font-medium text-zinc-700 mb-2">Calificar (privado, solo admin Poppins)</p>
                            <div className="flex gap-1 mb-2">
                              {[1, 2, 3, 4, 5].map((v) => (
                                <button key={v} onClick={() => setRatingValue(v)} className={`text-lg ${v <= ratingValue ? 'text-amber-500' : 'text-zinc-300'}`}>★</button>
                              ))}
                            </div>
                            <input value={ratingNota} onChange={(e) => setRatingNota(e.target.value)} placeholder="Nota privada (opcional)" className="w-full rounded-lg border border-zinc-200 px-3 py-1.5 text-xs mb-2" />
                            <div className="flex gap-2">
                              <button onClick={() => calificarTarea(task.id)} className="rounded-lg bg-zinc-900 text-white px-3 py-1 text-xs font-medium">Guardar</button>
                              <button onClick={() => setRatingTask(null)} className="text-xs text-zinc-500">Cancelar</button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {colTasks.length === 0 && (
                    <p className="text-center text-xs text-zinc-300 py-8 border border-dashed border-zinc-200 rounded-lg">Arrastrá tareas aquí</p>
                  )}
                </div>
              </div>
            );
          })}
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
