'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Users,
  MessageSquare,
  CheckSquare,
  CreditCard,
  ClipboardList,
  ShoppingCart,
  Bell,
  ChevronDown,
  Check,
  Loader2,
} from 'lucide-react';
import { useEmployees, useAbsences } from '@/hooks/useBuk';

/* ------------------------------------------------------------------ */
/*  Mock data (employer-specific features not in BUK)                  */
/* ------------------------------------------------------------------ */

const quickActions = [
  { label: 'Asignar Tarea', icon: ClipboardList, href: '/empresa/tareas' },
  { label: 'Lista de Compras', icon: ShoppingCart, href: '/empresa/compras' },
  { label: 'Nuevo Recordatorio', icon: Bell, href: '/empresa/recordatorios' },
  { label: 'Ver Solicitudes', icon: MessageSquare, href: '/empresa/solicitudes' },
];

interface Task {
  id: number;
  title: string;
  assignee: string;
  role: string;
  completed: boolean;
}

const initialTasks: Task[] = [
  { id: 1, title: 'Aseo general living y comedor', assignee: 'María', role: 'nana', completed: true },
  { id: 2, title: 'Lavar y planchar ropa', assignee: 'María', role: 'nana', completed: false },
  { id: 3, title: 'Cortar pasto sector norte', assignee: 'Juan', role: 'jardinero', completed: false },
  { id: 4, title: 'Limpiar piscina y revisar pH', assignee: 'Pedro', role: 'piscinero', completed: false },
  { id: 5, title: 'Preparar almuerzo', assignee: 'María', role: 'nana', completed: false },
];

interface ShoppingItem {
  id: number;
  name: string;
  checked: boolean;
}

const initialShoppingItems: ShoppingItem[] = [
  { id: 1, name: 'Leche (2lt)', checked: true },
  { id: 2, name: 'Pan (2un)', checked: true },
  { id: 3, name: 'Frutas (1kg)', checked: true },
  { id: 4, name: 'Detergente', checked: false },
  { id: 5, name: 'Carne', checked: false },
  { id: 6, name: 'Arroz', checked: false },
  { id: 7, name: 'Verduras', checked: false },
  { id: 8, name: 'Cloro piscina', checked: false },
];

const noticias = [
  { id: 1, title: 'Nuevo salario mínimo 2026', date: '15 Mar 2026', badge: 'laboral', badgeColor: 'bg-blue-100 text-blue-700' },
  { id: 2, title: 'Cambios en cotización AFC', date: '12 Mar 2026', badge: 'previsión', badgeColor: 'bg-purple-100 text-purple-700' },
];

