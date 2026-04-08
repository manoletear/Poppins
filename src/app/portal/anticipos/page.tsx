'use client';

import { useState, useEffect, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth/context';
import {
  Plus,
  CreditCard,
  X,
  CheckCircle2,
  Hourglass,
  XCircle,
  ArrowDownCircle,
  FileCheck,
  ExternalLink,
  DollarSign,
  TrendingUp,
  Clock,
} from 'lucide-react';

type Anticipo = {
  id: string;
  trabajador_id: string;
  empleador_id: string;
  periodo: string;
  monto: number;
  motivo: string | null;
  fecha_solicitud: string;
  estado: 'pendiente' | 'aprobado' | 'rechazado' | 'transferido' | 'comprobante_ok' | 'procesado';
  fecha_aprobacion: string | null;
  motivo_rechazo: string | null;
  fecha_transferencia: string | null;
  comprobante_url: string | null;
  comprobante_nombre: string | null;
  created_at: string;
};

const ESTADO_CONFIG: Record<string, { bg: string; text: string; icon: React.ElementType; label: string }> = {
  pendiente: { bg: 'bg-amber-50 border-amber-200', text: 'text-amber-700', icon: Hourglass, label: 'Pendiente' },
  aprobado: { bg: 'bg-blue-50 border-blue-200', text: 'text-blue-700', icon: CheckCircle2, label: 'Aprobado' },
  rechazado: { bg: 'bg-red-50 border-red-200', text: 'text-red-700', icon: XCircle, label: 'Rechazado' },
  transferido: { bg: 'bg-violet-50 border-violet-200', text: 'text-violet-700', icon: ArrowDownCircle, label: 'Transferido' },
  comprobante_ok: { bg: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-700', icon: FileCheck, label: 'Comprobante OK' },
  procesado: { bg: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-700', icon: FileCheck, label: 'En Liquidación' },
};

function StatusBadge({ estado, motivoRechazo }: { estado: string; motivoRechazo?: string | null }) {
  const c = ESTADO_CONFIG[estado] || ESTADO_CONFIG.pendiente;
  const Icon = c.icon;
  return (
    <div className="flex flex-col gap-1">
      <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border ${c.bg} ${c.text}`}>
        <Icon className="h-3 w-3" />
        {c.label}
      </span>
      {estado === 'rechazado' && motivoRechazo && (
        <span className="text-xs text-red-500 italic">{motivoRechazo}</span>
      )}
    </div>
  );
}

function formatCLP(amount: number): string {
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(amount);
}

function formatDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('es-CL', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function getCurrentPeriodo(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export default function AnticiposPage() {
  const { profile } = useAuth();
  const trabajadorId = profile?.trabajador_id || '';
  const [anticipos, setAnticipos] = useState<Anticipo[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [confirmation, setConfirmation] = useState(false);
  const [empleadorId, setEmpleadorId] = useState('');

  // Form state
  const [monto, setMonto] = useState('');
  const [motivo, setMotivo] = useState('');

  const supabase = useMemo(() => createClient(), []);

  // Derive empleadorId from active contract
  useEffect(() => {
    if (!trabajadorId) return;
    supabase.from('contratos').select('empleador_id').eq('trabajador_id', trabajadorId).eq('estado', 'activo').limit(1).maybeSingle()
      .then(({ data }: any) => { if (data) setEmpleadorId(data.empleador_id); }).catch(() => {});
  }, [trabajadorId, supabase]);

  useEffect(() => {
    if (trabajadorId) loadAnticipos();
  }, [trabajadorId]);

  async function loadAnticipos() {
    setLoading(true);
    const { data, error } = await supabase
      .from('anticipos')
      .select('*')
      .eq('trabajador_id', trabajadorId)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setAnticipos(data as Anticipo[]);
    }
    setLoading(false);
  }

  // Stats
  const currentYear = new Date().getFullYear();
  const anticiposYear = anticipos.filter((a) => a.fecha_solicitud?.startsWith(String(currentYear)) || a.created_at?.startsWith(String(currentYear)));
  const totalYear = anticiposYear.length;
  const montoAprobado = anticiposYear
    .filter((a) => ['aprobado', 'transferido', 'comprobante_ok', 'procesado'].includes(a.estado))
    .reduce((sum, a) => sum + a.monto, 0);
  const pendientesCount = anticipos.filter((a) => a.estado === 'pendiente').length;

  function resetForm() {
    setMonto('');
    setMotivo('');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!empleadorId) { alert('Cargando datos, intenta en un momento'); return; }
    const montoNum = parseInt(monto.replace(/\D/g, ''), 10);
    if (!montoNum || montoNum <= 0) { alert('Ingresa un monto válido'); return; }
    setSubmitting(true);

    const { error } = await supabase.from('anticipos').insert({
      trabajador_id: trabajadorId,
      empleador_id: empleadorId,
      periodo: getCurrentPeriodo(),
      monto: montoNum,
      motivo: motivo || null,
      fecha_solicitud: new Date().toISOString().split('T')[0],
      estado: 'pendiente',
    });

    setSubmitting(false);

    if (!error) {
      setShowModal(false);
      setConfirmation(true);
      resetForm();
      loadAnticipos();
      setTimeout(() => setConfirmation(false), 4000);
    } else {
      alert('Error al enviar la solicitud');
    }
  }

  // Format monto input with thousand separators
  function handleMontoChange(value: string) {
    const raw = value.replace(/\D/g, '');
    if (!raw) { setMonto(''); return; }
    const num = parseInt(raw, 10);
    setMonto(new Intl.NumberFormat('es-CL').format(num));
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-zinc-900">Anticipos de Sueldo</h1>
          <p className="text-sm text-zinc-500 mt-0.5">Solicita y revisa el estado de tus anticipos</p>
        </div>
        <button
          onClick={() => { resetForm(); setShowModal(true); }}
          className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white text-sm font-semibold rounded-lg hover:bg-emerald-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Solicitar Anticipo
        </button>
      </div>

      {/* Confirmation */}
      {confirmation && (
        <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-700 font-medium">
          <CheckCircle2 className="h-5 w-5 shrink-0" />
          Solicitud de anticipo enviada exitosamente. Tu empleador será notificado.
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-zinc-200 p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100">
              <TrendingUp className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-zinc-900">{totalYear}</p>
              <p className="text-xs text-zinc-500">Anticipos del año</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-zinc-200 p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100">
              <DollarSign className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-zinc-900">{formatCLP(montoAprobado)}</p>
              <p className="text-xs text-zinc-500">Monto aprobado</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-zinc-200 p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100">
              <Clock className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-zinc-900">{pendientesCount}</p>
              <p className="text-xs text-zinc-500">Pendientes</p>
            </div>
          </div>
        </div>
      </div>

      {/* Anticipos List */}
      <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-zinc-100">
          <h2 className="text-sm font-semibold text-zinc-900">Historial de Anticipos</h2>
        </div>
        {loading ? (
          <div className="p-6 text-sm text-zinc-400">Cargando...</div>
        ) : anticipos.length === 0 ? (
          <div className="p-6 text-sm text-zinc-400 text-center">
            <CreditCard className="h-8 w-8 mx-auto mb-2 text-zinc-300" />
            No tienes anticipos registrados
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-zinc-50 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wide">
                  <th className="px-6 py-3">Fecha</th>
                  <th className="px-4 py-3">Monto</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3">Motivo</th>
                  <th className="px-4 py-3">Comprobante</th>
                </tr>
              </thead>
              <tbody>
                {anticipos.map((a) => (
                  <tr key={a.id} className="border-b border-zinc-50 last:border-0 hover:bg-zinc-50/50 transition-colors">
                    <td className="px-6 py-3 text-zinc-700">
                      {formatDate(a.fecha_solicitud || a.created_at.split('T')[0])}
                    </td>
                    <td className="px-4 py-3 font-semibold text-zinc-900">{formatCLP(a.monto)}</td>
                    <td className="px-4 py-3">
                      <StatusBadge estado={a.estado} motivoRechazo={a.motivo_rechazo} />
                    </td>
                    <td className="px-4 py-3 text-zinc-500 max-w-[200px] truncate">{a.motivo || '—'}</td>
                    <td className="px-4 py-3">
                      {a.comprobante_url ? (
                        <a
                          href={a.comprobante_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600 hover:text-emerald-700 transition-colors"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                          Ver Comprobante
                        </a>
                      ) : (
                        <span className="text-zinc-300">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Solicitar Anticipo Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200">
              <h2 className="text-lg font-bold text-zinc-900">Solicitar Anticipo</h2>
              <button
                onClick={() => setShowModal(false)}
                className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* Monto */}
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">Monto (CLP)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 text-sm">$</span>
                  <input
                    type="text"
                    required
                    value={monto}
                    onChange={(e) => handleMontoChange(e.target.value)}
                    placeholder="100.000"
                    className="w-full rounded-lg border border-zinc-300 pl-7 pr-3 py-2 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
                  />
                </div>
              </div>

              {/* Motivo */}
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">
                  Motivo <span className="text-zinc-400 font-normal">(opcional)</span>
                </label>
                <textarea
                  value={motivo}
                  onChange={(e) => setMotivo(e.target.value)}
                  rows={3}
                  placeholder="Describe el motivo del anticipo..."
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none resize-none"
                />
              </div>

              {/* Info */}
              <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-700">
                El anticipo será descontado de tu próxima liquidación de sueldo.
              </div>

              <button
                type="submit"
                disabled={submitting || !monto}
                className="w-full py-2.5 bg-emerald-600 text-white text-sm font-semibold rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {submitting ? 'Enviando...' : 'Enviar Solicitud'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
