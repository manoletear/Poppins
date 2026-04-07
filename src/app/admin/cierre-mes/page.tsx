'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth/context';
import { createClient } from '@/lib/supabase/client';
import {
  Calendar, FileText, CreditCard, Shield, CheckCircle2, Clock, AlertTriangle,
  ChevronLeft, ChevronRight, Loader2, Users, Receipt, Building2, Stamp,
} from 'lucide-react';

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

const PASOS = [
  { key: 'cierre_mes', label: 'Cerrar Mes', desc: 'Confirmar cierre de novedades del periodo', icon: Calendar, deadline: 'Último día hábil del mes' },
  { key: 'liquidaciones', label: 'Liquidaciones', desc: 'Calcular sueldos, descuentos, impuestos', icon: Receipt, deadline: 'Antes del día 5' },
  { key: 'firma', label: 'Emisión y Firma', desc: 'Generar docs, firma electrónica trabajador', icon: Stamp, deadline: 'Antes del pago' },
  { key: 'previred', label: 'Previred', desc: 'Pago cotizaciones AFP, Salud, AFC', icon: CreditCard, deadline: 'Día 10 (13 electrónico)' },
  { key: 'lre', label: 'LRE (Mi DT)', desc: 'Libro Remuneraciones Electrónico', icon: Building2, deadline: 'Antes del día 15' },
  { key: 'f29', label: 'F29 (SII)', desc: 'Impuesto Único Segunda Categoría', icon: Shield, deadline: 'Día 12 del mes siguiente' },
  { key: 'contratos', label: 'Contratos', desc: 'Anexos, cambios jornada/sueldo', icon: Users, deadline: 'Si aplica' },
];

const ESTADO_COLORS: Record<string, string> = {
  pendiente: 'bg-zinc-100 text-zinc-600',
  en_progreso: 'bg-amber-100 text-amber-700',
  completado: 'bg-emerald-100 text-emerald-700',
  error: 'bg-red-100 text-red-700',
};

function formatCLP(n: number): string { return '$' + (n ?? 0).toLocaleString('es-CL'); }

