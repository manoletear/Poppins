'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Lock, ChevronDown, Download, Loader2,
  FileText, Shield, BookOpen, FileSpreadsheet, CreditCard,
  Calculator, Receipt, CheckCircle2, X, Plus, Trash2, Stethoscope,
} from 'lucide-react';

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
               'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

const PROCESOS_ABIERTO = [
  { key: 'contabilidad',      label: 'Contabilidad',       Icon: FileSpreadsheet },
  { key: 'previred',          label: 'Previred',           Icon: Shield          },
  { key: 'libro_electronico', label: 'Libro Electrónico',  Icon: BookOpen        },
];

const PROCESOS_CERRADO = [
  { key: 'anticipos',         label: 'Anticipos',            Icon: CreditCard,      download: null       },
  { key: 'sueldos',           label: 'Sueldos',              Icon: Calculator,      download: 'sueldos'  },
  { key: 'liquidaciones_pdf', label: 'Liquidaciones PDF',    Icon: FileText,        download: null       },
  { key: 'libros',            label: 'Libro Remuneraciones', Icon: BookOpen,        download: 'libro'    },
  { key: 'contabilidad',      label: 'Contabilidad',         Icon: FileSpreadsheet, download: null       },
  { key: 'previred',          label: 'Previred',             Icon: Shield,          download: 'previred' },
  { key: 'libro_electronico', label: 'Libro Electrónico',    Icon: Receipt,         download: null       },
];

const TIPOS_LICENCIA = [
  { value: 'MEDICA',    label: 'Médica' },
  { value: 'PRENATAL',  label: 'Prenatal' },
  { value: 'POSNATAL',  label: 'Posnatal' },
  { value: 'ACCIDENTE', label: 'Accidente laboral' },
];

function periodoLabel(period: string) {
  const [y, m] = period.split('-').map(Number);
  return `${MESES[m - 1]} '${String(y).slice(2)}`;
}

function currentPeriod() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function lastNPeriods(n: number): string[] {
  const result: string[] = [];
  const now = new Date();
  for (let i = 0; i < n; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    result.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }
  return result;
}

interface PeriodSummary {
  period: string;
  closed: boolean;
  workerCount: number;
  totalNetPay: number;
}

interface ProcessResult {
  workerName: string;
  workerId: string;
  netPay: number;
  grossIncome: number;
  warnings: string[];
}

interface Licencia {
  id: string;
  trabajador_id: string;
  periodo: string;
  tipo: string;
  fecha_inicio: string;
  fecha_fin: string;
  dias: number;
  observacion?: string;
  trabajadores: { nombre: string; apellido_paterno: string; rut: string };
}

interface Trabajador {
  id: string;
  rut: string;
  nombre: string;
  apellido_paterno: string;
}

