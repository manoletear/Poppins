'use client';

import { useState } from 'react';
import { X, Loader2, AlertTriangle, FileText, Download } from 'lucide-react';

interface Props {
  trabajadorId: string;
  trabajadorNombre: string;
  sueldoBase: number;
  fechaInicio: string;
  onClose: () => void;
  onTerminado: () => void;
}

const CAUSALES: Array<{ value: string; label: string; indemniza: boolean }> = [
  { value: '159-1', label: '159 N°1 — Mutuo acuerdo', indemniza: false },
  { value: '159-2', label: '159 N°2 — Renuncia del trabajador', indemniza: false },
  { value: '159-4', label: '159 N°4 — Vencimiento del plazo', indemniza: false },
  { value: '159-5', label: '159 N°5 — Conclusión del trabajo o servicio', indemniza: false },
  { value: '159-6', label: '159 N°6 — Caso fortuito o fuerza mayor', indemniza: false },
  { value: '160-1', label: '160 N°1 — Conductas indebidas graves', indemniza: false },
  { value: '160-3', label: '160 N°3 — Inasistencia injustificada', indemniza: false },
  { value: '160-4', label: '160 N°4 — Abandono del trabajo', indemniza: false },
  { value: '160-7', label: '160 N°7 — Incumplimiento grave', indemniza: false },
  { value: '161-1', label: '161 — Necesidades de la empresa', indemniza: true },
  { value: '161-2', label: '161 — Desahucio', indemniza: true },
];

const fmt = (n: number) => '$ ' + (Math.round(n) || 0).toLocaleString('es-CL');

