'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  ChevronLeft, ChevronRight, Calendar, AlertTriangle, CheckCircle2,
  Loader2, FileText, Receipt, Banknote, Sparkles,
} from 'lucide-react';

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const STEPS = [
  { key: 'periodo',    label: '1. Período',     icon: Calendar },
  { key: 'novedades',  label: '2. Novedades',   icon: FileText },
  { key: 'preview',    label: '3. Revisar',     icon: Receipt },
  { key: 'pagar',      label: '4. Cerrar',      icon: Banknote },
] as const;
type StepKey = typeof STEPS[number]['key'];

function fmt(n: number) { return '$' + (n ?? 0).toLocaleString('es-CL'); }
function nombreMes(p: string) { const [y, m] = p.split('-'); return `${MESES[Number(m) - 1]} ${y}`; }

export default function PagarMesWizard() {
  const [step, setStep] = useState<StepKey>('periodo');
  const [periods, setPeriods] = useState<{ period: string; closed: boolean; workerCount: number; totalNetPay: number }[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<string>('');
  const [loadingPeriods, setLoadingPeriods] = useState(true);

  // Novedades del período
  const [novedades, setNovedades] = useState<any>(null);
  const [loadingNov, setLoadingNov] = useState(false);

  // Preview
  const [preview, setPreview] = useState<any[]>([]);
  const [previewErrors, setPreviewErrors] = useState<any[]>([]);
  const [previewWarnings, setPreviewWarnings] = useState<any[]>([]);
  const [loadingPreview, setLoadingPreview] = useState(false);

  // Cierre final
  const [closing, setClosing] = useState(false);
  const [closeResult, setCloseResult] = useState<any>(null);

  useEffect(() => {
    fetch('/api/payroll/periodos-estado')
      .then(r => r.json())
      .then(d => {
        if (d.ok) {
          setPeriods(d.data ?? []);
          const firstOpen = (d.data ?? []).find((p: any) => !p.closed);
          const now = new Date();
          const currentPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
          setSelectedPeriod(firstOpen?.period ?? currentPeriod);
        }
      })
      .finally(() => setLoadingPeriods(false));
  }, []);

  async function loadNovedades(period: string) {
    setLoadingNov(true);
    try {
      const r = await fetch(`/api/empresa/novedades-resumen?period=${period}`);
      const d = await r.json();
      setNovedades(d.ok ? d.data : null);
    } finally { setLoadingNov(false); }
  }

  async function loadPreview(period: string) {
    setLoadingPreview(true);
    try {
      const r = await fetch('/api/payroll/procesar-mes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ period, mode: 'preview' }),
      });
      const d = await r.json();
      if (d.ok) {
        setPreview(d.results ?? []);
        setPreviewErrors(d.errors ?? []);
        setPreviewWarnings(d.warnings ?? []);
      }
    } finally { setLoadingPreview(false); }
  }

  async function ejecutarCierre() {
    setClosing(true);
    try {
      const r = await fetch('/api/payroll/procesar-mes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ period: selectedPeriod, mode: 'final' }),
      });
      const d = await r.json();
      setCloseResult(d);
    } finally { setClosing(false); }
  }

  function siguiente() {
    const i = STEPS.findIndex(s => s.key === step);
    const next = STEPS[i + 1];
    if (!next) return;
    if (next.key === 'novedades' && selectedPeriod) loadNovedades(selectedPeriod);
    if (next.key === 'preview'   && selectedPeriod) loadPreview(selectedPeriod);
    setStep(next.key);
  }

  function atras() {
    const i = STEPS.findIndex(s => s.key === step);
    if (i > 0) setStep(STEPS[i - 1].key);
  }

  const totalLiquido = useMemo(() => preview.reduce((s, p) => s + (p.netPay ?? p.net_pay ?? 0), 0), [preview]);
  const stepIndex = STEPS.findIndex(s => s.key === step);
  const canAdvance =
    step === 'periodo'   ? !!selectedPeriod :
    step === 'novedades' ? true :
    step === 'preview'   ? previewErrors.length === 0 && preview.length > 0 :
    false;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-emerald-600" />
            Pagar el mes
          </h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            En 4 pasos cierras el mes y dejas listas las liquidaciones para pagar.
          </p>
        </div>
        <Link
          href="/hogar/remuneraciones"
          className="text-xs text-zinc-500 hover:text-zinc-700 underline"
        >
          Modo experto →
        </Link>
      </div>

      {/* Stepper */}
      <div className="rounded-xl border border-zinc-200 bg-white p-3">
        <div className="flex items-center gap-2">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            const isActive = s.key === step;
            const isDone = i < stepIndex;
            return (
              <div key={s.key} className="flex-1 flex items-center gap-2">
                <div className={`flex items-center gap-2 px-3 py-2 rounded-lg flex-1 ${
                  isActive ? 'bg-emerald-50 border border-emerald-200' : isDone ? 'bg-zinc-50' : ''
                }`}>
                  <div className={`flex h-7 w-7 items-center justify-center rounded-full ${
                    isActive ? 'bg-emerald-600 text-white' : isDone ? 'bg-emerald-100 text-emerald-700' : 'bg-zinc-100 text-zinc-400'
                  }`}>
                    {isDone ? <CheckCircle2 className="h-4 w-4" /> : <Icon className="h-3.5 w-3.5" />}
                  </div>
                  <div className={`text-xs font-semibold ${isActive ? 'text-emerald-700' : isDone ? 'text-zinc-700' : 'text-zinc-400'}`}>
                    {s.label}
                  </div>
                </div>
                {i < STEPS.length - 1 && <ChevronRight className="h-4 w-4 text-zinc-300 shrink-0" />}
              </div>
            );
          })}
        </div>
      </div>

      {/* Body */}
      <div className="rounded-xl border border-zinc-200 bg-white p-6 min-h-[300px]">
        {step === 'periodo' && (
          <div>
            <h2 className="text-base font-semibold text-zinc-900 mb-1">¿Qué mes vamos a pagar?</h2>
            <p className="text-sm text-zinc-500 mb-4">Elige el período que todavía está abierto.</p>
            {loadingPeriods ? (
              <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-zinc-400" /></div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {periods.slice(0, 6).map(p => (
                  <button
                    key={p.period}
                    onClick={() => setSelectedPeriod(p.period)}
                    disabled={p.closed}
                    className={`rounded-xl border p-4 text-left transition ${
                      selectedPeriod === p.period
                        ? 'border-emerald-500 bg-emerald-50'
                        : p.closed
                          ? 'border-zinc-200 bg-zinc-50 opacity-50 cursor-not-allowed'
                          : 'border-zinc-200 bg-white hover:border-emerald-300 hover:bg-emerald-50/50'
                    }`}
                  >
                    <div className="font-semibold text-zinc-900">{nombreMes(p.period)}</div>
                    <div className="text-xs text-zinc-500 mt-1">
                      {p.closed
                        ? `Ya cerrado (${p.workerCount} trabajadores · ${fmt(p.totalNetPay)})`
                        : 'Abierto — listo para procesar'}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {step === 'novedades' && (
          <div>
            <h2 className="text-base font-semibold text-zinc-900 mb-1">Novedades de {nombreMes(selectedPeriod)}</h2>
            <p className="text-sm text-zinc-500 mb-4">
              Estos son los eventos que se aplicarán automáticamente al cálculo. Si falta algo, agrégalo antes del paso siguiente.
            </p>
            {loadingNov ? (
              <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-zinc-400" /></div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <NovedadCard label="Anticipos" count={novedades?.anticipos?.length ?? 0} hint="Se descuentan del sueldo automáticamente." href="/hogar/anticipos" />
                <NovedadCard label="Vacaciones aprobadas" count={novedades?.vacaciones?.length ?? 0} hint="Días que ya autorizaste." href="/hogar/solicitudes" />
                <NovedadCard label="Licencias médicas" count={novedades?.licencias?.length ?? 0} hint="Pago lo cubre la Isapre/Fonasa." href="/hogar/licencias" />
                <NovedadCard label="Otras novedades" count={novedades?.novedades?.length ?? 0} hint="Bonos, descuentos, eventos manuales." href="/hogar/remuneraciones" />
              </div>
            )}
          </div>
        )}

        {step === 'preview' && (
          <div>
            <h2 className="text-base font-semibold text-zinc-900 mb-1">Previsualización de pagos</h2>
            <p className="text-sm text-zinc-500 mb-4">Esto es lo que pagarás. Aún no es definitivo — revisa antes de cerrar.</p>
            {loadingPreview ? (
              <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-zinc-400" /></div>
            ) : (
              <>
                {previewErrors.length > 0 && (
                  <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4">
                    <div className="flex items-center gap-2 text-sm font-semibold text-red-900 mb-2">
                      <AlertTriangle className="h-4 w-4" />
                      No podemos cerrar el mes. {previewErrors.length} problema{previewErrors.length === 1 ? '' : 's'}:
                    </div>
                    <ul className="space-y-1 text-xs text-red-700 pl-6 list-disc">
                      {previewErrors.map((e, i) => (
                        <li key={i}>
                          <strong>{e.workerName ?? e.workerRut ?? 'Trabajador'}</strong>: {e.detail ?? e.error}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                <div className="space-y-2">
                  {preview.map((p: any) => (
                    <div key={p.contractId ?? p.workerId} className="flex items-center justify-between rounded-lg border border-zinc-200 bg-zinc-50 p-3">
                      <div>
                        <div className="text-sm font-semibold text-zinc-900">{p.workerName ?? 'Trabajador'}</div>
                        <div className="text-xs text-zinc-500">Haberes {fmt(p.grossIncome ?? p.gross_income ?? 0)} · Descuentos {fmt(p.totalDeductions ?? 0)}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-emerald-600">{fmt(p.netPay ?? p.net_pay ?? 0)}</div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 rounded-lg border-2 border-emerald-200 bg-emerald-50 p-4 flex items-center justify-between">
                  <div className="text-sm font-semibold text-emerald-900">Total a pagar</div>
                  <div className="text-2xl font-bold text-emerald-700">{fmt(totalLiquido)}</div>
                </div>
              </>
            )}
          </div>
        )}

        {step === 'pagar' && (
          <div className="text-center py-6">
            {!closeResult ? (
              <>
                <h2 className="text-base font-semibold text-zinc-900 mb-2">¿Todo en orden?</h2>
                <p className="text-sm text-zinc-500 mb-6">
                  Al cerrar quedan registradas las liquidaciones del período <strong>{nombreMes(selectedPeriod)}</strong>. Total: <strong className="text-emerald-700">{fmt(totalLiquido)}</strong>.
                </p>
                <button
                  onClick={ejecutarCierre}
                  disabled={closing}
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 transition"
                >
                  {closing ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                  {closing ? 'Cerrando…' : 'Sí, cerrar el mes'}
                </button>
              </>
            ) : closeResult.ok ? (
              <div>
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
                  <CheckCircle2 className="h-8 w-8 text-emerald-600" />
                </div>
                <h2 className="text-xl font-bold text-zinc-900 mb-2">¡Listo!</h2>
                <p className="text-sm text-zinc-600 mb-6">
                  Cerraste {nombreMes(selectedPeriod)} — {(closeResult.results ?? []).length} liquidaciones generadas.
                </p>
                <div className="flex justify-center gap-2">
                  <Link href="/hogar/liquidaciones" className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700">
                    Ver liquidaciones
                  </Link>
                  <Link href="/hogar" className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50">
                    Volver al inicio
                  </Link>
                </div>
              </div>
            ) : (
              <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-left">
                <div className="font-semibold text-red-900">No se pudo cerrar el mes</div>
                <div className="text-sm text-red-700 mt-1">{closeResult.error ?? 'Error desconocido'}</div>
                {closeResult.errors && (
                  <ul className="text-xs text-red-700 mt-2 pl-4 list-disc">
                    {closeResult.errors.map((e: any, i: number) => (
                      <li key={i}><strong>{e.workerName ?? e.workerRut}</strong>: {e.detail ?? e.error}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer botones */}
      {step !== 'pagar' && (
        <div className="flex items-center justify-between">
          <button
            onClick={atras}
            disabled={stepIndex === 0}
            className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-50 disabled:opacity-30"
          >
            <ChevronLeft className="h-4 w-4" /> Atrás
          </button>
          <button
            onClick={siguiente}
            disabled={!canAdvance}
            className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-30"
          >
            Siguiente <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}

function NovedadCard({ label, count, hint, href }: { label: string; count: number; hint: string; href: string }) {
  return (
    <Link href={href} className="rounded-xl border border-zinc-200 bg-white p-4 hover:border-emerald-300 hover:bg-emerald-50/50 transition">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-sm font-semibold text-zinc-900">{label}</div>
          <div className="text-xs text-zinc-500 mt-1">{hint}</div>
        </div>
        <span className="text-lg font-bold text-emerald-600">{count}</span>
      </div>
    </Link>
  );
}