export default function CierreMesPage() {
  const { profile } = useAuth();
  // Auto-select: si estamos en los primeros 10 días, puede que el mes anterior no esté cerrado
  const [year, setYear] = useState(() => {
    const d = new Date();
    return d.getDate() <= 10 && d.getMonth() > 0 ? d.getFullYear() : d.getFullYear();
  });
  const [month, setMonth] = useState(() => {
    const d = new Date();
    return d.getDate() <= 10 ? (d.getMonth() === 0 ? 11 : d.getMonth() - 1) : d.getMonth();
  });
  const [empleadores, setEmpleadores] = useState<any[]>([]);
  const [ciclos, setCiclos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCierreModal, setShowCierreModal] = useState(false);
  const [cierreDropdownOpen, setCierreDropdownOpen] = useState(false);

  const periodo = `${year}-${String(month + 1).padStart(2, '0')}`;

  // ¿El periodo está cerrado? (todos los empleadores tienen cierre_mes completado)
  const mesCerrado = empleadores.length > 0 && empleadores.every(
    emp => ciclos.find((c: any) => c.empleador_id === emp.id && c.paso === 'cierre_mes' && c.estado === 'completado')
  );

  const loadData = useCallback(async () => {
    if (profile?.rol !== 'admin') return;
    setLoading(true);
    const supabase = createClient();

    const [empRes, cicloRes] = await Promise.all([
      supabase.from('empleadores').select('id, nombre, apellido, plan_tipo').order('nombre'),
      supabase.from('ciclo_cierre_mes').select('*').eq('periodo', periodo),
    ]);

    const emps = empRes.data || [];
    setEmpleadores(emps);

    // Auto-create ciclo rows for employers that don't have them
    const existing = new Set((cicloRes.data || []).map((c: any) => `${c.empleador_id}-${c.paso}`));
    const missing: any[] = [];
    emps.forEach((e: any) => {
      PASOS.forEach(p => {
        if (!existing.has(`${e.id}-${p.key}`)) {
          missing.push({ empleador_id: e.id, periodo, paso: p.key, estado: 'pendiente' });
        }
      });
    });
    if (missing.length > 0) {
      await supabase.from('ciclo_cierre_mes').insert(missing);
      const { data: refreshed } = await supabase.from('ciclo_cierre_mes').select('*').eq('periodo', periodo);
      setCiclos(refreshed || []);
    } else {
      setCiclos(cicloRes.data || []);
    }

    setLoading(false);
  }, [profile?.rol, periodo]);

  useEffect(() => { loadData(); }, [loadData]);

  const updatePaso = async (empleadorId: string, paso: string, estado: string) => {
    const supabase = createClient();
    await supabase.from('ciclo_cierre_mes').update({
      estado,
      completado_at: estado === 'completado' ? new Date().toISOString() : null,
    }).eq('empleador_id', empleadorId).eq('periodo', periodo).eq('paso', paso);
    loadData();
  };

  const getEstado = (empleadorId: string, paso: string) => {
    const c = ciclos.find((c: any) => c.empleador_id === empleadorId && c.paso === paso);
    return c?.estado || 'pendiente';
  };

  const getPasoStats = (paso: string) => {
    const total = empleadores.length;
    const completados = ciclos.filter((c: any) => c.paso === paso && c.estado === 'completado').length;
    return { total, completados, pct: total > 0 ? Math.round((completados / total) * 100) : 0 };
  };

  // Cerrar el mes: marcar cierre_mes como completado para TODOS los empleadores
  const handleCerrarMes = async () => {
    const supabase = createClient();
    const ids = empleadores.map((e: any) => e.id);
    await supabase.from('ciclo_cierre_mes').update({
      estado: 'completado',
      completado_at: new Date().toISOString(),
    }).eq('periodo', periodo).eq('paso', 'cierre_mes').in('empleador_id', ids);
    setCierreDropdownOpen(false);
    setShowCierreModal(false);
    loadData();
  };

  // Deadlines
  const hoy = new Date();
  const diaPrevired = new Date(year, month + 1, 13);
  const diasParaPrevired = Math.ceil((diaPrevired.getTime() - hoy.getTime()) / 86400000);

  if (profile?.rol !== 'admin') return <p className="p-8 text-zinc-500">No autorizado</p>;
  if (loading) return <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-zinc-400" /></div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">Cierre de Mes</h1>
          <p className="text-sm text-zinc-400">Ciclo de remuneraciones y cumplimiento legal</p>
        </div>
        <div className="flex items-center gap-2 bg-zinc-800 rounded-lg px-3 py-2">
          <button onClick={() => { if (month === 0) { setYear(y => y - 1); setMonth(11); } else setMonth(m => m - 1); }}>
            <ChevronLeft className="w-4 h-4 text-zinc-400" />
          </button>
          <span className="text-sm font-semibold text-zinc-200 min-w-[120px] text-center">{MESES[month]} {year}</span>
          <button onClick={() => { if (month === 11) { setYear(y => y + 1); setMonth(0); } else setMonth(m => m + 1); }}>
            <ChevronRight className="w-4 h-4 text-zinc-400" />
          </button>
        </div>
      </div>

      {/* Alerts */}
      {diasParaPrevired <= 5 && diasParaPrevired > 0 && (
        <div className="rounded-xl bg-amber-900/30 border border-amber-700/50 p-4 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
          <p className="text-sm text-amber-200">Previred vence en <strong>{diasParaPrevired} día{diasParaPrevired > 1 ? 's' : ''}</strong> (día 13 electrónico)</p>
        </div>
      )}

      {/* Pipeline de 7 pasos */}
      <div className="grid grid-cols-7 gap-2">
        {PASOS.map((paso, idx) => {
          const stats = getPasoStats(paso.key);
          const Icon = paso.icon;
          const allDone = stats.completados === stats.total && stats.total > 0;
          const isCierreMes = paso.key === 'cierre_mes';
          const isDisabled = !isCierreMes && !mesCerrado;
          const isActive = isCierreMes && !mesCerrado;
          return (
            <button
              key={paso.key}
              disabled={isDisabled}
              onClick={() => { if (isCierreMes && !mesCerrado) setShowCierreModal(true); }}
              className={`rounded-xl p-3 border text-left transition-all ${
                isDisabled
                  ? 'bg-zinc-900/50 border-zinc-800/50 opacity-40 cursor-not-allowed'
                  : allDone
                    ? 'bg-emerald-900/20 border-emerald-700/50'
                    : isActive
                      ? 'bg-violet-900/30 border-violet-500/60 ring-2 ring-violet-500/30 animate-pulse cursor-pointer hover:bg-violet-900/50'
                      : 'bg-zinc-800/50 border-zinc-700/50'
              }`}
            >
              <Icon className={`w-5 h-5 mb-2 ${
                isDisabled ? 'text-zinc-600' : allDone ? 'text-emerald-400' : isActive ? 'text-violet-400' : 'text-zinc-400'
              }`} />
              <p className={`text-xs font-semibold truncate ${isDisabled ? 'text-zinc-600' : isActive ? 'text-violet-200' : 'text-zinc-200'}`}>
                {paso.label}
              </p>
              <p className="text-[10px] text-zinc-500 mt-0.5">{paso.deadline}</p>
              <div className="mt-2 h-1.5 rounded-full bg-zinc-700">
                <div className={`h-1.5 rounded-full transition-all ${isActive ? 'bg-violet-500' : 'bg-emerald-500'}`} style={{ width: `${stats.pct}%` }} />
              </div>
              <p className="text-[10px] text-zinc-500 mt-1">{stats.completados}/{stats.total}</p>
            </button>
          );
        })}
      </div>

      {/* Modal Cerrar Mes */}
      {showCierreModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => { setShowCierreModal(false); setCierreDropdownOpen(false); }}>
          <div className="bg-zinc-900 rounded-2xl border border-zinc-700 w-full max-w-lg shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="bg-gradient-to-r from-violet-600 to-violet-700 rounded-t-2xl p-6">
              <h2 className="text-xl font-bold text-white">Cerrar Mes — {MESES[month]} {year}</h2>
              <p className="text-violet-200 text-sm mt-1">
                Esta acción confirma que todas las novedades del periodo están completas.
              </p>
            </div>
            <div className="p-6 space-y-5">
              <div className="bg-zinc-800 rounded-xl p-4 border border-zinc-700">
                <p className="text-sm text-zinc-300 leading-relaxed">
                  Al cerrar el mes, se habilitarán los pasos siguientes: cálculo de liquidaciones, emisión, firma, Previred, LRE y F29.
                </p>
                <p className="text-sm text-amber-400 mt-3 font-medium">
                  ¿Desea cerrar el periodo {MESES[month]} {year}?
                </p>
              </div>

              {/* Dropdown de decisión */}
              <div className="relative">
                <button
                  onClick={() => setCierreDropdownOpen(!cierreDropdownOpen)}
                  className="w-full flex items-center justify-between rounded-xl border border-zinc-600 bg-zinc-800 px-4 py-3 text-sm text-zinc-200 hover:border-violet-500 transition"
                >
                  <span>Seleccione una opción...</span>
                  <ChevronRight className={`w-4 h-4 text-zinc-400 transition-transform ${cierreDropdownOpen ? 'rotate-90' : ''}`} />
                </button>
                {cierreDropdownOpen && (
                  <div className="absolute left-0 right-0 mt-2 rounded-xl border border-zinc-600 bg-zinc-800 shadow-xl z-10 overflow-hidden">
                    <button
                      onClick={() => { setCierreDropdownOpen(false); setShowCierreModal(false); }}
                      className="w-full text-left px-4 py-3 text-sm text-zinc-300 hover:bg-zinc-700 border-b border-zinc-700 transition"
                    >
                      <p className="font-medium text-amber-400">Aún no</p>
                      <p className="text-xs text-zinc-500 mt-0.5">Todavía quiero realizar cambios a este proceso.</p>
                    </button>
                    <button
                      onClick={handleCerrarMes}
                      className="w-full text-left px-4 py-3 text-sm text-zinc-300 hover:bg-zinc-700 transition"
                    >
                      <p className="font-medium text-emerald-400">Sí, cerrar periodo</p>
                      <p className="text-xs text-zinc-500 mt-0.5">Este periodo ya está listo y quiero pasar al periodo siguiente.</p>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tabla empleadores × pasos */}
      <div className="rounded-xl border border-zinc-700/50 bg-zinc-800/30 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-700/50">
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400">Empleador</th>
                <th className="px-2 py-3 text-center text-xs font-medium text-zinc-400">Plan</th>
                {PASOS.map(p => (
                  <th key={p.key} className="px-2 py-3 text-center text-xs font-medium text-zinc-400 truncate" title={p.label}>
                    {p.label.split(' ')[0]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50">
              {empleadores.map(emp => (
                <tr key={emp.id} className="hover:bg-zinc-800/50">
                  <td className="px-4 py-2">
                    <a href={`/admin/empleadores/${emp.id}`} className="text-sm font-medium text-zinc-200 hover:text-violet-400">
                      {emp.nombre} {emp.apellido}
                    </a>
                  </td>
                  <td className="px-2 py-2 text-center">
                    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-violet-900/50 text-violet-300">{emp.plan_tipo}</span>
                  </td>
                  {PASOS.map(paso => {
                    const estado = getEstado(emp.id, paso.key);
                    return (
                      <td key={paso.key} className="px-2 py-2 text-center">
                        <button
                          onClick={() => {
                            const next = estado === 'pendiente' ? 'en_progreso' : estado === 'en_progreso' ? 'completado' : 'pendiente';
                            updatePaso(emp.id, paso.key, next);
                          }}
                          className={`w-6 h-6 rounded-full inline-flex items-center justify-center text-[10px] transition ${
                            estado === 'completado' ? 'bg-emerald-500 text-white' :
                            estado === 'en_progreso' ? 'bg-amber-500 text-white' :
                            'bg-zinc-700 text-zinc-400 hover:bg-zinc-600'
                          }`}
                          title={`${paso.label}: ${estado} — click para cambiar`}
                        >
                          {estado === 'completado' ? '✓' : estado === 'en_progreso' ? '⏳' : '○'}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Compliance */}
      <div className="rounded-xl bg-zinc-800/30 border border-zinc-700/50 p-5">
        <h3 className="text-sm font-semibold text-zinc-200 mb-3 flex items-center gap-2">
          <Shield className="w-4 h-4 text-violet-400" /> Cumplimiento Legal
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-zinc-400">
          <div>
            <p className="font-medium text-zinc-300">Ley Karin (21.643)</p>
            <p>Protocolos de prevención de acoso actualizados y comunicados a todos los trabajadores.</p>
          </div>
          <div>
            <p className="font-medium text-zinc-300">Ley 40 Horas (21.561)</p>
            <p>Jornada máxima 42h semanales desde abril 2026. Verificar contratos actualizados.</p>
          </div>
          <div>
            <p className="font-medium text-zinc-300">Archivo Legal</p>
            <p>Respaldo de liquidaciones, contratos y documentos por 5 años mínimo.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
