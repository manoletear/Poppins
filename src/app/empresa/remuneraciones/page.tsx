'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Lock, ChevronDown, ChevronRight, Download, Loader2,
  FileText, Shield, BookOpen, FileSpreadsheet, CreditCard,
  Calculator, Receipt, MoreHorizontal, CheckCircle2,
} from 'lucide-react';

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
               'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

const PROCESOS_ABIERTO = [
  { key: 'contabilidad',    label: 'Contabilidad',       Icon: FileSpreadsheet },
  { key: 'previred',        label: 'Previred',           Icon: Shield          },
  { key: 'libro_electronico', label: 'Libro Electrónico', Icon: BookOpen        },
];

const PROCESOS_CERRADO = [
  { key: 'anticipos',         label: 'Anticipos',          Icon: CreditCard    },
  { key: 'sueldos',           label: 'Sueldos',            Icon: Calculator    },
  { key: 'liquidaciones_pdf', label: 'Liquidaciones en PDF', Icon: FileText    },
  { key: 'libros',            label: 'Libros',             Icon: BookOpen      },
  { key: 'contabilidad',      label: 'Contabilidad',       Icon: FileSpreadsheet },
  { key: 'previred',          label: 'Previred',           Icon: Shield        },
  { key: 'libro_electronico', label: 'Libro Electrónico',  Icon: Receipt       },
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
  netPay: number;
  grossIncome: number;
  warnings: string[];
}

export default function RemuneracionesPage() {
  const periods = lastNPeriods(12);
  const current = currentPeriod();

  const [summaries, setSummaries] = useState<Map<string, PeriodSummary>>(new Map());
  const [expanded, setExpanded]   = useState<string | null>(periods[0]);
  const [masAcciones, setMasAcciones] = useState<string | null>(null);
  const [loading, setLoading]     = useState(true);

  // Estado por período durante procesamiento
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
          // Cerrado: refrescar estado
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

  const handleDownloadPrevired = async (period: string) => {
    const a = document.createElement('a');
    a.href = `/api/payroll/previred?period=${period}`;
    a.download = `previred_${period.replace('-', '')}.txt`;
    a.click();
  };

  const handleReopenPeriod = async (period: string) => {
    // TODO: API para anular todos los results del período y reabrirlo
    alert('Funcionalidad de reabrir período próximamente.');
    setMasAcciones(null);
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

      {periods.map((period, idx) => {
        const summary   = summaries.get(period);
        const isClosed  = summary?.closed ?? false;
        const isOpen    = expanded === period;
        const isCurrent = period === current;
        const isProc    = processing === period;
        const preview   = previewData.get(period) ?? [];

        return (
          <div key={period} className="border-b border-zinc-200 last:border-b-0">
            {/* ── Row header ── */}
            <button
              className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-zinc-50 transition text-left"
              onClick={() => setExpanded(isOpen ? null : period)}
            >
              {/* Lock icon */}
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

            {/* ── Expanded content ── */}
            {isOpen && (
              <div className="px-4 pb-5">
                {/* ── CERRADO ── */}
                {isClosed ? (
                  <div className="space-y-4">
                    {/* Más acciones */}
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

                    {/* Grid de procesos */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {PROCESOS_CERRADO.map(({ key, label, Icon }) => (
                        <button
                          key={key}
                          onClick={key === 'previred' ? () => handleDownloadPrevired(period) : undefined}
                          className="flex items-center justify-between rounded-xl border border-zinc-200 bg-white px-3 py-3 hover:border-[#1a2e6e]/40 hover:shadow-sm transition text-left"
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
                          <Download className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                        </button>
                      ))}
                    </div>

                    {/* Footer buttons */}
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
                    {/* Preview resultado */}
                    {preview.length > 0 && (
                      <div className="rounded-xl bg-blue-50 border border-blue-200 p-4 space-y-2">
                        <p className="text-xs font-semibold text-blue-800">Vista previa — {preview.length} trabajador{preview.length !== 1 ? 'es' : ''}</p>
                        {preview.map((r, i) => (
                          <div key={i} className="flex justify-between text-xs text-blue-700">
                            <span>{r.workerName}</span>
                            <span className="font-medium">${r.netPay.toLocaleString('es-CL')} neto</span>
                          </div>
                        ))}
                        {preview.some(r => r.warnings.length > 0) && (
                          <p className="text-[10px] text-amber-600 mt-1">
                            {preview.flatMap(r => r.warnings).length} advertencia(s). Revise antes de cerrar.
                          </p>
                        )}
                      </div>
                    )}

                    {/* Grid procesos desactualizados */}
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

                    {/* Footer buttons */}
                    <div className="flex items-center justify-between pt-1">
                      <button
                        onClick={() => setExpanded(null)}
                        className="text-sm px-4 py-2 rounded-lg border border-zinc-300 text-zinc-600 hover:bg-zinc-50 transition"
                      >
                        Cancelar
                      </button>
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
    </div>
  );
}
