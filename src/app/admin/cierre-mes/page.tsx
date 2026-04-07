'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth/context';
import { createClient } from '@/lib/supabase/client';
import {
  Calendar, FileText, CreditCard, Shield, CheckCircle2, Clock, AlertTriangle,
  ChevronDown, ChevronRight, Loader2, Users, Receipt, Building2, Stamp,
  Download, MoreHorizontal, Lock, BookOpen, Calculator, FileSpreadsheet,
} from 'lucide-react';

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

// Procesos que se generan DESPUÉS de cerrar el mes (como en BUK)
const PROCESOS = [
  { key: 'anticipos', label: 'Anticipos', icon: CreditCard, desc: 'Adelantos de sueldo del periodo' },
  { key: 'sueldos', label: 'Sueldos', icon: Calculator, desc: 'Cálculo de remuneraciones' },
  { key: 'liquidaciones_pdf', label: 'Liquidaciones PDF', icon: FileText, desc: 'Documentos de liquidación' },
  { key: 'libros', label: 'Libros', icon: BookOpen, desc: 'Libro de remuneraciones' },
  { key: 'contabilidad', label: 'Contabilidad', icon: FileSpreadsheet, desc: 'Centralizaciones contables' },
  { key: 'previred', label: 'Previred', icon: Shield, desc: 'Archivo cotizaciones previsionales' },
  { key: 'libro_electronico', label: 'Libro Electrónico', icon: Building2, desc: 'LRE para Dirección del Trabajo' },
];

type MesData = {
  periodo: string;
  year: number;
  month: number;
  cerrado: boolean;
  procesando: boolean;
  procesos: Record<string, { estado: string; completado_at: string | null }>;
};

