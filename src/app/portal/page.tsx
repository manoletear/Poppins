'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Clock,
  Receipt,
  ShoppingCart,
  HeartPulse,
  Send,
  CheckCircle2,
  Circle,
  ArrowRight,
  Loader2,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

const TRABAJADOR_ID = 'c711d829-4a6d-4496-a93b-221b81eb1258';
const EMPLEADOR_ID = '11111111-1111-1111-1111-111111111111';

type MarcajeState = 'not_checked_in' | 'checked_in' | 'completed';

interface Tarea {
  id: string;
  titulo: string;
  hora: string | null;
  prioridad: string | null;
  estado: string;
}

interface Solicitud {
  id: string;
  tipo: string;
  descripcion: string;
  estado: string;
  fecha_inicio: string | null;
  fecha_fin: string | null;
}

interface Recordatorio {
  id: string;
  mensaje: string;
  hora: string | null;
}

function formatDate(date: Date): string {
  const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  const months = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  return `${days[date.getDay()]} ${date.getDate()} de ${months[date.getMonth()]}, ${date.getFullYear()}`;
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
}

function CircularProgress({ percentage, color }: { percentage: number; color: string }) {
  const radius = 28;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <svg className="h-16 w-16 -rotate-90" viewBox="0 0 64 64">
      <circle cx="32" cy="32" r={radius} fill="none" stroke="#e4e4e7" strokeWidth="4" />
      <circle
        cx="32"
        cy="32"
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth="4"
        strokeDasharray={circumference}
        strokeDashoffset={strokeDashoffset}
        strokeLinecap="round"
        className="transition-all duration-500"
      />
    </svg>
  );
}

