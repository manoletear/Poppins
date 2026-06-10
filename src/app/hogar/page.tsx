'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
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
  ChevronRight,
  Check,
  Loader2,
  Trash2,
  CalendarDays,
} from 'lucide-react';
import { useAuth } from '@/lib/auth/context';
import { createClient } from '@/lib/supabase/client';
import { getTareasHoy, updateTareaEstado, getComprasActivas, getNoticiasLegales, updateSolicitudEstado, toggleItemComprado, deleteItemLista, getSolicitudes, getMarcajesHoy } from '@/lib/supabase/employer-queries';
import RecordatoriosWidget from '@/components/RecordatoriosWidget';

/* ------------------------------------------------------------------ */
/*  Mock data (employer-specific features not in BUK)                  */
/* ------------------------------------------------------------------ */

const quickActions = [
  { label: 'Asignar Tarea', icon: ClipboardList, href: '/hogar/tareas' },
  { label: 'Lista de Compras', icon: ShoppingCart, href: '/hogar/compras' },
  { label: 'Nuevo Recordatorio', icon: Bell, href: '/hogar/recordatorios' },
  { label: 'Ver Solicitudes', icon: MessageSquare, href: '/hogar/solicitudes' },
];

type TaskStatus = 'completed' | 'in_progress' | 'pending';

interface Task {
  id: string;
  title: string;
  assignee: string;
  role: string;
  status: TaskStatus;
}

interface ShoppingItem {
  id: string;
  name: string;
  checked: boolean;
}

