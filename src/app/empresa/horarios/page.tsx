'use client';

import { useState, useEffect, useCallback } from 'react';
import { Clock, Calendar, ChevronLeft, ChevronRight, ChevronDown, Loader2, Palmtree } from 'lucide-react';
import { useAuth } from '@/lib/auth/context';
import { createClient } from '@/lib/supabase/client';

const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const DIAS_SEM = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

type Vista = 'anual' | 'mensual' | 'semanal' | 'diario';

interface Marcaje {
  id: string;
  trabajador_id: string;
  fecha: string;
  hora_entrada: string | null;
  hora_salida: string | null;
  hora_salida_colacion: string | null;
  hora_regreso_colacion: string | null;
  horas_trabajadas: number | null;
  trabajadores?: { nombre: string; apellido_paterno: string } | null;
}

export default function HorariosPage() {
  const { profile } = useAuth();
  const empleadorId = profile?.empleador_id;
  const [vista, setVista] = useState<Vista>('mensual');
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth());
  const [weekStart, setWeekStart] = useState<Date>(() => {
    const d = new Date(); d.setDate(d.getDate() - d.getDay() + 1); return d;
  });
  const [day, setDay] = useState(new Date());
  const [marcajes, setMarcajes] = useState<Marcaje[]>([]);
  const [loading, setLoading] = useState(true);
  const [diasLibresLegales, setDiasLibresLegales] = useState({ tomados: 0, pendientes: 0 });

  const loadMarcajes = useCallback(async () => {
    if (!empleadorId) return;
    setLoading(true);
    const supabase = createClient();

    let desde: string, hasta: string;
    if (vista === 'anual') {
      desde = `${year}-01-01`; hasta = `${year}-12-31`;
    } else if (vista === 'mensual') {
      desde = `${year}-${String(month + 1).padStart(2, '0')}-01`;
      const last = new Date(year, month + 1, 0);
      hasta = `${year}-${String(month + 1).padStart(2, '0')}-${String(last.getDate()).padStart(2, '0')}`;
    } else if (vista === 'semanal') {
      desde = weekStart.toISOString().split('T')[0];
      const end = new Date(weekStart); end.setDate(end.getDate() + 6);
      hasta = end.toISOString().split('T')[0];
    } else {
      desde = hasta = day.toISOString().split('T')[0];
    }

    const { data } = await supabase
      .from('marcajes_horario')
      .select('*, trabajadores(nombre, apellido_paterno)')
      .eq('empleador_id', empleadorId)
      .gte('fecha', desde).lte('fecha', hasta)
      .order('fecha', { ascending: false });

    setMarcajes(data || []);

    // Días libres legales (domingos + feriados trabajados necesitan descanso compensatorio)
    const { data: vacData } = await supabase
      .from('solicitudes_empleado')
      .select('dias')
      .eq('empleador_id', empleadorId)
      .eq('tipo', 'vacaciones').eq('estado', 'aprobada');
    const tomados = (vacData || []).reduce((s: number, v: any) => s + (v.dias || 0), 0);
    setDiasLibresLegales({ tomados, pendientes: Math.max(0, 15 - tomados) });

    setLoading(false);
  }, [empleadorId, vista, year, month, weekStart, day]);

  useEffect(() => { loadMarcajes(); }, [loadMarcajes]);

  // Aggregate helpers
  const totalHoras = marcajes.reduce((s, m) => s + (m.horas_trabajadas || 0), 0);
  const diasTrabajados = marcajes.filter(m => m.hora_entrada).length;
  const byWorker = new Map<string, { nombre: string; horas: number; dias: number }>();
  marcajes.forEach(m => {
    const key = m.trabajador_id;
    const nombre = m.trabajadores ? `${m.trabajadores.nombre} ${m.trabajadores.apellido_paterno || ''}`.trim() : 'Empleado';
    const ex = byWorker.get(key) || { nombre, horas: 0, dias: 0 };
    ex.horas += m.horas_trabajadas || 0;
    if (m.hora_entrada) ex.dias++;
    byWorker.set(key, ex);
  });

  // Drill-down handlers
  const drillToMonth = (m: number) => { setMonth(m); setVista('mensual'); };
  const drillToWeek = (d: Date) => { const w = new Date(d); w.setDate(w.getDate() - w.getDay() + 1); setWeekStart(w); setVista('semanal'); };
  const drillToDay = (d: Date) => { setDay(d); setVista('diario'); };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Control de Horarios</h1>
          <p className="text-sm text-zinc-500">Asistencia y horas trabajadas</p>
        </div>
        <div className="flex items-center gap-2">
          {(['anual', 'mensual', 'semanal', 'diario'] as const).map(v => (
            <button key={v} onClick={() => setVista(v)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${vista === v ? 'bg-zinc-900 text-white' : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'}`}>
              {v.charAt(0).toUpperCase() + v.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center gap-3 text-sm">
        {vista === 'anual' && (
          <>
            <button onClick={() => setYear(y => y - 1)} className="p-1 hover:bg-zinc-100 rounded"><ChevronLeft className="w-4 h-4" /></button>
            <span className="font-semibold text-zinc-900">{year}</span>
            <button onClick={() => setYear(y => y + 1)} className="p-1 hover:bg-zinc-100 rounded"><ChevronRight className="w-4 h-4" /></button>
          </>
        )}
        {vista === 'mensual' && (
          <>
            <button onClick={() => { if (month === 0) { setYear(y => y - 1); setMonth(11); } else setMonth(m => m - 1); }} className="p-1 hover:bg-zinc-100 rounded"><ChevronLeft className="w-4 h-4" /></button>
            <span className="font-semibold text-zinc-900">{MESES[month]} {year}</span>
            <button onClick={() => { if (month === 11) { setYear(y => y + 1); setMonth(0); } else setMonth(m => m + 1); }} className="p-1 hover:bg-zinc-100 rounded"><ChevronRight className="w-4 h-4" /></button>
          </>
        )}
        {vista === 'semanal' && (
          <>
            <button onClick={() => setWeekStart(d => { const n = new Date(d); n.setDate(n.getDate() - 7); return n; })} className="p-1 hover:bg-zinc-100 rounded"><ChevronLeft className="w-4 h-4" /></button>
            <span className="font-semibold text-zinc-900">Semana del {weekStart.toLocaleDateString('es-CL')}</span>
            <button onClick={() => setWeekStart(d => { const n = new Date(d); n.setDate(n.getDate() + 7); return n; })} className="p-1 hover:bg-zinc-100 rounded"><ChevronRight className="w-4 h-4" /></button>
          </>
        )}
        {vista === 'diario' && (
          <>
            <button onClick={() => setDay(d => { const n = new Date(d); n.setDate(n.getDate() - 1); return n; })} className="p-1 hover:bg-zinc-100 rounded"><ChevronLeft className="w-4 h-4" /></button>
            <span className="font-semibold text-zinc-900">{day.toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span>
            <button onClick={() => setDay(d => { const n = new Date(d); n.setDate(n.getDate() + 1); return n; })} className="p-1 hover:bg-zinc-100 rounded"><ChevronRight className="w-4 h-4" /></button>
          </>
        )}
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Días Trabajados" value={String(diasTrabajados)} color="bg-emerald-500" />
        <StatCard label="Horas Totales" value={`${totalHoras.toFixed(1)}h`} color="bg-blue-500" />
        <StatCard label="Vacaciones Tomadas" value={`${diasLibresLegales.tomados} días`} color="bg-violet-500" />
        <StatCard label="Vacaciones Pendientes" value={`${diasLibresLegales.pendientes} días`} color="bg-amber-500" />
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-zinc-400" /></div>
      ) : (
        <>
          {/* ANUAL: grid de meses clickeables */}
          {vista === 'anual' && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {MESES.map((mes, i) => {
                const marcajesMes = marcajes.filter(m => new Date(m.fecha).getMonth() === i);
                const hrs = marcajesMes.reduce((s, m) => s + (m.horas_trabajadas || 0), 0);
                const dias = marcajesMes.filter(m => m.hora_entrada).length;
                return (
                  <button key={i} onClick={() => drillToMonth(i)}
                    className="rounded-xl border border-zinc-200 bg-white p-4 text-left hover:shadow-md transition">
                    <p className="text-sm font-semibold text-zinc-900">{mes}</p>
                    <p className="text-xs text-zinc-500 mt-1">{dias} días · {hrs.toFixed(0)}h</p>
                    <div className="mt-2 h-1.5 rounded-full bg-zinc-100">
                      <div className="h-1.5 rounded-full bg-emerald-500" style={{ width: `${Math.min(100, (hrs / 180) * 100)}%` }} />
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* MENSUAL: tabla por día, click va a diario */}
          {vista === 'mensual' && (
            <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
              <table className="w-full text-sm">
                <thead><tr className="border-b bg-zinc-50">
                  <th className="px-4 py-2 text-left font-medium text-zinc-500">Fecha</th>
                  <th className="px-4 py-2 text-left font-medium text-zinc-500">Empleado</th>
                  <th className="px-4 py-2 text-left font-medium text-zinc-500">Entrada</th>
                  <th className="px-4 py-2 text-left font-medium text-zinc-500">Salida</th>
                  <th className="px-4 py-2 text-left font-medium text-zinc-500">Horas</th>
                </tr></thead>
                <tbody className="divide-y divide-zinc-100">
                  {marcajes.length === 0 ? (
                    <tr><td colSpan={5} className="px-4 py-8 text-center text-zinc-400">Sin marcajes este mes</td></tr>
                  ) : marcajes.map(m => (
                    <tr key={m.id} className="hover:bg-zinc-50 cursor-pointer" onClick={() => drillToDay(new Date(m.fecha))}>
                      <td className="px-4 py-2 font-medium">{new Date(m.fecha).toLocaleDateString('es-CL', { weekday: 'short', day: 'numeric' })}</td>
                      <td className="px-4 py-2">{m.trabajadores ? `${m.trabajadores.nombre} ${m.trabajadores.apellido_paterno || ''}` : '-'}</td>
                      <td className="px-4 py-2">{m.hora_entrada || '-'}</td>
                      <td className="px-4 py-2">{m.hora_salida || '-'}</td>
                      <td className="px-4 py-2">{m.horas_trabajadas ? `${m.horas_trabajadas.toFixed(1)}h` : '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* SEMANAL: resumen por empleado con barra */}
          {vista === 'semanal' && (
            <div className="space-y-4">
              {Array.from(byWorker.values()).map((w, i) => (
                <div key={i} className="rounded-xl border border-zinc-200 bg-white p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-semibold text-zinc-900">{w.nombre}</p>
                    <p className="text-sm text-zinc-600">{w.horas.toFixed(1)}h / {w.dias} días</p>
                  </div>
                  <div className="h-2 rounded-full bg-zinc-100">
                    <div className="h-2 rounded-full bg-emerald-500 transition-all" style={{ width: `${Math.min(100, (w.horas / 45) * 100)}%` }} />
                  </div>
                </div>
              ))}
              {byWorker.size === 0 && <p className="text-sm text-zinc-400 text-center py-8">Sin marcajes esta semana</p>}
              {/* Daily breakdown */}
              <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
                <table className="w-full text-sm">
                  <thead><tr className="border-b bg-zinc-50">
                    <th className="px-4 py-2 text-left font-medium text-zinc-500">Día</th>
                    <th className="px-4 py-2 text-left font-medium text-zinc-500">Entrada</th>
                    <th className="px-4 py-2 text-left font-medium text-zinc-500">Salida</th>
                    <th className="px-4 py-2 text-left font-medium text-zinc-500">Horas</th>
                  </tr></thead>
                  <tbody className="divide-y divide-zinc-100">
                    {marcajes.map(m => (
                      <tr key={m.id} className="hover:bg-zinc-50 cursor-pointer" onClick={() => drillToDay(new Date(m.fecha))}>
                        <td className="px-4 py-2 font-medium">{new Date(m.fecha).toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'short' })}</td>
                        <td className="px-4 py-2">{m.hora_entrada || '-'}</td>
                        <td className="px-4 py-2">{m.hora_salida || '-'}</td>
                        <td className="px-4 py-2">{m.horas_trabajadas ? `${m.horas_trabajadas.toFixed(1)}h` : '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* DIARIO: detalle completo */}
          {vista === 'diario' && (
            <div className="space-y-4">
              {marcajes.length === 0 ? (
                <div className="rounded-xl border border-zinc-200 bg-white p-8 text-center">
                  <Clock className="w-8 h-8 text-zinc-300 mx-auto mb-2" />
                  <p className="text-sm text-zinc-400">Sin marcajes este día</p>
                </div>
              ) : marcajes.map(m => {
                const nombre = m.trabajadores ? `${m.trabajadores.nombre} ${m.trabajadores.apellido_paterno || ''}` : 'Empleado';
                return (
                  <div key={m.id} className="rounded-xl border border-zinc-200 bg-white p-5">
                    <p className="text-sm font-semibold text-zinc-900 mb-3">{nombre}</p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div><span className="text-zinc-500 block text-xs">Entrada</span><span className="font-medium">{m.hora_entrada || '-'}</span></div>
                      <div><span className="text-zinc-500 block text-xs">Salida Colación</span><span className="font-medium">{m.hora_salida_colacion || '-'}</span></div>
                      <div><span className="text-zinc-500 block text-xs">Regreso Colación</span><span className="font-medium">{m.hora_regreso_colacion || '-'}</span></div>
                      <div><span className="text-zinc-500 block text-xs">Salida</span><span className="font-medium">{m.hora_salida || '-'}</span></div>
                    </div>
                    {m.horas_trabajadas && (
                      <p className="mt-3 text-sm text-zinc-600">Total: <strong>{m.horas_trabajadas.toFixed(1)} horas</strong></p>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Días libres legales */}
          <div className="rounded-xl border border-zinc-200 bg-white p-5">
            <div className="flex items-center gap-3 mb-3">
              <Palmtree className="w-5 h-5 text-emerald-500" />
              <h3 className="text-sm font-semibold text-zinc-900">Días Libres Legales</h3>
            </div>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-zinc-500 text-xs">Derecho anual</p>
                <p className="font-semibold text-zinc-900">15 días hábiles</p>
              </div>
              <div>
                <p className="text-zinc-500 text-xs">Tomados</p>
                <p className="font-semibold text-emerald-600">{diasLibresLegales.tomados} días</p>
              </div>
              <div>
                <p className="text-zinc-500 text-xs">Pendientes</p>
                <p className="font-semibold text-amber-600">{diasLibresLegales.pendientes} días</p>
              </div>
            </div>
            <div className="mt-3 h-2 rounded-full bg-zinc-100">
              <div className="h-2 rounded-full bg-emerald-500 transition-all" style={{ width: `${(diasLibresLegales.tomados / 15) * 100}%` }} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4">
      <div className={`w-8 h-8 rounded-lg ${color} flex items-center justify-center mb-2`}>
        <Clock className="w-4 h-4 text-white" />
      </div>
      <p className="text-lg font-bold text-zinc-900">{value}</p>
      <p className="text-xs text-zinc-500">{label}</p>
    </div>
  );
}
