'use client';

import { useEffect, useState, useMemo } from 'react';
import { useAuth } from '@/lib/auth/context';
import { createClient } from '@/lib/supabase/client';
import {
  Loader2, Users, UserCheck, UserPlus, TrendingUp,
  Search, Filter, Copy, Check, ExternalLink
} from 'lucide-react';

// Future HubSpot integration
const HUBSPOT_API_KEY = ''; // Set in env vars

interface Lead {
  id: string;
  auth_user_id: string;
  email: string;
  nombre: string | null;
  apellido: string | null;
  rol: string;
  onboarding_completado: boolean;
  created_at: string;
}

type Column = 'registrados' | 'onboarding' | 'activos';

export default function LeadsPage() {
  const { profile } = useAuth();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [rolFilter, setRolFilter] = useState('');
  const [copied, setCopied] = useState(false);
  const [viewMode, setViewMode] = useState<'kanban' | 'table'>('kanban');

  useEffect(() => {
    if (profile?.rol !== 'admin') return;
    async function load() {
      const supabase = createClient();
      const { data } = await supabase
        .from('user_profiles')
        .select('id, auth_user_id, email, nombre, apellido, rol, onboarding_completado, created_at')
        .order('created_at', { ascending: false });
      setLeads(data || []);
      setLoading(false);
    }
    load();
  }, [profile]);

  const filtered = useMemo(() => {
    return leads.filter((l) => {
      const matchSearch =
        !search ||
        (l.nombre?.toLowerCase().includes(search.toLowerCase()) ?? false) ||
        (l.apellido?.toLowerCase().includes(search.toLowerCase()) ?? false) ||
        l.email.toLowerCase().includes(search.toLowerCase());
      const matchRol = !rolFilter || l.rol === rolFilter;
      return matchSearch && matchRol;
    });
  }, [leads, search, rolFilter]);

  const columns: Record<Column, Lead[]> = useMemo(() => {
    const registrados: Lead[] = [];
    const onboarding: Lead[] = [];
    const activos: Lead[] = [];
    for (const l of filtered) {
      if (l.onboarding_completado) {
        activos.push(l);
      } else {
        // Heuristic: if they have nombre set, they started onboarding
        if (l.nombre) {
          onboarding.push(l);
        } else {
          registrados.push(l);
        }
      }
    }
    return { registrados, onboarding, activos };
  }, [filtered]);

  const stats = useMemo(() => {
    const total = leads.length;
    const converted = leads.filter((l) => l.onboarding_completado).length;
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const newThisWeek = leads.filter((l) => new Date(l.created_at) >= weekAgo).length;
    return {
      total,
      converted,
      conversionRate: total > 0 ? ((converted / total) * 100).toFixed(1) : '0',
      newThisWeek,
    };
  }, [leads]);

  const handleExport = () => {
    const emails = filtered.map((l) => l.email).join(', ');
    navigator.clipboard.writeText(emails);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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

  const columnConfig: { key: Column; label: string; color: string; icon: React.ReactNode }[] = [
    { key: 'registrados', label: 'Registrados', color: 'bg-amber-500', icon: <UserPlus className="w-4 h-4" /> },
    { key: 'onboarding', label: 'Onboarding', color: 'bg-blue-500', icon: <Users className="w-4 h-4" /> },
    { key: 'activos', label: 'Activos', color: 'bg-emerald-500', icon: <UserCheck className="w-4 h-4" /> },
  ];

  return (
    <div className="min-h-screen bg-zinc-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-zinc-900">Leads Pipeline</h1>
            <p className="text-sm text-zinc-500">CRM de leads y conversiones</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setViewMode(viewMode === 'kanban' ? 'table' : 'kanban')}
              className="px-3 py-2 text-sm rounded-lg border border-zinc-200 bg-white hover:bg-zinc-50 transition"
            >
              {viewMode === 'kanban' ? 'Vista Tabla' : 'Vista Kanban'}
            </button>
            <button
              onClick={handleExport}
              className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg bg-violet-600 text-white hover:bg-violet-700 transition"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Copiado!' : 'Exportar Emails'}
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Total Leads', value: stats.total, icon: <Users className="w-5 h-5 text-white" />, color: 'bg-violet-500' },
            { label: 'Convertidos', value: stats.converted, icon: <UserCheck className="w-5 h-5 text-white" />, color: 'bg-emerald-500' },
            { label: 'Tasa Conversión', value: `${stats.conversionRate}%`, icon: <TrendingUp className="w-5 h-5 text-white" />, color: 'bg-blue-500' },
            { label: 'Nuevos esta semana', value: stats.newThisWeek, icon: <UserPlus className="w-5 h-5 text-white" />, color: 'bg-amber-500' },
          ].map((s) => (
            <div key={s.label} className="rounded-xl border border-zinc-200 bg-white p-4">
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 ${s.color} rounded-lg flex items-center justify-center`}>{s.icon}</div>
                <div>
                  <p className="text-xl font-bold text-zinc-900">{s.value}</p>
                  <p className="text-xs text-zinc-500">{s.label}</p>
                </div>
              </div>
            </div>
          ))}
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
              value={rolFilter}
              onChange={(e) => setRolFilter(e.target.value)}
              className="pl-9 pr-8 py-2 text-sm rounded-lg border border-zinc-200 bg-white focus:outline-none focus:ring-2 focus:ring-violet-500 appearance-none"
            >
              <option value="">Todos los roles</option>
              <option value="empleador">Empleador</option>
              <option value="trabajador">Trabajador</option>
              <option value="contador">Contador</option>
            </select>
          </div>
        </div>

        {/* Kanban View */}
        {viewMode === 'kanban' ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {columnConfig.map((col) => (
              <div key={col.key} className="rounded-xl border border-zinc-200 bg-white">
                <div className="p-4 border-b border-zinc-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-7 h-7 ${col.color} rounded-lg flex items-center justify-center text-white`}>
                      {col.icon}
                    </div>
                    <span className="font-semibold text-zinc-900 text-sm">{col.label}</span>
                  </div>
                  <span className="text-xs font-medium bg-zinc-100 text-zinc-600 px-2 py-1 rounded-full">
                    {columns[col.key].length}
                  </span>
                </div>
                <div className="p-3 space-y-2 max-h-[500px] overflow-y-auto">
                  {columns[col.key].length === 0 ? (
                    <p className="text-xs text-zinc-400 text-center py-4">Sin leads</p>
                  ) : (
                    columns[col.key].map((lead) => (
                      <div
                        key={lead.id}
                        className="rounded-lg border border-zinc-100 p-3 hover:border-zinc-300 transition"
                      >
                        <p className="text-sm font-medium text-zinc-900">
                          {lead.nombre || lead.email.split('@')[0]} {lead.apellido || ''}
                        </p>
                        <p className="text-xs text-zinc-500 truncate">{lead.email}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-600 capitalize">
                            {lead.rol}
                          </span>
                          <span className="text-[10px] text-zinc-400">
                            {new Date(lead.created_at).toLocaleDateString('es-CL')}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Table View */
          <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-zinc-50 border-b border-zinc-100">
                    <th className="text-left px-4 py-3 font-medium text-zinc-600">Nombre</th>
                    <th className="text-left px-4 py-3 font-medium text-zinc-600">Email</th>
                    <th className="text-left px-4 py-3 font-medium text-zinc-600">Rol</th>
                    <th className="text-left px-4 py-3 font-medium text-zinc-600">Estado</th>
                    <th className="text-left px-4 py-3 font-medium text-zinc-600">Registro</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((lead) => (
                    <tr key={lead.id} className="border-b border-zinc-50 hover:bg-zinc-50 transition">
                      <td className="px-4 py-3 font-medium text-zinc-900">
                        {lead.nombre || '-'} {lead.apellido || ''}
                      </td>
                      <td className="px-4 py-3 text-zinc-600">{lead.email}</td>
                      <td className="px-4 py-3">
                        <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-600 capitalize">
                          {lead.rol}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full ${
                            lead.onboarding_completado
                              ? 'bg-emerald-100 text-emerald-700'
                              : lead.nombre
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-amber-100 text-amber-700'
                          }`}
                        >
                          {lead.onboarding_completado ? 'Activo' : lead.nombre ? 'Onboarding' : 'Registrado'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-zinc-500">
                        {new Date(lead.created_at).toLocaleDateString('es-CL')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* HubSpot Integration Note */}
        <div className="mt-8 rounded-xl border border-dashed border-zinc-300 bg-zinc-50/50 p-4 flex items-center gap-3">
          <ExternalLink className="w-5 h-5 text-zinc-400 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-zinc-600">Integración HubSpot</p>
            <p className="text-xs text-zinc-400">
              Conectar con HubSpot API para sincronizar leads automáticamente.
              {HUBSPOT_API_KEY ? ' API Key configurada.' : ' Configurar HUBSPOT_API_KEY en variables de entorno.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
