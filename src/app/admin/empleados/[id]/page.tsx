'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth/context';
import { createClient } from '@/lib/supabase/client';
import {
  ArrowLeft, Loader2, User, FileText, Calendar, Clock, Star,
  DollarSign, Briefcase, Shield, MapPin, Phone, Mail, CreditCard,
  TrendingUp, TrendingDown,
} from 'lucide-react';

type TabKey = 'ficha' | 'contrato' | 'liquidaciones' | 'asistencia' | 'calificaciones';

const cargoLabel: Record<string, string> = {
  asesora_hogar: 'Asesora del Hogar',
  jardinero: 'Jardinero/a',
  piscinero: 'Piscinero/a',
};

function formatCLP(n: number) { return '$' + (n ?? 0).toLocaleString('es-CL'); }

function calcAntiguedad(fecha: string): string {
  const start = new Date(fecha), now = new Date();
  const months = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
  const y = Math.floor(months / 12), m = months % 12;
  if (y === 0) return `${m} meses`;
  return `${y} año${y > 1 ? 's' : ''}${m > 0 ? `, ${m} mes${m > 1 ? 'es' : ''}` : ''}`;
}

export default function AdminEmpleadoDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { profile, loading: authLoading } = useAuth();
  const [worker, setWorker] = useState<any>(null);
  const [contrato, setContrato] = useState<any>(null);
  const [empleador, setEmpleador] = useState<any>(null);
  const [liquidaciones, setLiquidaciones] = useState<any[]>([]);
  const [marcajes, setMarcajes] = useState<any[]>([]);
  const [visitas, setVisitas] = useState<any[]>([]);
  const [tareas, setTareas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabKey>('ficha');

  const loadData = useCallback(async () => {
    if (!id) return;
    const supabase = createClient();
    const [wRes, cRes, lRes, mRes] = await Promise.all([
      supabase.from('trabajadores').select('*').eq('id', id).single(),
      supabase.from('contratos').select('*, empleadores(id, nombre, rut, email, telefono, direccion, comuna)').eq('trabajador_id', id).eq('estado', 'activo').single(),
      supabase.from('liquidaciones').select('*').eq('trabajador_id', id).order('periodo', { ascending: false }).limit(24),
      supabase.from('marcajes_horario').select('*').eq('trabajador_id', id).order('fecha', { ascending: false }).limit(90),
    ]);
    setWorker(wRes.data);
    setContrato(cRes.data);
    setLiquidaciones(lRes.data || []);
    setMarcajes(mRes.data || []);

    // Employer from contract
    if (cRes.data?.empleadores) {
      setEmpleador(cRes.data.empleadores);
    } else if (cRes.data?.empleador_id) {
      const { data: empData } = await supabase.from('empleadores').select('*').eq('id', cRes.data.empleador_id).single();
      setEmpleador(empData);
    }

    // Visitas for service workers
    const cargo = (wRes.data?.cargo || '').toLowerCase();
    if (cargo.includes('piscin') || cargo.includes('jardin') || cargo === 'otro') {
      const { data: visitasData } = await supabase.from('visitas_servicio')
        .select('*').eq('trabajador_id', id).order('fecha', { ascending: false });
      setVisitas(visitasData || []);
    }

    // Tareas with calificaciones
    const empId = cRes.data?.empleador_id;
    if (empId) {
      const { data: tareasData } = await supabase.from('tareas')
        .select('*')
        .eq('trabajador_id', id)
        .not('calificacion', 'is', null)
        .order('created_at', { ascending: false })
        .limit(50);
      setTareas(tareasData || []);
    }

    setLoading(false);
  }, [id]);

  useEffect(() => {
    if (!authLoading && profile?.rol === 'admin') loadData();
  }, [authLoading, profile, loadData]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-zinc-400" />
      </div>
    );
  }

  if (!profile || profile.rol !== 'admin') {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center">
        <p className="text-zinc-500">Acceso restringido a administradores.</p>
      </div>
    );
  }

  if (!worker) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center">
        <p className="text-zinc-500">Trabajador no encontrado.</p>
      </div>
    );
  }

  const cargo = worker.cargo || 'otro';
  const isServiceWorker = cargo.includes('piscin') || cargo.includes('jardin');
  const tabs: { key: TabKey; label: string }[] = [
    { key: 'ficha', label: 'Ficha' },
    { key: 'contrato', label: 'Contrato' },
    { key: 'liquidaciones', label: 'Liquidaciones' },
    { key: 'asistencia', label: isServiceWorker ? 'Visitas' : 'Asistencia' },
    { key: 'calificaciones', label: 'Calificaciones' },
  ];

  // Calificaciones stats
  const avgRating = tareas.length > 0
    ? tareas.reduce((s, t) => s + (t.calificacion || 0), 0) / tareas.length
    : 0;
  const recentTareas = tareas.slice(0, 10);
  const olderTareas = tareas.slice(10, 20);
  const recentAvg = recentTareas.length > 0
    ? recentTareas.reduce((s, t) => s + (t.calificacion || 0), 0) / recentTareas.length
    : 0;
  const olderAvg = olderTareas.length > 0
    ? olderTareas.reduce((s, t) => s + (t.calificacion || 0), 0) / olderTareas.length
    : 0;
  const trend = recentAvg - olderAvg;

  return (
    <div className="min-h-screen bg-zinc-50">
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Link href="/admin/empleados" className="text-zinc-400 hover:text-zinc-600 transition">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-zinc-900">
              {worker.nombre} {worker.apellido_paterno} {worker.apellido_materno || ''}
            </h1>
            <p className="text-sm text-zinc-500">
              {cargoLabel[cargo] || cargo} &middot; RUT {worker.rut}
            </p>
          </div>
          <span className={`px-3 py-1 rounded-full text-xs font-medium ${worker.estado === 'activo' ? 'bg-emerald-100 text-emerald-700' : 'bg-zinc-100 text-zinc-600'}`}>
            {worker.estado}
          </span>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 overflow-x-auto">
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition ${
                tab === t.key ? 'bg-violet-600 text-white' : 'bg-white border border-zinc-200 text-zinc-600 hover:bg-zinc-50'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {tab === 'ficha' && (
          <div className="space-y-4">
            {/* Personal */}
            <div className="rounded-xl border border-zinc-200 bg-white p-6">
              <h2 className="text-lg font-semibold text-zinc-900 mb-4 flex items-center gap-2">
                <User className="w-5 h-5 text-violet-500" /> Datos Personales
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                <Field label="Nombre completo" value={`${worker.nombre} ${worker.apellido_paterno} ${worker.apellido_materno || ''}`} />
                <Field label="RUT" value={worker.rut} />
                <Field label="Fecha nacimiento" value={worker.fecha_nacimiento || '—'} />
                <Field label="Nacionalidad" value={worker.nacionalidad || 'Chilena'} />
                <Field label="Estado civil" value={worker.estado_civil || '—'} />
                <Field label="Genero" value={worker.genero || '—'} />
                <Field label="Email" value={worker.email || '—'} icon={<Mail className="w-3.5 h-3.5" />} />
                <Field label="Telefono" value={worker.telefono || '—'} icon={<Phone className="w-3.5 h-3.5" />} />
                <Field label="Direccion" value={worker.direccion || '—'} icon={<MapPin className="w-3.5 h-3.5" />} />
                <Field label="Comuna" value={worker.comuna || '—'} />
                <Field label="Region" value={worker.region || '—'} />
                <Field label="Nivel educacion" value={worker.nivel_educacion || '—'} />
              </div>
            </div>
            {/* Bank */}
            <div className="rounded-xl border border-zinc-200 bg-white p-6">
              <h2 className="text-lg font-semibold text-zinc-900 mb-4 flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-emerald-500" /> Datos Bancarios
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                <Field label="Banco" value={worker.banco || '—'} />
                <Field label="Tipo cuenta" value={worker.tipo_cuenta || '—'} />
                <Field label="N cuenta" value={worker.numero_cuenta || '—'} />
              </div>
            </div>
            {/* Previsional */}
            <div className="rounded-xl border border-zinc-200 bg-white p-6">
              <h2 className="text-lg font-semibold text-zinc-900 mb-4 flex items-center gap-2">
                <Shield className="w-5 h-5 text-blue-500" /> Datos Previsionales
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                <Field label="AFP" value={worker.afp_id || '—'} />
                <Field label="Salud" value={worker.salud_id || '—'} />
                <Field label="Plan salud (UF)" value={worker.salud_plan_uf ? `${worker.salud_plan_uf} UF` : '—'} />
                <Field label="Cargas familiares" value={String(worker.cargas_familiares || 0)} />
                <Field label="Puertas adentro" value={worker.puertas_adentro ? 'Si' : 'No'} />
              </div>
            </div>
          </div>
        )}

        {tab === 'contrato' && (
          <div className="rounded-xl border border-zinc-200 bg-white p-6">
            {contrato ? (
              <div className="space-y-6">
                <h2 className="text-lg font-semibold text-zinc-900 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-violet-500" /> Contrato
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                  <Field label="N contrato" value={contrato.numero_contrato || '—'} />
                  <Field label="Tipo" value={contrato.tipo_contrato} />
                  <Field label="Estado" value={contrato.estado} />
                  <Field label="Fecha inicio" value={contrato.fecha_inicio} />
                  <Field label="Fecha termino" value={contrato.fecha_termino || 'Indefinido'} />
                  <Field label="Antiguedad" value={calcAntiguedad(contrato.fecha_inicio)} />
                  <Field label="Sueldo base" value={formatCLP(contrato.sueldo_base)} />
                  <Field label="Colacion" value={formatCLP(contrato.colacion)} />
                  <Field label="Movilizacion" value={formatCLP(contrato.movilizacion)} />
                  <Field label="Horas semanales" value={String(contrato.horas_semanales || 45)} />
                  <Field label="Jornada" value={contrato.jornada || '—'} />
                  <Field label="Puertas adentro" value={contrato.puertas_adentro ? 'Si' : 'No'} />
                </div>
                {/* Employer info */}
                {empleador && (
                  <div className="mt-6 pt-6 border-t border-zinc-100">
                    <h3 className="text-sm font-semibold text-zinc-700 mb-3 flex items-center gap-2">
                      <Briefcase className="w-4 h-4 text-zinc-400" /> Empleador
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                      <Field label="Nombre" value={empleador.nombre} />
                      <Field label="RUT" value={empleador.rut} />
                      <Field label="Email" value={empleador.email || '—'} />
                      <Field label="Telefono" value={empleador.telefono || '—'} />
                      <Field label="Direccion" value={empleador.direccion || '—'} />
                      <Field label="Comuna" value={empleador.comuna || '—'} />
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-zinc-400 text-center py-8">Sin contrato activo.</p>
            )}
          </div>
        )}

        {tab === 'liquidaciones' && (
          <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
            <div className="p-4 border-b border-zinc-100 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-zinc-900 flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-emerald-500" /> Historial Liquidaciones
              </h2>
              <span className="text-xs text-zinc-400">{liquidaciones.length} registros</span>
            </div>
            {liquidaciones.length === 0 ? (
              <p className="text-zinc-400 text-center py-8">Sin liquidaciones.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-zinc-100 bg-zinc-50/50">
                      <th className="text-left px-4 py-3 font-medium text-zinc-500">Periodo</th>
                      <th className="text-right px-4 py-3 font-medium text-zinc-500">Sueldo Base</th>
                      <th className="text-right px-4 py-3 font-medium text-zinc-500">Total Haberes</th>
                      <th className="text-right px-4 py-3 font-medium text-zinc-500">Descuentos</th>
                      <th className="text-right px-4 py-3 font-medium text-zinc-500">Liquido</th>
                      <th className="text-left px-4 py-3 font-medium text-zinc-500">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {liquidaciones.map(l => (
                      <tr key={l.id} className="border-b border-zinc-50 hover:bg-zinc-50/50">
                        <td className="px-4 py-3 font-medium text-zinc-900">{l.periodo}</td>
                        <td className="px-4 py-3 text-right text-zinc-600">{formatCLP(l.sueldo_base)}</td>
                        <td className="px-4 py-3 text-right text-zinc-600">{formatCLP(l.total_haberes)}</td>
                        <td className="px-4 py-3 text-right text-rose-600">{formatCLP(l.total_descuentos)}</td>
                        <td className="px-4 py-3 text-right font-medium text-zinc-900">{formatCLP(l.liquido_pagar || l.sueldo_liquido)}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${l.estado === 'pagado' ? 'bg-emerald-100 text-emerald-700' : l.estado === 'aprobado' ? 'bg-blue-100 text-blue-700' : 'bg-zinc-100 text-zinc-600'}`}>
                            {l.estado}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-zinc-50/80 border-t border-zinc-200">
                      <td className="px-4 py-3 font-semibold text-zinc-700">Total</td>
                      <td className="px-4 py-3 text-right font-semibold text-zinc-700">{formatCLP(liquidaciones.reduce((s, l) => s + l.sueldo_base, 0))}</td>
                      <td className="px-4 py-3 text-right font-semibold text-zinc-700">{formatCLP(liquidaciones.reduce((s, l) => s + l.total_haberes, 0))}</td>
                      <td className="px-4 py-3 text-right font-semibold text-rose-700">{formatCLP(liquidaciones.reduce((s, l) => s + l.total_descuentos, 0))}</td>
                      <td className="px-4 py-3 text-right font-bold text-zinc-900">{formatCLP(liquidaciones.reduce((s, l) => s + (l.liquido_pagar || l.sueldo_liquido), 0))}</td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        )}

        {tab === 'asistencia' && (
          <div className="rounded-xl border border-zinc-200 bg-white p-6">
            <h2 className="text-lg font-semibold text-zinc-900 mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-500" /> {isServiceWorker ? 'Visitas de Servicio' : 'Marcajes de Asistencia'}
            </h2>
            {isServiceWorker ? (
              visitas.length === 0 ? (
                <p className="text-zinc-400 text-center py-8">Sin visitas registradas.</p>
              ) : (
                <div className="space-y-3">
                  {visitas.map(v => (
                    <div key={v.id} className="rounded-lg border border-zinc-100 p-4">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-zinc-900">{v.fecha}</span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${v.estado === 'completada' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                          {v.estado}
                        </span>
                      </div>
                      <p className="text-sm text-zinc-500">{v.descripcion || v.notas || 'Sin notas'}</p>
                      {v.hora_inicio && <p className="text-xs text-zinc-400 mt-1">{v.hora_inicio} - {v.hora_fin || '...'}</p>}
                    </div>
                  ))}
                </div>
              )
            ) : (
              marcajes.length === 0 ? (
                <p className="text-zinc-400 text-center py-8">Sin marcajes registrados.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-zinc-100">
                        <th className="text-left px-4 py-2 font-medium text-zinc-500">Fecha</th>
                        <th className="text-left px-4 py-2 font-medium text-zinc-500">Entrada</th>
                        <th className="text-left px-4 py-2 font-medium text-zinc-500">Salida</th>
                        <th className="text-left px-4 py-2 font-medium text-zinc-500">Horas</th>
                      </tr>
                    </thead>
                    <tbody>
                      {marcajes.map(m => {
                        const hrs = m.hora_entrada && m.hora_salida
                          ? ((new Date(`2000-01-01T${m.hora_salida}`).getTime() - new Date(`2000-01-01T${m.hora_entrada}`).getTime()) / 3600000).toFixed(1)
                          : '—';
                        return (
                          <tr key={m.id} className="border-b border-zinc-50">
                            <td className="px-4 py-2 text-zinc-900">{m.fecha}</td>
                            <td className="px-4 py-2 text-zinc-600">{m.hora_entrada || '—'}</td>
                            <td className="px-4 py-2 text-zinc-600">{m.hora_salida || '—'}</td>
                            <td className="px-4 py-2 text-zinc-500">{hrs}h</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )
            )}
          </div>
        )}

        {tab === 'calificaciones' && (
          <div className="space-y-4">
            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="rounded-xl border border-zinc-200 bg-white p-5">
                <div className="flex items-center gap-2 mb-1">
                  <Star className="w-4 h-4 text-amber-500" />
                  <span className="text-xs text-zinc-500">Promedio General</span>
                </div>
                <p className="text-3xl font-bold text-zinc-900">{avgRating.toFixed(1)}</p>
                <p className="text-xs text-zinc-400">{tareas.length} calificaciones</p>
              </div>
              <div className="rounded-xl border border-zinc-200 bg-white p-5">
                <div className="flex items-center gap-2 mb-1">
                  {trend >= 0 ? <TrendingUp className="w-4 h-4 text-emerald-500" /> : <TrendingDown className="w-4 h-4 text-rose-500" />}
                  <span className="text-xs text-zinc-500">Tendencia</span>
                </div>
                <p className={`text-3xl font-bold ${trend >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {trend >= 0 ? '+' : ''}{trend.toFixed(1)}
                </p>
                <p className="text-xs text-zinc-400">ultimas 10 vs anteriores</p>
              </div>
              <div className="rounded-xl border border-zinc-200 bg-white p-5">
                <div className="flex items-center gap-2 mb-1">
                  <Star className="w-4 h-4 text-violet-500" />
                  <span className="text-xs text-zinc-500">Promedio Reciente</span>
                </div>
                <p className="text-3xl font-bold text-zinc-900">{recentAvg.toFixed(1)}</p>
                <p className="text-xs text-zinc-400">ultimas 10 tareas</p>
              </div>
            </div>

            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
              <p className="text-sm text-amber-800 flex items-center gap-2">
                <Shield className="w-4 h-4" />
                <strong>Vista admin:</strong> estas calificaciones son privadas y no visibles para el trabajador.
              </p>
            </div>

            {/* List */}
            <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
              {tareas.length === 0 ? (
                <p className="text-zinc-400 text-center py-8">Sin calificaciones registradas.</p>
              ) : (
                <div className="divide-y divide-zinc-50">
                  {tareas.map(t => (
                    <div key={t.id} className="px-4 py-3 hover:bg-zinc-50/50">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-zinc-900 text-sm">{t.titulo}</span>
                        <div className="flex items-center gap-1">
                          <span className="text-amber-500 text-sm">
                            {'★'.repeat(t.calificacion || 0)}{'☆'.repeat(5 - (t.calificacion || 0))}
                          </span>
                          <span className="text-xs text-zinc-500 ml-1">{t.calificacion}/5</span>
                        </div>
                      </div>
                      {t.nota_calificacion && (
                        <p className="text-xs text-zinc-500 italic">&ldquo;{t.nota_calificacion}&rdquo;</p>
                      )}
                      <p className="text-xs text-zinc-400 mt-1">
                        {t.fecha} &middot; {t.categoria || 'General'}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-zinc-400 mb-0.5 flex items-center gap-1">{icon}{label}</p>
      <p className="text-zinc-900 font-medium">{value}</p>
    </div>
  );
}