const MESES_ES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const periodos = Array.from({ length: 6 }, (_, i) => {
  const d = new Date();
  d.setMonth(d.getMonth() - i);
  return `${MESES_ES[d.getMonth()]} ${d.getFullYear()}`;
});

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function EmpresaDashboard() {
  const { profile } = useAuth();
  const empleadorId = profile?.empleador_id || '';

  /* ── Puntos acumulados from Supabase ── */
  const [puntosAcumulados, setPuntosAcumulados] = useState<number | null>(null);
  useEffect(() => {
    if (!empleadorId) return;
    const supabase = createClient();
    supabase
      .from('pagos_empleador')
      .select('puntos_acumulados')
      .eq('empleador_id', empleadorId)
      .eq('estado', 'pagado')
      .then(({ data }: any) => {
        if (data) {
          const total = data.reduce(
            (sum: number, row: { puntos_acumulados: number | null }) =>
              sum + (row.puntos_acumulados ?? 0),
            0
          );
          setPuntosAcumulados(total);
        }
      });
  }, [empleadorId]);

  /* ── Data from Supabase ── */
  const [trabajadores, setTrabajadores] = useState<any[]>([]);
  const [marcajesHoy, setMarcajesHoy] = useState<any[]>([]);
  const [solicitudesPendientes, setSolicitudesPendientes] = useState<any[]>([]);
  const [vacacionesInfo, setVacacionesInfo] = useState<{ tomados: number; pendientes: number }>({ tomados: 0, pendientes: 15 });
  const [libreDisposicion, setLibreDisposicion] = useState<{ tomados: number; derecho: number }>({ tomados: 0, derecho: 0 });
  const [cuentasMes, setCuentasMes] = useState<any[]>([]);
  const [totalMes, setTotalMes] = useState(0);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (!empleadorId) return;
    const supabase = createClient();
    // Mes actual para libre disposición
    const now = new Date();
    const mesActual = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    Promise.all([
      supabase.from('contratos').select('*, trabajadores(id, nombre, apellido_paterno, cargo)').eq('empleador_id', empleadorId).eq('estado', 'activo'),
      getMarcajesHoy(empleadorId),
      supabase.from('solicitudes_empleado').select('*, trabajadores(nombre, apellido_paterno)').eq('empleador_id', empleadorId).eq('estado', 'pendiente').order('created_at', { ascending: false }).limit(5),
      supabase.from('solicitudes_empleado').select('dias').eq('empleador_id', empleadorId).eq('tipo', 'vacaciones').eq('estado', 'aprobada'),
      supabase.from('dias_libre_disposicion').select('id').eq('empleador_id', empleadorId).eq('estado', 'tomado').gte('fecha', mesActual + '-01').lte('fecha', mesActual + '-31'),
      supabase.from('cuentas_pago').select('*').eq('empleador_id', empleadorId).eq('activa', true).order('tipo'),
      // Contar meses trabajados para calcular derecho acumulado
      supabase.from('contratos').select('fecha_inicio').eq('empleador_id', empleadorId).eq('estado', 'activo').limit(1),
    ]).then(([contRes, marcajes, solRes, vacRes, ldRes, cuentasRes, contFechaRes]) => {
      setTrabajadores((contRes.data || []).map((c: any) => c.trabajadores).filter(Boolean));
      setMarcajesHoy(marcajes || []);
      setSolicitudesPendientes(solRes.data || []);
      const diasTomados = (vacRes.data || []).reduce((s: number, v: any) => s + (v.dias || 0), 0);
      setVacacionesInfo({ tomados: diasTomados, pendientes: Math.max(0, 15 - diasTomados) });

      // Ley 21.561: trabajadores puertas adentro tienen derecho a 2 días
      // de libre disposición remunerados al mes. Para puertas afuera aplica
      // la reducción gradual de jornada (44h→42h→40h).
      // Calculamos: meses trabajados × 2 = derecho acumulado anual
      const ldTomadosMes = ldRes.data?.length || 0;
      const fechaInicio = contFechaRes.data?.[0]?.fecha_inicio;
      let mesesTrabajados = 0;
      if (fechaInicio) {
        const inicio = new Date(fechaInicio);
        mesesTrabajados = (now.getFullYear() - inicio.getFullYear()) * 12 + (now.getMonth() - inicio.getMonth());
        if (mesesTrabajados < 0) mesesTrabajados = 0;
      }
      // Derecho: 2 días por cada mes del año en curso
      const mesesEnAnio = now.getMonth() + 1; // Ene=1, Feb=2, etc.
      const derechoAnual = mesesEnAnio * 2;
      setLibreDisposicion({ tomados: ldTomadosMes, derecho: 2 });

      // Cuentas del mes
      const cuentas = cuentasRes.data || [];
      setCuentasMes(cuentas);
      setTotalMes(cuentas.reduce((s: number, c: any) => s + (c.monto_fijo || 0), 0));

      setLoadingData(false);
    });
  }, [empleadorId]);

  const marcaje = marcajesHoy.map((m: any) => ({
    name: m.trabajadores ? `${m.trabajadores.nombre} ${m.trabajadores.apellido_paterno || ''}` : 'Trabajador',
    entrada: m.hora_entrada || '-',
    salida: m.hora_salida || '-',
    estado: m.hora_salida ? 'Completado' : m.hora_entrada ? 'En turno' : 'Sin marcar',
    color: m.hora_salida ? 'bg-blue-100 text-blue-700' : m.hora_entrada ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700',
  }));

  const solicitudesDashboard = solicitudesPendientes.map((s: any) => ({
    id: s.id,
    type: s.tipo,
    name: s.trabajadores ? `${s.trabajadores.nombre} ${s.trabajadores.apellido_paterno || ''}` : 'Empleado',
    date: s.fecha_inicio,
    status: s.estado,
  }));

  /* ── Local state for interactive features ── */
  const [tasks, setTasks] = useState<Task[]>([]);
  const [shoppingItems, setShoppingItems] = useState<ShoppingItem[]>([]);
  const [noticiasData, setNoticiasData] = useState<any[]>([]);
  const [periodoOpen, setPeriodoOpen] = useState(false);
  const [periodoSelected, setPeriodoSelected] = useState(periodos[0]);
  const [resolvedSolicitudes, setResolvedSolicitudes] = useState<Record<string, 'aprobada' | 'rechazada'>>({});
  const [taskDetailOpen, setTaskDetailOpen] = useState(false);

  /* ── Load tareas, compras, noticias from Supabase ── */
  useEffect(() => {
    if (!empleadorId) return;
    getTareasHoy(empleadorId).then((data) => {
      setTasks((data || []).map((t: any) => ({
        id: t.id,
        title: t.titulo,
        assignee: t.trabajadores ? t.trabajadores.nombre : '',
        role: t.categoria || '',
        status: t.estado === 'completada' ? 'completed' as const : t.estado === 'en_progreso' ? 'in_progress' as const : 'pending' as const,
      })));
    });
    getComprasActivas(empleadorId).then((data) => {
      setShoppingItems((data || []).map((i: any) => ({
        id: i.id || i.item_id || String(Math.random()),
        name: i.nombre || i.item_nombre || '',
        checked: i.comprado ?? false,
      })));
    });
    getNoticiasLegales().then((data) => setNoticiasData(data || []));
  }, [empleadorId]);

  const toggleTask = (id: string) => {
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id !== id) return t;
        const next: TaskStatus =
          t.status === 'pending' ? 'in_progress' : t.status === 'in_progress' ? 'completed' : 'pending';
        return { ...t, status: next };
      })
    );
    const task = tasks.find((t) => t.id === id);
    if (task) {
      const nextEstado = task.status === 'pending' ? 'en_progreso' : task.status === 'in_progress' ? 'completada' : 'pendiente';
      updateTareaEstado(id, nextEstado);
    }
  };

  const taskStats = useMemo(() => {
    const completed = tasks.filter((t) => t.status === 'completed');
    const inProgress = tasks.filter((t) => t.status === 'in_progress');
    const pending = tasks.filter((t) => t.status === 'pending');
    const total = tasks.length;
    const pct = total > 0 ? Math.round((completed.length / total) * 100) : 0;
    return { completed, inProgress, pending, total, pct };
  }, [tasks]);

  /* ── KPI cards with real data where available ── */
  const kpis = useMemo(
    () => [
      {
        label: 'Colaboradores Activos',
        value: loadingData ? '...' : String(trabajadores.length),
        sub: loadingData ? 'Cargando...' : trabajadores.map((t: any) => t.cargo || 'Empleado').join(', ') || 'Sin colaboradores',
        icon: Users,
        color: 'bg-emerald-500',
        href: '/hogar/empleados',
      },
      {
        label: 'Solicitudes Pendientes',
        value: loadingData ? '...' : String(solicitudesPendientes.length),
        sub: loadingData ? 'Cargando...' : solicitudesPendientes.length > 0 ? 'Requieren tu atención' : 'Todo al día',
        icon: MessageSquare,
        color: 'bg-amber-500',
        href: '/hogar/solicitudes',
      },
      {
        label: 'Tareas Hoy',
        value: `${taskStats.completed.length}/${taskStats.total}`,
        sub: `${taskStats.pct}% completado`,
        icon: CheckSquare,
        color: 'bg-blue-500',
        href: '/hogar/tareas',
      },
      {
        label: 'Puntos Acumulados',
        value: puntosAcumulados === null ? '...' : puntosAcumulados.toLocaleString('es-CL'),
        sub: puntosAcumulados === null ? 'Cargando...' : 'Puntos en pagos realizados',
        icon: CreditCard,
        color: 'bg-violet-500',
        href: '/hogar/pagos',
      },
      {
        label: 'Vacaciones',
        value: `${vacacionesInfo.tomados}/${vacacionesInfo.tomados + vacacionesInfo.pendientes}`,
        sub: `${vacacionesInfo.pendientes} días pendientes`,
        icon: CheckSquare,
        color: 'bg-cyan-500',
        href: '/hogar/solicitudes',
      },
      {
        label: 'Libre Disposición',
        value: `${libreDisposicion.tomados}/${libreDisposicion.derecho}`,
        sub: `Ley 21.561 · ${libreDisposicion.derecho - libreDisposicion.tomados} días pendientes este mes`,
        icon: CalendarDays,
        color: 'bg-teal-500',
        href: '/hogar/horarios',
      },
    ],
    [loadingData, trabajadores, solicitudesPendientes, taskStats, puntosAcumulados, vacacionesInfo, libreDisposicion]
  );

  const toggleShoppingItem = async (id: string) => {
    const item = shoppingItems.find(i => i.id === id);
    if (!item) return;
    setShoppingItems((prev) => prev.map((i) => (i.id === id ? { ...i, checked: !i.checked } : i)));
    await toggleItemComprado(id, !item.checked);
  };

  const deleteShoppingItem = async (id: string) => {
    setShoppingItems(prev => prev.filter(i => i.id !== id));
    await deleteItemLista(id);
  };

  const handleSolicitud = async (id: string | number, action: 'aprobada' | 'rechazada') => {
    setResolvedSolicitudes((prev) => ({ ...prev, [String(id)]: action }));
    await updateSolicitudEstado(String(id), action);
  };

  const checkedCount = shoppingItems.filter((i) => i.checked).length;

  const isLoading = loadingData;

  return (
    <div className="space-y-6">
      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Bienvenido, {profile?.nombre || 'Usuario'}</h1>
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
          <span>Conectando...</span>
        </div>
      )}

      {/* ── Recordatorios proactivos ───────────────────────────── */}
      <RecordatoriosWidget />

      {/* ── KPI Cards ──────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <Link
              key={kpi.label}
              href={kpi.href}
              className="rounded-xl border border-zinc-200 bg-white p-5 flex items-start gap-4 hover:shadow-md hover:border-zinc-300 transition-all"
            >
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${kpi.color} text-white`}>
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold text-zinc-900">{kpi.value}</p>
                <p className="text-sm font-medium text-zinc-700">{kpi.label}</p>
                <p className="text-xs text-zinc-400 mt-0.5">{kpi.sub}</p>
              </div>
            </Link>
          );
        })}
      </div>

      {/* ── Pagar Cuentas del Mes ─────────────────────────────── */}
      {!loadingData && (
        <Link href="/hogar/pagos" className="block rounded-xl border border-zinc-200 bg-gradient-to-r from-violet-50 to-indigo-50 p-5 hover:shadow-lg transition-all group">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-violet-600 rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform">
                <CreditCard className="w-6 h-6 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-zinc-900">Pagar Cuentas del Mes</h2>
                  {profile?.rol === 'empleador' && cuentasMes.some((c: any) => c.fuente === 'poppins_agent') && (
                    <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-bold text-violet-700">PAT</span>
                  )}
                </div>
                <p className="text-sm text-zinc-500">{cuentasMes.length} cuenta{cuentasMes.length !== 1 ? 's' : ''} activa{cuentasMes.length !== 1 ? 's' : ''}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-violet-700">${totalMes.toLocaleString('es-CL')}</p>
              <p className="text-xs text-zinc-500">Total estimado</p>
            </div>
          </div>
          {cuentasMes.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {cuentasMes.slice(0, 5).map((c: any) => (
                <span key={c.id} className="rounded-full bg-white border border-zinc-200 px-2.5 py-0.5 text-xs text-zinc-600">
                  {c.alias || c.proveedor || c.tipo}
                </span>
              ))}
              {cuentasMes.length > 5 && <span className="text-xs text-zinc-400">+{cuentasMes.length - 5} más</span>}
            </div>
          )}
        </Link>
      )}

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
            <div className="flex items-center gap-3">
              {/* Circular progress indicator */}
              <div className="relative h-11 w-11 shrink-0">
                <svg className="h-11 w-11 -rotate-90" viewBox="0 0 44 44">
                  <circle
                    cx="22"
                    cy="22"
                    r="18"
                    fill="none"
                    stroke="#e4e4e7"
                    strokeWidth="4"
                  />
                  <circle
                    cx="22"
                    cy="22"
                    r="18"
                    fill="none"
                    stroke="#3b82f6"
                    strokeWidth="4"
                    strokeLinecap="round"
                    strokeDasharray={`${2 * Math.PI * 18}`}
                    strokeDashoffset={`${2 * Math.PI * 18 * (1 - taskStats.pct / 100)}`}
                    className="transition-all duration-500"
                  />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-[11px] font-bold text-zinc-700">
                  {taskStats.pct}%
                </span>
              </div>
              <h2 className="text-base font-semibold text-zinc-900">Tareas del Día</h2>
            </div>
            <Link href="/hogar/tareas" className="text-xs font-medium text-blue-600 hover:text-blue-700">
              Ver todas &rarr;
            </Link>
          </div>

          {/* Stats bar */}
          <div className="flex items-center gap-4 px-5 py-2.5 border-b border-zinc-100 text-xs text-zinc-500">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              {taskStats.completed.length} completadas
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-blue-500" />
              {taskStats.inProgress.length} en progreso
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-amber-500" />
              {taskStats.pending.length} pendientes
            </span>
          </div>

          {/* Task toggles */}
          <div className="divide-y divide-zinc-100">
            {tasks.map((task) => (
              <div key={task.id} className="flex items-center justify-between px-5 py-3">
                <div>
                  <p className={`text-sm font-medium ${
                    task.status === 'completed' ? 'text-zinc-400 line-through' : 'text-zinc-800'
                  }`}>
                    {task.title}
                  </p>
                  <p className="text-xs text-zinc-400">
                    {task.assignee} ({task.role})
                  </p>
                </div>
                <button
                  onClick={() => toggleTask(task.id)}
                  className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
                    task.status === 'completed'
                      ? 'bg-emerald-500'
                      : task.status === 'in_progress'
                      ? 'bg-blue-500'
                      : 'bg-zinc-200'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                      task.status === 'completed'
                        ? 'translate-x-5'
                        : task.status === 'in_progress'
                        ? 'translate-x-2.5'
                        : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            ))}
          </div>

          {/* Expandable detail section */}
          <div className="border-t border-zinc-100">
            <button
              onClick={() => setTaskDetailOpen(!taskDetailOpen)}
              className="flex items-center gap-1.5 px-5 py-3 text-xs font-medium text-blue-600 hover:text-blue-700 transition-colors w-full text-left"
            >
              <ChevronRight
                className={`h-3.5 w-3.5 transition-transform duration-200 ${
                  taskDetailOpen ? 'rotate-90' : ''
                }`}
              />
              Ver detalle
            </button>
            {taskDetailOpen && (
              <div className="px-5 pb-4 space-y-4">
                {/* Completadas */}
                {taskStats.completed.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-emerald-700 mb-1.5 flex items-center gap-1.5">
                      <span className="text-sm">&#x2705;</span> Completadas
                    </p>
                    <ul className="space-y-1 pl-1">
                      {taskStats.completed.map((t) => (
                        <li key={t.id} className="text-xs text-zinc-500 flex items-start gap-1.5">
                          <span className="mt-0.5 h-1.5 w-1.5 rounded-full bg-emerald-400 shrink-0" />
                          {t.title} <span className="text-zinc-400">— {t.assignee}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {/* En progreso */}
                {taskStats.inProgress.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-blue-700 mb-1.5 flex items-center gap-1.5">
                      <span className="text-sm">&#x1F504;</span> En progreso
                    </p>
                    <ul className="space-y-1 pl-1">
                      {taskStats.inProgress.map((t) => (
                        <li key={t.id} className="text-xs text-zinc-500 flex items-start gap-1.5">
                          <span className="mt-0.5 h-1.5 w-1.5 rounded-full bg-blue-400 shrink-0" />
                          {t.title} <span className="text-zinc-400">— {t.assignee}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {/* Pendientes */}
                {taskStats.pending.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-amber-700 mb-1.5 flex items-center gap-1.5">
                      <span className="text-sm">&#x23F3;</span> Pendientes
                    </p>
                    <ul className="space-y-1 pl-1">
                      {taskStats.pending.map((t) => (
                        <li key={t.id} className="text-xs text-zinc-500 flex items-start gap-1.5">
                          <span className="mt-0.5 h-1.5 w-1.5 rounded-full bg-amber-400 shrink-0" />
                          {t.title} <span className="text-zinc-400">— {t.assignee}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Solicitudes Pendientes */}
        <div className="rounded-xl border border-zinc-200 bg-white">
          <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold text-zinc-900">Solicitudes Pendientes</h2>
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-100 text-[11px] font-bold text-amber-700">
                {loadingData ? '...' : solicitudesPendientes.length}
              </span>
            </div>
          </div>
          <div className="divide-y divide-zinc-100">
            {loadingData ? (
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
              <div
                key={item.id}
                className="flex items-center gap-3 px-5 py-2.5 hover:bg-zinc-50 transition-colors group"
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
                <span className={`text-sm flex-1 ${item.checked ? 'text-zinc-400 line-through' : 'text-zinc-700'}`}>
                  {item.name}
                </span>
                <button
                  onClick={() => deleteShoppingItem(item.id)}
                  className="opacity-0 group-hover:opacity-100 text-zinc-400 hover:text-red-500 transition"
                  title="Eliminar"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Noticias Legales */}
        <div className="rounded-xl border border-zinc-200 bg-white">
          <div className="px-5 py-4 border-b border-zinc-100">
            <h2 className="text-base font-semibold text-zinc-900">Noticias Legales</h2>
          </div>
          <div className="divide-y divide-zinc-100">
            {noticiasData.slice(0, 3).map((n: any) => (
              <a key={n.id} href={n.url_fuente || '#'} target="_blank" rel="noopener noreferrer" className="block px-5 py-4 hover:bg-zinc-50 transition">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium text-zinc-800">{n.titulo}</p>
                  <span className="shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium bg-blue-100 text-blue-700">
                    {n.categoria}
                  </span>
                </div>
                <p className="text-xs text-zinc-500 mt-1 line-clamp-2">{n.resumen}</p>
                <p className="text-xs text-zinc-400 mt-1">{n.fuente} · {n.fecha_publicacion ? new Date(n.fecha_publicacion).toLocaleDateString('es-CL') : ''}</p>
              </a>
            ))}
            {noticiasData.length === 0 && (
              <div className="px-5 py-4 text-sm text-zinc-400">Sin noticias recientes</div>
            )}
          </div>
        </div>
      </div>

      {/* ── Footer ─────────────────────────────────────────────── */}
      <p className="text-xs text-zinc-400 text-right">
        Última actualización: {new Date().toLocaleDateString('es-CL', { day: 'numeric', month: 'short', year: 'numeric' })}, {new Date().toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}
      </p>
    </div>
  );
}