export default function CierreMesPage() {
  const { profile } = useAuth();
  const [meses, setMeses] = useState<MesData[]>([]);
  const [expandedMes, setExpandedMes] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [procesando, setProcesando] = useState(false);
  const [showCierreModal, setShowCierreModal] = useState(false);
  const [cierreDropdownOpen, setCierreDropdownOpen] = useState(false);
  const [masAccionesOpen, setMasAccionesOpen] = useState<string | null>(null);

  // Generar los últimos 6 meses como periodos
  const getPeriodos = useCallback(() => {
    const result: { year: number; month: number; periodo: string }[] = [];
    const now = new Date();
    for (let i = 0; i < 6; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      result.push({
        year: d.getFullYear(),
        month: d.getMonth(),
        periodo: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
      });
    }
    return result;
  }, []);

  const loadData = useCallback(async () => {
    if (profile?.rol !== 'admin') return;
    setLoading(true);
    const supabase = createClient();
    const periodos = getPeriodos();
    const periodoStrs = periodos.map(p => p.periodo);

    const { data: cicloData } = await supabase
      .from('ciclo_cierre_mes')
      .select('*')
      .in('periodo', periodoStrs);

    const { data: emps } = await supabase
      .from('empleadores')
      .select('id')
      .limit(1);

    // Ensure cierre_mes rows exist for current month
    const currentPeriodo = periodos[0].periodo;
    const hasCurrentCierre = (cicloData || []).some(
      (c: any) => c.periodo === currentPeriodo && c.paso === 'cierre_mes'
    );
    if (!hasCurrentCierre && emps && emps.length > 0) {
      const { data: allEmps } = await supabase.from('empleadores').select('id');
      const rows = (allEmps || []).flatMap((e: any) =>
        [{ empleador_id: e.id, periodo: currentPeriodo, paso: 'cierre_mes', estado: 'pendiente' },
         ...PROCESOS.map(p => ({ empleador_id: e.id, periodo: currentPeriodo, paso: p.key, estado: 'pendiente' }))]
      );
      if (rows.length > 0) {
        await supabase.from('ciclo_cierre_mes').upsert(rows, { onConflict: 'empleador_id,periodo,paso' });
      }
      // Reload
      const { data: refreshed } = await supabase.from('ciclo_cierre_mes').select('*').in('periodo', periodoStrs);
      buildMeses(periodos, refreshed || []);
    } else {
      buildMeses(periodos, cicloData || []);
    }

    setLoading(false);
  }, [profile?.rol, getPeriodos]);

  function buildMeses(periodos: { year: number; month: number; periodo: string }[], cicloData: any[]) {
    const result: MesData[] = periodos.map(p => {
      const rows = cicloData.filter((c: any) => c.periodo === p.periodo);
      const cierreRows = rows.filter((c: any) => c.paso === 'cierre_mes');
      const cerrado = cierreRows.length > 0 && cierreRows.every((c: any) => c.estado === 'completado');

      const procesos: Record<string, { estado: string; completado_at: string | null }> = {};
      PROCESOS.forEach(proc => {
        const r = rows.find((c: any) => c.paso === proc.key);
        procesos[proc.key] = { estado: r?.estado || 'pendiente', completado_at: r?.completado_at || null };
      });

      return { periodo: p.periodo, year: p.year, month: p.month, cerrado, procesando: false, procesos };
    });
    setMeses(result);
    // Auto-expand the most recent unclosed, or first closed
    const firstOpen = result.find(m => !m.cerrado);
    setExpandedMes(firstOpen?.periodo || result[0]?.periodo || null);
  }

  useEffect(() => { loadData(); }, [loadData]);

  // Cerrar mes: marca cierre_mes=completado + procesa todos los procesos (simulated 1-min processing)
  const handleCerrarMes = async () => {
    setCierreDropdownOpen(false);
    setShowCierreModal(false);
    setProcesando(true);

    const targetMes = meses.find(m => m.periodo === expandedMes);
    if (!targetMes) { setProcesando(false); return; }

    const supabase = createClient();
    const { data: allEmps } = await supabase.from('empleadores').select('id');
    const ids = (allEmps || []).map((e: any) => e.id);

    // 1. Cerrar mes
    await supabase.from('ciclo_cierre_mes').update({
      estado: 'completado', completado_at: new Date().toISOString(),
    }).eq('periodo', targetMes.periodo).eq('paso', 'cierre_mes').in('empleador_id', ids);

    // 2. Simular procesamiento progresivo de cada proceso (~8s cada uno)
    for (const proc of PROCESOS) {
      await new Promise(resolve => setTimeout(resolve, 1500));
      await supabase.from('ciclo_cierre_mes').update({
        estado: 'completado', completado_at: new Date().toISOString(),
      }).eq('periodo', targetMes.periodo).eq('paso', proc.key).in('empleador_id', ids);

      // Update local state progressively
      setMeses(prev => prev.map(m =>
        m.periodo === targetMes.periodo
          ? { ...m, cerrado: true, procesos: { ...m.procesos, [proc.key]: { estado: 'completado', completado_at: new Date().toISOString() } } }
          : m
      ));
    }

    setProcesando(false);
    loadData();
  };

  // Abrir mes (revertir cierre)
  const handleAbrirMes = async (periodo: string) => {
    const supabase = createClient();
    await supabase.from('ciclo_cierre_mes').update({
      estado: 'pendiente', completado_at: null,
    }).eq('periodo', periodo);
    setMasAccionesOpen(null);
    loadData();
  };

  if (profile?.rol !== 'admin') return <p className="p-8 text-zinc-500">No autorizado</p>;
  if (loading) return <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-zinc-400" /></div>;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-zinc-100">Procesos</h1>
        <p className="text-sm text-zinc-400">Cierre de mes y generación de archivos</p>
      </div>

      {/* Processing overlay */}
      {procesando && (
        <div className="rounded-xl bg-violet-900/30 border border-violet-600/50 p-5 flex items-center gap-4">
          <Loader2 className="w-6 h-6 animate-spin text-violet-400 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-violet-200">Procesando cierre de mes...</p>
            <p className="text-xs text-violet-400 mt-0.5">Generando archivos. Esto puede tomar un momento.</p>
          </div>
        </div>
      )}

      {/* Meses como accordion */}
      {meses.map(mes => {
        const isExpanded = expandedMes === mes.periodo;
        const mesLabel = `${MESES[mes.month]} '${String(mes.year).slice(2)}`;
        const isCurrentMes = mes.periodo === meses[0]?.periodo;
        const completedCount = Object.values(mes.procesos).filter(p => p.estado === 'completado').length;
        const allProcessed = completedCount === PROCESOS.length;

        return (
          <div key={mes.periodo} className="rounded-xl border border-zinc-700/50 bg-zinc-800/30 overflow-hidden">
            {/* Accordion Header */}
            <button
              onClick={() => setExpandedMes(isExpanded ? null : mes.periodo)}
              className="w-full flex items-center justify-between px-5 py-4 hover:bg-zinc-800/50 transition"
            >
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  mes.cerrado ? 'bg-violet-600' : 'bg-zinc-700'
                }`}>
                  <Calendar className="w-5 h-5 text-white" />
                </div>
                <div className="text-left">
                  <p className="text-base font-bold text-zinc-100">{mesLabel}</p>
                  <p className={`text-xs font-medium ${mes.cerrado ? 'text-violet-400' : 'text-zinc-500'}`}>
                    {mes.cerrado ? 'Cerrado' : 'Abierto'}
                    {mes.cerrado && allProcessed && ' · Todos los procesos actualizados'}
                  </p>
                </div>
              </div>
              <ChevronDown className={`w-5 h-5 text-zinc-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
            </button>

            {/* Accordion Content */}
            {isExpanded && (
              <div className="px-5 pb-5 space-y-4">
                {/* Mes no cerrado: mostrar botón Cerrar Mes */}
                {!mes.cerrado && (
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setShowCierreModal(true)}
                      disabled={procesando}
                      className="flex items-center gap-2 px-5 py-3 rounded-xl bg-violet-600 text-white text-sm font-semibold hover:bg-violet-700 transition disabled:opacity-50"
                    >
                      <Lock className="w-4 h-4" />
                      Cerrar Mes
                    </button>
                    <p className="text-xs text-zinc-500">Cierre las novedades para habilitar los procesos del periodo.</p>
                  </div>
                )}

                {/* Mes cerrado: Más Acciones + grid de procesos */}
                {mes.cerrado && (
                  <>
                    {/* Más Acciones dropdown */}
                    <div className="relative inline-block">
                      <button
                        onClick={() => setMasAccionesOpen(masAccionesOpen === mes.periodo ? null : mes.periodo)}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg border border-zinc-600 bg-zinc-800 text-sm text-zinc-300 hover:border-zinc-500 transition"
                      >
                        Más Acciones
                        <ChevronDown className="w-3.5 h-3.5" />
                      </button>
                      {masAccionesOpen === mes.periodo && (
                        <>
                          <div className="fixed inset-0 z-40" onClick={() => setMasAccionesOpen(null)} />
                          <div className="absolute left-0 mt-1 w-48 rounded-xl border border-zinc-600 bg-zinc-800 shadow-xl z-50 overflow-hidden">
                            <button
                              onClick={() => handleAbrirMes(mes.periodo)}
                              className="w-full text-left px-4 py-2.5 text-sm text-zinc-300 hover:bg-zinc-700 transition"
                            >
                              Abrir Mes
                            </button>
                          </div>
                        </>
                      )}
                    </div>

                    {/* Grid de procesos (como BUK) */}
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                      {PROCESOS.map(proc => {
                        const estado = mes.procesos[proc.key];
                        const isCompleted = estado?.estado === 'completado';
                        const Icon = proc.icon;
                        return (
                          <div
                            key={proc.key}
                            className={`rounded-xl border p-4 flex items-start justify-between transition ${
                              isCompleted
                                ? 'bg-zinc-800/80 border-zinc-600/50 hover:border-violet-500/50'
                                : procesando
                                  ? 'bg-zinc-900/50 border-zinc-800/50 animate-pulse'
                                  : 'bg-zinc-900/50 border-zinc-800/50 opacity-50'
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                                isCompleted ? 'bg-violet-600' : 'bg-zinc-700'
                              }`}>
                                <Icon className="w-4 h-4 text-white" />
                              </div>
                              <div>
                                <p className={`text-sm font-semibold ${isCompleted ? 'text-zinc-200' : 'text-zinc-500'}`}>
                                  {proc.label}
                                </p>
                                <p className={`text-xs mt-0.5 ${isCompleted ? 'text-violet-400' : 'text-zinc-600'}`}>
                                  {isCompleted ? 'Actualizado' : procesando ? 'Procesando...' : 'Pendiente'}
                                </p>
                              </div>
                            </div>
                            {isCompleted && (
                              <button
                                className="p-1.5 rounded-lg text-zinc-400 hover:text-violet-400 hover:bg-zinc-700 transition"
                                title="Descargar"
                              >
                                <Download className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        );
      })}

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

      {/* Modal Cerrar Mes */}
      {showCierreModal && (() => {
        const targetMes = meses.find(m => m.periodo === expandedMes);
        if (!targetMes) return null;
        const mesLabel = `${MESES[targetMes.month]} ${targetMes.year}`;
        return (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => { setShowCierreModal(false); setCierreDropdownOpen(false); }}>
            <div className="bg-zinc-900 rounded-2xl border border-zinc-700 w-full max-w-lg shadow-2xl" onClick={e => e.stopPropagation()}>
              <div className="bg-gradient-to-r from-violet-600 to-violet-700 rounded-t-2xl p-6">
                <h2 className="text-xl font-bold text-white">Cerrar Mes — {mesLabel}</h2>
                <p className="text-violet-200 text-sm mt-1">
                  Esta acción confirma que todas las novedades del periodo están completas.
                </p>
              </div>
              <div className="p-6 space-y-5">
                <div className="bg-zinc-800 rounded-xl p-4 border border-zinc-700">
                  <p className="text-sm text-zinc-300 leading-relaxed">
                    Al cerrar el mes se generarán automáticamente: anticipos, sueldos, liquidaciones PDF, libros, contabilidad, Previred y libro electrónico.
                  </p>
                  <p className="text-sm text-zinc-400 mt-2">
                    Este proceso tarda aproximadamente un minuto.
                  </p>
                  <p className="text-sm text-amber-400 mt-3 font-medium">
                    ¿Desea cerrar el periodo {mesLabel}?
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
        );
      })()}
    </div>
  );
}