export default function PortalDashboard() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [loading, setLoading] = useState(true);

  // Marcaje state
  const [marcajeState, setMarcajeState] = useState<MarcajeState>('not_checked_in');
  const [entradaTime, setEntradaTime] = useState<string | null>(null);
  const [salidaTime, setSalidaTime] = useState<string | null>(null);
  const [marcajeLoading, setMarcajeLoading] = useState(false);
  const [marcajeId, setMarcajeId] = useState<string | null>(null);

  // Data state
  const [tareas, setTareas] = useState<Tarea[]>([]);
  const [solicitudes, setSolicitudes] = useState<Solicitud[]>([]);
  const [recordatorios, setRecordatorios] = useState<Recordatorio[]>([]);
  const [vacacionesDias, setVacacionesDias] = useState<number>(8.5);
  const [sueldoLiquido, setSueldoLiquido] = useState<number>(576750);
  const [horasTrabajadas, setHorasTrabajadas] = useState<string>('0h 00m');

  // Update clock every minute
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

  // Calculate hours worked
  useEffect(() => {
    if (entradaTime) {
      const calcHours = () => {
        const [h, m] = entradaTime.split(':').map(Number);
        const now = new Date();
        const entradaMinutes = h * 60 + m;
        const nowMinutes = now.getHours() * 60 + now.getMinutes();
        const diff = Math.max(0, nowMinutes - entradaMinutes);
        setHorasTrabajadas(`${Math.floor(diff / 60)}h ${String(diff % 60).padStart(2, '0')}m`);
      };
      calcHours();
      const interval = setInterval(calcHours, 60000);
      return () => clearInterval(interval);
    }
  }, [entradaTime]);

  // Load data
  const loadData = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    const today = new Date().toISOString().split('T')[0];

    try {
      // Load marcaje for today
      const { data: marcajeData } = await supabase
        .from('marcaje_horario')
        .select('*')
        .eq('trabajador_id', TRABAJADOR_ID)
        .eq('fecha', today)
        .maybeSingle();

      if (marcajeData) {
        setMarcajeId(marcajeData.id);
        if (marcajeData.hora_entrada) {
          setEntradaTime(marcajeData.hora_entrada);
        }
        if (marcajeData.hora_entrada && marcajeData.hora_salida) {
          setMarcajeState('completed');
          setEntradaTime(marcajeData.hora_entrada);
          setSalidaTime(marcajeData.hora_salida);
        } else if (marcajeData.hora_entrada) {
          setMarcajeState('checked_in');
          setEntradaTime(marcajeData.hora_entrada);
        }
      }

      // Load tareas for today
      const { data: tareasData } = await supabase
        .from('tareas')
        .select('id, titulo, hora, prioridad, estado')
        .eq('trabajador_id', TRABAJADOR_ID)
        .eq('fecha', today)
        .order('hora', { ascending: true });

      if (tareasData) setTareas(tareasData);

      // Load solicitudes
      const { data: solicitudesData } = await supabase
        .from('solicitudes_empleado')
        .select('id, tipo, descripcion, estado, fecha_inicio, fecha_fin')
        .eq('trabajador_id', TRABAJADOR_ID)
        .in('estado', ['pendiente', 'aprobada'])
        .order('created_at', { ascending: false })
        .limit(5);

      if (solicitudesData) setSolicitudes(solicitudesData);

      // Load recordatorios
      const { data: recordatoriosData } = await supabase
        .from('recordatorios')
        .select('id, mensaje, hora')
        .eq('trabajador_id', TRABAJADOR_ID)
        .eq('fecha', today)
        .order('hora', { ascending: true });

      if (recordatoriosData) setRecordatorios(recordatoriosData);

      // Load vacaciones disponibles
      const { data: vacData } = await supabase
        .from('vacaciones')
        .select('dias_disponibles')
        .eq('trabajador_id', TRABAJADOR_ID)
        .maybeSingle();

      if (vacData) setVacacionesDias(vacData.dias_disponibles);

      // Load sueldo liquido from latest liquidacion
      const { data: liqData } = await supabase
        .from('liquidaciones')
        .select('sueldo_liquido')
        .eq('trabajador_id', TRABAJADOR_ID)
        .order('periodo', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (liqData) setSueldoLiquido(liqData.sueldo_liquido);
    } catch (error) {
      console.error('Error loading portal data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle marcaje
  const handleMarcaje = async (tipo: 'entrada' | 'salida') => {
    setMarcajeLoading(true);
    const supabase = createClient();
    const now = new Date();
    const timeStr = formatTime(now);
    const today = now.toISOString().split('T')[0];

    try {
      if (tipo === 'entrada') {
        const { data } = await supabase
          .from('marcaje_horario')
          .insert({
            trabajador_id: TRABAJADOR_ID,
            empleador_id: EMPLEADOR_ID,
            fecha: today,
            hora_entrada: timeStr,
          })
          .select('id')
          .single();

        if (data) {
          setMarcajeId(data.id);
          setEntradaTime(timeStr);
          setMarcajeState('checked_in');
        }
      } else {
        if (marcajeId) {
          await supabase
            .from('marcaje_horario')
            .update({ hora_salida: timeStr })
            .eq('id', marcajeId);
        }
        setSalidaTime(timeStr);
        setMarcajeState('completed');
      }
    } catch (error) {
      console.error('Error en marcaje:', error);
    } finally {
      setMarcajeLoading(false);
    }
  };

  // Handle tarea toggle
  const handleTareaToggle = async (tareaId: string, currentEstado: string) => {
    const newEstado = currentEstado === 'completada' ? 'pendiente' : 'completada';
    setTareas((prev) =>
      prev.map((t) => (t.id === tareaId ? { ...t, estado: newEstado } : t))
    );

    const supabase = createClient();
    try {
      await supabase
        .from('tareas')
        .update({ estado: newEstado })
        .eq('id', tareaId);
    } catch (error) {
      console.error('Error updating tarea:', error);
      setTareas((prev) =>
        prev.map((t) => (t.id === tareaId ? { ...t, estado: currentEstado } : t))
      );
    }
  };

  const tareasCompletadas = tareas.filter((t) => t.estado === 'completada').length;
  const tareasTotal = tareas.length || 10;
  const tareasPercentage = tareasTotal > 0 ? Math.round((tareasCompletadas / tareasTotal) * 100) : 0;

  const greeting = (() => {
    const hour = currentTime.getHours();
    if (hour < 12) return 'Buenos días';
    if (hour < 19) return 'Buenas tardes';
    return 'Buenas noches';
  })();

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">{greeting}, María</h1>
          <p className="text-sm text-zinc-500">{formatDate(currentTime)}</p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-semibold text-zinc-900 tabular-nums">{formatTime(currentTime)}</p>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Tareas Hoy */}
        <div className="rounded-xl border border-zinc-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-zinc-500">Tareas Hoy</p>
              <p className="mt-1 text-xl font-bold text-zinc-900">{tareasCompletadas} <span className="text-sm font-normal text-zinc-400">de {tareasTotal}</span></p>
              <p className="text-xs text-emerald-600">{tareasTotal - tareasCompletadas} pendientes</p>
            </div>
            <CircularProgress percentage={tareasPercentage} color="#059669" />
          </div>
        </div>

        {/* Horas Trabajadas */}
        <div className="rounded-xl border border-zinc-200 p-4">
          <p className="text-xs font-medium text-zinc-500">Horas Trabajadas</p>
          <p className="mt-1 text-xl font-bold text-zinc-900">{horasTrabajadas}</p>
          <p className="text-xs text-blue-600">
            {entradaTime ? `Entrada: ${entradaTime}` : 'Sin marcar'}
          </p>
        </div>

        {/* Vacaciones */}
        <div className="rounded-xl border border-zinc-200 p-4">
          <p className="text-xs font-medium text-zinc-500">Vacaciones</p>
          <p className="mt-1 text-xl font-bold text-zinc-900">{vacacionesDias}</p>
          <p className="text-xs text-amber-600">días disponibles</p>
        </div>

        {/* Sueldo Líquido */}
        <Link href="/portal/liquidaciones" className="rounded-xl border border-zinc-200 p-4 hover:shadow-md transition-shadow">
          <p className="text-xs font-medium text-zinc-500">Sueldo Líquido</p>
          <p className="mt-1 text-xl font-bold text-zinc-900">
            ${sueldoLiquido.toLocaleString('es-CL')}
          </p>
          <p className="text-xs text-violet-600">Marzo 2026</p>
        </Link>
      </div>

      {/* Marcaje Rápido */}
      <div className="rounded-2xl border-2 border-emerald-200 bg-emerald-50 p-6">
        <h2 className="text-sm font-semibold text-emerald-800 mb-4">Marcaje Rápido</h2>

        {marcajeState === 'not_checked_in' && (
          <div className="flex flex-col items-center gap-3">
            <p className="text-sm text-emerald-700">Hora actual: {formatTime(currentTime)}</p>
            <button
              onClick={() => handleMarcaje('entrada')}
              disabled={marcajeLoading}
              className="flex items-center gap-2 rounded-xl bg-emerald-600 px-8 py-3 text-base font-semibold text-white hover:bg-emerald-700 transition-colors disabled:opacity-50"
            >
              {marcajeLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Clock className="h-5 w-5" />
              )}
              Marcar Entrada
            </button>
          </div>
        )}

        {marcajeState === 'checked_in' && (
          <div className="flex flex-col items-center gap-3">
            <p className="text-sm text-emerald-700">
              Entrada: <span className="font-semibold">{entradaTime}</span>
            </p>
            <button
              onClick={() => handleMarcaje('salida')}
              disabled={marcajeLoading}
              className="flex items-center gap-2 rounded-xl bg-blue-600 px-8 py-3 text-base font-semibold text-white hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {marcajeLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Clock className="h-5 w-5" />
              )}
              Marcar Salida
            </button>
          </div>
        )}

        {marcajeState === 'completed' && (
          <div className="flex flex-col items-center gap-2 text-emerald-700">
            <CheckCircle2 className="h-8 w-8 text-emerald-600" />
            <p className="text-base font-semibold">Jornada completada</p>
            <div className="flex gap-6 text-sm">
              <span>Entrada: <span className="font-semibold">{entradaTime}</span></span>
              <span>Salida: <span className="font-semibold">{salidaTime}</span></span>
            </div>
            {entradaTime && salidaTime && (
              <p className="text-xs text-emerald-600">
                Total: {(() => {
                  const [eh, em] = entradaTime.split(':').map(Number);
                  const [sh, sm] = salidaTime.split(':').map(Number);
                  const diff = (sh * 60 + sm) - (eh * 60 + em);
                  return `${Math.floor(diff / 60)}h ${String(diff % 60).padStart(2, '0')}m`;
                })()}
              </p>
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Mis Tareas de Hoy */}
        <div className="rounded-xl border border-zinc-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-zinc-900">Mis Tareas de Hoy</h2>
            <span className="text-xs text-zinc-500">{tareasCompletadas}/{tareasTotal} completadas</span>
          </div>

          {tareas.length === 0 ? (
            <p className="text-sm text-zinc-400 py-4 text-center">No hay tareas para hoy</p>
          ) : (
            <div className="space-y-2">
              {tareas.map((tarea) => (
                <button
                  key={tarea.id}
                  onClick={() => handleTareaToggle(tarea.id, tarea.estado)}
                  className="flex w-full items-center gap-3 rounded-lg p-2 text-left hover:bg-zinc-50 transition-colors"
                >
                  {tarea.estado === 'completada' ? (
                    <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500" />
                  ) : (
                    <Circle className="h-5 w-5 shrink-0 text-zinc-300" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className={`text-sm ${tarea.estado === 'completada' ? 'text-zinc-400 line-through' : 'text-zinc-900'}`}>
                      {tarea.titulo}
                    </p>
                    {tarea.hora && (
                      <p className="text-xs text-zinc-400">{tarea.hora}</p>
                    )}
                  </div>
                  {tarea.prioridad && (
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                        tarea.prioridad === 'alta'
                          ? 'bg-red-100 text-red-700'
                          : tarea.prioridad === 'media'
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-zinc-100 text-zinc-600'
                      }`}
                    >
                      {tarea.prioridad}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}

          <Link
            href="/portal/tareas"
            className="mt-3 flex items-center gap-1 text-xs font-medium text-emerald-600 hover:text-emerald-700 transition-colors"
          >
            Ver todas <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        {/* Próximas Solicitudes */}
        <div className="rounded-xl border border-zinc-200 p-5">
          <h2 className="text-sm font-semibold text-zinc-900 mb-4">Próximas Solicitudes</h2>

          {solicitudes.length === 0 ? (
            <p className="text-sm text-zinc-400 py-4 text-center">No hay solicitudes pendientes</p>
          ) : (
            <div className="space-y-3">
              {solicitudes.map((sol) => (
                <div key={sol.id} className="flex items-center justify-between rounded-lg border border-zinc-100 p-3">
                  <div>
                    <p className="text-sm font-medium text-zinc-900">{sol.tipo}</p>
                    <p className="text-xs text-zinc-500">{sol.descripcion}</p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-medium ${
                      sol.estado === 'aprobada'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-amber-100 text-amber-700'
                    }`}
                  >
                    {sol.estado === 'aprobada' ? 'Aprobada' : 'Pendiente'}
                  </span>
                </div>
              ))}
            </div>
          )}

          <Link
            href="/portal/solicitudes"
            className="mt-3 flex items-center gap-1 text-xs font-medium text-emerald-600 hover:text-emerald-700 transition-colors"
          >
            Ver todas <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </div>

      {/* Accesos Directos */}
      <div>
        <h2 className="text-sm font-semibold text-zinc-900 mb-3">Accesos Directos</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Link
            href="/portal/solicitudes"
            className="flex flex-col items-center gap-2 rounded-xl border border-zinc-200 p-4 hover:shadow-md transition-shadow"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100">
              <Send className="h-5 w-5 text-emerald-600" />
            </div>
            <span className="text-xs font-medium text-zinc-700">Nueva Solicitud</span>
          </Link>
          <Link
            href="/portal/liquidaciones"
            className="flex flex-col items-center gap-2 rounded-xl border border-zinc-200 p-4 hover:shadow-md transition-shadow"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
              <Receipt className="h-5 w-5 text-blue-600" />
            </div>
            <span className="text-xs font-medium text-zinc-700">Ver Liquidación</span>
          </Link>
          <Link
            href="/portal/compras"
            className="flex flex-col items-center gap-2 rounded-xl border border-zinc-200 p-4 hover:shadow-md transition-shadow"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100">
              <ShoppingCart className="h-5 w-5 text-amber-600" />
            </div>
            <span className="text-xs font-medium text-zinc-700">Lista de Compras</span>
          </Link>
          <Link
            href="/portal/ayuda-medica"
            className="flex flex-col items-center gap-2 rounded-xl border border-zinc-200 p-4 hover:shadow-md transition-shadow"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-rose-100">
              <HeartPulse className="h-5 w-5 text-rose-600" />
            </div>
            <span className="text-xs font-medium text-zinc-700">Ayuda Médica</span>
          </Link>
        </div>
      </div>

      {/* Noticias del Empleador */}
      {recordatorios.length > 0 && (
        <div className="rounded-xl border border-zinc-200 p-5">
          <h2 className="text-sm font-semibold text-zinc-900 mb-3">Recordatorios de hoy</h2>
          <div className="space-y-2">
            {recordatorios.map((rec) => (
              <div key={rec.id} className="flex items-center gap-3 rounded-lg bg-zinc-50 p-3">
                <div className="h-2 w-2 shrink-0 rounded-full bg-amber-400" />
                <p className="text-sm text-zinc-700">{rec.mensaje}</p>
                {rec.hora && (
                  <span className="ml-auto shrink-0 text-xs text-zinc-400">{rec.hora}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