export default function TerminarContratoModal({
  trabajadorId, trabajadorNombre, sueldoBase, fechaInicio, onClose, onTerminado,
}: Props) {
  const today = new Date().toISOString().slice(0, 10);
  const [fechaTermino, setFechaTermino] = useState(today);
  const [causal, setCausal] = useState('161-1');
  const [diasVacPend, setDiasVacPend] = useState('0');
  const [diasVacProp, setDiasVacProp] = useState('0');
  const [ultimaRem, setUltimaRem] = useState(String(sueldoBase));
  const [avisoPrevio, setAvisoPrevio] = useState(false);
  const [obs, setObs] = useState('');

  const [preview, setPreview] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const causalObj = CAUSALES.find(c => c.value === causal);
  const indemniza = !!causalObj?.indemniza;

  async function calcular() {
    setBusy(true); setErr(null); setPreview(null);
    try {
      const r = await fetch('/api/payroll/finiquito', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trabajador_id: trabajadorId, fecha_termino: fechaTermino, causal,
          dias_vacaciones_pendientes: Number(diasVacPend) || 0,
          dias_vacaciones_proporcionales: Number(diasVacProp) || 0,
          ultima_remuneracion: Number(ultimaRem) || sueldoBase,
          aviso_previo_dado: avisoPrevio,
          mode: 'preview',
        }),
      });
      const d = await r.json();
      if (d.ok) setPreview(d.result);
      else setErr(d.error || 'Error al calcular');
    } catch (e: any) { setErr(e?.message ?? 'Error de red'); }
    finally { setBusy(false); }
  }

  async function confirmar() {
    if (!confirm(`¿Confirmar finiquito de ${trabajadorNombre} por ${fmt(preview.total_finiquito)}? Esta acción TERMINA el contrato y no se puede deshacer fácilmente.`)) return;
    setBusy(true); setErr(null);
    try {
      const r = await fetch('/api/payroll/finiquito', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trabajador_id: trabajadorId, fecha_termino: fechaTermino, causal,
          dias_vacaciones_pendientes: Number(diasVacPend) || 0,
          dias_vacaciones_proporcionales: Number(diasVacProp) || 0,
          ultima_remuneracion: Number(ultimaRem) || sueldoBase,
          aviso_previo_dado: avisoPrevio, observaciones: obs || null,
          mode: 'final',
        }),
      });
      const d = await r.json();
      if (d.ok) { setDone(true); onTerminado(); }
      else setErr(d.error || 'Error al confirmar');
    } catch (e: any) { setErr(e?.message ?? 'Error de red'); }
    finally { setBusy(false); }
  }

  function downloadPdf() {
    const a = document.createElement('a');
    a.href = `/api/payroll/finiquito?_t=${Date.now()}`;
    // POST con body no permite link directo; mejor llamamos fetch y blob
    fetch('/api/payroll/finiquito', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ trabajador_id: trabajadorId, fecha_termino: fechaTermino, causal, mode: 'pdf' }),
    }).then(async r => {
      if (!r.ok) return;
      const blob = await r.blob();
      const url = URL.createObjectURL(blob);
      const a2 = document.createElement('a');
      a2.href = url; a2.download = `finiquito_${fechaTermino.replace(/-/g, '')}.pdf`; a2.click();
      URL.revokeObjectURL(url);
    });
  }

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/40" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl pointer-events-auto max-h-[90vh] flex flex-col">
          <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-200">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-zinc-500" />
              <h2 className="text-sm font-semibold text-zinc-800">Terminar contrato — {trabajadorNombre}</h2>
            </div>
            <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600"><X className="w-4 h-4" /></button>
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
            {done ? (
              <div className="space-y-4">
                <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-4 text-sm text-emerald-800">
                  <p className="font-semibold mb-1">✓ Finiquito generado y contrato terminado</p>
                  <p>Total: <span className="font-bold">{fmt(preview.total_finiquito)}</span></p>
                </div>
                <button
                  onClick={downloadPdf}
                  className="w-full text-sm px-4 py-2 rounded-lg bg-[#1a2e6e] text-white font-medium hover:bg-[#142358] flex items-center justify-center gap-2"
                >
                  <Download className="w-4 h-4" /> Descargar PDF del finiquito
                </button>
                <button
                  onClick={onClose}
                  className="w-full text-sm px-4 py-2 rounded-lg border border-zinc-300 text-zinc-600 hover:bg-zinc-50"
                >
                  Cerrar
                </button>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-zinc-700 block mb-1">Fecha de término *</label>
                    <input type="date" value={fechaTermino} onChange={e => setFechaTermino(e.target.value)}
                      className="w-full text-sm rounded-lg border border-zinc-300 px-3 py-2" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-zinc-700 block mb-1">Causal *</label>
                    <select value={causal} onChange={e => setCausal(e.target.value)}
                      className="w-full text-sm rounded-lg border border-zinc-300 px-3 py-2">
                      {CAUSALES.map(c => (
                        <option key={c.value} value={c.value}>{c.label}{c.indemniza ? ' (con indemnización)' : ''}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-zinc-700 block mb-1">Días feriado pendiente</label>
                    <input type="number" min="0" step="0.5" value={diasVacPend} onChange={e => setDiasVacPend(e.target.value)}
                      className="w-full text-sm rounded-lg border border-zinc-300 px-3 py-2" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-zinc-700 block mb-1">Días feriado proporcional</label>
                    <input type="number" min="0" step="0.5" value={diasVacProp} onChange={e => setDiasVacProp(e.target.value)}
                      className="w-full text-sm rounded-lg border border-zinc-300 px-3 py-2" />
                  </div>
                  {indemniza && (
                    <>
                      <div>
                        <label className="text-xs font-semibold text-zinc-700 block mb-1">Última remuneración (Art. 172)</label>
                        <input type="number" min="0" value={ultimaRem} onChange={e => setUltimaRem(e.target.value)}
                          className="w-full text-sm rounded-lg border border-zinc-300 px-3 py-2" />
                        <p className="text-[10px] text-zinc-400 mt-1">Default: sueldo base actual.</p>
                      </div>
                      <div className="flex items-end">
                        <label className="flex items-center gap-2 text-xs text-zinc-700">
                          <input type="checkbox" checked={avisoPrevio} onChange={e => setAvisoPrevio(e.target.checked)} />
                          Aviso previo dado (30 días)
                        </label>
                      </div>
                    </>
                  )}
                </div>

                <div>
                  <label className="text-xs font-semibold text-zinc-700 block mb-1">Observaciones</label>
                  <textarea value={obs} onChange={e => setObs(e.target.value)} rows={2}
                    className="w-full text-sm rounded-lg border border-zinc-300 px-3 py-2" />
                </div>

                <div className="flex justify-end">
                  <button onClick={calcular} disabled={busy}
                    className="text-sm px-4 py-2 rounded-lg border border-[#1a2e6e] text-[#1a2e6e] font-medium hover:bg-blue-50 disabled:opacity-50">
                    {busy ? <Loader2 className="w-4 h-4 animate-spin inline" /> : 'Calcular finiquito'}
                  </button>
                </div>

                {preview && (
                  <div className="rounded-xl bg-zinc-50 border border-zinc-200 p-4 space-y-1 text-xs">
                    <p className="font-semibold text-zinc-800 mb-2">Vista previa</p>
                    <Row label="Remuneración días trabajados" value={preview.remuneracion_dias_trabajados} detail={`${preview.dias_trabajados_mes} días`} />
                    {preview.vacaciones_pendientes > 0 && <Row label="Feriado pendiente" value={preview.vacaciones_pendientes} detail={`${preview.dias_vacaciones_pendientes} días`} />}
                    {preview.vacaciones_proporcionales > 0 && <Row label="Feriado proporcional" value={preview.vacaciones_proporcionales} detail={`${preview.dias_vacaciones_proporcionales} días`} />}
                    {preview.gratificacion_proporcional > 0 && <Row label="Gratificación proporcional" value={preview.gratificacion_proporcional} detail={`${preview.meses_trabajados_ano} meses`} />}
                    {preview.indemnizacion_aviso_previo > 0 && <Row label="Indemnización aviso previo" value={preview.indemnizacion_aviso_previo} />}
                    {preview.indemnizacion_anos_servicio > 0 && (
                      <Row label="Indemnización años servicio" value={preview.indemnizacion_anos_servicio}
                        detail={`${preview.meses_indemnizacion} mes(es)${preview.tope_11_anos_aplicado ? ' · tope 11 años' : ''}`} />
                    )}
                    <div className="flex justify-between border-t border-zinc-300 pt-2 mt-2 font-bold text-sm">
                      <span>TOTAL FINIQUITO</span>
                      <span>{fmt(preview.total_finiquito)}</span>
                    </div>
                  </div>
                )}

                {err && (
                  <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700">{err}</div>
                )}

                <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 flex items-start gap-2 text-xs text-amber-800">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <p>El finiquito debe ratificarse ante Notario, Inspector del Trabajo o equivalente (Art. 177 CT) para tener mérito ejecutivo. Confirmar TERMINA el contrato.</p>
                </div>
              </>
            )}
          </div>

          {!done && preview && (
            <div className="px-5 py-4 border-t border-zinc-200 flex justify-end gap-2">
              <button onClick={onClose} className="text-sm px-4 py-2 rounded-lg border border-zinc-300 text-zinc-600 hover:bg-zinc-50">
                Cancelar
              </button>
              <button onClick={confirmar} disabled={busy}
                className="text-sm px-5 py-2 rounded-lg bg-[#1a2e6e] text-white font-medium hover:bg-[#142358] disabled:opacity-50">
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirmar y terminar contrato'}
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function Row({ label, value, detail }: { label: string; value: number; detail?: string }) {
  return (
    <div className="flex justify-between items-baseline">
      <span className="text-zinc-700">{label}{detail && <span className="text-[10px] text-zinc-400 ml-1">· {detail}</span>}</span>
      <span className="font-medium text-zinc-900">{fmt(value)}</span>
    </div>
  );
}
