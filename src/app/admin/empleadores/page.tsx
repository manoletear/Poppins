'use client';

import { useEffect, useState, useMemo } from 'react';
import { useAuth } from '@/lib/auth/context';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import {
  Loader2, Building2, Search, Filter, Users, CreditCard, TrendingUp
} from 'lucide-react';

interface Empleador {
  id: string;
  nombre: string;
  email: string | null;
  plan_tipo: string;
  estado: string;
  onboarding_completado: boolean;
  created_at: string;
  // joined data
  contratos_count: number;
  profile_email: string | null;
}

export default function EmpleadoresAdminPage() {
  const { profile } = useAuth();
  const router = useRouter();
  const [empleadores, setEmpleadores] = useState<Empleador[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [planFilter, setPlanFilter] = useState('');

  useEffect(() => {
    if (profile?.rol !== 'admin') return;
    async function load() {
      const supabase = createClient();

      // Get empleadores
      const { data: emps } = await supabase
        .from('empleadores')
        .select('id, nombre, email, plan_tipo, estado, onboarding_completado, created_at, auth_user_id')
        .order('created_at', { ascending: false });

      if (!emps) { setLoading(false); return; }

      // Get contract counts per empleador
      const { data: contratos } = await supabase
        .from('contratos')
        .select('empleador_id');

      // Get user_profiles for email mapping
      const { data: profiles } = await supabase
        .from('user_profiles')
        .select('auth_user_id, email');

      const contratosMap: Record<string, number> = {};
      for (const c of contratos || []) {
        contratosMap[c.empleador_id] = (contratosMap[c.empleador_id] || 0) + 1;
      }

      const profileMap: Record<string, string> = {};
      for (const p of profiles || []) {
        profileMap[p.auth_user_id] = p.email;
      }

      const enriched: Empleador[] = emps.map((e: any) => ({
        ...e,
        contratos_count: contratosMap[e.id] || 0,
        profile_email: (e.auth_user_id ? profileMap[e.auth_user_id] : null) || e.email,
      }));

      setEmpleadores(enriched);
      setLoading(false);
    }
    load();
  }, [profile]);

  const filtered = useMemo(() => {
    return empleadores.filter((e) => {
      const matchSearch =
        !search ||
        e.nombre.toLowerCase().includes(search.toLowerCase()) ||
        (e.profile_email?.toLowerCase().includes(search.toLowerCase()) ?? false) ||
        (e.email?.toLowerCase().includes(search.toLowerCase()) ?? false);
      const matchPlan = !planFilter || e.plan_tipo === planFilter;
      return matchSearch && matchPlan;
    });
  }, [empleadores, search, planFilter]);

  const stats = useMemo(() => {
    const total = empleadores.length;
    const byPlan: Record<string, number> = {};
    let totalEmps = 0;
    for (const e of empleadores) {
      byPlan[e.plan_tipo] = (byPlan[e.plan_tipo] || 0) + 1;
      totalEmps += e.contratos_count;
    }
    return {
      total,
      byPlan,
      avgEmployees: total > 0 ? (totalEmps / total).toFixed(1) : '0',
    };
  }, [empleadores]);

  const planColors: Record<string, string> = {
    starter: 'bg-zinc-100 text-zinc-600',
    pro: 'bg-blue-100 text-blue-700',
    pro_plus: 'bg-violet-100 text-violet-700',
    // legacy (pre-migración)
    free: 'bg-zinc-100 text-zinc-600',
    premium: 'bg-blue-100 text-blue-700',
    casa: 'bg-blue-100 text-blue-700',
    hogar: 'bg-violet-100 text-violet-700',
    enterprise: 'bg-violet-100 text-violet-700',
  };

  if (profile?.rol !== 'admin') {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center">
        <p className="text-zinc-500">Acceso restringido a administradores.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-zinc-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-zinc-900">Empleadores</h1>
          <p className="text-sm text-zinc-500">Gestión de todos los empleadores registrados</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <div className="rounded-xl border border-zinc-200 bg-white p-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-violet-500 rounded-lg flex items-center justify-center">
                <Building2 className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-xl font-bold text-zinc-900">{stats.total}</p>
                <p className="text-xs text-zinc-500">Total Empleadores</p>
              </div>
            </div>
          </div>
          {Object.entries(stats.byPlan).map(([plan, count]) => (
            <div key={plan} className="rounded-xl border border-zinc-200 bg-white p-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-blue-500 rounded-lg flex items-center justify-center">
                  <CreditCard className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-xl font-bold text-zinc-900">{count}</p>
                  <p className="text-xs text-zinc-500 capitalize">Plan {plan}</p>
                </div>
              </div>
            </div>
          ))}
          <div className="rounded-xl border border-zinc-200 bg-white p-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-emerald-500 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-xl font-bold text-zinc-900">{stats.avgEmployees}</p>
                <p className="text-xs text-zinc-500">Prom. Empleados</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-6">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input
              type="text"
              placeholder="Buscar por nombre o email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-zinc-200 bg-white focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <select
              value={planFilter}
              onChange={(e) => setPlanFilter(e.target.value)}
              className="pl-9 pr-8 py-2 text-sm rounded-lg border border-zinc-200 bg-white focus:outline-none focus:ring-2 focus:ring-violet-500 appearance-none"
            >
              <option value="">Todos los planes</option>
              <option value="starter">Starter</option>
              <option value="pro">Pro</option>
              <option value="pro_plus">Pro+</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-zinc-50 border-b border-zinc-100">
                  <th className="text-left px-4 py-3 font-medium text-zinc-600">Nombre</th>
                  <th className="text-left px-4 py-3 font-medium text-zinc-600">Email</th>
                  <th className="text-left px-4 py-3 font-medium text-zinc-600">Plan</th>
                  <th className="text-left px-4 py-3 font-medium text-zinc-600">Empleados</th>
                  <th className="text-left px-4 py-3 font-medium text-zinc-600">Estado</th>
                  <th className="text-left px-4 py-3 font-medium text-zinc-600">Registro</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-zinc-400">
                      No se encontraron empleadores
                    </td>
                  </tr>
                ) : (
                  filtered.map((emp) => (
                    <tr
                      key={emp.id}
                      onClick={() => router.push(`/admin/empleadores/${emp.id}`)}
                      className="border-b border-zinc-50 hover:bg-zinc-50 transition cursor-pointer"
                    >
                      <td className="px-4 py-3 font-medium text-zinc-900">{emp.nombre}</td>
                      <td className="px-4 py-3 text-zinc-600">{emp.profile_email || emp.email || '-'}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${planColors[emp.plan_tipo] || 'bg-zinc-100 text-zinc-600'}`}>
                          {emp.plan_tipo}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <Users className="w-3.5 h-3.5 text-zinc-400" />
                          <span className="text-zinc-700">{emp.contratos_count}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full ${
                            emp.estado === 'activo'
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-zinc-100 text-zinc-600'
                          }`}
                        >
                          {emp.estado}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-zinc-500">
                        {new Date(emp.created_at).toLocaleDateString('es-CL')}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
