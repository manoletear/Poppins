'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth/context';
import { createClient } from '@/lib/supabase/client';
import { formatCLP } from '@/lib/formatters';
import {
  Shield,
  Loader2,
  Users,
  Building2,
  FileText,
  Receipt,
  Settings,
  DollarSign,
  Clock,
  CalendarDays,
} from 'lucide-react';

interface SystemParam {
  label: string;
  value: string;
  desc: string;
  icon: React.ElementType;
}

const PARAMS: SystemParam[] = [
  { label: 'Sueldo Mínimo', value: formatCLP(500000), desc: 'Ingreso Mínimo Mensual 2026', icon: DollarSign },
  { label: 'UF Actual', value: formatCLP(38700), desc: 'Valor referencial (hardcoded)', icon: DollarSign },
  { label: 'Tope Imponible', value: '81.6 UF', desc: 'Tope imponible AFP / AFC', icon: Shield },
  { label: 'Gratificación Legal', value: '25% tope 4.75 IMM', desc: 'Art. 50 Código del Trabajo', icon: Receipt },
  { label: 'Jornada Máxima', value: '42 hrs/semana', desc: 'Ley 40 horas desde 2026', icon: Clock },
  { label: 'Días Vacaciones', value: '15 días hábiles/año', desc: 'Art. 67 Código del Trabajo', icon: CalendarDays },
];

interface Institucion {
  id: string;
  nombre: string;
  tipo: string;
  tasa_descuento: number;
}

interface Stats {
  empleadores: number;
  trabajadores: number;
  contratos: number;
  liquidaciones: number;
}

export default function ConfiguracionPage() {
  const { profile, loading: authLoading } = useAuth();
  const [stats, setStats] = useState<Stats>({ empleadores: 0, trabajadores: 0, contratos: 0, liquidaciones: 0 });
  const [instituciones, setInstituciones] = useState<Institucion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile || profile.rol !== 'admin') return;
    const load = async () => {
      const supabase = createClient();
      const [empRes, trabRes, contRes, liqRes, instRes] = await Promise.all([
        supabase.from('empleadores').select('id', { count: 'exact', head: true }),
        supabase.from('trabajadores').select('id', { count: 'exact', head: true }),
        supabase.from('contratos').select('id', { count: 'exact', head: true }),
        supabase.from('liquidaciones').select('id', { count: 'exact', head: true }),
        supabase.from('instituciones_previsionales').select('*').order('tipo').order('nombre'),
      ]);
      setStats({
        empleadores: empRes.count ?? 0,
        trabajadores: trabRes.count ?? 0,
        contratos: contRes.count ?? 0,
        liquidaciones: liqRes.count ?? 0,
      });
      setInstituciones((instRes.data as Institucion[]) || []);
      setLoading(false);
    };
    load();
  }, [profile]);

  if (authLoading || loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-violet-600" />
      </div>
    );
  }

  if (profile?.rol !== 'admin') {
    return (
      <div className="flex h-96 items-center justify-center">
        <p className="text-zinc-500">Acceso restringido a administradores.</p>
      </div>
    );
  }

  const statCards = [
    { label: 'Empleadores', value: stats.empleadores, icon: Building2, color: 'text-violet-600' },
    { label: 'Trabajadores', value: stats.trabajadores, icon: Users, color: 'text-emerald-600' },
    { label: 'Contratos', value: stats.contratos, icon: FileText, color: 'text-blue-600' },
    { label: 'Liquidaciones', value: stats.liquidaciones, icon: Receipt, color: 'text-amber-600' },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div className="flex items-center gap-3">
        <Settings className="h-6 w-6 text-violet-600" />
        <h1 className="text-2xl font-bold text-zinc-900">Configuración</h1>
      </div>

      {/* Sección 1: Perfil Admin */}
      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-500 mb-3">Perfil Administrador</h2>
        <div className="rounded-xl border border-zinc-200 bg-white p-6">
          <div className="flex items-center gap-4">
            {profile.avatar_url ? (
              <img src={profile.avatar_url} alt="" className="h-14 w-14 rounded-full object-cover" />
            ) : (
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-violet-600 text-lg font-bold text-white">
                {(profile.nombre?.[0] || '').toUpperCase()}
              </div>
            )}
            <div>
              <p className="text-lg font-semibold text-zinc-900">{profile.nombre} {profile.apellido || ''}</p>
              <p className="text-sm text-zinc-500">{profile.email}</p>
              <span className="mt-1 inline-block rounded-full bg-violet-100 px-2.5 py-0.5 text-xs font-medium text-violet-700 capitalize">
                {profile.rol}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Sección 2: Parámetros del Sistema */}
      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-500 mb-3">Parámetros del Sistema</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {PARAMS.map((p) => {
            const Icon = p.icon;
            return (
              <div key={p.label} className="rounded-xl border border-zinc-200 bg-white p-5">
                <div className="flex items-center gap-2 mb-2">
                  <Icon className="h-4 w-4 text-violet-600" />
                  <span className="text-xs font-medium text-zinc-500">{p.label}</span>
                </div>
                <p className="text-lg font-bold text-zinc-900">{p.value}</p>
                <p className="text-xs text-zinc-400 mt-1">{p.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Sección 3: Tablas de Referencia */}
      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-500 mb-3">Tablas de Referencia</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((s) => {
            const Icon = s.icon;
            return (
              <div key={s.label} className="rounded-xl border border-zinc-200 bg-white p-5 text-center">
                <Icon className={`h-6 w-6 mx-auto mb-2 ${s.color}`} />
                <p className="text-2xl font-bold text-zinc-900">{s.value}</p>
                <p className="text-xs text-zinc-500 mt-1">{s.label}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Sección 4: Instituciones Previsionales */}
      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-500 mb-3">
          Instituciones Previsionales ({instituciones.length})
        </h2>
        <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
          {instituciones.length === 0 ? (
            <p className="p-6 text-sm text-zinc-400 text-center">No hay instituciones registradas.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-100 bg-zinc-50">
                  <th className="px-4 py-3 text-left font-medium text-zinc-600">Nombre</th>
                  <th className="px-4 py-3 text-left font-medium text-zinc-600">Tipo</th>
                  <th className="px-4 py-3 text-right font-medium text-zinc-600">Tasa Descuento</th>
                </tr>
              </thead>
              <tbody>
                {instituciones.map((inst) => (
                  <tr key={inst.id} className="border-b border-zinc-50 hover:bg-zinc-50 transition-colors">
                    <td className="px-4 py-3 text-zinc-900">{inst.nombre}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                        inst.tipo === 'AFP' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'
                      }`}>
                        {inst.tipo}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-zinc-700 font-mono">
                      {(inst.tasa_descuento * 100).toFixed(2)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </div>
  );
}
