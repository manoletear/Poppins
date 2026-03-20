'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';

interface Trabajador {
  id: string;
  nombre: string;
  apellido_paterno: string;
  cargo: string | null;
  estado: string;
}

interface Marcaje {
  id: string;
  trabajador_id: string;
  empleador_id: string;
  fecha: string;
  hora_entrada: string | null;
  hora_salida: string | null;
  horas_trabajadas: number | null;
  tipo: string | null;
  notas: string | null;
  trabajadores?: Trabajador;
}

// Mock data used as fallback when no real marcajes exist
const MOCK_TRABAJADORES: Trabajador[] = [
  { id: 'mock-1', nombre: 'María', apellido_paterno: 'González', cargo: 'Asesora del Hogar', estado: 'activo' },
  { id: 'mock-2', nombre: 'Carmen', apellido_paterno: 'López', cargo: 'Niñera', estado: 'activo' },
  { id: 'mock-3', nombre: 'Rosa', apellido_paterno: 'Martínez', cargo: 'Cuidadora', estado: 'activo' },
];

function getMockMarcajes(fecha: string): Marcaje[] {
  const today = new Date().toISOString().split('T')[0];
  if (fecha !== today) return [];
  return MOCK_TRABAJADORES.map((t) => ({
    id: `mock-marcaje-${t.id}`,
    trabajador_id: t.id,
    empleador_id: '11111111-1111-1111-1111-111111111111',
    fecha,
    hora_entrada: '08:30',
    hora_salida: fecha < today ? '17:00' : null,
    horas_trabajadas: null,
    tipo: 'normal',
    notas: null,
    trabajadores: t,
  }));
}

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

function getWeekDates(date: Date): Date[] {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d.setDate(diff));
  return Array.from({ length: 5 }, (_, i) => {
    const dt = new Date(monday);
    dt.setDate(monday.getDate() + i);
    return dt;
  });
}

const EMPLEADOR_ID = '11111111-1111-1111-1111-111111111111';

