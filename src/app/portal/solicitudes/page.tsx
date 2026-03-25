'use client';

import { useState, useEffect, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth/context';
import {
  Plus,
  Stethoscope,
  Umbrella,
  Building,
  Clock,
  FileText,
  X,
  CheckCircle2,
  XCircle,
  Hourglass,
} from 'lucide-react';


type Solicitud = {
  id: string;
  trabajador_id: string;
  tipo: string;
  descripcion: string;
  fecha_inicio: string;
  fecha_fin: string | null;
  dias: number;
  estado: 'pendiente' | 'aprobada' | 'rechazada';
  fecha_respuesta: string | null;
  created_at: string;
};

const TIPO_OPTIONS = [
  { value: 'medico', label: 'Permiso Médico' },
  { value: 'vacaciones', label: 'Vacaciones' },
  { value: 'administrativo', label: 'Día Administrativo' },
  { value: 'sin_goce', label: 'Permiso Sin Goce' },
  { value: 'otro', label: 'Otro' },
];

const TIPO_ICONS: Record<string, React.ElementType> = {
  medico: Stethoscope,
  vacaciones: Umbrella,
  administrativo: Building,
  sin_goce: Clock,
  otro: FileText,
};

const TIPO_LABELS: Record<string, string> = {
  medico: 'Permiso Médico',
  vacaciones: 'Vacaciones',
  administrativo: 'Día Administrativo',
  sin_goce: 'Permiso Sin Goce',
  otro: 'Otro',
};

const FILTER_TABS = ['Todas', 'Pendientes', 'Aprobadas', 'Rechazadas'] as const;
type FilterTab = (typeof FILTER_TABS)[number];

function StatusBadge({ estado }: { estado: string }) {
  const config: Record<string, { bg: string; text: string; icon: React.ElementType; label: string }> = {
    pendiente: { bg: 'bg-amber-50 border-amber-200', text: 'text-amber-700', icon: Hourglass, label: 'Pendiente' },
    aprobada: { bg: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-700', icon: CheckCircle2, label: 'Aprobada' },
    rechazada: { bg: 'bg-red-50 border-red-200', text: 'text-red-700', icon: XCircle, label: 'Rechazada' },
  };
  const c = config[estado] || config.pendiente;
  const Icon = c.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border ${c.bg} ${c.text}`}>
      <Icon className="h-3 w-3" />
      {c.label}
    </span>
  );
}

function calcBusinessDays(start: string, end: string): number {
  const s = new Date(start + 'T00:00:00');
  const e = new Date(end + 'T00:00:00');
  if (e < s) return 0;
  let count = 0;
  const cur = new Date(s);
  while (cur <= e) {
    const day = cur.getDay();
    if (day !== 0 && day !== 6) count++;
    cur.setDate(cur.getDate() + 1);
  }
  return count || 1;
}

export default function SolicitudesPage() {
  const { profile } = useAuth();
  const trabajadorId = profile?.trabajador_id || '';
  const [empleadorId, setEmpleadorId] = useState('');
  const [solicitudes, setSolicitudes] = useState<Solicitud[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterTab>('Todas');
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [confirmation, setConfirmation] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form state
  const [tipo, setTipo] = useState('medico');
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [dias, setDias] = useState(1);
  const [descripcion, setDescripcion] = useState('');

  const supabase = useMemo(() => createClient(), []);

  // Derive empleadorId from active contract
  useEffect(() => {
    if (!trabajadorId) return;
    supabase.from('contratos').select('empleador_id').eq('trabajador_id', trabajadorId).eq('estado', 'activo').limit(1).single()
      .then(({ data }) => { if (data) setEmpleadorId(data.empleador_id); });
  }, [trabajadorId, supabase]);

  useEffect(() => {
    if (trabajadorId) loadSolicitudes();
  }, [trabajadorId]);

  useEffect(() => {
    if (fechaInicio && fechaFin) {
      setDias(calcBusinessDays(fechaInicio, fechaFin));
    } else if (fechaInicio && !fechaFin) {
      setDias(1);
    }
  }, [fechaInicio, fechaFin]);

  async function loadSolicitudes() {
    setLoading(true);
    const { data, error } = await supabase
      .from('solicitudes_empleado')
      .select('*')
      .eq('trabajador_id', trabajadorId)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setSolicitudes(data as Solicitud[]);
    }
    setLoading(false);
  }

  const filtered = solicitudes.filter((s) => {
    if (filter === 'Pendientes') return s.estado === 'pendiente';
    if (filter === 'Aprobadas') return s.estado === 'aprobada';
    if (filter === 'Rechazadas') return s.estado === 'rechazada';
    return true;
  });

  function resetForm() {
    setTipo('medico');
    setFechaInicio('');
    setFechaFin('');
    setDias(1);
    setDescripcion('');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg(null);

    const { error } = await supabase.from('solicitudes_empleado').insert({
      trabajador_id: trabajadorId,
      empleador_id: empleadorId,
      tipo,
      descripcion,
      fecha_inicio: fechaInicio,
      fecha_fin: fechaFin || fechaInicio,
      dias,
      estado: 'pendiente',
    });

    setSubmitting(false);

    if (!error) {
      setShowModal(false);
      setConfirmation(true);
      resetForm();
      loadSolicitudes();
      setTimeout(() => setConfirmation(false), 4000);
    } else {
      setErrorMsg(error.message || 'Error al enviar la solicitud. Intenta nuevamente.');
      setTimeout(() => setErrorMsg(null), 5000);
    }
  }

  function openModal(presetTipo?: string) {
    resetForm();
    if (presetTipo) setTipo(presetTipo);
    setShowModal(true);
  }

  function formatDate(d: string) {
    return new Date(d + 'T00:00:00').toLocaleDateString('es-CL', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-zinc-900">Mis Solicitudes</h1>
        <button
          onClick={() => openModal()}
          className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white text-sm font-semibold rounded-lg hover:bg-emerald-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Nueva Solicitud
        </button>
      </div>

      {/* Confirmation */}
      {confirmation && (
        <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-700 font-medium animate-in fade-in duration-300">
          <CheckCircle2 className="h-5 w-5 shrink-0" />
          Solicitud enviada exitosamente. Tu empleador será notificado.
        </div>
      )}

      {/* Error */}
      {errorMsg && (
        <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700 font-medium animate-in fade-in duration-300">
          <XCircle className="h-5 w-5 shrink-0" />
          {errorMsg}
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex gap-1 bg-zinc-100 rounded-lg p-1">
        {FILTER_TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={`flex-1 text-sm font-medium rounded-md px-3 py-2 transition-colors ${
              filter === tab ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Request Cards */}
      {loading ? (
        <div className="text-sm text-zinc-400 py-8 text-center">Cargando solicitudes...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-zinc-400">
          <FileText className="h-10 w-10 mx-auto mb-3 text-zinc-300" />
          <p className="text-sm font-medium">No hay solicitudes {filter !== 'Todas' ? filter.toLowerCase() : ''}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((sol) => {
            const Icon = TIPO_ICONS[sol.tipo] || FileText;
            return (
              <div
                key={sol.id}
                className="bg-white rounded-xl border border-zinc-200 p-5 hover:border-zinc-300 transition-colors"
              >
                <div className="flex items-start gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-100 shrink-0">
                    <Icon className="h-5 w-5 text-zinc-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-3 mb-1">
                      <h3 className="text-sm font-semibold text-zinc-900">
                        {TIPO_LABELS[sol.tipo] || sol.tipo}
                      </h3>
                      <StatusBadge estado={sol.estado} />
                    </div>
                    {sol.descripcion && (
                      <p className="text-sm text-zinc-500 mb-2">{sol.descripcion}</p>
                    )}
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-400">
                      <span>
                        {formatDate(sol.fecha_inicio)}
                        {sol.fecha_fin && sol.fecha_fin !== sol.fecha_inicio && ` — ${formatDate(sol.fecha_fin)}`}
                      </span>
                      <span>{sol.dias} {sol.dias === 1 ? 'día' : 'días'}</span>
                    </div>
                    {sol.estado === 'aprobada' && sol.fecha_respuesta && (
                      <p className="text-xs text-emerald-600 mt-2 font-medium">
                        Aprobada el {formatDate(sol.fecha_respuesta)}
                      </p>
                    )}
                    {sol.estado === 'rechazada' && sol.fecha_respuesta && (
                      <p className="text-xs text-red-600 mt-2 font-medium">
                        Rechazada el {formatDate(sol.fecha_respuesta)}
                      </p>
                    )}
                    {sol.estado === 'pendiente' && (
                      <p className="text-xs text-amber-600 mt-2 font-medium">En espera de aprobación</p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Nueva Solicitud Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200">
              <h2 className="text-lg font-bold text-zinc-900">Nueva Solicitud</h2>
              <button
                onClick={() => setShowModal(false)}
                className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* Tipo */}
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">Tipo</label>
                <select
                  value={tipo}
                  onChange={(e) => setTipo(e.target.value)}
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
                >
                  {TIPO_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Fecha Inicio */}
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">Fecha Inicio</label>
                <input
                  type="date"
                  required
                  value={fechaInicio}
                  onChange={(e) => setFechaInicio(e.target.value)}
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
                />
              </div>

              {/* Fecha Fin */}
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">
                  Fecha Fin <span className="text-zinc-400 font-normal">(opcional para 1 día)</span>
                </label>
                <input
                  type="date"
                  value={fechaFin}
                  onChange={(e) => setFechaFin(e.target.value)}
                  min={fechaInicio}
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
                />
              </div>

              {/* Días */}
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">Días</label>
                <input
                  type="number"
                  min={1}
                  value={dias}
                  onChange={(e) => setDias(Number(e.target.value))}
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
                />
              </div>

              {/* Descripción */}
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">Descripción</label>
                <textarea
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  rows={3}
                  placeholder="Describe el motivo de tu solicitud..."
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={submitting || !fechaInicio}
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