const periodos = ['Marzo 2026', 'Febrero 2026', 'Enero 2026'];

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function EmpresaDashboard() {
  /* ── Real data from hooks ── */
  const { data: employees, loading: loadingEmployees } = useEmployees();
  const { data: absences, loading: loadingAbsences } = useAbsences();

  /* ── Derived real data ── */
  const activeEmployees = useMemo(
    () => (employees ?? []).filter((e) => e.estado === 'activo'),
    [employees]
  );

  const pendingAbsences = useMemo(
    () => (absences ?? []).filter((a) => a.estado === 'pendiente'),
    [absences]
  );

  const employeeCountLabel = useMemo(() => {
    if (!activeEmployees.length) return '';
    const roles = activeEmployees.map((e) => e.cargo.toLowerCase());
    const grouped: Record<string, number> = {};
    roles.forEach((r) => {
      grouped[r] = (grouped[r] || 0) + 1;
    });
    return Object.entries(grouped)
      .map(([role, count]) => `${count} ${role}`)
      .join(', ');
  }, [activeEmployees]);

  /* ── Marcaje built from real employee data ── */
  const marcaje = useMemo(() => {
    if (!activeEmployees.length) {
      return [
        { name: 'Cargando...', entrada: '-', salida: '-', estado: '-', color: 'bg-zinc-100 text-zinc-500' },
      ];
    }
    // Use real employee names with mock attendance data
    return activeEmployees.map((emp, idx) => ({
      name: emp.nombreCompleto,
      entrada: idx === 0 ? '08:02' : idx === 1 ? '08:30' : 'No marcó',
      salida: '-',
      estado: idx < 2 ? 'En turno' : 'Sin marcar',
      color: idx < 2 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700',
    }));
  }, [activeEmployees]);

  /* ── Solicitudes from absences data ── */
  const solicitudesDashboard = useMemo(() => {
    return pendingAbsences.slice(0, 3).map((a) => {
      const emp = (employees ?? []).find((e) => e.id === a.empleadoId);
      return {
        id: a.id,
        type: a.tipo,
        name: emp?.nombreCompleto ?? `Empleado #${a.empleadoId}`,
        date: a.inicio,
        status: a.estado,
      };
    });
  }, [pendingAbsences, employees]);

  /* ── KPI cards with real data where available ── */
  const kpis = useMemo(
    () => [
      {
        label: 'Colaboradores Activos',
        value: loadingEmployees ? '...' : String(activeEmployees.length),
        sub: loadingEmployees ? 'Cargando...' : employeeCountLabel || 'Sin colaboradores',
        icon: Users,
        color: 'bg-emerald-500',
      },
      {
        label: 'Solicitudes Pendientes',
        value: loadingAbsences ? '...' : String(pendingAbsences.length),
        sub: loadingAbsences ? 'Cargando...' : pendingAbsences.length > 0 ? 'Requieren tu atención' : 'Todo al día',
        icon: MessageSquare,
        color: 'bg-amber-500',
      },
      {
        label: 'Tareas Hoy',
        value: '5',
        sub: '2 completadas',
        icon: CheckSquare,
        color: 'bg-blue-500',
      },
      {
        label: 'Puntos Acumulados',
        value: '12.450',
        sub: 'Tarjeta ****4521',
        icon: CreditCard,
        color: 'bg-violet-500',
      },
    ],
    [loadingEmployees, loadingAbsences, activeEmployees, pendingAbsences, employeeCountLabel]
  );

  /* ── Local state for interactive features ── */
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [shoppingItems, setShoppingItems] = useState<ShoppingItem[]>(initialShoppingItems);
  const [periodoOpen, setPeriodoOpen] = useState(false);
  const [periodoSelected, setPeriodoSelected] = useState(periodos[0]);
  const [resolvedSolicitudes, setResolvedSolicitudes] = useState<Record<number, 'aprobada' | 'rechazada'>>({});

  const toggleTask = (id: number) => {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t)));
  };

  const toggleShoppingItem = (id: number) => {
    setShoppingItems((prev) => prev.map((i) => (i.id === id ? { ...i, checked: !i.checked } : i)));
  };

  const handleSolicitud = (id: number, action: 'aprobada' | 'rechazada') => {
    setResolvedSolicitudes((prev) => ({ ...prev, [id]: action }));
  };

  const checkedCount = shoppingItems.filter((i) => i.checked).length;

  const isLoading = loadingEmployees || loadingAbsences;

  return (
    <div className="space-y-6">
      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Bienvenido, Rene</h1>
          <p className="text-sm text-zinc-500">Tu hogar en orden</p>
        </div>

        {/* Periodo selector */}
        <div className="relative">
          <button
            onClick={() => setPeriodoOpen(!periodoOpen)}
            className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 transition-colors"
          >
            {periodoSelected}
            <ChevronDown className="h-4 w-4 text-zinc-400" />
          </button>
          {periodoOpen && (
            <div className="absolute right-0 z-20 mt-1 w-44 rounded-lg border border-zinc-200 bg-white py-1 shadow-lg">
              {periodos.map((p) => (
                <button
                  key={p}
                  onClick={() => {
                    setPeriodoSelected(p);
                    setPeriodoOpen(false);
                  }}
                  className={`block w-full px-4 py-2 text-left text-sm transition-colors ${
                    p === periodoSelected
                      ? 'bg-zinc-100 font-medium text-zinc-900'
                      : 'text-zinc-600 hover:bg-zinc-50'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Loading indicator ──────────────────────────────────── */}
      {isLoading && (
        <div className="flex items-center gap-2 text-sm text-zinc-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Conectando con BUK...</span>
        </div>
      )}

      {/* ── KPI Cards ──────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <div
              key={kpi.label}
              className="rounded-xl border border-zinc-200 bg-white p-5 flex items-start gap-4"
            >
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${kpi.color} text-white`}>
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold text-zinc-900">{kpi.value}</p>
                <p className="text-sm font-medium text-zinc-700">{kpi.label}</p>
                <p className="text-xs text-zinc-400 mt-0.5">{kpi.sub}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Quick Actions ──────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {quickActions.map((action) => {
          const Icon = action.icon;
          return (
            <Link
              key={action.label}
              href={action.href}
              className="rounded-xl bg-white border border-zinc-200 p-4 flex flex-col items-center gap-2 text-center hover:shadow-md hover:border-blue-300 transition-all"
            >
              <Icon className="h-6 w-6 text-zinc-600" />
              <span className="text-sm font-medium text-zinc-700">{action.label}</span>
            </Link>
          );
        })}
      </div>

      {/* ── Tasks & Solicitudes (two-column) ───────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Tareas del Día */}
        <div className="rounded-xl border border-zinc-200 bg-white">
          <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100">
            <h2 className="text-base font-semibold text-zinc-900">Tareas del Día</h2>
            <Link href="/empresa/tareas" className="text-xs font-medium text-blue-600 hover:text-blue-700">
              Ver todas &rarr;
            </Link>
          </div>
          <div className="divide-y divide-zinc-100">
            {tasks.map((task) => (
              <div key={task.id} className="flex items-center justify-between px-5 py-3">
                <div>
                  <p className={`text-sm font-medium ${task.completed ? 'text-zinc-400 line-through' : 'text-zinc-800'}`}>
                    {task.title}
                  </p>
                  <p className="text-xs text-zinc-400">
                    {task.assignee} ({task.role})
                  </p>
                </div>
                <button
                  onClick={() => toggleTask(task.id)}
                  className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
                    task.completed ? 'bg-emerald-500' : 'bg-zinc-200'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                      task.completed ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Solicitudes Pendientes */}
        <div className="rounded-xl border border-zinc-200 bg-white">
          <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold text-zinc-900">Solicitudes Pendientes</h2>
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-100 text-[11px] font-bold text-amber-700">
                {loadingAbsences ? '...' : pendingAbsences.length}
              </span>
            </div>
          </div>
          <div className="divide-y divide-zinc-100">
            {loadingAbsences ? (
              <div className="px-5 py-8 text-center">
                <Loader2 className="h-5 w-5 animate-spin text-zinc-400 mx-auto" />
                <p className="text-sm text-zinc-400 mt-2">Cargando solicitudes...</p>
              </div>
            ) : solicitudesDashboard.length === 0 ? (
              <div className="px-5 py-8 text-center">
                <p className="text-sm text-zinc-400">No hay solicitudes pendientes</p>
              </div>
            ) : (
              solicitudesDashboard.map((s) => {
                const resolved = resolvedSolicitudes[s.id];
                return (
                  <div key={s.id} className="px-5 py-4 flex flex-col gap-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm font-medium text-zinc-800">{s.type}</p>
                        <p className="text-xs text-zinc-400">
                          {s.name} &middot; {s.date}
                        </p>
                      </div>
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${
                          resolved === 'aprobada'
                            ? 'bg-emerald-100 text-emerald-700'
                            : resolved === 'rechazada'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-amber-100 text-amber-700'
                        }`}
                      >
                        {resolved === 'aprobada' ? 'Aprobada' : resolved === 'rechazada' ? 'Rechazada' : 'pendiente'}
                      </span>
                    </div>
                    {!resolved && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleSolicitud(s.id, 'aprobada')}
                          className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 transition-colors"
                        >
                          Aprobar
                        </button>
                        <button
                          onClick={() => handleSolicitud(s.id, 'rechazada')}
                          className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50 transition-colors"
                        >
                          Rechazar
                        </button>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* ── Bottom section (three-column) ──────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Marcaje Horario */}
        <div className="rounded-xl border border-zinc-200 bg-white">
          <div className="px-5 py-4 border-b border-zinc-100">
            <h2 className="text-base font-semibold text-zinc-900">Marcaje Horario Hoy</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-100 text-left text-xs font-medium text-zinc-400">
                  <th className="px-5 py-2">Empleado</th>
                  <th className="px-3 py-2">Entrada</th>
                  <th className="px-3 py-2">Salida</th>
                  <th className="px-3 py-2">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {marcaje.map((m) => (
                  <tr key={m.name}>
                    <td className="px-5 py-3 font-medium text-zinc-800">{m.name}</td>
                    <td className="px-3 py-3 text-zinc-600">{m.entrada}</td>
                    <td className="px-3 py-3 text-zinc-600">{m.salida}</td>
                    <td className="px-3 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${m.color}`}>
                        {m.estado}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Lista de Compras */}
        <div className="rounded-xl border border-zinc-200 bg-white">
          <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100">
            <h2 className="text-base font-semibold text-zinc-900">Compras Semana</h2>
            <span className="text-xs text-zinc-400 font-medium">
              {checkedCount}/{shoppingItems.length} items
            </span>
          </div>
          {/* Progress bar */}
          <div className="px-5 pt-3">
            <div className="h-2 w-full rounded-full bg-zinc-100">
              <div
                className="h-2 rounded-full bg-blue-500 transition-all"
                style={{ width: `${(checkedCount / shoppingItems.length) * 100}%` }}
              />
            </div>
          </div>
          <div className="divide-y divide-zinc-100 mt-3">
            {shoppingItems.map((item) => (
              <label
                key={item.id}
                className="flex items-center gap-3 px-5 py-2.5 cursor-pointer hover:bg-zinc-50 transition-colors"
              >
                <button
                  onClick={() => toggleShoppingItem(item.id)}
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors ${
                    item.checked
                      ? 'border-blue-500 bg-blue-500 text-white'
                      : 'border-zinc-300 bg-white'
                  }`}
                >
                  {item.checked && <Check className="h-3 w-3" />}
                </button>
                <span className={`text-sm ${item.checked ? 'text-zinc-400 line-through' : 'text-zinc-700'}`}>
                  {item.name}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Noticias Legales */}
        <div className="rounded-xl border border-zinc-200 bg-white">
          <div className="px-5 py-4 border-b border-zinc-100">
            <h2 className="text-base font-semibold text-zinc-900">Noticias Legales</h2>
          </div>
          <div className="divide-y divide-zinc-100">
            {noticias.map((n) => (
              <div key={n.id} className="px-5 py-4">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium text-zinc-800">{n.title}</p>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${n.badgeColor}`}>
                    {n.badge}
                  </span>
                </div>
                <p className="text-xs text-zinc-400 mt-1">{n.date}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Footer ─────────────────────────────────────────────── */}
      <p className="text-xs text-zinc-400 text-right">
        Última actualización: 20 Mar 2026, 09:15
      </p>
    </div>
  );
}
