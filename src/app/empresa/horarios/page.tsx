'use client';

import { useState, useEffect, useCallback } from 'react';
import { Clock, Calendar, ChevronLeft, ChevronRight, ChevronDown, Loader2, Palmtree, Download, FileText, Printer, Share2 } from 'lucide-react';
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

function generateVacacionesDoc(emp: any, trab: any, vac: any) {
  const hoy = new Date().toLocaleDateString('es-CL');
  return `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>Comprobante de Feriado Legal</title>
<style>body{font-family:Arial,sans-serif;max-width:700px;margin:30px auto;padding:30px;color:#1a1a1a;font-size:13px}
h1{text-align:center;font-size:18px;margin-bottom:20px}
.info{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:20px 0;padding:16px;background:#f9fafb;border-radius:8px}
.clause{margin:16px 0;text-align:justify;line-height:1.6}
.sig{margin-top:60px;display:flex;justify-content:space-between}
.sig-block{text-align:center;width:40%;border-top:1px solid #333;padding-top:8px;font-size:12px}
@media print{body{margin:0;padding:20px}}</style></head><body>
<h1>COMPROBANTE DE FERIADO LEGAL ANUAL</h1>
<p style="text-align:center;color:#666;font-size:12px">Artículos 67 al 76, Código del Trabajo</p>
<div class="info">
<div><strong>Empleador:</strong> ${emp?.nombre || ''} ${emp?.apellido || ''}</div>
<div><strong>RUT Empleador:</strong> ${emp?.rut || ''}</div>
<div><strong>Trabajador(a):</strong> ${trab?.nombre || ''} ${trab?.apellido_paterno || ''}</div>
<div><strong>RUT Trabajador:</strong> ${trab?.rut || ''}</div>
</div>
<p class="clause">Por medio del presente, se deja constancia que el(la) trabajador(a) hará uso de su feriado legal anual conforme al artículo 67 del Código del Trabajo, en las siguientes condiciones:</p>
<div class="info">
<div><strong>Fecha inicio:</strong> ${vac.fecha_inicio ? new Date(vac.fecha_inicio).toLocaleDateString('es-CL') : ''}</div>
<div><strong>Fecha término:</strong> ${vac.fecha_fin ? new Date(vac.fecha_fin).toLocaleDateString('es-CL') : ''}</div>
<div><strong>Total días hábiles:</strong> ${vac.dias || 0}</div>
<div><strong>Fecha emisión:</strong> ${hoy}</div>
</div>
<p class="clause">El trabajador declara que este feriado corresponde al período anual en curso y que las fechas fueron acordadas con el empleador conforme a la normativa vigente. Durante el feriado, el trabajador percibirá la remuneración íntegra establecida en su contrato.</p>
<p class="clause">Ambas partes firman el presente comprobante en señal de conformidad.</p>
<div class="sig">
<div class="sig-block"><strong>${emp?.nombre || ''} ${emp?.apellido || ''}</strong><br>Empleador</div>
<div class="sig-block"><strong>${trab?.nombre || ''} ${trab?.apellido_paterno || ''}</strong><br>Trabajador(a)<br><em style="color:#666;font-size:10px">Firma digital registrada en Poppins</em></div>
</div></body></html>`;
}

