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
  { key: 'novedades', label: 'Cierre Novedades', desc: 'Inasistencias, licencias, horas extras, bonos', icon: FileText, deadline: 'Último día hábil del mes' },
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
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth());
  const [empleadores, setEmpleadores] = useState<any[]>([]);
  const [ciclos, setCiclos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const periodo = `${year}-${String(month + 1).padStart(2, '0')}`;

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

  // Deadlines
  const hoy = new Date();
  const diaPrevired = new Date(year, month + 1, 13); // día 13 del mes siguiente
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
        {PASOS.map(paso => {
          const stats = getPasoStats(paso.key);
          const Icon = paso.icon;
          const allDone = stats.completados === stats.total && stats.total > 0;
          return (
            <div key={paso.key} className={`rounded-xl p-3 border ${allDone ? 'bg-emerald-900/20 border-emerald-700/50' : 'bg-zinc-800/50 border-zinc-700/50'}`}>
              <Icon className={`w-5 h-5 mb-2 ${allDone ? 'text-emerald-400' : 'text-zinc-400'}`} />
              <p className="text-xs font-semibold text-zinc-200 truncate">{paso.label}</p>
              <p className="text-[10px] text-zinc-500 mt-0.5">{paso.deadline}</p>
              <div className="mt-2 h-1.5 rounded-full bg-zinc-700">
                <div className="h-1.5 rounded-full bg-emerald-500 transition-all" style={{ width: `${stats.pct}%` }} />
              </div>
              <p className="text-[10px] text-zinc-500 mt-1">{stats.completados}/{stats.total}</p>
            </div>
          );
        })}
      </div>

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
