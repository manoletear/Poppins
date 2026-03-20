'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Clock, CheckCircle2 } from 'lucide-react';

const WORKER_ID = 'c711d829-4a6d-4496-a93b-221b81eb1258';

interface Marcaje {
  id: string;
  trabajador_id: string;
  fecha: string;
  hora_entrada: string | null;
  hora_salida: string | null;
}

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

function diffHours(entrada: string, salida: string): number {
  return Math.max(0, (timeToMinutes(salida) - timeToMinutes(entrada)) / 60);
}

function formatHoursMinutes(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60);
  const m = Math.floor(totalMinutes % 60);
  return `${h}h ${String(m).padStart(2, '0')}m`;
}

function getCurrentTimeString(): string {
  const now = new Date();
  return now.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function getCurrentHHMM(): string {
  const now = new Date();
  return now.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
}

export default function MarcajePage() {
  const supabase = createClient();
  const today = toDateString(new Date(2026, 2, 20));
  const weekDates = getWeekDates(new Date(2026, 2, 20));

  const [marcaje, setMarcaje] = useState<Marcaje | null>(null);
  const [weekMarcajes, setWeekMarcajes] = useState<Marcaje[]>([]);
  const [monthMarcajes, setMonthMarcajes] = useState<Marcaje[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(getCurrentTimeString());
  const [elapsedMinutes, setElapsedMinutes] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchTodayMarcaje = useCallback(async () => {
    const { data } = await supabase
      .from('marcajes_horario')
      .select('*')
      .eq('trabajador_id', WORKER_ID)
      .eq('fecha', today)
      .single();
    setMarcaje(data as Marcaje | null);
  }, [today]);

  const fetchWeekMarcajes = useCallback(async () => {
    const start = toDateString(weekDates[0]);
    const end = toDateString(weekDates[6]);
    const { data } = await supabase
      .from('marcajes_horario')
      .select('*')
      .eq('trabajador_id', WORKER_ID)
      .gte('fecha', start)
      .lte('fecha', end)
      .order('fecha');
    if (data) setWeekMarcajes(data as Marcaje[]);
  }, []);

  const fetchMonthMarcajes = useCallback(async () => {
    const startOfMonth = `2026-03-01`;
    const endOfMonth = `2026-03-31`;
    const { data } = await supabase
      .from('marcajes_horario')
      .select('*')
      .eq('trabajador_id', WORKER_ID)
      .gte('fecha', startOfMonth)
      .lte('fecha', endOfMonth);
    if (data) setMonthMarcajes(data as Marcaje[]);
  }, []);

  useEffect(() => {
    Promise.all([fetchTodayMarcaje(), fetchWeekMarcajes(), fetchMonthMarcajes()]).then(() =>
      setLoading(false)
    );
  }, [fetchTodayMarcaje, fetchWeekMarcajes, fetchMonthMarcajes]);

  // Live clock
  useEffect(() => {
    const id = setInterval(() => setCurrentTime(getCurrentTimeString()), 1000);
    return () => clearInterval(id);
  }, []);

  // Elapsed timer when checked in
  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (marcaje?.hora_entrada && !marcaje?.hora_salida) {
      const update = () => {
        const now = new Date();
        const entradaMin = timeToMinutes(marcaje.hora_entrada!);
        const nowMin = now.getHours() * 60 + now.getMinutes();
        setElapsedMinutes(Math.max(0, nowMin - entradaMin));
      };
      update();
      intervalRef.current = setInterval(update, 1000);
    } else {
      setElapsedMinutes(0);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [marcaje]);

  const marcarEntrada = async () => {
    const hora = getCurrentHHMM();
    const { data } = await supabase
      .from('marcajes_horario')
      .insert({ trabajador_id: WORKER_ID, fecha: today, hora_entrada: hora })
      .select()
      .single();
    if (data) {
      setMarcaje(data as Marcaje);
      fetchWeekMarcajes();
      fetchMonthMarcajes();
    }
  };

  const marcarSalida = async () => {
    if (!marcaje) return;
    const hora = getCurrentHHMM();
    const { data } = await supabase
      .from('marcajes_horario')
      .update({ hora_salida: hora })
      .eq('id', marcaje.id)
      .select()
      .single();
    if (data) {
      setMarcaje(data as Marcaje);
      fetchWeekMarcajes();
      fetchMonthMarcajes();
    }
  };

  // Monthly summary calculations
  const diasTrabajados = monthMarcajes.filter((m) => m.hora_entrada).length;
  const diasHabiles = 22;
  const totalHorasMes = monthMarcajes.reduce((sum, m) => {
    if (m.hora_entrada && m.hora_salida) return sum + diffHours(m.hora_entrada, m.hora_salida);
    return sum;
  }, 0);
  const promedioDiario = diasTrabajados > 0 ? totalHorasMes / diasTrabajados : 0;

  const hasEntrada = !!marcaje?.hora_entrada;
  const hasSalida = !!marcaje?.hora_salida;
  const jornadaCompleta = hasEntrada && hasSalida;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-sm text-gray-400">Cargando...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Marcaje Horario</h1>
          <p className="text-sm text-gray-500 mt-1">Control de entrada y salida</p>
        </div>

        {/* Today's Marcaje Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          {jornadaCompleta ? (
            /* Jornada completada */
            <div className="text-center space-y-4">
              <CheckCircle2 className="w-14 h-14 text-green-500 mx-auto" />
              <h2 className="text-lg font-semibold text-gray-900">Jornada Completada</h2>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-xs text-gray-500">Entrada</p>
                  <p className="text-lg font-bold text-gray-900">{marcaje!.hora_entrada?.slice(0, 5)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Salida</p>
                  <p className="text-lg font-bold text-gray-900">{marcaje!.hora_salida?.slice(0, 5)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Total horas</p>
                  <p className="text-lg font-bold text-gray-900">
                    {diffHours(marcaje!.hora_entrada!, marcaje!.hora_salida!).toFixed(1)}h
                  </p>
                </div>
              </div>
            </div>
          ) : hasEntrada ? (
            /* Has entrada, waiting for salida */
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                  Entrada: {marcaje!.hora_entrada?.slice(0, 5)}
                </span>
              </div>
              <div className="text-center">
                <p className="text-xs text-gray-500">Tiempo trabajado</p>
                <p className="text-2xl font-bold text-blue-600">{formatHoursMinutes(elapsedMinutes)}</p>
              </div>
              <button
                onClick={marcarSalida}
                className="w-full h-20 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-lg font-semibold flex items-center justify-center gap-3 transition-colors"
              >
                <Clock className="w-6 h-6" />
                MARCAR SALIDA
              </button>
            </div>
          ) : (
            /* No marcaje yet */
            <div className="space-y-4">
              <div className="text-center">
                <p className="text-xs text-gray-500">Hora actual</p>
                <p className="text-3xl font-bold text-gray-900 tabular-nums">{currentTime}</p>
              </div>
              <button
                onClick={marcarEntrada}
                className="w-full h-20 rounded-xl bg-green-600 hover:bg-green-700 text-white text-lg font-semibold flex items-center justify-center gap-3 transition-colors"
              >
                <Clock className="w-6 h-6" />
                MARCAR ENTRADA
              </button>
            </div>
          )}
        </div>

        {/* Weekly History */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-800">Historial Semanal</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-xs text-gray-500">
                  <th className="px-4 py-2 text-left font-medium">Día</th>
                  <th className="px-4 py-2 text-left font-medium">Fecha</th>
                  <th className="px-4 py-2 text-left font-medium">Entrada</th>
                  <th className="px-4 py-2 text-left font-medium">Salida</th>
                  <th className="px-4 py-2 text-left font-medium">Horas</th>
                  <th className="px-4 py-2 text-left font-medium">Estado</th>
                </tr>
              </thead>
              <tbody>
                {weekDates.map((date) => {
                  const dateStr = toDateString(date);
                  const m = weekMarcajes.find((mk) => mk.fecha === dateStr);
                  const dayIndex = date.getDay();
                  const isWeekend = dayIndex === 0 || dayIndex === 6;
                  const isToday = dateStr === today;

                  let estado: string;
                  let estadoStyle: string;
                  let horas = '-';

                  if (m?.hora_entrada && m?.hora_salida) {
                    estado = 'Completado';
                    estadoStyle = 'bg-emerald-100 text-emerald-700';
                    horas = diffHours(m.hora_entrada, m.hora_salida).toFixed(1);
                  } else if (m?.hora_entrada && !m?.hora_salida) {
                    estado = 'En turno';
                    estadoStyle = 'bg-blue-100 text-blue-700';
                    horas = '-';
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
                      className={`border-b border-gray-50 last:border-0 ${isToday ? 'bg-blue-50/50' : ''}`}
                    >
                      <td className="px-4 py-2.5 font-medium text-gray-700">
                        {DAY_NAMES[dayIndex]}
                      </td>
                      <td className="px-4 py-2.5 text-gray-500">
                        {date.getDate()}/{date.getMonth() + 1}
                      </td>
                      <td className="px-4 py-2.5 text-gray-700">
                        {m?.hora_entrada?.slice(0, 5) || '-'}
                      </td>
                      <td className="px-4 py-2.5 text-gray-700">
                        {m?.hora_salida?.slice(0, 5) || '-'}
                      </td>
                      <td className="px-4 py-2.5 text-gray-700">{horas}</td>
                      <td className="px-4 py-2.5">
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

        {/* Monthly Summary */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h2 className="text-sm font-semibold text-gray-800 mb-4">Resumen Mensual - Marzo 2026</h2>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {diasTrabajados}/{diasHabiles}
              </p>
              <p className="text-xs text-gray-500 mt-1">Días trabajados</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{totalHorasMes.toFixed(1)}</p>
              <p className="text-xs text-gray-500 mt-1">Horas totales</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{promedioDiario.toFixed(1)}</p>
              <p className="text-xs text-gray-500 mt-1">Promedio diario</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
