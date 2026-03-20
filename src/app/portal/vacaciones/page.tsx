'use client';

import { useState, useEffect, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  Plus,
  Umbrella,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  X,
  CheckCircle2,
  Hourglass,
  XCircle,
} from 'lucide-react';

const WORKER_ID = 'c711d829-4a6d-4496-a93b-221b81eb1258';

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

function getDaysInRange(start: string, end: string): Set<string> {
  const days = new Set<string>();
  const s = new Date(start + 'T00:00:00');
  const e = new Date(end + 'T00:00:00');
  const cur = new Date(s);
  while (cur <= e) {
    days.add(cur.toISOString().split('T')[0]);
    cur.setDate(cur.getDate() + 1);
  }
  return days;
}

export default function VacacionesPage() {
  const [vacaciones, setVacaciones] = useState<Solicitud[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [confirmation, setConfirmation] = useState(false);
  const [calMonth, setCalMonth] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });

  // Form state
  const [tipo, setTipo] = useState('vacaciones');
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [dias, setDias] = useState(1);
  const [descripcion, setDescripcion] = useState('');

  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    loadVacaciones();
  }, []);

  useEffect(() => {
    if (fechaInicio && fechaFin) {
      setDias(calcBusinessDays(fechaInicio, fechaFin));
    } else if (fechaInicio && !fechaFin) {
      setDias(1);
    }
  }, [fechaInicio, fechaFin]);

  async function loadVacaciones() {
    setLoading(true);
    const { data, error } = await supabase
      .from('solicitudes_empleado')
      .select('*')
      .eq('trabajador_id', WORKER_ID)
      .in('tipo', ['vacaciones'])
      .order('created_at', { ascending: false });

    if (!error && data) {
      setVacaciones(data as Solicitud[]);
    }
    setLoading(false);
  }

  // Vacation balance
  const DIAS_LEGALES = 15;
  const diasUsados = vacaciones
    .filter((v) => v.estado === 'aprobada')
    .reduce((sum, v) => sum + v.dias, 0);
  const diasDisponibles = Math.max(DIAS_LEGALES - diasUsados, 0);

  // Next approved vacation
  const today = new Date().toISOString().split('T')[0];
  const proximaVacacion = vacaciones
    .filter((v) => v.estado === 'aprobada' && v.fecha_inicio >= today)
    .sort((a, b) => a.fecha_inicio.localeCompare(b.fecha_inicio))[0];

  // Calendar data
  const approvedDays = useMemo(() => {
    const set = new Set<string>();
    vacaciones
      .filter((v) => v.estado === 'aprobada')
      .forEach((v) => getDaysInRange(v.fecha_inicio, v.fecha_fin || v.fecha_inicio).forEach((d) => set.add(d)));
    return set;
  }, [vacaciones]);

  const pendingDays = useMemo(() => {
    const set = new Set<string>();
    vacaciones
      .filter((v) => v.estado === 'pendiente')
      .forEach((v) => getDaysInRange(v.fecha_inicio, v.fecha_fin || v.fecha_inicio).forEach((d) => set.add(d)));
    return set;
  }, [vacaciones]);

  // Calendar grid
  const calendarDays = useMemo(() => {
    const { year, month } = calMonth;
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startPad = (firstDay.getDay() + 6) % 7; // Monday start
    const days: Array<{ date: string; day: number; inMonth: boolean }> = [];

    for (let i = startPad - 1; i >= 0; i--) {
      const d = new Date(year, month, -i);
      days.push({ date: d.toISOString().split('T')[0], day: d.getDate(), inMonth: false });
    }
    for (let d = 1; d <= lastDay.getDate(); d++) {
      const dt = new Date(year, month, d);
      days.push({ date: dt.toISOString().split('T')[0], day: d, inMonth: true });
    }
    const remaining = 7 - (days.length % 7);
    if (remaining < 7) {
      for (let d = 1; d <= remaining; d++) {
        const dt = new Date(year, month + 1, d);
        days.push({ date: dt.toISOString().split('T')[0], day: d, inMonth: false });
      }
    }
    return days;
  }, [calMonth]);

  const monthLabel = new Date(calMonth.year, calMonth.month).toLocaleDateString('es-CL', {
    month: 'long',
    year: 'numeric',
  });

  function prevMonth() {
    setCalMonth((p) => {
      const m = p.month - 1;
      return m < 0 ? { year: p.year - 1, month: 11 } : { year: p.year, month: m };
    });
  }
  function nextMonth() {
    setCalMonth((p) => {
      const m = p.month + 1;
      return m > 11 ? { year: p.year + 1, month: 0 } : { year: p.year, month: m };
    });
  }

  function resetForm() {
    setTipo('vacaciones');
    setFechaInicio('');
    setFechaFin('');
    setDias(1);
    setDescripcion('');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);

    const { error } = await supabase.from('solicitudes_empleado').insert({
      trabajador_id: WORKER_ID,
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
      loadVacaciones();
      setTimeout(() => setConfirmation(false), 4000);
    }
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
        <h1 className="text-xl font-bold text-zinc-900">Mis Vacaciones</h1>
        <button
          onClick={() => { resetForm(); setShowModal(true); }}
          className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white text-sm font-semibold rounded-lg hover:bg-emerald-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Solicitar Vacaciones
        </button>
      </div>

      {/* Confirmation */}
      {confirmation && (
        <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-700 font-medium">
          <CheckCircle2 className="h-5 w-5 shrink-0" />
          Solicitud enviada exitosamente. Tu empleador será notificado.
        </div>
      )}

      {/* Balance Card */}
      <div className="bg-white rounded-2xl border border-zinc-200 p-6 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100 shrink-0">
            <Umbrella className="h-6 w-6 text-emerald-600" />
          </div>
          <div className="flex-1">
            <p className="text-3xl font-bold text-emerald-600">{diasDisponibles} días disponibles</p>
            <p className="text-sm text-zinc-500 mt-1">{DIAS_LEGALES} días legales por año</p>

            {/* Progress Bar */}
            <div className="mt-4">
              <div className="flex justify-between text-xs text-zinc-400 mb-1.5">
                <span>{diasUsados} usados</span>
                <span>{DIAS_LEGALES} totales</span>
              </div>
              <div className="h-3 bg-zinc-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min((diasUsados / DIAS_LEGALES) * 100, 100)}%` }}
                />
              </div>
            </div>

            {proximaVacacion && (
              <div className="mt-4 flex items-center gap-2 text-sm text-zinc-600">
                <CalendarDays className="h-4 w-4 text-emerald-500" />
                <span>
                  Próximas vacaciones: {formatDate(proximaVacacion.fecha_inicio)}
                  {proximaVacacion.fecha_fin && proximaVacacion.fecha_fin !== proximaVacacion.fecha_inicio
                    ? ` — ${formatDate(proximaVacacion.fecha_fin)}`
                    : ''}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Calendar View */}
      <div className="bg-white rounded-2xl border border-zinc-200 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-zinc-900 capitalize">{monthLabel}</h2>
          <div className="flex gap-1">
            <button onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-zinc-100 transition-colors">
              <ChevronLeft className="h-4 w-4 text-zinc-500" />
            </button>
            <button onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-zinc-100 transition-colors">
              <ChevronRight className="h-4 w-4 text-zinc-500" />
            </button>
          </div>
        </div>

        {/* Legend */}
        <div className="flex gap-4 mb-3 text-xs text-zinc-500">
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> Aprobadas</span>
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-amber-400" /> Pendientes</span>
        </div>

        <div className="grid grid-cols-7 text-center text-xs font-medium text-zinc-400 mb-1">
          {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map((d) => (
            <div key={d} className="py-1">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 text-center text-sm">
          {calendarDays.map((d, i) => {
            const isApproved = approvedDays.has(d.date);
            const isPending = pendingDays.has(d.date);
            const isToday = d.date === today;
            return (
              <div
                key={i}
                className={`py-1.5 rounded-lg ${
                  !d.inMonth
                    ? 'text-zinc-300'
                    : isApproved
                      ? 'bg-emerald-100 text-emerald-700 font-semibold'
                      : isPending
                        ? 'bg-amber-50 text-amber-700 font-semibold'
                        : isToday
                          ? 'bg-zinc-900 text-white font-semibold'
                          : 'text-zinc-700'
                }`}
              >
                {d.day}
              </div>
            );
          })}
        </div>
      </div>

      {/* History Table */}
      <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-zinc-100">
          <h2 className="text-sm font-semibold text-zinc-900">Historial de Vacaciones</h2>
        </div>
        {loading ? (
          <div className="p-6 text-sm text-zinc-400">Cargando...</div>
        ) : vacaciones.length === 0 ? (
          <div className="p-6 text-sm text-zinc-400 text-center">Sin registros de vacaciones</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-zinc-50 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wide">
                  <th className="px-6 py-3">Período</th>
                  <th className="px-4 py-3">Días</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3">Fecha Solicitud</th>
                  <th className="px-4 py-3">Fecha Respuesta</th>
                </tr>
              </thead>
              <tbody>
                {vacaciones.map((v) => (
                  <tr key={v.id} className="border-b border-zinc-50 last:border-0 hover:bg-zinc-50/50 transition-colors">
                    <td className="px-6 py-3 text-zinc-700">
                      {formatDate(v.fecha_inicio)}
                      {v.fecha_fin && v.fecha_fin !== v.fecha_inicio ? ` — ${formatDate(v.fecha_fin)}` : ''}
                    </td>
                    <td className="px-4 py-3 text-zinc-600">{v.dias}</td>
                    <td className="px-4 py-3"><StatusBadge estado={v.estado} /></td>
                    <td className="px-4 py-3 text-zinc-500">{formatDate(v.created_at.split('T')[0])}</td>
                    <td className="px-4 py-3 text-zinc-500">
                      {v.fecha_respuesta ? formatDate(v.fecha_respuesta) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Solicitar Vacaciones Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200">
              <h2 className="text-lg font-bold text-zinc-900">Solicitar Vacaciones</h2>
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
                  placeholder="Motivo de las vacaciones..."
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none resize-none"
                />
              </div>

              {/* Balance info */}
              <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-700">
                Tienes <strong>{diasDisponibles} días</strong> disponibles de {DIAS_LEGALES} legales.
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