function generateLdDoc(emp: any, trab: any, dia: any) {
  const hoy = new Date().toLocaleDateString('es-CL');
  const fechaDia = dia.fecha ? new Date(dia.fecha).toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : '';
  return `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>Constancia Día Libre Disposición</title>
<style>body{font-family:Arial,sans-serif;max-width:700px;margin:30px auto;padding:30px;color:#1a1a1a;font-size:13px}
h1{text-align:center;font-size:18px;margin-bottom:20px}
.info{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:20px 0;padding:16px;background:#f9fafb;border-radius:8px}
.clause{margin:16px 0;text-align:justify;line-height:1.6}
.legal{background:#eff6ff;border-left:4px solid #3b82f6;padding:12px 16px;margin:20px 0;border-radius:0 8px 8px 0;font-size:12px}
.sig{margin-top:60px;display:flex;justify-content:space-between}
.sig-block{text-align:center;width:40%;border-top:1px solid #333;padding-top:8px;font-size:12px}
@media print{body{margin:0;padding:20px}}</style></head><body>
<h1>CONSTANCIA DE DÍA DE LIBRE DISPOSICIÓN</h1>
<p style="text-align:center;color:#666;font-size:12px">Ley 21.561 — Reducción de Jornada Laboral</p>
<div class="info">
<div><strong>Empleador:</strong> ${emp?.nombre || ''} ${emp?.apellido || ''}</div>
<div><strong>RUT Empleador:</strong> ${emp?.rut || ''}</div>
<div><strong>Trabajador(a):</strong> ${trab?.nombre || ''} ${trab?.apellido_paterno || ''}</div>
<div><strong>RUT Trabajador:</strong> ${trab?.rut || ''}</div>
</div>
<p class="clause">Se deja constancia que el(la) trabajador(a) hizo uso de un día de libre disposición en la fecha:</p>
<div class="info">
<div><strong>Fecha:</strong> ${fechaDia}</div>
<div><strong>Fecha emisión:</strong> ${hoy}</div>
</div>
<div class="legal">
<strong>Marco Legal:</strong> Conforme a la Ley 21.561 que modifica el Código del Trabajo en materia de reducción de jornada laboral, los trabajadores de casa particular bajo modalidad "puertas adentro" tienen derecho a dos días de libre disposición remunerados al mes. Estos días no requieren justificación y son adicionales al feriado legal anual (Art. 67). El empleador está obligado a llevar registro de estos días.
</div>
<p class="clause">${dia.notas ? `Observaciones: ${dia.notas}` : ''}</p>
<div class="sig">
<div class="sig-block"><strong>${emp?.nombre || ''} ${emp?.apellido || ''}</strong><br>Empleador</div>
<div class="sig-block"><strong>${trab?.nombre || ''} ${trab?.apellido_paterno || ''}</strong><br>Trabajador(a)<br><em style="color:#666;font-size:10px">Firma digital registrada en Poppins</em></div>
</div></body></html>`;
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
  const [vacaciones, setVacaciones] = useState({ tomados: 0, pendientes: 15 });
  const [libreDisposicion, setLibreDisposicion] = useState({ tomados: 0, pendientes: 2 });
  const [salidaPendiente, setSalidaPendiente] = useState<any[]>([]);
  const [ldHistorico, setLdHistorico] = useState<any[]>([]);
  const [vacHistorico, setVacHistorico] = useState<any[]>([]);
  const [showLdHistorico, setShowLdHistorico] = useState(false);
  const [showVacHistorico, setShowVacHistorico] = useState(false);
  const [ldFilterMes, setLdFilterMes] = useState('todos');
  const [vacFilterMes, setVacFilterMes] = useState('todos');
  const [empleadorData, setEmpleadorData] = useState<any>(null);
  const [trabajadorData, setTrabajadorData] = useState<any>(null);
  const [vacEmpleados, setVacEmpleados] = useState<any[]>([]);

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

    // Vacaciones (15 días/año)
    const { data: vacData } = await supabase.from('solicitudes_empleado').select('dias')
      .eq('empleador_id', empleadorId).eq('tipo', 'vacaciones').eq('estado', 'aprobada');
    const vacTomados = (vacData || []).reduce((s: number, v: any) => s + (v.dias || 0), 0);
    setVacaciones({ tomados: vacTomados, pendientes: Math.max(0, 15 - vacTomados) });

    // Días libre disposición (2/mes - Ley 40h puertas adentro)
    const mesActual = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
    const { data: ldData } = await supabase.from('dias_libre_disposicion').select('id')
      .eq('empleador_id', empleadorId).eq('estado', 'tomado')
      .gte('fecha', mesActual + '-01').lte('fecha', mesActual + '-31');
    const ldTomados = ldData?.length || 0;
    setLibreDisposicion({ tomados: ldTomados, pendientes: Math.max(0, 2 - ldTomados) });

    // Salida pendiente — query INDEPENDIENTE del rango de vista, siempre para HOY
    const hoy = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD en hora local
    const { data: hoyData } = await supabase
      .from('marcajes_horario')
      .select('*, trabajadores(nombre, apellido_paterno)')
      .eq('empleador_id', empleadorId)
      .eq('fecha', hoy);
    const sinSalida = (hoyData || []).filter((m: any) => m.hora_entrada && !m.hora_salida);
    setSalidaPendiente(sinSalida);

    // Histórico libre disposición (todos los meses)
    const { data: ldAll } = await supabase.from('dias_libre_disposicion')
      .select('*').eq('empleador_id', empleadorId).order('fecha', { ascending: false });
    setLdHistorico(ldAll || []);

    // Histórico vacaciones aprobadas
    const { data: vacAll } = await supabase.from('solicitudes_empleado')
      .select('*, trabajadores(nombre, apellido_paterno)').eq('empleador_id', empleadorId)
      .eq('tipo', 'vacaciones').eq('estado', 'aprobada').order('fecha_inicio', { ascending: false });
    setVacHistorico(vacAll || []);

    // Datos para documentos
    const { data: empData } = await supabase.from('empleadores').select('*').eq('id', empleadorId).maybeSingle();
    setEmpleadorData(empData);
    const { data: contData } = await supabase.from('contratos')
      .select('trabajadores(*)').eq('empleador_id', empleadorId).eq('estado', 'activo').limit(1);
    if (contData?.[0]?.trabajadores) setTrabajadorData(contData[0].trabajadores);

    setLoading(false);
  }, [empleadorId, vista, year, month, weekStart, day]);

  useEffect(() => { loadMarcajes(); }, [loadMarcajes]);

  useEffect(() => {
    fetch('/api/buk/vacaciones').then((r) => r.json()).then((d) => { if (d?.ok) setVacEmpleados(d.items || []); }).catch(() => {});
  }, []);

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
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <StatCard label="Días Trabajados" value={String(diasTrabajados)} color="bg-emerald-500" />
        <StatCard label="Horas Totales" value={`${totalHoras.toFixed(1)}h`} color="bg-blue-500" />
        <StatCard label="Vacaciones" value={`${vacaciones.tomados}/${vacaciones.tomados + vacaciones.pendientes}`} color="bg-violet-500" />
        <StatCard label="Libre Disposición" value={`${libreDisposicion.tomados}/2 mes`} color="bg-cyan-500" />
        <StatCard label="Salida Pendiente" value={String(salidaPendiente.length)} color={salidaPendiente.length > 0 ? 'bg-red-500' : 'bg-zinc-400'} />
      </div>

      {/* Alerta salida pendiente */}
      {salidaPendiente.length > 0 && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4">
          <p className="text-sm font-semibold text-red-800 mb-2">Salida pendiente de registrar</p>
          {salidaPendiente.map((m: any) => {
            const nombre = m.trabajadores ? `${m.trabajadores.nombre} ${m.trabajadores.apellido_paterno || ''}` : 'Empleado';
            return (
              <div key={m.id} className="flex items-center justify-between text-sm">
                <span className="text-red-700">{nombre} — entrada {m.hora_entrada}, sin salida</span>
                <button onClick={async () => {
                  const supabase = createClient();
                  // Notificar al empleador
                  await supabase.from('notificaciones_push').insert({
                    destinatario_id: profile?.auth_user_id || '',
                    tipo: 'salida_pendiente',
                    titulo: `${nombre} no ha registrado salida`,
                    mensaje: `Entrada a las ${m.hora_entrada}. Recuérdale registrar su salida.`,
                  });
                  // Notificar al empleado
                  const { data: workerProfile } = await supabase.from('user_profiles').select('auth_user_id').eq('trabajador_id', m.trabajador_id).maybeSingle();
                  if (workerProfile?.auth_user_id) {
                    await supabase.from('notificaciones_push').insert({
                      destinatario_id: workerProfile.auth_user_id,
                      tipo: 'salida_pendiente',
                      titulo: 'Recuerda registrar tu salida',
                      mensaje: 'Tu empleador te recuerda registrar la salida de hoy.',
                    });
                  }
                  alert('Notificación enviada');
                }} className="text-xs bg-red-600 text-white px-3 py-1 rounded-lg hover:bg-red-700 transition">
                  Notificar
                </button>
              </div>
            );
          })}
        </div>
      )}

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

          {vacEmpleados.length > 0 && (
            <div className="rounded-xl border border-zinc-200 bg-white p-5">
              <div className="flex items-center gap-3 mb-4">
                <Palmtree className="w-5 h-5 text-violet-500" />
                <h3 className="text-sm font-semibold text-zinc-900">Vacaciones por empleado</h3>
              </div>
              <div className="space-y-4">
                {vacEmpleados.map((emp) => (
                  <div key={emp.trabajadorId} className="rounded-lg border border-zinc-100 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                      <p className="font-semibold text-zinc-900 text-sm">{emp.nombre}</p>
                      <div className="flex flex-wrap gap-1.5 text-[11px]">
                        <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">{emp.resumen.solicitadas} solicitadas</span>
                        <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">{emp.resumen.aprobadas} aprobadas</span>
                        <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">{emp.resumen.tomadas} tomadas ({emp.resumen.diasTomados}d)</span>
                        <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-700">{emp.resumen.rechazadas} rechazadas</span>
                      </div>
                    </div>
                    {emp.vacaciones.length === 0 ? (
                      <p className="text-xs text-zinc-400">Sin vacaciones registradas</p>
                    ) : (
                      <div className="space-y-1">
                        {emp.vacaciones.map((v, i) => {
                          const c = v.estado === 'tomada' ? 'bg-blue-100 text-blue-700' : v.estado === 'aprobada' ? 'bg-emerald-100 text-emerald-700' : v.estado === 'rechazada' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700';
                          return (
                            <div key={i} className="flex flex-wrap items-center gap-2 text-xs">
                              <span className={'px-2 py-0.5 rounded-full font-medium capitalize ' + c}>{v.estado}</span>
                              <span className="text-zinc-700 font-medium">{v.dias} días</span>
                              <span className="text-zinc-400">{v.desde || '—'} → {v.hasta || '—'}</span>
                              {v.tipo && <span className="text-zinc-400">· {v.tipo}</span>}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Vacaciones legales */}
          <div className="space-y-4">
            <div className="rounded-xl border border-zinc-200 bg-white p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <Palmtree className="w-5 h-5 text-emerald-500" />
                  <h3 className="text-sm font-semibold text-zinc-900">Vacaciones Legales (Art. 67)</h3>
                </div>
                <button onClick={() => setShowVacHistorico(!showVacHistorico)} className="text-xs text-violet-600 hover:underline">
                  {showVacHistorico ? 'Ocultar' : 'Ver historial'}
                </button>
              </div>
              <div className="grid grid-cols-3 gap-4 text-sm mb-3">
                <div><p className="text-zinc-500 text-xs">Derecho anual</p><p className="font-semibold text-zinc-900">15 días</p></div>
                <div><p className="text-zinc-500 text-xs">Tomados</p><p className="font-semibold text-emerald-600">{vacaciones.tomados}</p></div>
                <div><p className="text-zinc-500 text-xs">Pendientes</p><p className="font-semibold text-amber-600">{vacaciones.pendientes}</p></div>
              </div>
              <div className="h-2 rounded-full bg-zinc-100 mb-1">
                <div className="h-2 rounded-full bg-emerald-500 transition-all" style={{ width: `${(vacaciones.tomados / 15) * 100}%` }} />
              </div>
              <p className="text-[10px] text-zinc-400">Solicitud del empleado + aprobación del empleador = registro válido</p>

              {showVacHistorico && (() => {
                const mesesDisponibles = [...new Set(vacHistorico.map((v: any) => v.fecha_inicio?.substring(0, 7)))].filter(Boolean);
                const filtered = vacFilterMes === 'todos' ? vacHistorico : vacHistorico.filter((v: any) => v.fecha_inicio?.startsWith(vacFilterMes));
                const totalDiasFiltrado = filtered.reduce((s: number, v: any) => s + (v.dias || 0), 0);
                return (
                  <div className="mt-4 border-t border-zinc-100 pt-4">
                    <div className="flex items-center justify-between mb-3">
                      <select value={vacFilterMes} onChange={e => setVacFilterMes(e.target.value)} className="text-xs border border-zinc-200 rounded-lg px-2 py-1 bg-white">
                        <option value="todos">Todos los períodos</option>
                        {mesesDisponibles.map((m: string) => <option key={m} value={m}>{MESES[parseInt(m.split('-')[1]) - 1]} {m.split('-')[0]}</option>)}
                      </select>
                      <ReportButtons data={filtered} tipo="vacaciones" empleador={empleadorData} trabajador={trabajadorData} totalDias={totalDiasFiltrado} />
                    </div>
                    {filtered.length === 0 ? <p className="text-xs text-zinc-400">Sin registros en este período</p> : (
                      <div className="space-y-2">
                        {filtered.map((v: any) => (
                          <div key={v.id} className="flex items-center justify-between rounded-lg bg-zinc-50 px-3 py-2">
                            <div>
                              <p className="text-sm text-zinc-800">{v.trabajadores ? `${v.trabajadores.nombre} ${v.trabajadores.apellido_paterno || ''}` : ''} — {v.dias} días</p>
                              <p className="text-xs text-zinc-500">{new Date(v.fecha_inicio).toLocaleDateString('es-CL')} al {new Date(v.fecha_fin).toLocaleDateString('es-CL')}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>

            <div className="rounded-xl border border-zinc-200 bg-white p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <Calendar className="w-5 h-5 text-cyan-500" />
                  <h3 className="text-sm font-semibold text-zinc-900">Libre Disposición (Ley 21.561)</h3>
                </div>
                <button onClick={() => setShowLdHistorico(!showLdHistorico)} className="text-xs text-violet-600 hover:underline">
                  {showLdHistorico ? 'Ocultar' : 'Ver historial'}
                </button>
              </div>
              <p className="text-xs text-zinc-500 mb-3">2 días remunerados/mes · Solicitud + aceptación = registro válido</p>
              <div className="grid grid-cols-3 gap-4 text-sm mb-3">
                <div><p className="text-zinc-500 text-xs">Este mes</p><p className="font-semibold text-zinc-900">2 días</p></div>
                <div><p className="text-zinc-500 text-xs">Tomados</p><p className="font-semibold text-cyan-600">{libreDisposicion.tomados}</p></div>
                <div><p className="text-zinc-500 text-xs">Pendientes</p><p className="font-semibold text-amber-600">{libreDisposicion.pendientes}</p></div>
              </div>
              <div className="h-2 rounded-full bg-zinc-100">
                <div className="h-2 rounded-full bg-cyan-500 transition-all" style={{ width: `${(libreDisposicion.tomados / 2) * 100}%` }} />
              </div>

              {showLdHistorico && (() => {
                const mesesDisponibles = [...new Set(ldHistorico.map((d: any) => d.fecha?.substring(0, 7)))].filter(Boolean);
                const filtered = ldFilterMes === 'todos' ? ldHistorico : ldHistorico.filter((d: any) => d.fecha?.startsWith(ldFilterMes));
                return (
                  <div className="mt-4 border-t border-zinc-100 pt-4">
                    <div className="flex items-center justify-between mb-3">
                      <select value={ldFilterMes} onChange={e => setLdFilterMes(e.target.value)} className="text-xs border border-zinc-200 rounded-lg px-2 py-1 bg-white">
                        <option value="todos">Todos los meses</option>
                        {mesesDisponibles.map((m: string) => <option key={m} value={m}>{MESES[parseInt(m.split('-')[1]) - 1]} {m.split('-')[0]}</option>)}
                      </select>
                      <ReportButtons data={filtered} tipo="libre_disposicion" empleador={empleadorData} trabajador={trabajadorData} totalDias={filtered.length} />
                    </div>
                    {filtered.length === 0 ? <p className="text-xs text-zinc-400">Sin registros</p> : (
                      <div className="space-y-2">
                        {filtered.map((d: any) => (
                          <div key={d.id} className="rounded-lg bg-zinc-50 px-3 py-2">
                            <p className="text-sm text-zinc-800">{new Date(d.fecha).toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
                            <p className="text-xs text-zinc-500">{d.notas || 'Día de libre disposición'}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function ReportButtons({ data, tipo, empleador, trabajador, totalDias }: { data: any[]; tipo: string; empleador: any; trabajador: any; totalDias: number }) {
  const generateReport = () => {
    const hoy = new Date().toLocaleDateString('es-CL');
    const titulo = tipo === 'vacaciones' ? 'REPORTE DE VACACIONES LEGALES' : 'REPORTE DÍAS LIBRE DISPOSICIÓN';
    const ley = tipo === 'vacaciones' ? 'Art. 67-76 Código del Trabajo' : 'Ley 21.561';
    const rows = data.map((d: any) => {
      if (tipo === 'vacaciones') {
        const nombre = d.trabajadores ? `${d.trabajadores.nombre} ${d.trabajadores.apellido_paterno || ''}` : '';
        return `<tr><td>${nombre}</td><td>${new Date(d.fecha_inicio).toLocaleDateString('es-CL')}</td><td>${new Date(d.fecha_fin).toLocaleDateString('es-CL')}</td><td>${d.dias}</td></tr>`;
      }
      return `<tr><td>${new Date(d.fecha).toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' })}</td><td>${d.estado}</td><td>${d.notas || '-'}</td></tr>`;
    }).join('');
    const cols = tipo === 'vacaciones' ? '<th>Empleado</th><th>Desde</th><th>Hasta</th><th>Días</th>' : '<th>Fecha</th><th>Estado</th><th>Notas</th>';
    return `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>${titulo}</title>
<style>body{font-family:Arial,sans-serif;max-width:700px;margin:30px auto;padding:30px;font-size:13px}h1{text-align:center;font-size:18px}
.info{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:20px 0;padding:16px;background:#f9fafb;border-radius:8px}
table{width:100%;border-collapse:collapse;margin:20px 0}th{background:#f3f4f6;text-align:left;padding:8px;font-size:12px;border-bottom:2px solid #e5e7eb}
td{padding:8px;border-bottom:1px solid #e5e7eb}.total{font-weight:bold;background:#ecfdf5;font-size:14px}
@media print{body{margin:0;padding:20px}}</style></head><body>
<h1>${titulo}</h1><p style="text-align:center;color:#666;font-size:12px">${ley} · Emitido ${hoy}</p>
<div class="info"><div><strong>Empleador:</strong> ${empleador?.nombre || ''} ${empleador?.apellido || ''}</div>
<div><strong>RUT:</strong> ${empleador?.rut || ''}</div>
<div><strong>Trabajador:</strong> ${trabajador?.nombre || ''} ${trabajador?.apellido_paterno || ''}</div>
<div><strong>RUT:</strong> ${trabajador?.rut || ''}</div></div>
<table><thead><tr>${cols}</tr></thead><tbody>${rows}</tbody>
<tfoot><tr class="total"><td colspan="${tipo === 'vacaciones' ? 3 : 2}">Total</td><td>${totalDias} días</td></tr></tfoot></table>
<p style="text-align:center;font-size:11px;color:#999;margin-top:40px">Generado por Poppins · Registro basado en solicitud del empleado y aprobación del empleador</p></body></html>`;
  };

  const handlePrint = () => { const w = window.open('', '_blank'); if (w) { w.document.write(generateReport()); w.document.close(); setTimeout(() => w.print(), 400); } };

  const handleShare = () => {
    const text = `${tipo === 'vacaciones' ? 'Reporte Vacaciones' : 'Reporte Libre Disposición'}\n${totalDias} días registrados\nEmpleador: ${empleador?.nombre || ''}\nTrabajador: ${trabajador?.nombre || ''}\n\nGenerado por Poppins`;
    if (navigator.share) { navigator.share({ title: 'Reporte Poppins', text }).catch(() => {}); }
    else { window.open(`mailto:?subject=Reporte Poppins&body=${encodeURIComponent(text)}`, '_blank'); }
  };

  if (data.length === 0) return null;
  return (
    <div className="flex gap-1">
      <button onClick={handlePrint} className="p-1.5 rounded-lg hover:bg-zinc-100 text-zinc-500 transition" title="Imprimir"><Printer className="w-3.5 h-3.5" /></button>
      <button onClick={handlePrint} className="p-1.5 rounded-lg hover:bg-zinc-100 text-zinc-500 transition" title="Descargar"><Download className="w-3.5 h-3.5" /></button>
      <button onClick={handleShare} className="p-1.5 rounded-lg hover:bg-zinc-100 text-zinc-500 transition" title="Compartir"><Share2 className="w-3.5 h-3.5" /></button>
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
