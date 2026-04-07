'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth/context';
import { createClient } from '@/lib/supabase/client';
import {
  Calendar, FileText, CreditCard, Shield, CheckCircle2, AlertTriangle,
  ChevronDown, ChevronRight, Loader2, Users, Building2,
  Download, Lock, BookOpen, Calculator, FileSpreadsheet, Receipt,
  Clock, XCircle, Ban,
} from 'lucide-react';

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

const PROCESOS = [
  { key: 'anticipos', tipo: 'anticipo_pdf', label: 'Anticipos', icon: CreditCard, desc: 'Adelantos de sueldo del periodo' },
  { key: 'sueldos', tipo: 'liquidacion_pdf', label: 'Sueldos', icon: Calculator, desc: 'Cálculo de remuneraciones' },
  { key: 'liquidaciones_pdf', tipo: 'liquidacion_pdf', label: 'Liquidaciones PDF', icon: FileText, desc: 'Documentos de liquidación' },
  { key: 'libros', tipo: 'libro_remuneraciones', label: 'Libros', icon: BookOpen, desc: 'Libro de remuneraciones' },
  { key: 'contabilidad', tipo: 'contabilidad_csv', label: 'Contabilidad', icon: FileSpreadsheet, desc: 'Centralizaciones contables' },
  { key: 'previred', tipo: 'previred_csv', label: 'Previred', icon: Shield, desc: 'Archivo cotizaciones previsionales' },
  { key: 'libro_electronico', tipo: 'lre_txt', label: 'Libro Electrónico', icon: Building2, desc: 'LRE para Dirección del Trabajo' },
];

function periodoStr(y: number, m: number) {
  return `${y}-${String(m + 1).padStart(2, '0')}`;
}

function formatCLP(n: number) { return '$' + (n ?? 0).toLocaleString('es-CL'); }

interface CierreMes {
  id: string;
  periodo: string;
  estado: string;
  fecha_cierre: string | null;
  total_empleadores: number;
  total_trabajadores: number;
  total_liquido: number;
  total_cotizaciones: number;
}

interface EmpleadorCierre {
  id: string;
  empleador_id: string;
  autorizado: boolean;
  fecha_autorizacion: string | null;
  metodo_pago: string | null;
  estado: string;
  monto_liquido: number;
  monto_cotizaciones: number;
  cantidad_trabajadores: number;
  empleador?: { nombre: string; apellido: string; plan_tipo: string };
}

interface DocumentoCierre {
  id: string;
  tipo: string;
  empleador_id: string;
  trabajador_id: string | null;
  nombre_archivo: string | null;
  archivo_url: string | null;
  estado: string;
  metadata: any;
  empleador?: { nombre: string; apellido: string };
  trabajador?: { nombre: string; apellido_paterno: string; rut: string };
}

