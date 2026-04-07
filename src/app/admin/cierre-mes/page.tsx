'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth/context';
import { createClient } from '@/lib/supabase/client';
import {
  Calendar, FileText, CreditCard, Shield, CheckCircle2, AlertTriangle,
  ChevronDown, ChevronRight, Loader2, Users, Building2,
  Download, Lock, BookOpen, Calculator, FileSpreadsheet, Receipt,
} from 'lucide-react';

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

const PROCESOS = [
  { key: 'anticipos', label: 'Anticipos', icon: CreditCard, desc: 'Adelantos de sueldo del periodo' },
  { key: 'sueldos', label: 'Sueldos', icon: Calculator, desc: 'Cálculo de remuneraciones' },
  { key: 'liquidaciones_pdf', label: 'Liquidaciones PDF', icon: FileText, desc: 'Documentos de liquidación' },
  { key: 'libros', label: 'Libros', icon: BookOpen, desc: 'Libro de remuneraciones' },
  { key: 'contabilidad', label: 'Contabilidad', icon: FileSpreadsheet, desc: 'Centralizaciones contables' },
  { key: 'previred', label: 'Previred', icon: Shield, desc: 'Archivo cotizaciones previsionales' },
  { key: 'libro_electronico', label: 'Libro Electrónico', icon: Building2, desc: 'LRE para Dirección del Trabajo' },
];

type PeriodoData = {
  periodo: string;
  year: number;
  month: number;
  cerrado: boolean;
  procesos: Record<string, { estado: string; completado_at: string | null }>;
};

function periodoStr(y: number, m: number) {
  return `${y}-${String(m + 1).padStart(2, '0')}`;
}

