'use client';

import { useState } from 'react';
import { X, Loader2, CheckCircle2 } from 'lucide-react';

interface Props {
  reciboId: string;
  workerName: string;
  netPay: number;
  period: string;
  onClose: () => void;
  onMarcado: () => void;
}

const MEDIOS = [
  { value: 'transferencia', label: 'Transferencia bancaria' },
  { value: 'efectivo',      label: 'Efectivo' },
  { value: 'cheque',        label: 'Cheque' },
  { value: 'otro',          label: 'Otro' },
];

export default function MarcarPagadoModal({ reciboId, workerName, netPay, period, onClose, onMarcado }: Props) {
  const today = new Date().toISOString().slice(0, 10);
  const [medio, setMedio] = useState('transferencia');
  const [referencia, setReferencia] = useState('');
  const [pagadoAt, setPagadoAt] = useState(today);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function save() {
    setSaving(true); setErr(null);
    try {
      const r = await fetch(`/api/payroll/recibos/${reciboId}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          medio_pago: medio,
          referencia_pago: referencia || null,
          pagado_at: pagadoAt,
        }),
      });
      const d = await r.json();
      if (d.ok) { onMarcado(); onClose(); }
      else setErr(d.error ?? 'Error al marcar pagado');
    } catch (e: any) { setErr(e?.message ?? 'Error de red'); }
    finally { setSaving(false); }
  }

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/40" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md pointer-events-auto">
          <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-200">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-zinc-500" />
              <h2 className="text-sm font-semibold text-zinc-800">Registrar pago — {workerName}</h2>
            </div>
            <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600"><X className="w-4 h-4" /></button>
          </div>

          <div className="px-5 py-4 space-y-3">
            <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-xs">
              Período: <strong>{period}</strong> · Líquido: <strong>${netPay.toLocaleString('es-CL')}</strong>
            </div>
            <div>
              <label className="text-xs font-semibold text-zinc-700 block mb-1">Medio de pago *</label>
              <select value={medio} onChange={e => setMedio(e.target.value)}
                className="w-full text-sm rounded-lg border border-zinc-300 px-3 py-2">
                {MEDIOS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-zinc-700 block mb-1">
                Referencia {medio === 'transferencia' ? '(N° transferencia)' : medio === 'cheque' ? '(N° cheque)' : '(opcional)'}
              </label>
              <input type="text" value={referencia} onChange={e => setReferencia(e.target.value)}
                placeholder={medio === 'transferencia' ? 'Ej: BSCH-2026-04-001' : ''}
                className="w-full text-sm rounded-lg border border-zinc-300 px-3 py-2" />
            </div>
            <div>
              <label className="text-xs font-semibold text-zinc-700 block mb-1">Fecha de pago *</label>
              <input type="date" value={pagadoAt} onChange={e => setPagadoAt(e.target.value)}
                className="w-full text-sm rounded-lg border border-zinc-300 px-3 py-2" />
            </div>
            {err && <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700">{err}</div>}
          </div>

          <div className="px-5 py-4 border-t border-zinc-200 flex justify-end gap-2">
            <button onClick={onClose} className="text-sm px-4 py-2 rounded-lg border border-zinc-300 text-zinc-600 hover:bg-zinc-50">
              Cancelar
            </button>
            <button onClick={save} disabled={saving}
              className="text-sm px-4 py-2 rounded-lg bg-emerald-600 text-white font-medium hover:bg-emerald-700 disabled:opacity-50">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Registrar pago'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
