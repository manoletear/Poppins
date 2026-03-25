'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth/context';
import {
  Clock,
  CheckCircle2,
  UtensilsCrossed,
  LogOut,
  Loader2,
  Info,
} from 'lucide-react';


interface Marcaje {
  id: string;
  trabajador_id: string;
  empleador_id: string;
  fecha: string;
  hora_entrada: string | null;
  hora_salida_colacion: string | null;
  hora_regreso_colacion: string | null;
  hora_salida: string | null;
  horas_trabajadas: number | null;
  tipo: string | null;
  notas: string | null;
  contrato_id: string | null;
  created_at: string;
}

type Step = 1 | 2 | 3 | 4 | 5; // 5 = completed

function toDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getWeekDates(refDate: Date): Date[] {
  const day = refDate.getDay();
  const monday = new Date(refDate);
  monday.setDate(refDate.getDate() - ((day + 6) % 7));
  const dates: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    dates.push(d);
  }
  return dates;
}

const DAY_NAMES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

function diffHours(t1: string, t2: string): number {
  return Math.max(0, (timeToMinutes(t2) - timeToMinutes(t1)) / 60);
}

function getCurrentTimeString(): string {
  const now = new Date();
  return now.toLocaleTimeString('es-CL', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function getCurrentHHMMSS(): string {
  const now = new Date();
  const h = String(now.getHours()).padStart(2, '0');
  const m = String(now.getMinutes()).padStart(2, '0');
  const s = String(now.getSeconds()).padStart(2, '0');
  return `${h}:${m}:${s}`;
}

function formatTime(time: string | null): string {
  if (!time) return '-';
  return time.slice(0, 5);
}

function determineStep(marcaje: Marcaje | null): Step {
  if (!marcaje) return 1;
  if (!marcaje.hora_entrada) return 1;
  if (!marcaje.hora_salida_colacion) return 2;
  if (!marcaje.hora_regreso_colacion) return 3;
  if (!marcaje.hora_salida) return 4;
  return 5;
}

function calculateHoursWorked(marcaje: Marcaje): number {
  if (
    !marcaje.hora_entrada ||
    !marcaje.hora_salida_colacion ||
    !marcaje.hora_regreso_colacion ||
    !marcaje.hora_salida
  )
    return 0;

  const totalMinutes =
    timeToMinutes(marcaje.hora_salida) -
    timeToMinutes(marcaje.hora_entrada) -
    (timeToMinutes(marcaje.hora_regreso_colacion) -
      timeToMinutes(marcaje.hora_salida_colacion));

  return Math.max(0, totalMinutes / 60);
}

function calculateColacion(marcaje: Marcaje): number {
  if (!marcaje.hora_salida_colacion || !marcaje.hora_regreso_colacion) return 0;
  return diffHours(marcaje.hora_salida_colacion, marcaje.hora_regreso_colacion);
}

const STEPS_CONFIG = [
  {
    step: 1 as Step,
    label: 'Marcar Entrada',
    shortLabel: 'Entrada',
    icon: Clock,
    color: 'green',
    bgClass: 'bg-green-600 hover:bg-green-700',
    borderClass: 'border-green-400',
    ringClass: 'ring-green-400/50',
  },
  {
    step: 2 as Step,
    label: 'Salida Colación',
    shortLabel: 'Sal. Colación',
    icon: UtensilsCrossed,
    color: 'amber',
    bgClass: 'bg-amber-500 hover:bg-amber-600',
    borderClass: 'border-amber-400',
    ringClass: 'ring-amber-400/50',
  },
  {
    step: 3 as Step,
    label: 'Regreso Colación',
    shortLabel: 'Reg. Colación',
    icon: UtensilsCrossed,
    color: 'blue',
    bgClass: 'bg-blue-600 hover:bg-blue-700',
    borderClass: 'border-blue-400',
    ringClass: 'ring-blue-400/50',
  },
  {
    step: 4 as Step,
    label: 'Marcar Salida',
    shortLabel: 'Salida',
    icon: LogOut,
    color: 'red',
    bgClass: 'bg-red-600 hover:bg-red-700',
    borderClass: 'border-red-400',
    ringClass: 'ring-red-400/50',
  },
];

function getStepTime(marcaje: Marcaje | null, step: Step): string | null {
  if (!marcaje) return null;
  switch (step) {
    case 1:
      return marcaje.hora_entrada;
    case 2:
      return marcaje.hora_salida_colacion;
    case 3:
      return marcaje.hora_regreso_colacion;
    case 4:
      return marcaje.hora_salida;
    default:
      return null;
  }
}

export default function MarcajePage() {
  const { profile } = useAuth();
  const trabajadorId = profile?.trabajador_id || '';
  const [empleadorId, setEmpleadorId] = useState('');
  const supabaseRef = useRef(createClient());
  const supabase = supabaseRef.current;

  // Derive empleadorId from active contract
  useEffect(() => {
    if (!trabajadorId) return;
    supabase.from('contratos').select('empleador_id').eq('trabajador_id', trabajadorId).eq('estado', 'activo').limit(1).single()
      .then(({ data }) => { if (data) setEmpleadorId(data.empleador_id); });
  }, [trabajadorId, supabase]);

  const today = toDateString(new Date());
  const weekDates = getWeekDates(new Date());

  const [marcaje, setMarcaje] = useState<Marcaje | null>(null);
  const [weekMarcajes, setWeekMarcajes] = useState<Marcaje[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(getCurrentTimeString());

  const currentStep = determineStep(marcaje);

  const fetchTodayMarcaje = useCallback(async () => {
    const { data } = await supabase
      .from('marcajes_horario')
      .select('*')
      .eq('trabajador_id', trabajadorId)
      .eq('fecha', today)
      .single();
    setMarcaje(data as Marcaje | null);
  }, [supabase, trabajadorId, today]);

  const fetchWeekMarcajes = useCallback(async () => {
    const start = toDateString(weekDates[0]);
    const end = toDateString(weekDates[6]);
    const { data } = await supabase
      .from('marcajes_horario')
      .select('*')
      .eq('trabajador_id', trabajadorId)
      .gte('fecha', start)
      .lte('fecha', end)
      .order('fecha');
    if (data) setWeekMarcajes(data as Marcaje[]);
  }, [supabase, trabajadorId, weekDates]);

  useEffect(() => {
    if (!trabajadorId) return;
    Promise.all([fetchTodayMarcaje(), fetchWeekMarcajes()]).then(() =>
      setLoading(false)
    );
  }, [fetchTodayMarcaje, fetchWeekMarcajes, trabajadorId]);

  // Live clock
  useEffect(() => {
    const id = setInterval(() => setCurrentTime(getCurrentTimeString()), 1000);
    return () => clearInterval(id);
  }, []);

  const handleMarcaje = async (step: Step) => {
    setActionLoading(true);
    const hora = getCurrentHHMMSS();

    try {
      if (step === 1) {
        // Insert new row
        await supabase.from('marcajes_horario').insert({
          trabajador_id: trabajadorId,
          empleador_id: empleadorId,
          fecha: today,
          hora_entrada: hora,
        });
      } else if (step === 2 && marcaje) {
        await supabase
          .from('marcajes_horario')
          .update({ hora_salida_colacion: hora })
          .eq('id', marcaje.id);
      } else if (step === 3 && marcaje) {
        await supabase
          .from('marcajes_horario')
          .update({ hora_regreso_colacion: hora })
          .eq('id', marcaje.id);
      } else if (step === 4 && marcaje) {
        // Calculate hours worked
        const updatedMarcaje = {
          ...marcaje,
          hora_salida: hora,
        };
        const totalEntradaToSalida =
          timeToMinutes(hora) - timeToMinutes(marcaje.hora_entrada!);
        const colacionMinutes = marcaje.hora_regreso_colacion && marcaje.hora_salida_colacion
          ? timeToMinutes(marcaje.hora_regreso_colacion) -
            timeToMinutes(marcaje.hora_salida_colacion)
          : 0;
        const horasTrabajadas = Math.max(
          0,
          (totalEntradaToSalida - colacionMinutes) / 60
        );

        await supabase
          .from('marcajes_horario')
          .update({
            hora_salida: hora,
            horas_trabajadas: Math.round(horasTrabajadas * 100) / 100,
          })
          .eq('id', marcaje.id);
      }

      // Refresh state
      await Promise.all([fetchTodayMarcaje(), fetchWeekMarcajes()]);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-5">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Marcaje Horario</h1>
          <p className="text-sm text-gray-500 mt-1">
            Control de asistencia — Art. 33 Código del Trabajo
          </p>
        </div>

        {/* Live Clock */}
        <div className="text-center">
          <p className="text-xs text-gray-500">Hora actual</p>
          <p className="text-3xl font-bold text-gray-900 tabular-nums">
            {currentTime}
          </p>
        </div>

        {/* Stepper Timeline */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          {currentStep === 5 ? (
            /* Jornada Completada */
            <div className="space-y-5">
              <div className="text-center space-y-3">
                <CheckCircle2 className="w-14 h-14 text-green-500 mx-auto" />
                <h2 className="text-lg font-semibold text-green-700">
                  Jornada Completada
                </h2>
              </div>

              {/* Timeline of completed steps */}
              <div className="flex items-center justify-between gap-2">
                {STEPS_CONFIG.map((cfg, idx) => {
                  const time = getStepTime(marcaje, cfg.step);
                  return (
                    <div key={cfg.step} className="flex items-center flex-1">
                      <div className="flex flex-col items-center flex-1">
                        <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                          <CheckCircle2 className="w-5 h-5 text-green-600" />
                        </div>
                        <p className="text-[11px] font-medium text-gray-600 mt-1">
                          {cfg.shortLabel}
                        </p>
                        <p className="text-sm font-bold text-gray-900">
                          {formatTime(time)}
                        </p>
                      </div>
                      {idx < STEPS_CONFIG.length - 1 && (
                        <div className="w-8 h-0.5 bg-green-300 -mt-5" />
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Summary */}
              <div className="grid grid-cols-2 gap-4 pt-3 border-t border-gray-100">
                <div className="text-center">
                  <p className="text-xs text-gray-500">Total trabajado</p>
                  <p className="text-xl font-bold text-gray-900">
                    {marcaje?.horas_trabajadas != null
                      ? marcaje.horas_trabajadas.toFixed(1)
                      : calculateHoursWorked(marcaje!).toFixed(1)}{' '}
                    horas
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-gray-500">Colación</p>
                  <p className="text-xl font-bold text-gray-900">
                    {calculateColacion(marcaje!).toFixed(1)} hora
                  </p>
                </div>
              </div>
            </div>
          ) : (
            /* Active stepper */
            <div className="space-y-6">
              {/* Timeline steps */}
              <div className="flex items-start justify-between gap-2">
                {STEPS_CONFIG.map((cfg, idx) => {
                  const time = getStepTime(marcaje, cfg.step);
                  const isCompleted = cfg.step < currentStep;
                  const isCurrent = cfg.step === currentStep;
                  const isFuture = cfg.step > currentStep;
                  const Icon = cfg.icon;

                  return (
                    <div key={cfg.step} className="flex items-start flex-1">
                      <div className="flex flex-col items-center flex-1">
                        {/* Circle */}
                        <div
                          className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                            isCompleted
                              ? 'bg-green-100'
                              : isCurrent
                              ? `bg-white border-2 ${cfg.borderClass} ring-4 ${cfg.ringClass} animate-pulse`
                              : 'bg-gray-100'
                          }`}
                        >
                          {isCompleted ? (
                            <CheckCircle2 className="w-6 h-6 text-green-600" />
                          ) : (
                            <Icon
                              className={`w-5 h-5 ${
                                isCurrent ? 'text-gray-700' : 'text-gray-400'
                              }`}
                            />
                          )}
                        </div>
                        {/* Label */}
                        <p
                          className={`text-[11px] font-medium mt-1.5 text-center ${
                            isCompleted
                              ? 'text-green-700'
                              : isCurrent
                              ? 'text-gray-900 font-semibold'
                              : 'text-gray-400'
                          }`}
                        >
                          {cfg.shortLabel}
                        </p>
                        {/* Time */}
                        {isCompleted && time && (
                          <p className="text-xs font-bold text-green-700">
                            {formatTime(time)}
                          </p>
                        )}
                      </div>
                      {idx < STEPS_CONFIG.length - 1 && (
                        <div
                          className={`w-8 h-0.5 mt-5 ${
                            cfg.step < currentStep
                              ? 'bg-green-300'
                              : 'bg-gray-200'
                          }`}
                        />
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Current action button */}
              {(() => {
                const cfg = STEPS_CONFIG[currentStep - 1];
                const Icon = cfg.icon;
                return (
                  <button
                    onClick={() => handleMarcaje(currentStep)}
                    disabled={actionLoading}
                    className={`w-full h-16 rounded-xl ${cfg.bgClass} text-white text-lg font-semibold flex items-center justify-center gap-3 transition-all disabled:opacity-60 disabled:cursor-not-allowed`}
                  >
                    {actionLoading ? (
                      <Loader2 className="w-6 h-6 animate-spin" />
                    ) : (
                      <Icon className="w-6 h-6" />
                    )}
                    {actionLoading ? 'Registrando...' : cfg.label.toUpperCase()}
                  </button>
                );
              })()}
            </div>
          )}
        </div>

        {/* Legal Info Banner */}
        <div className="flex items-start gap-2 bg-blue-50 border border-blue-200 rounded-lg px-4 py-3">
          <Info className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-blue-700">
            <span className="font-semibold">Art. 33 Código del Trabajo:</span>{' '}
            El empleador debe mantener un registro de asistencia que consigne la
            hora de entrada, salida y colación.
          </p>
        </div>

        {/* Weekly History */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-800">
              Historial Semanal
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-xs text-gray-500">
                  <th className="px-3 py-2 text-left font-medium">Día</th>
                  <th className="px-3 py-2 text-left font-medium">Entrada</th>
                  <th className="px-3 py-2 text-left font-medium">
                    Sal. Colación
                  </th>
                  <th className="px-3 py-2 text-left font-medium">
                    Reg. Colación
                  </th>
                  <th className="px-3 py-2 text-left font-medium">Salida</th>
                  <th className="px-3 py-2 text-left font-medium">Horas</th>
                  <th className="px-3 py-2 text-left font-medium">Estado</th>
                </tr>
              </thead>
              <tbody>
                {weekDates.map((date) => {
                  const dateStr = toDateString(date);
                  const m = weekMarcajes.find(
                    (mk) => mk.fecha === dateStr
                  ) as Marcaje | undefined;
                  const dayIndex = date.getDay();
                  const isWeekend = dayIndex === 0 || dayIndex === 6;
                  const isToday = dateStr === today;

                  const step = determineStep(m ?? null);

                  let estado: string;
                  let estadoStyle: string;
                  let horas = '-';

                  if (step === 5) {
                    estado = 'Completado';
                    estadoStyle = 'bg-emerald-100 text-emerald-700';
                    horas =
                      m?.horas_trabajadas != null
                        ? m.horas_trabajadas.toFixed(1)
                        : '-';
                  } else if (step === 3) {
                    estado = 'En colación';
                    estadoStyle = 'bg-amber-100 text-amber-700';
                  } else if (step > 1) {
                    estado = 'En turno';
                    estadoStyle = 'bg-blue-100 text-blue-700';
                  } else if (isWeekend) {
                    estado = 'Día libre';
                    estadoStyle = 'bg-zinc-100 text-zinc-500';
                  } else {
                    estado = 'Sin marcar';
                    estadoStyle = 'bg-red-100 text-red-600';
                  }

                  return (
                    <tr
                      key={dateStr}
                      className={`border-b border-gray-50 last:border-0 ${
                        isToday ? 'bg-blue-50/50' : ''
                      }`}
                    >
                      <td className="px-3 py-2.5 font-medium text-gray-700">
                        <span>{DAY_NAMES[dayIndex]}</span>
                        <span className="text-gray-400 ml-1 text-xs">
                          {date.getDate()}/{date.getMonth() + 1}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-gray-700">
                        {formatTime(m?.hora_entrada ?? null)}
                      </td>
                      <td className="px-3 py-2.5 text-gray-700">
                        {formatTime(m?.hora_salida_colacion ?? null)}
                      </td>
                      <td className="px-3 py-2.5 text-gray-700">
                        {formatTime(m?.hora_regreso_colacion ?? null)}
                      </td>
                      <td className="px-3 py-2.5 text-gray-700">
                        {formatTime(m?.hora_salida ?? null)}
                      </td>
                      <td className="px-3 py-2.5 text-gray-700">{horas}</td>
                      <td className="px-3 py-2.5">
                        <span
                          className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${estadoStyle}`}
                        >
                          {estado}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
