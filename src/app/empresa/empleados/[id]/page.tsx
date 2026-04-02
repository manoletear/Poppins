'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth/context';
import {
  ArrowLeft, FileText, Calendar, Clock, Mail, Phone, MapPin,
  Briefcase, Shield, DollarSign, Palmtree, Printer, Loader2, AlertCircle, User,
} from 'lucide-react';

type TabKey = 'resumen' | 'contrato' | 'liquidaciones' | 'asistencia';

const tabs: { key: TabKey; label: string }[] = [
  { key: 'resumen', label: 'Resumen' },
  { key: 'contrato', label: 'Contrato' },
  { key: 'liquidaciones', label: 'Liquidaciones' },
  { key: 'asistencia', label: 'Asistencia' },
];

function formatCLP(n: number): string {
  return '$' + (n ?? 0).toLocaleString('es-CL');
}

function calcAntiguedad(fecha: string): string {
  const start = new Date(fecha);
  const now = new Date();
  const months = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
  const years = Math.floor(months / 12);
  const rem = months % 12;
  if (years === 0) return `${rem} meses`;
  return `${years} año${years > 1 ? 's' : ''}${rem > 0 ? `, ${rem} mes${rem > 1 ? 'es' : ''}` : ''}`;
}

export default function EmpleadoDetallePage() {
  const params = useParams();
  const id = params.id as string;
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState<TabKey>('resumen');
  const [worker, setWorker] = useState<any>(null);
  const [contrato, setContrato] = useState<any>(null);
  const [liquidaciones, setLiquidaciones] = useState<any[]>([]);
  const [marcajes, setMarcajes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedLiq, setExpandedLiq] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    const supabase = createClient();

    const [wRes, cRes, lRes, mRes] = await Promise.all([
      supabase.from('trabajadores').select('*').eq('id', id).single(),
      supabase.from('contratos').select('*').eq('trabajador_id', id).eq('estado', 'activo').single(),
      supabase.from('liquidaciones').select('*').eq('trabajador_id', id).order('periodo', { ascending: false }).limit(6),
      supabase.from('marcajes_horario').select('*').eq('trabajador_id', id).order('fecha', { ascending: false }).limit(15),
    ]);

    setWorker(wRes.data);
    setContrato(cRes.data);
    setLiquidaciones(lRes.data || []);
    setMarcajes(mRes.data || []);
    setLoading(false);
  }, [id]);

  useEffect(() => { loadData(); }, [loadData]);

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-zinc-400" /></div>;
  }

  if (!worker) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <AlertCircle className="h-12 w-12 text-zinc-300" />
        <p className="text-zinc-500">Empleado no encontrado</p>
        <Link href="/empresa/empleados" className="text-sm text-violet-600 hover:underline">Volver a empleados</Link>
      </div>
    );
  }

  const nombre = `${worker.nombre} ${worker.apellido_paterno || ''} ${worker.apellido_materno || ''}`.trim();
  const iniciales = `${(worker.nombre || '')[0] || ''}${(worker.apellido_paterno || '')[0] || ''}`.toUpperCase();
  const sueldo = contrato?.sueldo_base || 0;

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link href="/empresa/empleados" className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-800 transition">
        <ArrowLeft className="w-4 h-4" /> Volver a empleados
      </Link>

      {/* Header Card */}
      <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
        <div className="bg-gradient-to-r from-rose-500 to-rose-600 px-6 py-5">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/20 text-lg font-bold text-white">
              {iniciales}
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">{nombre}</h1>
              <p className="text-rose-100">{worker.cargo || 'Empleado'}</p>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 flex flex-wrap gap-3">
          <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
            {contrato?.tipo_contrato === 'indefinido' ? 'Contrato Indefinido' : contrato?.tipo_contrato || 'Sin contrato'}
          </span>
          <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
            {worker.estado === 'activo' ? 'Activa' : worker.estado || 'Activa'}
          </span>
          {contrato?.tipo_jornada && (
            <span className="rounded-full bg-violet-50 px-3 py-1 text-xs font-medium text-violet-700">
              Jornada {contrato.tipo_jornada === 'completa' ? 'Completa' : contrato.tipo_jornada}
            </span>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-lg bg-zinc-100 p-1 w-fit">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === tab.key ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="rounded-xl border border-zinc-200 bg-white p-6">
        {/* ── RESUMEN ── */}
        {activeTab === 'resumen' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-zinc-900 uppercase tracking-wide">Datos Personales</h3>
              <InfoRow icon={User} label="RUT" value={worker.rut} />
              <InfoRow icon={Mail} label="Email" value={worker.email || 'No registrado'} />
              <InfoRow icon={Phone} label="Teléfono" value={worker.telefono || 'No registrado'} />
              <InfoRow icon={MapPin} label="Dirección" value={worker.direccion || 'No registrada'} />
              <InfoRow icon={Calendar} label="Nacimiento" value={worker.fecha_nacimiento ? new Date(worker.fecha_nacimiento).toLocaleDateString('es-CL') : 'No registrado'} />
            </div>
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-zinc-900 uppercase tracking-wide">Datos Laborales</h3>
              <InfoRow icon={Briefcase} label="Cargo" value={worker.cargo || contrato?.cargo || 'No definido'} />
              <InfoRow icon={DollarSign} label="Sueldo Base" value={formatCLP(sueldo)} />
              <InfoRow icon={Clock} label="Horas Semanales" value={contrato?.horas_semanales ? `${contrato.horas_semanales}h` : '-'} />
              <InfoRow icon={Calendar} label="Fecha Ingreso" value={contrato?.fecha_inicio ? new Date(contrato.fecha_inicio).toLocaleDateString('es-CL') : '-'} />
              <InfoRow icon={Palmtree} label="Antigüedad" value={contrato?.fecha_inicio ? calcAntiguedad(contrato.fecha_inicio) : '-'} />
              <InfoRow icon={Shield} label="AFP" value={worker.afp_id ? `AFP ID ${worker.afp_id}` : 'No registrada'} />
              <InfoRow icon={Shield} label="Salud" value={worker.salud_tipo === 'fonasa' ? 'FONASA' : worker.salud_tipo || 'No registrada'} />
            </div>
          </div>
        )}

        {/* ── CONTRATO ── */}
        {activeTab === 'contrato' && contrato && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-zinc-900">Contrato #{contrato.numero_contrato}</h3>
              <button
                onClick={() => window.print()}
                className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 transition"
              >
                <Printer className="w-4 h-4" /> Imprimir
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <ContractField label="Tipo Contrato" value={contrato.tipo_contrato === 'indefinido' ? 'Indefinido' : contrato.tipo_contrato} />
              <ContractField label="Jornada" value={`${contrato.tipo_jornada} (${contrato.horas_semanales}h/sem)`} />
              <ContractField label="Sueldo Base" value={formatCLP(contrato.sueldo_base)} />
              <ContractField label="Fecha Inicio" value={new Date(contrato.fecha_inicio).toLocaleDateString('es-CL')} />
              <ContractField label="Gratificación" value={contrato.tipo_gratificacion === 'art_50' ? 'Art. 50 (tope)' : 'Art. 47'} />
              <ContractField label="Cargo" value={contrato.cargo || worker.cargo || '-'} />
              <ContractField label="Vacaciones" value={`${contrato.dias_vacaciones_anuales || 15} días anuales`} />
              <ContractField label="Estado" value={contrato.estado} />
            </div>
          </div>
        )}
        {activeTab === 'contrato' && !contrato && (
          <p className="text-sm text-zinc-500 text-center py-8">No hay contrato activo registrado.</p>
        )}

        {/* ── LIQUIDACIONES ── */}
        {activeTab === 'liquidaciones' && (
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-zinc-900 mb-4">Últimas Liquidaciones</h3>
            {liquidaciones.length === 0 ? (
              <p className="text-sm text-zinc-500 text-center py-8">No hay liquidaciones registradas.</p>
            ) : (
              liquidaciones.map((liq) => (
                <div key={liq.id} className="rounded-lg border border-zinc-200 overflow-hidden">
                  <button
                    onClick={() => setExpandedLiq(expandedLiq === liq.id ? null : liq.id)}
                    className="w-full px-4 py-3 flex items-center justify-between hover:bg-zinc-50 transition"
                  >
                    <div className="flex items-center gap-3">
                      <FileText className="w-4 h-4 text-zinc-400" />
                      <span className="text-sm font-medium text-zinc-900">{liq.periodo}</span>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        liq.estado === 'pagada' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                      }`}>
                        {liq.estado}
                      </span>
                    </div>
                    <span className="text-sm font-bold text-zinc-900">{formatCLP(liq.liquido_pagar)}</span>
                  </button>
                  {expandedLiq === liq.id && (
                    <div className="px-4 pb-4 border-t border-zinc-100 bg-zinc-50">
                      <div className="grid grid-cols-2 gap-x-8 gap-y-2 py-3 text-sm">
                        <div className="flex justify-between"><span className="text-zinc-500">Sueldo Base</span><span>{formatCLP(liq.sueldo_base)}</span></div>
                        <div className="flex justify-between"><span className="text-zinc-500">Gratificación</span><span>{formatCLP(liq.gratificacion_legal)}</span></div>
                        <div className="flex justify-between"><span className="text-zinc-500">Colación</span><span>{formatCLP(liq.colacion)}</span></div>
                        <div className="flex justify-between"><span className="text-zinc-500">Movilización</span><span>{formatCLP(liq.movilizacion)}</span></div>
                        <div className="flex justify-between font-medium border-t border-zinc-200 pt-2"><span>Total Haberes</span><span>{formatCLP(liq.total_haberes)}</span></div>
                        <div className="flex justify-between font-medium border-t border-zinc-200 pt-2"><span>Total Descuentos</span><span className="text-red-600">-{formatCLP(liq.total_descuentos)}</span></div>
                        <div className="flex justify-between"><span className="text-zinc-500">AFP</span><span>-{formatCLP(liq.afp_trabajador)}</span></div>
                        <div className="flex justify-between"><span className="text-zinc-500">Salud</span><span>-{formatCLP(liq.salud_trabajador)}</span></div>
                        <div className="flex justify-between"><span className="text-zinc-500">AFC</span><span>-{formatCLP(liq.afc_trabajador)}</span></div>
                        {liq.asignacion_familiar > 0 && (
                          <div className="flex justify-between"><span className="text-zinc-500">Asig. Familiar</span><span className="text-emerald-600">+{formatCLP(liq.asignacion_familiar)}</span></div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* ── ASISTENCIA ── */}
        {activeTab === 'asistencia' && (
          <div>
            <h3 className="text-lg font-semibold text-zinc-900 mb-4">Registro de Asistencia</h3>
            {marcajes.length === 0 ? (
              <p className="text-sm text-zinc-500 text-center py-8">No hay marcajes registrados.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-zinc-100 bg-zinc-50">
                      <th className="px-4 py-2 text-left font-medium text-zinc-500">Fecha</th>
                      <th className="px-4 py-2 text-left font-medium text-zinc-500">Entrada</th>
                      <th className="px-4 py-2 text-left font-medium text-zinc-500">Salida</th>
                      <th className="px-4 py-2 text-left font-medium text-zinc-500">Horas</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {marcajes.map((m) => (
                      <tr key={m.id} className="hover:bg-zinc-50">
                        <td className="px-4 py-2">{new Date(m.fecha).toLocaleDateString('es-CL')}</td>
                        <td className="px-4 py-2">{m.hora_entrada || '-'}</td>
                        <td className="px-4 py-2">{m.hora_salida || '-'}</td>
                        <td className="px-4 py-2">{m.horas_trabajadas ? `${m.horas_trabajadas.toFixed(1)}h` : '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function InfoRow({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 text-sm">
      <Icon className="w-4 h-4 text-zinc-400 shrink-0" />
      <span className="text-zinc-500 w-28 shrink-0">{label}</span>
      <span className="text-zinc-900">{value}</span>
    </div>
  );
}

function ContractField({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-zinc-50 p-3">
      <p className="text-xs text-zinc-500 mb-1">{label}</p>
      <p className="text-sm font-medium text-zinc-900 capitalize">{value}</p>
    </div>
  );
}