// ── Modal Licencias Médicas ──────────────────────────────────────────────────
function LicenciasModal({ period, onClose }: { period: string; onClose: () => void }) {
  const [licencias, setLicencias] = useState<Licencia[]>([]);
  const [trabajadores, setTrabajadores] = useState<Trabajador[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // form
  const [form, setForm] = useState({
    trabajador_id: '',
    tipo: 'MEDICA',
    fecha_inicio: '',
    fecha_fin: '',
    observacion: '',
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [licRes, trabRes] = await Promise.all([
      fetch(`/api/payroll/licencias-medicas?period=${period}`),
      fetch('/api/payroll/trabajadores'),
    ]);
    if (licRes.ok) {
      const d = await licRes.json();
      setLicencias(d.data ?? []);
    }
    if (trabRes.ok) {
      const d = await trabRes.json();
      setTrabajadores(d.data ?? d ?? []);
    }
    setLoading(false);
  }, [period]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleAdd = async () => {
    if (!form.trabajador_id || !form.fecha_inicio || !form.fecha_fin) return;
    setSaving(true);
    try {
      const res = await fetch('/api/payroll/licencias-medicas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, periodo: period }),
      });
      if (res.ok) {
        setForm({ trabajador_id: '', tipo: 'MEDICA', fecha_inicio: '', fecha_fin: '', observacion: '' });
        await fetchData();
      } else {
        const d = await res.json();
        alert(d.error ?? 'Error al guardar');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar esta licencia?')) return;
    await fetch(`/api/payroll/licencias-medicas?id=${id}`, { method: 'DELETE' });
    await fetchData();
  };

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-50 bg-black/40" onClick={onClose} />

      {/* Panel */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl pointer-events-auto flex flex-col max-h-[80vh]">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-200">
            <div className="flex items-center gap-2">
              <Stethoscope className="w-4 h-4 text-zinc-500" />
              <h2 className="text-sm font-semibold text-zinc-800">
                Licencias médicas — {periodoLabel(period)}
              </h2>
            </div>
            <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600 transition">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin text-zinc-400" />
              </div>
            ) : (
              <>
                {/* Lista */}
                {licencias.length === 0 ? (
                  <p className="text-xs text-zinc-400 text-center py-4">Sin licencias registradas para este período.</p>
                ) : (
                  <div className="space-y-2">
                    {licencias.map(lic => (
                      <div key={lic.id} className="flex items-start justify-between rounded-xl border border-zinc-200 px-3 py-2.5 gap-3">
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-zinc-800">
                            {lic.trabajadores?.nombre} {lic.trabajadores?.apellido_paterno}
                          </p>
                          <p className="text-[11px] text-zinc-500">
                            {TIPOS_LICENCIA.find(t => t.value === lic.tipo)?.label ?? lic.tipo}
                            {' · '}{lic.fecha_inicio} → {lic.fecha_fin}
                            {' · '}<span className="font-medium text-zinc-700">{lic.dias} día{lic.dias !== 1 ? 's' : ''}</span>
                          </p>
                          {lic.observacion && (
                            <p className="text-[10px] text-zinc-400 mt-0.5">{lic.observacion}</p>
                          )}
                        </div>
                        <button
                          onClick={() => handleDelete(lic.id)}
                          className="shrink-0 text-zinc-400 hover:text-red-500 transition mt-0.5"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Form nueva licencia */}
                <div className="rounded-xl border border-dashed border-zinc-300 p-3 space-y-2.5">
                  <p className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wide">Registrar licencia</p>

                  <select
                    value={form.trabajador_id}
                    onChange={e => setForm(f => ({ ...f, trabajador_id: e.target.value }))}
                    className="w-full text-xs rounded-lg border border-zinc-300 px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#1a2e6e]"
                  >
                    <option value="">Seleccionar trabajador…</option>
                    {trabajadores.map(t => (
                      <option key={t.id} value={t.id}>
                        {t.nombre} {t.apellido_paterno} — {t.rut}
                      </option>
                    ))}
                  </select>

                  <select
                    value={form.tipo}
                    onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))}
                    className="w-full text-xs rounded-lg border border-zinc-300 px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#1a2e6e]"
                  >
                    {TIPOS_LICENCIA.map(t => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-zinc-500 mb-0.5 block">Fecha inicio</label>
                      <input
                        type="date"
                        value={form.fecha_inicio}
                        onChange={e => setForm(f => ({ ...f, fecha_inicio: e.target.value }))}
                        className="w-full text-xs rounded-lg border border-zinc-300 px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#1a2e6e]"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-zinc-500 mb-0.5 block">Fecha fin</label>
                      <input
                        type="date"
                        value={form.fecha_fin}
                        onChange={e => setForm(f => ({ ...f, fecha_fin: e.target.value }))}
                        className="w-full text-xs rounded-lg border border-zinc-300 px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#1a2e6e]"
                      />
                    </div>
                  </div>

                  <input
                    type="text"
                    placeholder="Observación (opcional)"
                    value={form.observacion}
                    onChange={e => setForm(f => ({ ...f, observacion: e.target.value }))}
                    className="w-full text-xs rounded-lg border border-zinc-300 px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#1a2e6e]"
                  />

                  <button
                    disabled={saving || !form.trabajador_id || !form.fecha_inicio || !form.fecha_fin}
                    onClick={handleAdd}
                    className="w-full flex items-center justify-center gap-1.5 text-xs py-1.5 rounded-lg bg-[#1a2e6e] text-white font-medium hover:bg-[#142358] disabled:opacity-50 transition"
                  >
                    {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                    Agregar
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────
export default function RemuneracionesPage() {
  const periods = lastNPeriods(12);
  const current = currentPeriod();

  const [summaries, setSummaries] = useState<Map<string, PeriodSummary>>(new Map());
  const [expanded, setExpanded]   = useState<string | null>(periods[0]);
  const [masAcciones, setMasAcciones] = useState<string | null>(null);
  const [loading, setLoading]     = useState(true);
  const [licenciasModal, setLicenciasModal] = useState<string | null>(null);

  const [processing, setProcessing] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<Map<string, ProcessResult[]>>(new Map());

  const fetchSummaries = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/payroll/periodos-estado');
      if (res.ok) {
        const data = await res.json();
        const map = new Map<string, PeriodSummary>();
        for (const s of data.periods ?? []) map.set(s.period, s);
        setSummaries(map);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchSummaries(); }, [fetchSummaries]);

  const handleProcesar = async (period: string, mode: 'preview' | 'final') => {
    setProcessing(period);
    try {
      const res = await fetch('/api/payroll/procesar-mes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ period, mode }),
      });
      const data = await res.json();
      if (data.ok) {
        if (mode === 'preview') {
          setPreviewData(prev => new Map(prev).set(period, data.results));
        } else {
          await fetchSummaries();
          setPreviewData(prev => { const m = new Map(prev); m.delete(period); return m; });
        }
      } else {
        alert(data.error ?? 'Error al procesar');
      }
    } finally {
      setProcessing(null);
    }
  };

  const handleDownloadPrevired = (period: string) => {
    const a = document.createElement('a');
    a.href = `/api/payroll/previred?period=${period}`;
    a.download = `previred_${period.replace('-', '')}.txt`;
    a.click();
  };

  const handleDownload = (path: string, filename: string) => {
    const a = document.createElement('a');
    a.href = path;
    a.download = filename;
    a.click();
  };

  const handleReopenPeriod = async (period: string) => {
    if (!confirm(`¿Reabrir el período ${periodoLabel(period)}? Se anularán todos los resultados calculados.`)) return;
    setMasAcciones(null);
    const res = await fetch('/api/payroll/reabrir-periodo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ period }),
    });
    const data = await res.json();
    if (data.ok) {
      await fetchSummaries();
    } else {
      alert(data.error ?? 'Error al reabrir período');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-zinc-400" />
      </div>
    );
  }

  return (
    <div className="space-y-0 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-zinc-900">Procesos</h1>
      </div>

      {periods.map((period) => {
        const summary   = summaries.get(period);
        const isClosed  = summary?.closed ?? false;
        const isOpen    = expanded === period;
        const isCurrent = period === current;
        const isProc    = processing === period;
        const preview   = previewData.get(period) ?? [];

        return (
          <div key={period} className="border-b border-zinc-200 last:border-b-0">
            {/* Row header */}
            <button
              className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-zinc-50 transition text-left"
              onClick={() => setExpanded(isOpen ? null : period)}
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                isClosed ? 'bg-[#1a2e6e]' : 'bg-zinc-300'
              }`}>
                <Lock className="w-4 h-4 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-zinc-800">{periodoLabel(period)}</p>
                <p className="text-xs text-zinc-400">{isClosed ? 'Cerrado' : isCurrent ? 'Abierto' : 'Pendiente'}</p>
              </div>
              <ChevronDown className={`w-4 h-4 text-zinc-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Expanded content */}
            {isOpen && (
              <div className="px-4 pb-5">
                {isClosed ? (
                  /* ── CERRADO ── */
                  <div className="space-y-4">
                    <div className="flex justify-end">
                      <div className="relative">
                        <button
                          onClick={() => setMasAcciones(masAcciones === period ? null : period)}
                          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-zinc-300 text-zinc-600 hover:border-zinc-400 transition"
                        >
                          Más Acciones <ChevronDown className="w-3 h-3" />
                        </button>
                        {masAcciones === period && (
                          <>
                            <div className="fixed inset-0 z-40" onClick={() => setMasAcciones(null)} />
                            <div className="absolute right-0 mt-1 w-44 rounded-xl border border-zinc-200 bg-white shadow-xl z-50 overflow-hidden">
                              <button
                                onClick={() => handleReopenPeriod(period)}
                                className="w-full text-left px-4 py-2.5 text-sm text-zinc-600 hover:bg-zinc-50 transition"
                              >
                                Reabrir período
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {PROCESOS_CERRADO.map(({ key, label, Icon, download }) => {
                        const onClickFn = download === 'previred'
                          ? () => handleDownload(`/api/payroll/previred?period=${period}`, `previred_${period.replace('-','')}.txt`)
                          : download === 'sueldos'
                          ? () => handleDownload(`/api/payroll/sueldos?period=${period}`, `sueldos_${period.replace('-','')}.csv`)
                          : download === 'libro'
                          ? () => handleDownload(`/api/payroll/libro-remuneraciones?period=${period}`, `libro_remuneraciones_${period.replace('-','')}.csv`)
                          : undefined;
                        return (
                        <button
                          key={key}
                          onClick={onClickFn}
                          className={`flex items-center justify-between rounded-xl border border-zinc-200 bg-white px-3 py-3 transition text-left ${onClickFn ? 'hover:border-[#1a2e6e]/40 hover:shadow-sm cursor-pointer' : 'cursor-default opacity-60'}`}
                        >
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-[#1a2e6e] flex items-center justify-center shrink-0">
                              <Icon className="w-4 h-4 text-white" />
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-zinc-800 leading-tight">{label}</p>
                              <p className="text-[10px] text-zinc-400">Actualizado</p>
                            </div>
                          </div>
                          <Download className={`w-3.5 h-3.5 shrink-0 ${onClickFn ? 'text-zinc-400' : 'text-zinc-200'}`} />
                        </button>
                        );
                      })}
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <button className="text-sm px-4 py-2 rounded-lg border border-zinc-300 text-zinc-600 hover:bg-zinc-50 transition">
                        Cancelar
                      </button>
                      <button
                        onClick={() => handleDownloadPrevired(period)}
                        className="text-sm px-5 py-2 rounded-lg bg-[#1a2e6e] text-white font-medium hover:bg-[#142358] transition"
                      >
                        Descargar
                      </button>
                    </div>
                  </div>
                ) : (
                  /* ── ABIERTO ── */
                  <div className="space-y-4">
                    {/* Preview */}
                    {preview.length > 0 && (
                      <div className="rounded-xl bg-blue-50 border border-blue-200 p-4 space-y-2">
                        <p className="text-xs font-semibold text-blue-800">Vista previa — {preview.length} trabajador{preview.length !== 1 ? 'es' : ''}</p>
                        {preview.map((r, i) => (
                          <div key={i} className="flex justify-between items-center text-xs text-blue-700">
                            <span>{r.workerName}</span>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">${r.netPay.toLocaleString('es-CL')} neto</span>
                              <button
                                onClick={() => handleDownload(
                                  `/api/payroll/liquidacion-pdf?period=${period}&workerId=${r.workerId}`,
                                  `liquidacion_${period.replace('-','')}_${r.workerId.slice(0,8)}.pdf`
                                )}
                                className="text-blue-500 hover:text-blue-700 transition"
                                title="Descargar liquidación PDF"
                              >
                                <FileText className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                        {preview.some(r => r.warnings.length > 0) && (
                          <p className="text-[10px] text-amber-600 mt-1">
                            {preview.flatMap(r => r.warnings).length} advertencia(s). Revise antes de cerrar.
                          </p>
                        )}
                      </div>
                    )}

                    {/* Grid procesos */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {PROCESOS_ABIERTO.map(({ key, label, Icon }) => (
                        <div
                          key={key}
                          className="flex items-center justify-between rounded-xl border border-orange-200 bg-orange-50 px-3 py-3"
                        >
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-orange-400 flex items-center justify-center shrink-0">
                              <Icon className="w-4 h-4 text-white" />
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-zinc-800 leading-tight">{label}</p>
                              <p className="text-[10px] text-orange-500">Desactualizado</p>
                            </div>
                          </div>
                          <Download className="w-3.5 h-3.5 text-zinc-300 shrink-0" />
                        </div>
                      ))}
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-between pt-1">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setExpanded(null)}
                          className="text-sm px-4 py-2 rounded-lg border border-zinc-300 text-zinc-600 hover:bg-zinc-50 transition"
                        >
                          Cancelar
                        </button>
                        <button
                          onClick={() => setLicenciasModal(period)}
                          className="flex items-center gap-1.5 text-sm px-3 py-2 rounded-lg border border-zinc-300 text-zinc-600 hover:bg-zinc-50 transition"
                        >
                          <Stethoscope className="w-3.5 h-3.5" />
                          Licencias
                        </button>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          disabled={isProc}
                          onClick={() => handleProcesar(period, 'preview')}
                          className="text-sm px-4 py-2 rounded-lg border border-[#1a2e6e] text-[#1a2e6e] font-medium hover:bg-blue-50 transition disabled:opacity-50"
                        >
                          {isProc ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Calcular'}
                        </button>
                        <button
                          disabled={isProc}
                          onClick={() => handleProcesar(period, 'final')}
                          className="text-sm px-5 py-2 rounded-lg bg-[#1a2e6e] text-white font-medium hover:bg-[#142358] transition disabled:opacity-50 flex items-center gap-2"
                        >
                          {isProc
                            ? <><Loader2 className="w-4 h-4 animate-spin" /> Procesando...</>
                            : <><CheckCircle2 className="w-4 h-4" /> Cerrar mes</>
                          }
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}

      {/* Modal licencias */}
      {licenciasModal && (
        <LicenciasModal
          period={licenciasModal}
          onClose={() => setLicenciasModal(null)}
        />
      )}
    </div>
  );
}