export default function CierreMesPage() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [procesando, setProcesando] = useState(false);
  const [showCierreModal, setShowCierreModal] = useState(false);
  const [cierreDropdownOpen, setCierreDropdownOpen] = useState(false);
  const [masAccionesOpen, setMasAccionesOpen] = useState(false);

  // Mes activo (el que estamos viendo/trabajando)
  const now = new Date();
  const mesActualYear = now.getFullYear();
  const mesActualMonth = now.getMonth(); // 0-based
  const mesAnteriorYear = mesActualMonth === 0 ? mesActualYear - 1 : mesActualYear;
  const mesAnteriorMonth = mesActualMonth === 0 ? 11 : mesActualMonth - 1;

  const [activePeriodo, setActivePeriodo] = useState<string>(() => periodoStr(mesAnteriorYear, mesAnteriorMonth));
  const [periodoActual, setPeriodoActual] = useState<PeriodoData | null>(null);
  const [periodoAnterior, setPeriodoAnterior] = useState<PeriodoData | null>(null);

  // Histórico
  const [histYear, setHistYear] = useState(mesActualYear);
  const [histMonth, setHistMonth] = useState<number | ''>('');
  const [historico, setHistorico] = useState<PeriodoData[]>([]);
  const [histExpanded, setHistExpanded] = useState<string | null>(null);

  const loadPeriodoData = useCallback(async (periodoKey: string): Promise<PeriodoData | null> => {
    const supabase = createClient();
    const [y, m] = periodoKey.split('-').map(Number);

    const { data: cicloData } = await supabase
      .from('ciclo_cierre_mes')
      .select('*')
      .eq('periodo', periodoKey);

    // Ensure rows exist
    if (!cicloData || cicloData.length === 0) {
      const { data: allEmps } = await supabase.from('empleadores').select('id');
      if (allEmps && allEmps.length > 0) {
        const rows = allEmps.flatMap((e: any) =>
          [{ empleador_id: e.id, periodo: periodoKey, paso: 'cierre_mes', estado: 'pendiente' },
           ...PROCESOS.map(p => ({ empleador_id: e.id, periodo: periodoKey, paso: p.key, estado: 'pendiente' }))]
        );
        await supabase.from('ciclo_cierre_mes').upsert(rows, { onConflict: 'empleador_id,periodo,paso' });
        const { data: refreshed } = await supabase.from('ciclo_cierre_mes').select('*').eq('periodo', periodoKey);
        return buildPeriodo(periodoKey, y, m - 1, refreshed || []);
      }
      return { periodo: periodoKey, year: y, month: m - 1, cerrado: false, procesos: {} };
    }

    return buildPeriodo(periodoKey, y, m - 1, cicloData);
  }, []);

  function buildPeriodo(periodoKey: string, y: number, m: number, cicloData: any[]): PeriodoData {
    const cierreRows = cicloData.filter((c: any) => c.paso === 'cierre_mes');
    const cerrado = cierreRows.length > 0 && cierreRows.every((c: any) => c.estado === 'completado');

    const procesos: Record<string, { estado: string; completado_at: string | null }> = {};
    PROCESOS.forEach(proc => {
      const rows = cicloData.filter((c: any) => c.paso === proc.key);
      const allCompleted = rows.length > 0 && rows.every((r: any) => r.estado === 'completado');
      procesos[proc.key] = {
        estado: allCompleted ? 'completado' : 'pendiente',
        completado_at: rows.find((r: any) => r.completado_at)?.completado_at || null,
      };
    });

    return { periodo: periodoKey, year: y, month: m, cerrado, procesos };
  }

  const loadData = useCallback(async () => {
    if (profile?.rol !== 'admin') return;
    setLoading(true);

    const pActual = periodoStr(mesActualYear, mesActualMonth);
    const pAnterior = periodoStr(mesAnteriorYear, mesAnteriorMonth);

    const [actual, anterior] = await Promise.all([
      loadPeriodoData(pActual),
      loadPeriodoData(pAnterior),
    ]);

    setPeriodoActual(actual);
    setPeriodoAnterior(anterior);

    // Si el mes anterior no está cerrado, es el activo por defecto
    if (anterior && !anterior.cerrado) {
      setActivePeriodo(pAnterior);
    } else {
      setActivePeriodo(pActual);
    }

    setLoading(false);
  }, [profile?.rol, mesActualYear, mesActualMonth, mesAnteriorYear, mesAnteriorMonth, loadPeriodoData]);

  useEffect(() => { loadData(); }, [loadData]);

  // Load histórico when filters change
  const loadHistorico = useCallback(async () => {
    if (profile?.rol !== 'admin') return;
    const supabase = createClient();

    let periodos: string[] = [];
    if (histMonth !== '') {
      periodos = [periodoStr(histYear, histMonth as number)];
    } else {
      // All months of histYear
      for (let m = 0; m < 12; m++) periodos.push(periodoStr(histYear, m));
    }

    // Exclude current 2 months
    const pActual = periodoStr(mesActualYear, mesActualMonth);
    const pAnterior = periodoStr(mesAnteriorYear, mesAnteriorMonth);
    periodos = periodos.filter(p => p !== pActual && p !== pAnterior);

    if (periodos.length === 0) { setHistorico([]); return; }

    const { data: cicloData } = await supabase
      .from('ciclo_cierre_mes')
      .select('*')
      .in('periodo', periodos);

    const grouped: Record<string, any[]> = {};
    (cicloData || []).forEach((c: any) => {
      if (!grouped[c.periodo]) grouped[c.periodo] = [];
      grouped[c.periodo].push(c);
    });

    const result: PeriodoData[] = Object.entries(grouped)
      .map(([p, rows]) => {
        const [y, m] = p.split('-').map(Number);
        return buildPeriodo(p, y, m - 1, rows);
      })
      .sort((a, b) => b.periodo.localeCompare(a.periodo));

    setHistorico(result);
  }, [profile?.rol, histYear, histMonth, mesActualYear, mesActualMonth, mesAnteriorYear, mesAnteriorMonth]);

  useEffect(() => { loadHistorico(); }, [loadHistorico]);

  // Cerrar mes
  const handleCerrarMes = async () => {
    setCierreDropdownOpen(false);
    setShowCierreModal(false);
    setProcesando(true);

    const supabase = createClient();
    const { data: allEmps } = await supabase.from('empleadores').select('id');
    const ids = (allEmps || []).map((e: any) => e.id);

    // 1. Cerrar mes
    await supabase.from('ciclo_cierre_mes').update({
      estado: 'completado', completado_at: new Date().toISOString(),
    }).eq('periodo', activePeriodo).eq('paso', 'cierre_mes').in('empleador_id', ids);

    // 2. Procesar cada proceso progresivamente
    const updateLocal = (procKey: string) => {
      const updater = (prev: PeriodoData | null) => {
        if (!prev || prev.periodo !== activePeriodo) return prev;
        return { ...prev, cerrado: true, procesos: { ...prev.procesos, [procKey]: { estado: 'completado', completado_at: new Date().toISOString() } } };
      };
      setPeriodoActual(p => updater(p));
      setPeriodoAnterior(p => updater(p));
    };

    // Mark as cerrado immediately
    const markCerrado = (prev: PeriodoData | null) => {
      if (!prev || prev.periodo !== activePeriodo) return prev;
      return { ...prev, cerrado: true };
    };
    setPeriodoActual(p => markCerrado(p));
    setPeriodoAnterior(p => markCerrado(p));

    for (const proc of PROCESOS) {
      await new Promise(resolve => setTimeout(resolve, 1500));
      await supabase.from('ciclo_cierre_mes').update({
        estado: 'completado', completado_at: new Date().toISOString(),
      }).eq('periodo', activePeriodo).eq('paso', proc.key).in('empleador_id', ids);
      updateLocal(proc.key);
    }

    setProcesando(false);
  };

  // Abrir mes
  const handleAbrirMes = async () => {
    const supabase = createClient();
    await supabase.from('ciclo_cierre_mes').update({
      estado: 'pendiente', completado_at: null,
    }).eq('periodo', activePeriodo);
    setMasAccionesOpen(false);
    loadData();
  };

  if (profile?.rol !== 'admin') return <p className="p-8 text-zinc-500">No autorizado</p>;
  if (loading) return <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-zinc-400" /></div>;

  // Periodo activo (el que estamos viendo)
  const pActualStr = periodoStr(mesActualYear, mesActualMonth);
  const pAnteriorStr = periodoStr(mesAnteriorYear, mesAnteriorMonth);
  const activeData = activePeriodo === pActualStr ? periodoActual : periodoAnterior;
  const activeLabel = activeData ? `${MESES[activeData.month]} ${activeData.year}` : '';

  // Years for histórico filter
  const years = Array.from({ length: 3 }, (_, i) => mesActualYear - i);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-zinc-100">Procesos</h1>
        <p className="text-sm text-zinc-400">Cierre de mes y generación de archivos</p>
      </div>

      {/* Tabs: mes en curso / mes a cerrar */}
      <div className="flex items-center gap-2">
        {periodoAnterior && (
          <button
            onClick={() => setActivePeriodo(pAnteriorStr)}
            className={`px-4 py-2.5 rounded-xl text-sm font-medium transition ${
              activePeriodo === pAnteriorStr
                ? 'bg-violet-600 text-white'
                : 'bg-zinc-800 text-zinc-400 border border-zinc-700 hover:border-zinc-500'
            }`}
          >
            {MESES[mesAnteriorMonth]} '{String(mesAnteriorYear).slice(2)}
            <span className={`ml-2 text-xs px-1.5 py-0.5 rounded-full ${
              periodoAnterior.cerrado ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'
            }`}>
              {periodoAnterior.cerrado ? 'Cerrado' : 'Pendiente'}
            </span>
          </button>
        )}
        {periodoActual && (
          <button
            onClick={() => setActivePeriodo(pActualStr)}
            className={`px-4 py-2.5 rounded-xl text-sm font-medium transition ${
              activePeriodo === pActualStr
                ? 'bg-violet-600 text-white'
                : 'bg-zinc-800 text-zinc-400 border border-zinc-700 hover:border-zinc-500'
            }`}
          >
            {MESES[mesActualMonth]} '{String(mesActualYear).slice(2)}
            <span className={`ml-2 text-xs px-1.5 py-0.5 rounded-full ${
              periodoActual.cerrado ? 'bg-emerald-500/20 text-emerald-400' : 'bg-zinc-500/20 text-zinc-400'
            }`}>
              {periodoActual.cerrado ? 'Cerrado' : 'En curso'}
            </span>
          </button>
        )}
      </div>

      {/* Processing banner */}
      {procesando && (
        <div className="rounded-xl bg-violet-900/30 border border-violet-600/50 p-5 flex items-center gap-4">
          <Loader2 className="w-6 h-6 animate-spin text-violet-400 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-violet-200">Procesando cierre de mes...</p>
            <p className="text-xs text-violet-400 mt-0.5">Generando archivos. Esto puede tomar un momento.</p>
          </div>
        </div>
      )}

      {/* === PERIODO ACTIVO === */}
      {activeData && (
        <div className="space-y-4">
          {/* Encabezado del periodo */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                activeData.cerrado ? 'bg-violet-600' : 'bg-zinc-700'
              }`}>
                <Calendar className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-lg font-bold text-zinc-100">{activeLabel}</p>
                <p className={`text-xs font-medium ${activeData.cerrado ? 'text-violet-400' : 'text-zinc-500'}`}>
                  {activeData.cerrado ? 'Cerrado' : 'Abierto — pendiente de cierre'}
                </p>
              </div>
            </div>

            {/* Más Acciones (solo si cerrado) */}
            {activeData.cerrado && (
              <div className="relative">
                <button
                  onClick={() => setMasAccionesOpen(!masAccionesOpen)}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg border border-zinc-600 bg-zinc-800 text-sm text-zinc-300 hover:border-zinc-500 transition"
                >
                  Más Acciones
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>
                {masAccionesOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setMasAccionesOpen(false)} />
                    <div className="absolute right-0 mt-1 w-48 rounded-xl border border-zinc-600 bg-zinc-800 shadow-xl z-50 overflow-hidden">
                      <button
                        onClick={handleAbrirMes}
                        className="w-full text-left px-4 py-2.5 text-sm text-zinc-300 hover:bg-zinc-700 transition"
                      >
                        Abrir Mes
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Mes no cerrado: botón Cerrar Mes */}
          {!activeData.cerrado && (
            <div className="rounded-xl border-2 border-dashed border-violet-500/40 bg-violet-900/10 p-6 flex flex-col items-center gap-3">
              <Lock className="w-8 h-8 text-violet-400" />
              <p className="text-sm text-zinc-300 text-center max-w-md">
                Cierre las novedades de <strong className="text-violet-300">{activeLabel}</strong> para generar los archivos del periodo: anticipos, sueldos, liquidaciones, previred y más.
              </p>
              <button
                onClick={() => setShowCierreModal(true)}
                disabled={procesando}
                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-violet-600 text-white text-sm font-semibold hover:bg-violet-700 transition disabled:opacity-50 mt-1"
              >
                <Lock className="w-4 h-4" />
                Cerrar Mes
              </button>
            </div>
          )}

          {/* Mes cerrado: grid de procesos */}
          {activeData.cerrado && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {PROCESOS.map(proc => {
                const estado = activeData.procesos[proc.key];
                const isCompleted = estado?.estado === 'completado';
                const Icon = proc.icon;
                return (
                  <div
                    key={proc.key}
                    className={`rounded-xl border p-4 flex items-start justify-between transition cursor-pointer ${
                      isCompleted
                        ? 'bg-zinc-800/80 border-zinc-600/50 hover:border-violet-500/50 hover:shadow-lg hover:shadow-violet-500/5'
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
                        onClick={e => e.stopPropagation()}
                      >
                        <Download className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* === HISTÓRICO === */}
      <div className="rounded-xl border border-zinc-700/50 bg-zinc-800/30 overflow-hidden">
        <div className="px-5 py-4 border-b border-zinc-700/50 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-zinc-200">Histórico de Procesos</h2>
          <div className="flex items-center gap-2">
            <select
              value={histYear}
              onChange={e => setHistYear(Number(e.target.value))}
              className="px-3 py-1.5 rounded-lg bg-zinc-800 border border-zinc-600 text-sm text-zinc-300 focus:outline-none focus:border-violet-500"
            >
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <select
              value={histMonth}
              onChange={e => setHistMonth(e.target.value === '' ? '' : Number(e.target.value))}
              className="px-3 py-1.5 rounded-lg bg-zinc-800 border border-zinc-600 text-sm text-zinc-300 focus:outline-none focus:border-violet-500"
            >
              <option value="">Todos los meses</option>
              {MESES.map((m, i) => <option key={i} value={i}>{m}</option>)}
            </select>
          </div>
        </div>

        {historico.length === 0 ? (
          <div className="px-5 py-8 text-center text-zinc-500 text-sm">
            No hay procesos históricos para este filtro.
          </div>
        ) : (
          <div className="divide-y divide-zinc-800/50">
            {historico.map(mes => {
              const isExpanded = histExpanded === mes.periodo;
              const mesLabel = `${MESES[mes.month]} '${String(mes.year).slice(2)}`;
              const completedCount = Object.values(mes.procesos).filter(p => p.estado === 'completado').length;
              return (
                <div key={mes.periodo}>
                  <button
                    onClick={() => setHistExpanded(isExpanded ? null : mes.periodo)}
                    className="w-full flex items-center justify-between px-5 py-3 hover:bg-zinc-800/50 transition"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        mes.cerrado ? 'bg-violet-600/80' : 'bg-zinc-700'
                      }`}>
                        <Calendar className="w-4 h-4 text-white" />
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-semibold text-zinc-200">{mesLabel}</p>
                        <p className="text-xs text-zinc-500">
                          {mes.cerrado ? `Cerrado · ${completedCount}/${PROCESOS.length} procesos` : 'Abierto'}
                        </p>
                      </div>
                    </div>
                    <ChevronDown className={`w-4 h-4 text-zinc-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                  </button>
                  {isExpanded && (
                    <div className="px-5 pb-4 grid grid-cols-2 md:grid-cols-4 gap-2">
                      {PROCESOS.map(proc => {
                        const isCompleted = mes.procesos[proc.key]?.estado === 'completado';
                        const Icon = proc.icon;
                        return (
                          <div key={proc.key} className={`rounded-lg border p-3 flex items-center gap-2 ${
                            isCompleted ? 'border-zinc-600/50 bg-zinc-800/60' : 'border-zinc-800/50 bg-zinc-900/30 opacity-40'
                          }`}>
                            <div className={`w-7 h-7 rounded-md flex items-center justify-center ${isCompleted ? 'bg-violet-600/80' : 'bg-zinc-700'}`}>
                              <Icon className="w-3.5 h-3.5 text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium text-zinc-300 truncate">{proc.label}</p>
                              <p className="text-[10px] text-zinc-500">{isCompleted ? 'Actualizado' : 'Pendiente'}</p>
                            </div>
                            {isCompleted && <Download className="w-3.5 h-3.5 text-zinc-500 shrink-0" />}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Compliance */}
      <div className="rounded-xl bg-zinc-800/30 border border-zinc-700/50 p-5">
        <h3 className="text-sm font-semibold text-zinc-200 mb-3 flex items-center gap-2">
          <Shield className="w-4 h-4 text-violet-400" /> Cumplimiento Legal
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-zinc-400">
          <div>
            <p className="font-medium text-zinc-300">Ley Karin (21.643)</p>
            <p>Protocolos de prevención de acoso actualizados y comunicados.</p>
          </div>
          <div>
            <p className="font-medium text-zinc-300">Ley 40 Horas (21.561)</p>
            <p>Jornada máxima 42h semanales desde abril 2026.</p>
          </div>
          <div>
            <p className="font-medium text-zinc-300">Archivo Legal</p>
            <p>Respaldo de liquidaciones y contratos por 5 años mínimo.</p>
          </div>
        </div>
      </div>

      {/* Modal Cerrar Mes */}
      {showCierreModal && activeData && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => { setShowCierreModal(false); setCierreDropdownOpen(false); }}>
          <div className="bg-zinc-900 rounded-2xl border border-zinc-700 w-full max-w-lg shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="bg-gradient-to-r from-violet-600 to-violet-700 rounded-t-2xl p-6">
              <h2 className="text-xl font-bold text-white">Cerrar Mes — {activeLabel}</h2>
              <p className="text-violet-200 text-sm mt-1">
                Esta acción confirma que todas las novedades del periodo están completas.
              </p>
            </div>
            <div className="p-6 space-y-5">
              <div className="bg-zinc-800 rounded-xl p-4 border border-zinc-700">
                <p className="text-sm text-zinc-300 leading-relaxed">
                  Al cerrar el mes se generarán automáticamente: anticipos, sueldos, liquidaciones PDF, libros, contabilidad, Previred y libro electrónico.
                </p>
                <p className="text-sm text-zinc-400 mt-2">Este proceso tarda aproximadamente un minuto.</p>
                <p className="text-sm text-amber-400 mt-3 font-medium">¿Desea cerrar el periodo {activeLabel}?</p>
              </div>
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
    </div>
  );
}