export default function CierreMesPage() {
  const { profile } = useAuth();
  const now = new Date();
  const mesActualYear = now.getFullYear();
  const mesActualMonth = now.getMonth();
  const mesAnteriorYear = mesActualMonth === 0 ? mesActualYear - 1 : mesActualYear;
  const mesAnteriorMonth = mesActualMonth === 0 ? 11 : mesActualMonth - 1;
  const pActualStr = periodoStr(mesActualYear, mesActualMonth);
  const pAnteriorStr = periodoStr(mesAnteriorYear, mesAnteriorMonth);

  const [activePeriodo, setActivePeriodo] = useState(pAnteriorStr);
  const [loading, setLoading] = useState(true);
  const [procesando, setProcesando] = useState(false);
  const [progresoMsg, setProgresoMsg] = useState('');
  const [showCierreModal, setShowCierreModal] = useState(false);
  const [cierreDropdownOpen, setCierreDropdownOpen] = useState(false);
  const [masAccionesOpen, setMasAccionesOpen] = useState(false);
  const [selectedProceso, setSelectedProceso] = useState<string | null>(null);

  // Data
  const [cierreActual, setCierreActual] = useState<CierreMes | null>(null);
  const [cierreAnterior, setCierreAnterior] = useState<CierreMes | null>(null);
  const [empleadoresCierre, setEmpleadoresCierre] = useState<EmpleadorCierre[]>([]);
  const [documentos, setDocumentos] = useState<DocumentoCierre[]>([]);

  // Histórico
  const [histYear, setHistYear] = useState(mesActualYear);
  const [histMonth, setHistMonth] = useState<number | ''>('');
  const [historico, setHistorico] = useState<CierreMes[]>([]);
  const [histExpanded, setHistExpanded] = useState<string | null>(null);

  const cierre = activePeriodo === pActualStr ? cierreActual : cierreAnterior;

  // Ensure cierre_mes record exists
  const ensureCierre = useCallback(async (periodo: string) => {
    const supabase = createClient();
    const { data } = await supabase.from('cierre_mes').select('*').eq('periodo', periodo).maybeSingle();
    if (data) return data as CierreMes;

    const [y, m] = periodo.split('-').map(Number);
    const deadline = `${y}-${String(m).padStart(2, '0')}-27`;
    const { data: created } = await supabase.from('cierre_mes').insert({
      periodo, estado: 'abierto', fecha_deadline: deadline,
    }).select().single();
    return created as CierreMes;
  }, []);

  // Ensure empleador rows for a cierre
  const ensureEmpleadorRows = useCallback(async (cierreId: string, periodo: string) => {
    const supabase = createClient();
    const { data: existing } = await supabase.from('cierre_mes_empleador')
      .select('empleador_id').eq('cierre_mes_id', cierreId);
    const existingIds = new Set((existing || []).map((e: any) => e.empleador_id));

    const { data: allEmps } = await supabase.from('empleadores').select('id');
    const missing = (allEmps || []).filter((e: any) => !existingIds.has(e.id));

    if (missing.length > 0) {
      await supabase.from('cierre_mes_empleador').insert(
        missing.map((e: any) => ({
          cierre_mes_id: cierreId, empleador_id: e.id, periodo, metodo_pago: 'pendiente',
        }))
      );
    }
  }, []);

  const loadData = useCallback(async () => {
    if (profile?.rol !== 'admin') return;
    setLoading(true);
    const supabase = createClient();

    const [cAnt, cAct] = await Promise.all([
      ensureCierre(pAnteriorStr),
      ensureCierre(pActualStr),
    ]);
    setCierreAnterior(cAnt);
    setCierreActual(cAct);

    // Auto-select: si anterior no cerrado, es el activo
    if (cAnt && cAnt.estado !== 'cerrado') setActivePeriodo(pAnteriorStr);
    else setActivePeriodo(pActualStr);

    // Ensure empleador rows
    if (cAnt) await ensureEmpleadorRows(cAnt.id, pAnteriorStr);
    if (cAct) await ensureEmpleadorRows(cAct.id, pActualStr);

    setLoading(false);
  }, [profile?.rol, pAnteriorStr, pActualStr, ensureCierre, ensureEmpleadorRows]);

  // Load empleadores for active periodo
  const loadEmpleadores = useCallback(async () => {
    if (!cierre) return;
    const supabase = createClient();
    const { data } = await supabase.from('cierre_mes_empleador')
      .select('*, empleadores(nombre, apellido, plan_tipo)')
      .eq('cierre_mes_id', cierre.id)
      .order('created_at');
    setEmpleadoresCierre((data || []).map((d: any) => ({
      ...d, empleador: d.empleadores,
    })));
  }, [cierre]);

  // Load documentos for active periodo (with joins)
  const loadDocumentos = useCallback(async () => {
    if (!cierre) return;
    const supabase = createClient();
    const { data } = await supabase.from('cierre_mes_documento')
      .select('id, tipo, empleador_id, trabajador_id, nombre_archivo, archivo_url, estado, metadata, empleadores(nombre, apellido), trabajadores(nombre, apellido_paterno, rut)')
      .eq('cierre_mes_id', cierre.id)
      .order('tipo').order('empleador_id');
    setDocumentos((data || []).map((d: any) => ({
      ...d,
      empleador: d.empleadores || null,
      trabajador: d.trabajadores || null,
    })));
  }, [cierre]);

  useEffect(() => { loadData(); }, [loadData]);
  useEffect(() => { if (cierre) { loadEmpleadores(); loadDocumentos(); } }, [cierre, loadEmpleadores, loadDocumentos]);

  // Histórico
  const loadHistorico = useCallback(async () => {
    if (profile?.rol !== 'admin') return;
    const supabase = createClient();
    let query = supabase.from('cierre_mes').select('*').eq('estado', 'cerrado').order('periodo', { ascending: false });
    if (histMonth !== '') {
      const p = periodoStr(histYear, histMonth as number);
      query = query.eq('periodo', p);
    } else {
      query = query.gte('periodo', `${histYear}-01`).lte('periodo', `${histYear}-12`);
    }
    // Exclude current 2
    query = query.not('periodo', 'in', `(${pActualStr},${pAnteriorStr})`);
    const { data } = await query;
    setHistorico(data || []);
  }, [profile?.rol, histYear, histMonth, pActualStr, pAnteriorStr]);

  useEffect(() => { loadHistorico(); }, [loadHistorico]);

  // Toggle autorización empleador
  const toggleAutorizacion = async (empCierreId: string, autorizado: boolean, metodoPago?: string) => {
    const supabase = createClient();
    await supabase.from('cierre_mes_empleador').update({
      autorizado,
      estado: autorizado ? 'autorizado' : 'pendiente',
      fecha_autorizacion: autorizado ? new Date().toISOString() : null,
      metodo_pago: autorizado ? (metodoPago || 'transferencia') : 'pendiente',
    }).eq('id', empCierreId);
    loadEmpleadores();
  };

  // CERRAR MES: batch process
  const handleCerrarMes = async () => {
    if (!cierre) return;
    setCierreDropdownOpen(false);
    setShowCierreModal(false);
    setProcesando(true);

    const supabase = createClient();
    const autorizados = empleadoresCierre.filter(e => e.autorizado);

    // 1. Marcar como procesando
    setProgresoMsg('Iniciando cierre de mes...');
    await supabase.from('cierre_mes').update({ estado: 'procesando' }).eq('id', cierre.id);

    // 2. Para cada empleador autorizado, generar documentos por trabajador
    for (let i = 0; i < autorizados.length; i++) {
      const emp = autorizados[i];
      const empName = emp.empleador ? `${emp.empleador.nombre} ${emp.empleador.apellido}`.trim() : emp.empleador_id.slice(0, 8);
      setProgresoMsg(`Procesando ${empName} (${i + 1}/${autorizados.length})...`);

      // Get trabajadores of this employer
      const { data: contratos } = await supabase.from('contratos')
        .select('trabajador_id').eq('empleador_id', emp.empleador_id).eq('estado', 'activo');
      const trabajadorIds = (contratos || []).map((c: any) => c.trabajador_id);

      // Generate document records per process type per worker
      const docRows: any[] = [];
      for (const proc of PROCESOS) {
        if (proc.tipo === 'previred_csv' || proc.tipo === 'lre_txt' || proc.tipo === 'contabilidad_csv' || proc.tipo === 'libro_remuneraciones') {
          // 1 per employer
          docRows.push({
            cierre_mes_id: cierre.id,
            empleador_id: emp.empleador_id,
            trabajador_id: null,
            tipo: proc.tipo,
            periodo: activePeriodo,
            nombre_archivo: `${proc.label}_${activePeriodo}_${empName}.${proc.tipo.split('_').pop()}`,
            estado: 'generado',
          });
        } else {
          // 1 per worker
          for (const tid of trabajadorIds) {
            docRows.push({
              cierre_mes_id: cierre.id,
              empleador_id: emp.empleador_id,
              trabajador_id: tid,
              tipo: proc.tipo,
              periodo: activePeriodo,
              nombre_archivo: `${proc.label}_${activePeriodo}_${tid.slice(0, 8)}.pdf`,
              estado: 'generado',
            });
          }
        }
      }

      if (docRows.length > 0) {
        await supabase.from('cierre_mes_documento').insert(docRows);
      }

      // Mark employer as processed
      await supabase.from('cierre_mes_empleador').update({ estado: 'procesado' }).eq('id', emp.id);
      await new Promise(r => setTimeout(r, 1200));
    }

    // 3. Totals
    const totalLiquido = autorizados.reduce((s, e) => s + (e.monto_liquido || 0), 0);
    const totalCotiz = autorizados.reduce((s, e) => s + (e.monto_cotizaciones || 0), 0);

    // 4. Close
    setProgresoMsg('Finalizando cierre...');
    await supabase.from('cierre_mes').update({
      estado: 'cerrado',
      fecha_cierre: new Date().toISOString(),
      total_empleadores: autorizados.length,
      total_liquido: totalLiquido,
      total_cotizaciones: totalCotiz,
    }).eq('id', cierre.id);

    setProcesando(false);
    setProgresoMsg('');
    loadData();
  };

  // Abrir mes
  const handleAbrirMes = async () => {
    if (!cierre) return;
    const supabase = createClient();
    await supabase.from('cierre_mes').update({ estado: 'abierto', fecha_cierre: null }).eq('id', cierre.id);
    await supabase.from('cierre_mes_empleador').update({ estado: 'pendiente' }).eq('cierre_mes_id', cierre.id);
    await supabase.from('cierre_mes_documento').delete().eq('cierre_mes_id', cierre.id);
    setMasAccionesOpen(false);
    loadData();
  };

  if (profile?.rol !== 'admin') return <p className="p-8 text-zinc-500">No autorizado</p>;
  if (loading) return <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-zinc-400" /></div>;

  const activeLabel = (() => {
    const [y, m] = activePeriodo.split('-').map(Number);
    return `${MESES[m - 1]} ${y}`;
  })();

  const autorizados = empleadoresCierre.filter(e => e.autorizado);
  const pendientes = empleadoresCierre.filter(e => !e.autorizado);
  const docsCount = documentos.length;
  const docsByTipo = PROCESOS.map(p => ({
    ...p,
    count: documentos.filter(d => d.tipo === p.tipo).length,
    completed: documentos.filter(d => d.tipo === p.tipo && d.estado !== 'error').length > 0,
  }));

  const esCerrado = cierre?.estado === 'cerrado';
  const esProcesando = cierre?.estado === 'procesando';
  const deadline = 27;
  const diasRestantes = (() => {
    const [y, m] = activePeriodo.split('-').map(Number);
    const dl = new Date(y, m - 1, deadline);
    return Math.ceil((dl.getTime() - now.getTime()) / 86400000);
  })();

  const years = Array.from({ length: 3 }, (_, i) => mesActualYear - i);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-100">Procesos</h1>
        <p className="text-sm text-zinc-400">Cierre de mes y generación de archivos</p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2">
        {[pAnteriorStr, pActualStr].map(p => {
          const [y, m] = p.split('-').map(Number);
          const c = p === pActualStr ? cierreActual : cierreAnterior;
          const label = `${MESES[m - 1]} '${String(y).slice(2)}`;
          const badge = c?.estado === 'cerrado' ? 'Cerrado' : p === pActualStr ? 'En curso' : 'Pendiente';
          const badgeColor = c?.estado === 'cerrado' ? 'bg-emerald-500/20 text-emerald-400' : p === pActualStr ? 'bg-zinc-500/20 text-zinc-400' : 'bg-amber-500/20 text-amber-400';
          return (
            <button key={p} onClick={() => setActivePeriodo(p)}
              className={`px-4 py-2.5 rounded-xl text-sm font-medium transition ${
                activePeriodo === p ? 'bg-violet-600 text-white' : 'bg-zinc-800 text-zinc-400 border border-zinc-700 hover:border-zinc-500'
              }`}>
              {label}
              <span className={`ml-2 text-xs px-1.5 py-0.5 rounded-full ${badgeColor}`}>{badge}</span>
            </button>
          );
        })}
      </div>

      {/* Processing */}
      {(procesando || esProcesando) && (
        <div className="rounded-xl bg-violet-900/30 border border-violet-600/50 p-5 flex items-center gap-4">
          <Loader2 className="w-6 h-6 animate-spin text-violet-400 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-violet-200">Procesando cierre de mes...</p>
            <p className="text-xs text-violet-400 mt-0.5">{progresoMsg || 'Generando archivos por empleador y trabajador.'}</p>
          </div>
        </div>
      )}

      {/* Deadline alert */}
      {!esCerrado && diasRestantes > 0 && diasRestantes <= 5 && (
        <div className="rounded-xl bg-amber-900/30 border border-amber-700/50 p-4 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
          <p className="text-sm text-amber-200">Deadline de autorización: día {deadline}. Quedan <strong>{diasRestantes} día{diasRestantes > 1 ? 's' : ''}</strong>.</p>
        </div>
      )}

      {/* === ESTADO: ABIERTO — Tabla de autorizaciones === */}
      {!esCerrado && !procesando && cierre && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-zinc-100">Autorización de Empleadores — {activeLabel}</h2>
              <p className="text-xs text-zinc-500">Cada empleador debe confirmar el pago antes del día {deadline}. {autorizados.length}/{empleadoresCierre.length} autorizados.</p>
            </div>
            <button
              onClick={() => setShowCierreModal(true)}
              disabled={autorizados.length === 0}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-violet-600 text-white text-sm font-semibold hover:bg-violet-700 transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Lock className="w-4 h-4" />
              Cerrar Mes ({autorizados.length})
            </button>
          </div>

          {/* Progress bar */}
          <div className="rounded-xl bg-zinc-800 p-4 border border-zinc-700/50">
            <div className="flex justify-between text-xs text-zinc-400 mb-2">
              <span>{autorizados.length} autorizados</span>
              <span>{empleadoresCierre.length} total</span>
            </div>
            <div className="h-2 rounded-full bg-zinc-700">
              <div className="h-2 rounded-full bg-violet-500 transition-all" style={{ width: `${empleadoresCierre.length > 0 ? (autorizados.length / empleadoresCierre.length) * 100 : 0}%` }} />
            </div>
          </div>

          {/* Employer table */}
          <div className="rounded-xl border border-zinc-700/50 bg-zinc-800/30 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-700/50">
                  <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400">Empleador</th>
                  <th className="px-3 py-3 text-center text-xs font-medium text-zinc-400">Plan</th>
                  <th className="px-3 py-3 text-center text-xs font-medium text-zinc-400">Trabajadores</th>
                  <th className="px-3 py-3 text-center text-xs font-medium text-zinc-400">Método Pago</th>
                  <th className="px-3 py-3 text-center text-xs font-medium text-zinc-400">Estado</th>
                  <th className="px-3 py-3 text-center text-xs font-medium text-zinc-400">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50">
                {empleadoresCierre.map(emp => {
                  const name = emp.empleador ? `${emp.empleador.nombre} ${emp.empleador.apellido}`.trim() : emp.empleador_id.slice(0, 8);
                  return (
                    <tr key={emp.id} className="hover:bg-zinc-800/50">
                      <td className="px-4 py-3 text-zinc-200 font-medium">{name}</td>
                      <td className="px-3 py-3 text-center">
                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-violet-900/50 text-violet-300">
                          {emp.empleador?.plan_tipo || '-'}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-center text-zinc-400">{emp.cantidad_trabajadores || '—'}</td>
                      <td className="px-3 py-3 text-center">
                        {emp.autorizado ? (
                          <select
                            value={emp.metodo_pago || 'transferencia'}
                            onChange={e => {
                              const supabase = createClient();
                              supabase.from('cierre_mes_empleador').update({ metodo_pago: e.target.value }).eq('id', emp.id).then(() => loadEmpleadores());
                            }}
                            className="text-xs bg-zinc-800 border border-zinc-600 rounded-lg px-2 py-1 text-zinc-300"
                          >
                            <option value="transferencia">Transferencia</option>
                            <option value="tc_pat">TC (PAT)</option>
                          </select>
                        ) : (
                          <span className="text-xs text-zinc-500">—</span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-center">
                        {emp.autorizado ? (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-400">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Autorizado
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-400">
                            <Clock className="w-3.5 h-3.5" /> Pendiente
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-center">
                        <button
                          onClick={() => toggleAutorizacion(emp.id, !emp.autorizado)}
                          className={`text-xs px-3 py-1.5 rounded-lg font-medium transition ${
                            emp.autorizado
                              ? 'bg-zinc-700 text-zinc-400 hover:bg-red-900/30 hover:text-red-400'
                              : 'bg-emerald-600 text-white hover:bg-emerald-700'
                          }`}
                        >
                          {emp.autorizado ? 'Revocar' : 'Autorizar'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* === ESTADO: CERRADO — Grid de procesos === */}
      {esCerrado && cierre && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-violet-600 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-lg font-bold text-zinc-100">{activeLabel} — Cerrado</p>
                <p className="text-xs text-zinc-500">
                  {cierre.total_empleadores} empleadores · {docsCount} documentos generados
                  {cierre.fecha_cierre && ` · Cerrado el ${new Date(cierre.fecha_cierre).toLocaleDateString('es-CL')}`}
                </p>
              </div>
            </div>
            <div className="relative">
              <button onClick={() => setMasAccionesOpen(!masAccionesOpen)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg border border-zinc-600 bg-zinc-800 text-sm text-zinc-300 hover:border-zinc-500 transition">
                Más Acciones <ChevronDown className="w-3.5 h-3.5" />
              </button>
              {masAccionesOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setMasAccionesOpen(false)} />
                  <div className="absolute right-0 mt-1 w-48 rounded-xl border border-zinc-600 bg-zinc-800 shadow-xl z-50 overflow-hidden">
                    <button onClick={handleAbrirMes} className="w-full text-left px-4 py-2.5 text-sm text-zinc-300 hover:bg-zinc-700 transition">
                      Abrir Mes
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Grid de procesos */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {docsByTipo.map(proc => {
              const Icon = proc.icon;
              const isSelected = selectedProceso === proc.key;
              return (
                <button key={proc.key}
                  onClick={() => setSelectedProceso(isSelected ? null : proc.key)}
                  className={`rounded-xl border p-4 flex items-start justify-between transition text-left ${
                    isSelected
                      ? 'bg-violet-900/30 border-violet-500 ring-2 ring-violet-500/30'
                      : proc.completed
                        ? 'bg-zinc-800/80 border-zinc-600/50 hover:border-violet-500/50 hover:shadow-lg hover:shadow-violet-500/5'
                        : 'bg-zinc-900/50 border-zinc-800/50 opacity-50'
                  }`}>
                  <div className="flex items-start gap-3">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                      isSelected ? 'bg-violet-500' : proc.completed ? 'bg-violet-600' : 'bg-zinc-700'
                    }`}>
                      <Icon className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <p className={`text-sm font-semibold ${proc.completed ? 'text-zinc-200' : 'text-zinc-500'}`}>{proc.label}</p>
                      <p className="text-xs text-violet-400 mt-0.5">
                        {proc.completed ? `${proc.count} archivo${proc.count !== 1 ? 's' : ''}` : 'Pendiente'}
                      </p>
                    </div>
                  </div>
                  {proc.completed && !isSelected && (
                    <Download className="w-4 h-4 text-zinc-500 shrink-0" />
                  )}
                  {isSelected && (
                    <ChevronDown className="w-4 h-4 text-violet-400 shrink-0" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Panel detalle del proceso seleccionado */}
          {selectedProceso && (() => {
            const proc = PROCESOS.find(p => p.key === selectedProceso);
            if (!proc) return null;
            const procDocs = documentos.filter(d => d.tipo === proc.tipo);
            const Icon = proc.icon;

            // Agrupar por empleador
            const byEmpleador: Record<string, { empName: string; docs: DocumentoCierre[] }> = {};
            procDocs.forEach(d => {
              const empName = d.empleador ? `${d.empleador.nombre} ${d.empleador.apellido}`.trim() : d.empleador_id.slice(0, 8);
              if (!byEmpleador[d.empleador_id]) byEmpleador[d.empleador_id] = { empName, docs: [] };
              byEmpleador[d.empleador_id].docs.push(d);
            });

            const isPerEmployer = ['previred_csv','lre_txt','contabilidad_csv','libro_remuneraciones'].includes(proc.tipo);

            return (
              <div className="rounded-xl border border-violet-500/30 bg-zinc-900/50 overflow-hidden">
                {/* Header */}
                <div className="px-5 py-4 border-b border-zinc-700/50 flex items-center justify-between bg-violet-900/20">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-violet-600 flex items-center justify-center">
                      <Icon className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-zinc-100">{proc.label}</p>
                      <p className="text-xs text-zinc-400">{proc.desc} · {procDocs.length} archivo{procDocs.length !== 1 ? 's' : ''}</p>
                    </div>
                  </div>
                  <button onClick={() => setSelectedProceso(null)} className="text-zinc-400 hover:text-zinc-200 transition">
                    <XCircle className="w-5 h-5" />
                  </button>
                </div>

                {/* Content por empleador */}
                <div className="divide-y divide-zinc-800/50">
                  {Object.entries(byEmpleador).map(([empId, { empName, docs }]) => (
                    <div key={empId} className="px-5 py-3">
                      <div className="flex items-center gap-2 mb-2">
                        <Building2 className="w-4 h-4 text-violet-400" />
                        <p className="text-sm font-semibold text-zinc-200">{empName}</p>
                        <span className="text-[10px] text-zinc-500 ml-1">{docs.length} archivo{docs.length !== 1 ? 's' : ''}</span>
                      </div>

                      {isPerEmployer ? (
                        /* Documento único por empleador */
                        <div className="flex items-center justify-between rounded-lg bg-zinc-800/60 border border-zinc-700/50 px-4 py-3">
                          <div className="flex items-center gap-3">
                            <FileText className="w-4 h-4 text-zinc-400" />
                            <div>
                              <p className="text-sm text-zinc-300">{docs[0]?.nombre_archivo || `${proc.label}_${activePeriodo}`}</p>
                              <p className="text-xs text-zinc-500">{docs[0]?.estado === 'firmado' ? 'Firmado' : docs[0]?.estado === 'enviado' ? 'Enviado' : 'Generado'}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                              docs[0]?.estado === 'firmado' ? 'bg-emerald-500/20 text-emerald-400' :
                              docs[0]?.estado === 'enviado' ? 'bg-blue-500/20 text-blue-400' :
                              'bg-zinc-700 text-zinc-400'
                            }`}>
                              {docs[0]?.estado === 'firmado' ? '✓ Firmado' : docs[0]?.estado === 'enviado' ? '↗ Enviado' : '● Generado'}
                            </span>
                            <button className="p-1.5 rounded-lg text-zinc-400 hover:text-violet-400 hover:bg-zinc-700 transition" title="Descargar">
                              <Download className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ) : (
                        /* Documentos por trabajador */
                        <div className="space-y-1">
                          {docs.map(doc => {
                            const workerName = doc.trabajador
                              ? `${doc.trabajador.nombre} ${doc.trabajador.apellido_paterno}`.trim()
                              : doc.trabajador_id?.slice(0, 8) || '—';
                            const workerRut = doc.trabajador?.rut || '';
                            return (
                              <div key={doc.id} className="flex items-center justify-between rounded-lg bg-zinc-800/40 border border-zinc-800 px-4 py-2.5 hover:bg-zinc-800/60 transition">
                                <div className="flex items-center gap-3 min-w-0">
                                  <Users className="w-4 h-4 text-zinc-500 shrink-0" />
                                  <div className="min-w-0">
                                    <p className="text-sm text-zinc-300 truncate">{workerName}</p>
                                    {workerRut && <p className="text-[10px] text-zinc-500">{workerRut}</p>}
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                                    doc.estado === 'firmado' ? 'bg-emerald-500/20 text-emerald-400' :
                                    doc.estado === 'enviado' ? 'bg-blue-500/20 text-blue-400' :
                                    doc.estado === 'error' ? 'bg-red-500/20 text-red-400' :
                                    'bg-zinc-700 text-zinc-400'
                                  }`}>
                                    {doc.estado === 'firmado' ? '✓ Firmado' : doc.estado === 'enviado' ? '↗ Enviado' : doc.estado === 'error' ? '✗ Error' : '● Generado'}
                                  </span>
                                  <button className="p-1 rounded-lg text-zinc-500 hover:text-violet-400 hover:bg-zinc-700 transition" title="Descargar">
                                    <Download className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  ))}
                  {Object.keys(byEmpleador).length === 0 && (
                    <div className="px-5 py-8 text-center text-zinc-500 text-sm">
                      No hay documentos generados para este proceso.
                    </div>
                  )}
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* === HISTÓRICO === */}
      <div className="rounded-xl border border-zinc-700/50 bg-zinc-800/30 overflow-hidden">
        <div className="px-5 py-4 border-b border-zinc-700/50 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-zinc-200">Histórico</h2>
          <div className="flex items-center gap-2">
            <select value={histYear} onChange={e => setHistYear(Number(e.target.value))}
              className="px-3 py-1.5 rounded-lg bg-zinc-800 border border-zinc-600 text-sm text-zinc-300 focus:outline-none focus:border-violet-500">
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <select value={histMonth} onChange={e => setHistMonth(e.target.value === '' ? '' : Number(e.target.value))}
              className="px-3 py-1.5 rounded-lg bg-zinc-800 border border-zinc-600 text-sm text-zinc-300 focus:outline-none focus:border-violet-500">
              <option value="">Todos</option>
              {MESES.map((m, i) => <option key={i} value={i}>{m}</option>)}
            </select>
          </div>
        </div>
        {historico.length === 0 ? (
          <div className="px-5 py-8 text-center text-zinc-500 text-sm">Sin cierres históricos para este filtro.</div>
        ) : (
          <div className="divide-y divide-zinc-800/50">
            {historico.map(h => {
              const [y, m] = h.periodo.split('-').map(Number);
              const label = `${MESES[m - 1]} '${String(y).slice(2)}`;
              const isExp = histExpanded === h.periodo;
              return (
                <div key={h.periodo}>
                  <button onClick={() => setHistExpanded(isExp ? null : h.periodo)}
                    className="w-full flex items-center justify-between px-5 py-3 hover:bg-zinc-800/50 transition">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-violet-600/80 flex items-center justify-center">
                        <Calendar className="w-4 h-4 text-white" />
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-semibold text-zinc-200">{label}</p>
                        <p className="text-xs text-zinc-500">
                          {h.total_empleadores} empleadores · {formatCLP(h.total_liquido)} líquido
                        </p>
                      </div>
                    </div>
                    <ChevronDown className={`w-4 h-4 text-zinc-500 transition-transform ${isExp ? 'rotate-180' : ''}`} />
                  </button>
                  {isExp && (
                    <div className="px-5 pb-4 text-xs text-zinc-400 space-y-1">
                      <p>Cerrado: {h.fecha_cierre ? new Date(h.fecha_cierre).toLocaleDateString('es-CL') : '—'}</p>
                      <p>Cotizaciones: {formatCLP(h.total_cotizaciones)}</p>
                      <p>Trabajadores: {h.total_trabajadores}</p>
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
          <div><p className="font-medium text-zinc-300">Ley Karin (21.643)</p><p>Protocolos prevención acoso actualizados.</p></div>
          <div><p className="font-medium text-zinc-300">Ley 40 Horas (21.561)</p><p>Jornada máxima 42h semanales desde 2026.</p></div>
          <div><p className="font-medium text-zinc-300">Archivo Legal</p><p>Respaldo 5 años mínimo.</p></div>
        </div>
      </div>

      {/* Modal Cerrar Mes */}
      {showCierreModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => { setShowCierreModal(false); setCierreDropdownOpen(false); }}>
          <div className="bg-zinc-900 rounded-2xl border border-zinc-700 w-full max-w-lg shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="bg-gradient-to-r from-violet-600 to-violet-700 rounded-t-2xl p-6">
              <h2 className="text-xl font-bold text-white">Cerrar Mes — {activeLabel}</h2>
              <p className="text-violet-200 text-sm mt-1">Proceso batch para {autorizados.length} empleador{autorizados.length !== 1 ? 'es' : ''} autorizado{autorizados.length !== 1 ? 's' : ''}.</p>
            </div>
            <div className="p-6 space-y-5">
              <div className="bg-zinc-800 rounded-xl p-4 border border-zinc-700 space-y-2 text-sm text-zinc-300">
                <p>Se generarán por cada empleador y trabajador:</p>
                <ul className="list-disc pl-5 text-xs text-zinc-400 space-y-1">
                  <li>Liquidaciones de sueldo (PDF por trabajador)</li>
                  <li>Archivo Previred (CSV por empleador)</li>
                  <li>Libro de Remuneraciones (por empleador)</li>
                  <li>Libro Electrónico LRE (por empleador)</li>
                  <li>Contabilidad centralizada (CSV por empleador)</li>
                  <li>Anticipos (si aplica)</li>
                </ul>
                <p className="text-amber-400 font-medium mt-2">
                  {pendientes.length > 0
                    ? `${pendientes.length} empleador${pendientes.length > 1 ? 'es' : ''} no ha${pendientes.length > 1 ? 'n' : ''} autorizado y NO serán procesados.`
                    : 'Todos los empleadores están autorizados.'}
                </p>
              </div>
              <div className="relative">
                <button onClick={() => setCierreDropdownOpen(!cierreDropdownOpen)}
                  className="w-full flex items-center justify-between rounded-xl border border-zinc-600 bg-zinc-800 px-4 py-3 text-sm text-zinc-200 hover:border-violet-500 transition">
                  <span>Seleccione una opción...</span>
                  <ChevronRight className={`w-4 h-4 text-zinc-400 transition-transform ${cierreDropdownOpen ? 'rotate-90' : ''}`} />
                </button>
                {cierreDropdownOpen && (
                  <div className="absolute left-0 right-0 mt-2 rounded-xl border border-zinc-600 bg-zinc-800 shadow-xl z-10 overflow-hidden">
                    <button onClick={() => { setCierreDropdownOpen(false); setShowCierreModal(false); }}
                      className="w-full text-left px-4 py-3 text-sm text-zinc-300 hover:bg-zinc-700 border-b border-zinc-700 transition">
                      <p className="font-medium text-amber-400">Aún no</p>
                      <p className="text-xs text-zinc-500 mt-0.5">Todavía quiero realizar cambios a este proceso.</p>
                    </button>
                    <button onClick={handleCerrarMes}
                      className="w-full text-left px-4 py-3 text-sm text-zinc-300 hover:bg-zinc-700 transition">
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
