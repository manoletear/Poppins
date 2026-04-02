'use client';

import { useState, useEffect, useCallback } from 'react';
import { Clock, Calendar, ChevronLeft, ChevronRight, AlertCircle, Loader2 } from 'lucide-react';
import { useAuth } from '@/lib/auth/context';
import { getMarcajesHoy } from '@/lib/supabase/employer-queries';
import { createClient } from '@/lib/supabase/client';

interface Marcaje {
  id: string;
  trabajador_id: string;
  fecha: string;
  hora_entrada: string | null;
  hora_salida: string | null;
  hora_entrada_colacion: string | null;
  hora_salida_colacion: string | null;
  horas_trabajadas: number | null;
  trabajadores?: { nombre: string; apellido_paterno: string } | null;
}

function formatDateLong(date: Date): string {
  return date.toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' });
}

function toISODate(date: Date): string {
  return date.toISOString().split('T')[0];
}

function calcHours(entrada: string | null, salida: string | null): string {
  if (!entrada) return '-';
  const end = salida || new Date().toTimeString().split(' ')[0].substring(0, 5);
  const [h1, m1] = entrada.split(':').map(Number);
  const [h2, m2] = end.split(':').map(Number);
  const diffMin = (h2 * 60 + m2) - (h1 * 60 + m1);
  if (diffMin <= 0) return '-';
  const hours = Math.floor(diffMin / 60);
  const mins = diffMin % 60;
  return `${hours}h ${mins}m`;
}

function getEstado(m: Marcaje): { label: string; color: string } {
  if (!m.hora_entrada) return { label: 'Sin marcar', color: 'bg-red-50 text-red-700' };
  if (m.hora_salida) return { label: 'Completado', color: 'bg-zinc-100 text-zinc-700' };
  return { label: 'En turno', color: 'bg-emerald-50 text-emerald-700' };
}

export default function HorariosPage() {
  const { profile } = useAuth();
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [marcajes, setMarcajes] = useState<Marcaje[]>([]);
  const [loading, setLoading] = useState(true);
  const [weekSummary, setWeekSummary] = useState<any[]>([]);

  const empleadorId = profile?.empleador_id;

  const loadData = useCallback(async () => {
    if (!empleadorId) return;
    setLoading(true);

    const data = await getMarcajesHoy(empleadorId, toISODate(currentDate));
    setMarcajes(data || []);

    // Load week summary
    const supabase = createClient();
    const startOfWeek = new Date(currentDate);
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay() + 1);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(endOfWeek.getDate() + 4);

    const { data: weekData } = await supabase
      .from('marcajes_horario')
      .select('trabajador_id, horas_trabajadas, trabajadores(nombre, apellido_paterno)')
      .eq('empleador_id', empleadorId)
      .gte('fecha', toISODate(startOfWeek))
      .lte('fecha', toISODate(endOfWeek));

    // Aggregate by worker
    const byWorker = new Map<string, { nombre: string; horas: number }>();
    (weekData || []).forEach((m: any) => {
      const key = m.trabajador_id;
      const existing = byWorker.get(key) || { nombre: m.trabajadores ? `${m.trabajadores.nombre} ${m.trabajadores.apellido_paterno || ''}`.trim() : 'Empleado', horas: 0 };
      existing.horas += m.horas_trabajadas || 0;
      byWorker.set(key, existing);
    });

    setWeekSummary(Array.from(byWorker.values()));
    setLoading(false);
  }, [empleadorId, currentDate]);

  useEffect(() => { loadData(); }, [loadData]);

  function changeDate(delta: number) {
    setCurrentDate((prev) => {
      const d = new Date(prev);
      d.setDate(d.getDate() + delta);
      return d;
    });
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-zinc-400" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Control de Horarios</h1>
          <p className="text-sm text-zinc-500 mt-1">Marcaje digital de entrada y salida</p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-700">
          <Calendar className="h-4 w-4 text-zinc-400" />
          <button onClick={() => changeDate(-1)} className="hover:text-zinc-900">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="font-medium">{formatDateLong(currentDate)}</span>
          <button onClick={() => changeDate(1)} className="hover:text-zinc-900">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Marcajes table */}
      <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-100 bg-zinc-50">
                <th className="px-4 py-3 text-left font-medium text-zinc-500">Empleado</th>
                <th className="px-4 py-3 text-left font-medium text-zinc-500">Entrada</th>
                <th className="px-4 py-3 text-left font-medium text-zinc-500">Salida</th>
                <th className="px-4 py-3 text-left font-medium text-zinc-500">Horas</th>
                <th className="px-4 py-3 text-left font-medium text-zinc-500">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {marcajes.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-zinc-400 text-sm">
                    No hay marcajes para este día
                  </td>
                </tr>
              ) : (
                marcajes.map((m) => {
                  const nombre = m.trabajadores ? `${m.trabajadores.nombre} ${m.trabajadores.apellido_paterno || ''}`.trim() : 'Empleado';
                  const estado = getEstado(m);
                  return (
                    <tr key={m.id} className="hover:bg-zinc-50 transition-colors">
                      <td className="px-4 py-3 font-medium text-zinc-900">{nombre}</td>
                      <td className="px-4 py-3 text-zinc-600">{m.hora_entrada ?? '-'}</td>
                      <td className="px-4 py-3 text-zinc-600">{m.hora_salida ?? '-'}</td>
                      <td className="px-4 py-3 text-zinc-600">{m.horas_trabajadas ? `${m.horas_trabajadas.toFixed(1)}h` : calcHours(m.hora_entrada, m.hora_salida)}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${estado.color}`}>
                          {estado.label}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Resumen Semanal */}
      {weekSummary.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-zinc-900 mb-4">Resumen Semanal</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {weekSummary.map((r, i) => {
              const totalEsperado = 45;
              const porcentaje = Math.min(Math.round((r.horas / totalEsperado) * 100), 100);
              return (
                <div key={i} className="rounded-xl border border-zinc-200 bg-white p-4">
                  <p className="text-sm font-medium text-zinc-900">{r.nombre}</p>
                  <p className="text-xs text-zinc-500 mt-1">{r.horas.toFixed(1)} hrs de {totalEsperado} hrs</p>
                  <div className="mt-3 h-2 w-full rounded-full bg-zinc-100">
                    <div className="h-2 rounded-full bg-emerald-500 transition-all" style={{ width: `${porcentaje}%` }} />
                  </div>
                  <p className="text-xs text-zinc-400 mt-1 text-right">{porcentaje}%</p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