export default function AsistenciaPage() {
  const [selectedDate, setSelectedDate] = useState<string>(formatDate(new Date()));
  const [marcajes, setMarcajes] = useState<Marcaje[]>([]);
  const [trabajadores, setTrabajadores] = useState<Trabajador[]>([]);
  const [loading, setLoading] = useState(true);
  const [usingMock, setUsingMock] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Weekly summary state
  const [weeklySummary, setWeeklySummary] = useState<
    { trabajador: Trabajador; dias: { fecha: string; entrada: string | null; salida: string | null }[] }[]
  >([]);

  const fetchMarcajes = useCallback(async (fecha: string) => {
    setLoading(true);
    const supabase = createClient();

    try {
      // Fetch trabajadores
      const { data: trabajadoresData } = await supabase
        .from('trabajadores')
        .select('id, nombre, apellido_paterno, cargo, estado')
        .eq('estado', 'activo');

      const activeTrabajadores = trabajadoresData || [];

      // Fetch marcajes for selected date
      const { data: marcajesData } = await supabase
        .from('marcajes_horario')
        .select('*, trabajadores(id, nombre, apellido_paterno, cargo, estado)')
        .eq('fecha', fecha);

      const realMarcajes = marcajesData || [];

      if (realMarcajes.length > 0 || activeTrabajadores.length > 0) {
        setTrabajadores(activeTrabajadores);
        setMarcajes(realMarcajes as Marcaje[]);
        setUsingMock(realMarcajes.length === 0 && activeTrabajadores.length === 0);
      } else {
        // Full fallback to mock data
        setTrabajadores(MOCK_TRABAJADORES);
        setMarcajes(getMockMarcajes(fecha));
        setUsingMock(true);
      }
    } catch {
      // On error, fall back to mock
      setTrabajadores(MOCK_TRABAJADORES);
      setMarcajes(getMockMarcajes(fecha));
      setUsingMock(true);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch weekly summary
  const fetchWeeklySummary = useCallback(async () => {
    const supabase = createClient();
    const weekDates = getWeekDates(new Date(selectedDate + 'T12:00:00'));
    const startDate = formatDate(weekDates[0]);
    const endDate = formatDate(weekDates[4]);

    try {
      const { data: weekMarcajes } = await supabase
        .from('marcajes_horario')
        .select('*, trabajadores(id, nombre, apellido_paterno, cargo, estado)')
        .gte('fecha', startDate)
        .lte('fecha', endDate);

      if (weekMarcajes && weekMarcajes.length > 0) {
        const byTrabajador = new Map<string, { trabajador: Trabajador; marcajes: Marcaje[] }>();
        for (const m of weekMarcajes as Marcaje[]) {
          if (!byTrabajador.has(m.trabajador_id)) {
            byTrabajador.set(m.trabajador_id, {
              trabajador: m.trabajadores || { id: m.trabajador_id, nombre: '?', apellido_paterno: '?', cargo: null, estado: 'activo' },
              marcajes: [],
            });
          }
          byTrabajador.get(m.trabajador_id)!.marcajes.push(m);
        }

        const summary = Array.from(byTrabajador.values()).map(({ trabajador, marcajes: ms }) => ({
          trabajador,
          dias: weekDates.map((d) => {
            const f = formatDate(d);
            const m = ms.find((x) => x.fecha === f);
            return { fecha: f, entrada: m?.hora_entrada || null, salida: m?.hora_salida || null };
          }),
        }));
        setWeeklySummary(summary);
      } else {
        // Mock weekly summary
        const today = formatDate(new Date());
        setWeeklySummary(
          (trabajadores.length > 0 ? trabajadores : MOCK_TRABAJADORES).map((t) => ({
            trabajador: t,
            dias: weekDates.map((d) => {
              const f = formatDate(d);
              const isPast = f < today;
              return { fecha: f, entrada: isPast ? '08:30' : null, salida: isPast ? '17:00' : null };
            }),
          }))
        );
      }
    } catch {
      // Mock fallback
      setWeeklySummary([]);
    }
  }, [selectedDate, trabajadores]);

  useEffect(() => {
    fetchMarcajes(selectedDate);
  }, [selectedDate, fetchMarcajes]);

  useEffect(() => {
    if (!loading) {
      fetchWeeklySummary();
    }
  }, [loading, fetchWeeklySummary]);

  // Get marcaje for a given trabajador on the selected date
  function getMarcajeForTrabajador(trabajadorId: string): Marcaje | undefined {
    return marcajes.find((m) => m.trabajador_id === trabajadorId);
  }

  // Handle registering entrada or salida
  async function handleRegistrarMarcaje(trabajadorId: string, tipo: 'entrada' | 'salida') {
    if (usingMock && trabajadorId.startsWith('mock-')) return;

    setActionLoading(trabajadorId);
    const supabase = createClient();
    const ahora = new Date().toTimeString().split(' ')[0].substring(0, 5);

    try {
      if (tipo === 'entrada') {
        await supabase.from('marcajes_horario').insert({
          trabajador_id: trabajadorId,
          empleador_id: EMPLEADOR_ID,
          fecha: selectedDate,
          hora_entrada: ahora,
        });
      } else {
        await supabase
          .from('marcajes_horario')
          .update({ hora_salida: ahora })
          .eq('trabajador_id', trabajadorId)
          .eq('fecha', selectedDate);
      }
      await fetchMarcajes(selectedDate);
    } catch {
      // silently fail
    } finally {
      setActionLoading(null);
    }
  }

  function renderMarcajeButton(trabajadorId: string) {
    const marcaje = getMarcajeForTrabajador(trabajadorId);
    const isLoading = actionLoading === trabajadorId;
    const isMockItem = usingMock && trabajadorId.startsWith('mock-');

    if (isLoading) {
      return (
        <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-gray-100 text-gray-400 text-xs">
          <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Procesando...
        </span>
      );
    }

    if (!marcaje || (!marcaje.hora_entrada && !marcaje.hora_salida)) {
      return (
        <button
          onClick={() => handleRegistrarMarcaje(trabajadorId, 'entrada')}
          disabled={isMockItem}
          className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-300 text-white text-xs font-medium transition-colors"
        >
          Marcar Entrada
        </button>
      );
    }

    if (marcaje.hora_entrada && !marcaje.hora_salida) {
      return (
        <button
          onClick={() => handleRegistrarMarcaje(trabajadorId, 'salida')}
          disabled={isMockItem}
          className="px-3 py-1.5 rounded-lg bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white text-xs font-medium transition-colors"
        >
          Marcar Salida
        </button>
      );
    }

    return (
      <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-gray-100 text-gray-500 text-xs font-medium">
        <svg className="w-3.5 h-3.5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
        Completado
      </span>
    );
  }

  const dayNames = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie'];
  const weekDates = getWeekDates(new Date(selectedDate + 'T12:00:00'));
  const todayStr = formatDate(new Date());

  function getInitials(nombre: string, apellido: string): string {
    return `${nombre.charAt(0)}${apellido.charAt(0)}`.toUpperCase();
  }

  function getColor(name: string): string {
    const colors = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#ef4444'];
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
  }

  return (
    <div className="space-y-5">
      {/* Header with date picker */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Asistencia</h1>
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-300"
        />
      </div>

      {/* Mock data banner */}
      {usingMock && (
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-amber-50 border border-amber-200">
          <svg className="w-4 h-4 text-amber-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M12 2a10 10 0 100 20 10 10 0 000-20z" />
          </svg>
          <span className="text-xs text-amber-700">
            Datos de ejemplo &mdash; Se sincronizar&aacute; con marcajes reales
          </span>
        </div>
      )}

      {/* Daily marcajes table */}
      {loading ? (
        <div className="text-sm text-gray-400 py-8 text-center">Cargando...</div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
            <h2 className="text-sm font-semibold text-gray-700">
              Marcajes del {new Date(selectedDate + 'T12:00:00').toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' })}
            </h2>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50/50 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                <th className="px-5 py-3">Colaboradora</th>
                <th className="px-4 py-3">Cargo</th>
                <th className="px-4 py-3 text-center">Entrada</th>
                <th className="px-4 py-3 text-center">Salida</th>
                <th className="px-4 py-3 text-center">Horas</th>
                <th className="px-4 py-3 text-center">Acci&oacute;n</th>
              </tr>
            </thead>
            <tbody>
              {trabajadores.map((t) => {
                const marcaje = getMarcajeForTrabajador(t.id);
                const nombre = `${t.nombre} ${t.apellido_paterno}`;
                return (
                  <tr key={t.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0"
                          style={{ background: getColor(nombre) }}
                        >
                          {getInitials(t.nombre, t.apellido_paterno)}
                        </div>
                        <span className="font-medium text-gray-800">{nombre}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{t.cargo || '—'}</td>
                    <td className="px-4 py-3 text-center">
                      {marcaje?.hora_entrada ? (
                        <span className="text-emerald-600 font-medium">{marcaje.hora_entrada}</span>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {marcaje?.hora_salida ? (
                        <span className="text-blue-600 font-medium">{marcaje.hora_salida}</span>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {marcaje?.horas_trabajadas != null ? (
                        <span className="font-medium text-gray-700">{Number(marcaje.horas_trabajadas).toFixed(1)}h</span>
                      ) : marcaje?.hora_entrada && marcaje?.hora_salida ? (
                        <span className="font-medium text-gray-700">
                          {(() => {
                            const [eh, em] = marcaje.hora_entrada.split(':').map(Number);
                            const [sh, sm] = marcaje.hora_salida.split(':').map(Number);
                            return ((sh * 60 + sm - eh * 60 - em) / 60).toFixed(1);
                          })()}h
                        </span>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {renderMarcajeButton(t.id)}
                    </td>
                  </tr>
                );
              })}
              {trabajadores.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-gray-400 text-sm">
                    No hay colaboradoras registradas
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Weekly summary */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
          <h2 className="text-sm font-semibold text-gray-700">
            Resumen Semanal &mdash; {weekDates[0].toLocaleDateString('es-CL', { day: 'numeric', month: 'short' })} al{' '}
            {weekDates[4].toLocaleDateString('es-CL', { day: 'numeric', month: 'short', year: 'numeric' })}
          </h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50/50 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
              <th className="px-5 py-3">Colaboradora</th>
              {dayNames.map((d, i) => (
                <th key={d} className="px-3 py-3 text-center">
                  <div>{d}</div>
                  <div className="text-[10px] font-normal text-gray-400">{weekDates[i].getDate()}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {weeklySummary.map(({ trabajador: t, dias }) => {
              const nombre = `${t.nombre} ${t.apellido_paterno}`;
              return (
                <tr key={t.id} className="border-b border-gray-50 last:border-0">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0"
                        style={{ background: getColor(nombre) }}
                      >
                        {getInitials(t.nombre, t.apellido_paterno)}
                      </div>
                      <span className="font-medium text-gray-800">{nombre}</span>
                    </div>
                  </td>
                  {dias.map((dia) => {
                    const isToday = dia.fecha === todayStr;
                    const hasEntrada = !!dia.entrada;
                    const hasSalida = !!dia.salida;
                    return (
                      <td key={dia.fecha} className="px-3 py-3 text-center">
                        {hasEntrada && hasSalida ? (
                          <span
                            className={`inline-block w-6 h-6 rounded-full bg-emerald-100 text-emerald-600 text-xs leading-6 ${
                              isToday ? 'ring-2 ring-emerald-300' : ''
                            }`}
                          >
                            &#10003;
                          </span>
                        ) : hasEntrada ? (
                          <span
                            className={`inline-block w-6 h-6 rounded-full bg-blue-100 text-blue-600 text-xs leading-6 ${
                              isToday ? 'ring-2 ring-blue-300' : ''
                            }`}
                          >
                            &#8226;
                          </span>
                        ) : (
                          <span
                            className={`inline-block w-6 h-6 rounded-full bg-gray-100 text-gray-400 text-xs leading-6 ${
                              isToday ? 'ring-2 ring-gray-300' : ''
                            }`}
                          >
                            &mdash;
                          </span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
            {weeklySummary.length === 0 && (
              <tr>
                <td colSpan={6} className="px-5 py-6 text-center text-gray-400 text-sm">
                  Sin datos para esta semana
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-gray-400">
        * La asistencia se conecta a la tabla marcajes_horario en Supabase.
      </p>
    </div>
  );
}
