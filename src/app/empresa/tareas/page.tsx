'use client';

import { useState } from 'react';
import { Plus, ChevronLeft, ChevronRight } from 'lucide-react';

type TaskStatus = 'Completada' | 'En Progreso' | 'Pendiente';
type Priority = 'alta' | 'media' | 'baja';
type FilterTab = 'all' | 'Pendiente' | 'En Progreso' | 'Completada';

interface Task {
  id: number;
  title: string;
  description?: string;
  assignee: string;
  category: string;
  priority: Priority;
  time: string;
  status: TaskStatus;
}

const initialTasks: Task[] = [
  { id: 1, title: 'Aseo general living y comedor', assignee: 'María', category: 'Aseo', priority: 'alta', time: '08:00 - 10:00', status: 'Completada' },
  { id: 2, title: 'Preparar desayuno', assignee: 'María', category: 'Cocina', priority: 'alta', time: '07:30 - 08:00', status: 'Completada' },
  { id: 3, title: 'Lavar y planchar ropa de la semana', assignee: 'María', category: 'Lavado', priority: 'media', time: '10:00 - 12:00', status: 'Pendiente' },
  { id: 4, title: 'Preparar almuerzo', assignee: 'María', category: 'Cocina', priority: 'alta', time: '12:00 - 13:00', status: 'Pendiente' },
  { id: 5, title: 'Aseo dormitorios y baños', assignee: 'María', category: 'Aseo', priority: 'media', time: '14:00 - 16:00', status: 'Pendiente' },
  { id: 6, title: 'Cortar pasto sector norte', assignee: 'Juan', category: 'Jardinería', priority: 'media', time: '08:00 - 10:00', status: 'En Progreso' },
  { id: 7, title: 'Podar arbustos entrada', assignee: 'Juan', category: 'Jardinería', priority: 'baja', time: '10:00 - 12:00', status: 'Pendiente' },
  { id: 8, title: 'Limpiar piscina', assignee: 'Pedro', category: 'Piscina', priority: 'alta', time: '08:00 - 09:00', status: 'Pendiente' },
  { id: 9, title: 'Revisar pH y cloro', assignee: 'Pedro', category: 'Piscina', priority: 'alta', time: '09:00 - 09:30', status: 'Pendiente' },
  { id: 10, title: 'Pasear a Rocky (mañana)', assignee: 'María', category: 'Mascotas', priority: 'alta', time: '07:00 - 07:30', status: 'Completada' },
];

const priorityBorderColor: Record<Priority, string> = {
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
  { label: 'Pendientes', value: 'Pendiente' },
  { label: 'En Progreso', value: 'En Progreso' },
  { label: 'Completadas', value: 'Completada' },
];

export default function TareasPage() {
  const [activeFilter, setActiveFilter] = useState<FilterTab>('all');
  const [tasks, setTasks] = useState<Task[]>(initialTasks);

  const filteredTasks = activeFilter === 'all'
    ? tasks
    : tasks.filter((t) => t.status === activeFilter);

  const completadas = tasks.filter((t) => t.status === 'Completada').length;
  const enProgreso = tasks.filter((t) => t.status === 'En Progreso').length;
  const pendientes = tasks.filter((t) => t.status === 'Pendiente').length;

  function toggleTask(id: number) {
    setTasks((prev) =>
      prev.map((t) =>
        t.id === id
          ? { ...t, status: t.status === 'Completada' ? 'Pendiente' : 'Completada' as TaskStatus }
          : t
      )
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Tareas del Día</h1>
          <p className="text-zinc-500 text-sm mt-1">Viernes 20 de marzo, 2026</p>
        </div>
        <button className="inline-flex items-center gap-2 rounded-lg bg-zinc-900 text-white px-4 py-2 text-sm font-medium hover:bg-zinc-800 transition-colors">
          <Plus className="w-4 h-4" />
          Nueva Tarea
        </button>
      </div>

      {/* Date selector */}
      <div className="flex items-center gap-3 mb-6">
        <button className="p-1.5 rounded-lg border border-zinc-200 hover:bg-zinc-50 transition-colors">
          <ChevronLeft className="w-4 h-4 text-zinc-600" />
        </button>
        <span className="text-sm font-medium text-zinc-700">20 Mar 2026</span>
        <button className="p-1.5 rounded-lg border border-zinc-200 hover:bg-zinc-50 transition-colors">
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
      <div className="space-y-2">
        {filteredTasks.map((task) => (
          <div
            key={task.id}
            className={`rounded-xl border border-zinc-200 bg-white px-5 py-4 border-l-4 ${priorityBorderColor[task.priority]} flex items-start gap-4 transition-colors ${
              task.status === 'Completada' ? 'opacity-75' : ''
            }`}
          >
            {/* Toggle */}
            <button
              onClick={() => toggleTask(task.id)}
              className={`mt-0.5 w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors ${
                task.status === 'Completada'
                  ? 'bg-emerald-500 border-emerald-500 text-white'
                  : 'border-zinc-300 hover:border-zinc-400'
              }`}
            >
              {task.status === 'Completada' && (
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              )}
            </button>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className={`text-sm font-medium ${
                    task.status === 'Completada' ? 'line-through text-zinc-400' : 'text-zinc-900'
                  }`}
                >
                  {task.title}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <span className="rounded-full bg-blue-100 text-blue-700 px-2 py-0.5 text-xs font-medium">
                  {task.assignee}
                </span>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    categoryColors[task.category] || 'bg-zinc-100 text-zinc-700'
                  }`}
                >
                  {task.category}
                </span>
                <span className="text-xs text-zinc-400">{task.time}</span>
              </div>
            </div>

            {/* Status indicator */}
            {task.status === 'En Progreso' && (
              <span className="rounded-full bg-blue-100 text-blue-700 px-2.5 py-0.5 text-xs font-medium whitespace-nowrap">
                En Progreso
              </span>
            )}
          </div>
        ))}

        {filteredTasks.length === 0 && (
          <div className="text-center py-12 text-zinc-400 text-sm">
            No hay tareas en esta categoría.
          </div>
        )}
      </div>
    </div>
  );
}
