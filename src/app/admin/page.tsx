'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth/context';
import { createClient } from '@/lib/supabase/client';
import {
  Users,
  Building2,
  FileText,
  CreditCard,
  Loader2,
  Shield,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Receipt,
  Calendar,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

const PLAN_PRICES: Record<string, number> = {
  starter: 0, pro: 19990, pro_plus: 24990,
  // legacy (pre-migración)
  free: 0, casa: 19990, premium: 19990, hogar: 24990, enterprise: 24990,
};
const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

const STEPS = [
  { key: 'cerrar_mes', title: 'Cerrar Mes', desc: 'Confirmar novedades y autorizar cierre', icon: Calendar, action: 'Cerrar Mes' },
  { key: 'liquidaciones', title: 'Procesamiento Liquidaciones', desc: 'Calcular sueldos, descuentos, impuestos', icon: Receipt, action: 'Procesar' },
  { key: 'firma', title: 'Emisión y Firma', desc: 'Generar docs, firma electrónica trabajador', icon: FileText, action: 'Generar' },
  { key: 'previred', title: 'Pago Cotizaciones (Previred)', desc: 'Deadline: día 10 (o 13 electrónico)', icon: CreditCard, action: 'Pagar' },
  { key: 'lre', title: 'Libro Remuneraciones (LRE)', desc: 'Declarar en Mi DT', icon: FileText, action: 'Declarar' },
  { key: 'f29', title: 'Declaración Impuestos (F29)', desc: 'SII Impuesto Único 2ª Categoría', icon: Shield, action: 'Declarar' },
  { key: 'contratos', title: 'Actualización Contratos', desc: 'Anexos, cambios jornada/sueldo', icon: Users, action: 'Actualizar' },
];

function statusColor(s: string) {
  if (s === 'completado') return 'bg-emerald-100 text-emerald-700';
  if (s === 'en_progreso') return 'bg-amber-100 text-amber-700';
  return 'bg-zinc-100 text-zinc-500';
}

function dotColor(s: string) {
  if (s === 'completado' || s === 'pagado' || s === 'firmada') return 'bg-emerald-500';
  if (s === 'en_progreso' || s === 'borrador') return 'bg-amber-500';
  return 'bg-red-500';
}

interface EmpleadorRow {
  id: string;
  nombre: string;
  plan: string;
  empleados: number;
  liqEstado: string;
  previred: string;
  lre: string;
  f29: string;
}

export default function AdminPage() {
  const { profile, loading: authLoading } = useAuth();
  const [mes, setMes] = useState(() => { const d = new Date(); return { year: d.getFullYear(), month: d.getMonth() }; });
  const [loading, setLoading] = useState(true);
  const [empleadores, setEmpleadores] = useState<any[]>([]);
  const [contratoCounts, setContratoCounts] = useState<Record<string, number>>({});
  const [liquidaciones, setLiquidaciones] = useState<any[]>([]);
  const [solicitudesPend, setSolicitudesPend] = useState(0);
  const [trabajadoresCount, setTrabajadoresCount] = useState(0);
  const [mesCerrado, setMesCerrado] = useState(false);

  const periodo = `${mes.year}-${String(mes.month + 1).padStart(2, '0')}`;
  const mesLabel = `${MESES[mes.month]} ${mes.year}`;

  const prevMonth = () => setMes(p => p.month === 0 ? { year: p.year - 1, month: 11 } : { ...p, month: p.month - 1 });
  const nextMonth = () => setMes(p => p.month === 11 ? { year: p.year + 1, month: 0 } : { ...p, month: p.month + 1 });

  useEffect(() => {
    if (authLoading || !profile || profile.rol !== 'admin') return;
    setLoading(true);

    async function load() {
      const supabase = createClient();
      const [empRes, contRes, liqRes, solRes, trabRes, cierreRes] = await Promise.all([
        supabase.from('empleadores').select('id, nombre, plan_tipo'),
        supabase.from('contratos').select('empleador_id'),
        supabase.from('liquidaciones').select('id, empleador_id, estado, periodo').eq('periodo', periodo),
        supabase.from('solicitudes_empleado').select('id', { count: 'exact', head: true }).eq('estado', 'pendiente'),
        supabase.from('contratos').select('trabajador_id', { count: 'exact', head: true }),
        supabase.from('cierre_mes').select('estado').eq('periodo', periodo).maybeSingle(),
      ]);

      setMesCerrado(cierreRes.data?.estado === 'cerrado');
      setEmpleadores(empRes.data || []);
      const counts: Record<string, number> = {};
      (contRes.data || []).forEach((c: any) => { counts[c.empleador_id] = (counts[c.empleador_id] || 0) + 1; });
      setContratoCounts(counts);
      setLiquidaciones(liqRes.data || []);
      setSolicitudesPend(solRes.count || 0);
      setTrabajadoresCount(trabRes.count || 0);
      setLoading(false);
    }
    load();
  }, [profile, authLoading, periodo]);

  // Derived KPIs
  const liqBorrador = liquidaciones.filter(l => l.estado === 'borrador').length;
  const cotizacionesPorPagar = empleadores.filter(e => {
    const empLiqs = liquidaciones.filter(l => l.empleador_id === e.id);
    return empLiqs.length > 0 && empLiqs.every(l => l.estado !== 'pagada');
  }).length;
  const mrr = empleadores.reduce((s: number, e: any) => s + (PLAN_PRICES[e.plan_tipo] || 0), 0);
  const totalEmp = empleadores.length;
  const empConLiq = new Set(liquidaciones.map(l => l.empleador_id)).size;
  const empLiqCompleta = new Set(liquidaciones.filter(l => l.estado === 'firmada' || l.estado === 'pagada').map(l => l.empleador_id)).size;
  const procesados = empLiqCompleta;

  // Pipeline step status
  function stepStatus(key: string): { status: string; done: number; total: number } {
    const total = totalEmp;
    if (key === 'novedades' || key === 'liquidaciones') {
      return { status: empConLiq >= total && total > 0 ? 'completado' : empConLiq > 0 ? 'en_progreso' : 'pendiente', done: empConLiq, total };
    }
    if (key === 'firma' || key === 'previred') {
      return { status: empLiqCompleta >= total && total > 0 ? 'completado' : empLiqCompleta > 0 ? 'en_progreso' : 'pendiente', done: empLiqCompleta, total };
    }
    return { status: 'pendiente', done: 0, total };
  }

  // Compliance
  const today = new Date();
  const daysToDeadline = Math.ceil((new Date(mes.year, mes.month + 1, 10).getTime() - today.getTime()) / 86400000);
  const unsignedLiqs = liqBorrador;

  // Employer rows
  const rows: EmpleadorRow[] = empleadores.map(e => {
    const empLiqs = liquidaciones.filter(l => l.empleador_id === e.id);
    const liqEstado = empLiqs.length === 0 ? 'pendiente' : empLiqs.some(l => l.estado === 'borrador') ? 'borrador' : 'completado';
    const previred = liqEstado === 'completado' ? 'completado' : 'pendiente';
    const lre = previred; // LRE se genera junto con Previred al cerrar el mes
    return { id: e.id, nombre: e.nombre || `${e.nombre}`, plan: e.plan_tipo, empleados: contratoCounts[e.id] || 0, liqEstado, previred, lre, f29: 'pendiente' };
  });

  if (authLoading || loading) {
    return <div className="flex items-center justify-center py-32"><Loader2 className="w-6 h-6 animate-spin text-zinc-400" /></div>;
  }

  if (!profile || profile.rol !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-center">
        <AlertTriangle className="w-12 h-12 text-red-400 mb-4" />
        <h1 className="text-xl font-bold text-zinc-900 mb-2">Acceso no autorizado</h1>
        <p className="text-sm text-zinc-500 mb-6">No tienes permisos para acceder al panel de administración.</p>
        <a href="/" className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 transition-colors">Volver al inicio</a>
      </div>
    );
  }

  const kpis = [
    { label: 'Empleadores Activos', value: empleadores.length, icon: Building2, color: 'bg-emerald-500' },
    { label: 'Trabajadores', value: trabajadoresCount, icon: Users, color: 'bg-violet-600' },
    { label: 'Liquidaciones Pendientes', value: liqBorrador, icon: Receipt, color: 'bg-amber-500' },
    { label: 'Cotizaciones por Pagar', value: cotizacionesPorPagar, icon: CreditCard, color: 'bg-rose-500' },
    { label: 'MRR', value: `$${mrr.toLocaleString('es-CL')}`, icon: CheckCircle2, color: 'bg-emerald-600' },
    { label: 'Solicitudes Pendientes', value: solicitudesPend, icon: Clock, color: 'bg-blue-500' },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* TOP BAR */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-violet-600 rounded-xl flex items-center justify-center">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-zinc-900">Panel Admin</h1>
            <p className="text-sm text-zinc-500">Ciclo de remuneraciones</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-2">
            <button onClick={prevMonth} className="p-1 hover:bg-zinc-100 rounded-lg transition-colors"><ChevronLeft className="w-4 h-4 text-zinc-500" /></button>
            <span className="text-sm font-semibold text-zinc-900 min-w-[120px] text-center">{mesLabel}</span>
            <button onClick={nextMonth} className="p-1 hover:bg-zinc-100 rounded-lg transition-colors"><ChevronRight className="w-4 h-4 text-zinc-500" /></button>
          </div>
          <span className="rounded-full bg-violet-100 text-violet-700 px-3 py-1 text-xs font-medium whitespace-nowrap">
            {procesados} de {totalEmp} procesados
          </span>
        </div>
      </div>

      {/* COMPLIANCE ALERTS */}
      {daysToDeadline <= 3 && daysToDeadline >= 0 && (
        <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
          <p className="text-sm text-amber-800 font-medium">Deadline Previred en {daysToDeadline} {daysToDeadline === 1 ? 'día' : 'días'}. Asegurar pago de cotizaciones.</p>
        </div>
      )}
      {unsignedLiqs > 0 && (
        <div className="flex items-center gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3">
          <FileText className="w-5 h-5 text-rose-600 shrink-0" />
          <p className="text-sm text-rose-800 font-medium">{unsignedLiqs} liquidaciones sin firmar para {mesLabel}.</p>
        </div>
      )}
      <div className="flex items-center gap-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3">
        <Shield className="w-5 h-5 text-blue-600 shrink-0" />
        <p className="text-sm text-blue-800 font-medium">Ley Karin: verificar cumplimiento protocolo de acoso laboral en todos los empleadores.</p>
      </div>

      {/* KPI CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {kpis.map(k => {
          const Icon = k.icon;
          return (
            <div key={k.label} className="rounded-xl border border-zinc-200 bg-white p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className={`w-8 h-8 ${k.color} rounded-lg flex items-center justify-center`}>
                  <Icon className="w-4 h-4 text-white" />
                </div>
              </div>
              <p className="text-2xl font-bold text-zinc-900">{typeof k.value === 'number' ? k.value.toLocaleString('es-CL') : k.value}</p>
              <p className="text-xs text-zinc-500 mt-1">{k.label}</p>
            </div>
          );
        })}
      </div>

      {/* PIPELINE: Cierre de Mes */}
      <div>
        <h2 className="text-lg font-semibold text-zinc-900 mb-3">Cierre de Mes</h2>
        <div className="flex gap-3 overflow-x-auto pb-2">
          {STEPS.map((step, i) => {
            const Icon = step.icon;
            const isCerrarMes = step.key === 'cerrar_mes';
            const isEnabled = isCerrarMes || mesCerrado;
            const { status, done, total } = stepStatus(step.key);
            return (
              <div key={step.key} className={`min-w-[170px] flex-1 rounded-xl border p-4 flex flex-col gap-2 transition-all ${
                !isEnabled
                  ? 'border-zinc-100 bg-zinc-50 opacity-40'
                  : isCerrarMes && !mesCerrado
                    ? 'border-violet-300 bg-violet-50 ring-2 ring-violet-200'
                    : mesCerrado && isCerrarMes
                      ? 'border-emerald-200 bg-emerald-50'
                      : 'border-zinc-200 bg-white'
              }`}>
                <div className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    !isEnabled ? 'bg-zinc-100' :
                    isCerrarMes && !mesCerrado ? 'bg-violet-600' :
                    mesCerrado && isCerrarMes ? 'bg-emerald-500' :
                    'bg-zinc-100'
                  }`}>
                    <Icon className={`w-4 h-4 ${
                      !isEnabled ? 'text-zinc-300' :
                      isCerrarMes ? 'text-white' :
                      'text-zinc-600'
                    }`} />
                  </div>
                  <span className={`text-xs font-medium ${!isEnabled ? 'text-zinc-300' : 'text-zinc-400'}`}>Paso {i + 1}</span>
                </div>
                <p className={`text-sm font-semibold leading-tight ${!isEnabled ? 'text-zinc-300' : isCerrarMes && !mesCerrado ? 'text-violet-800' : 'text-zinc-900'}`}>{step.title}</p>
                <p className={`text-xs leading-snug ${!isEnabled ? 'text-zinc-200' : 'text-zinc-400'}`}>{step.desc}</p>
                {isEnabled && (
                  <>
                    <span className={`inline-flex self-start rounded-full px-2 py-0.5 text-xs font-medium ${
                      mesCerrado && isCerrarMes ? 'bg-emerald-100 text-emerald-700' : statusColor(status)
                    }`}>
                      {mesCerrado && isCerrarMes ? 'cerrado' : status.replace('_', ' ')}
                    </span>
                    {!isCerrarMes && <p className="text-xs text-zinc-500">{done}/{total} empleadores</p>}
                  </>
                )}
                {isEnabled && (
                  <button onClick={() => window.location.href = '/admin/cierre-mes'} className={`mt-auto rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                    isCerrarMes && !mesCerrado
                      ? 'bg-violet-600 text-white hover:bg-violet-700'
                      : mesCerrado && isCerrarMes
                        ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                        : 'bg-zinc-900 text-white hover:bg-zinc-800'
                  }`}>
                    {mesCerrado && isCerrarMes ? 'Ver Procesos' : step.action}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* EMPLOYER TABLE */}
      <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
        <div className="px-5 py-4 border-b border-zinc-100">
          <h2 className="text-lg font-semibold text-zinc-900">Empleadores</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-100 text-left">
                <th className="px-5 py-3 font-medium text-zinc-500">Empleador</th>
                <th className="px-5 py-3 font-medium text-zinc-500">Plan</th>
                <th className="px-5 py-3 font-medium text-zinc-500 text-center">Empleados</th>
                <th className="px-5 py-3 font-medium text-zinc-500 text-center">Liq. Estado</th>
                <th className="px-5 py-3 font-medium text-zinc-500 text-center">Previred</th>
                <th className="px-5 py-3 font-medium text-zinc-500 text-center">LRE</th>
                <th className="px-5 py-3 font-medium text-zinc-500 text-center">F29</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr><td colSpan={7} className="px-5 py-8 text-center text-zinc-400">Sin empleadores registrados</td></tr>
              ) : rows.map(r => (
                <tr key={r.id} className="border-b border-zinc-50 hover:bg-zinc-50 cursor-pointer transition-colors" onClick={() => window.location.href = `/admin/empleadores/${r.id}`}>
                  <td className="px-5 py-3 font-medium text-zinc-900">{r.nombre || r.id.slice(0, 8)}</td>
                  <td className="px-5 py-3"><span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600">{r.plan || 'starter'}</span></td>
                  <td className="px-5 py-3 text-center text-zinc-700">{r.empleados}</td>
                  <td className="px-5 py-3 text-center"><span className={`inline-block w-2.5 h-2.5 rounded-full ${dotColor(r.liqEstado)}`} /></td>
                  <td className="px-5 py-3 text-center"><span className={`inline-block w-2.5 h-2.5 rounded-full ${dotColor(r.previred)}`} /></td>
                  <td className="px-5 py-3 text-center"><span className={`inline-block w-2.5 h-2.5 rounded-full ${dotColor(r.lre)}`} /></td>
                  <td className="px-5 py-3 text-center"><span className={`inline-block w-2.5 h-2.5 rounded-full ${dotColor(r.f29)}`} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
