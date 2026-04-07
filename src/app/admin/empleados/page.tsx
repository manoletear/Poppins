'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth/context';
import { createClient } from '@/lib/supabase/client';
import {
  Users, Search, Download, Filter, Loader2, Shield, ChevronRight,
  DollarSign, BarChart3,
} from 'lucide-react';

interface Trabajador {
  id: string;
  nombre: string;
  apellido_paterno: string;
  apellido_materno?: string;
  rut: string;
  cargo?: string;
  estado: string;
  sueldo_base: number;
  afp_id?: string;
  salud_id?: string;
  contratos?: {
    id: string;
    sueldo_base: number;
    estado: string;
    empleador_id: string;
    empleadores?: { id: string; nombre: string } | null;
  }[];
}

const cargoColors: Record<string, string> = {
  asesora_hogar: 'bg-rose-100 text-rose-700',
  jardinero: 'bg-green-100 text-green-700',
  piscinero: 'bg-cyan-100 text-cyan-700',
};

const cargoLabel: Record<string, string> = {
  asesora_hogar: 'Asesora del Hogar',
  jardinero: 'Jardinero/a',
  piscinero: 'Piscinero/a',
};

function formatCLP(n: number) { return '$' + (n ?? 0).toLocaleString('es-CL'); }

function buildCSVPrevired(workers: Trabajador[]) {
  const header = 'RUT;Nombre;Apellido Paterno;Apellido Materno;Cargo;Sueldo Base;AFP;Salud;Estado';
  const rows = workers.map(w =>
    `${w.rut};${w.nombre};${w.apellido_paterno};${w.apellido_materno || ''};${w.cargo || ''};${w.sueldo_base};${w.afp_id || ''};${w.salud_id || ''};${w.estado}`
  );
  return [header, ...rows].join('\n');
}

export default function AdminEmpleadosPage() {
  const { profile, loading: authLoading } = useAuth();
  const [workers, setWorkers] = useState<Trabajador[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterCargo, setFilterCargo] = useState('');
  const [filterEstado, setFilterEstado] = useState('');

  useEffect(() => {
    if (authLoading) return;
    if (!profile || profile.rol !== 'admin') return;
    (async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from('trabajadores')
        .select('*, contratos(id, sueldo_base, estado, empleador_id, empleadores(id, nombre))')
        .order('nombre');
      setWorkers((data as Trabajador[]) || []);
      setLoading(false);
    })();
  }, [profile, authLoading]);

  const filtered = useMemo(() => {
    let list = workers;
    if (search) {
      const s = search.toLowerCase();
      list = list.filter(w =>
        `${w.nombre} ${w.apellido_paterno} ${w.rut}`.toLowerCase().includes(s)
      );
    }
    if (filterCargo) list = list.filter(w => w.cargo === filterCargo);
    if (filterEstado) list = list.filter(w => w.estado === filterEstado);
    return list;
  }, [workers, search, filterCargo, filterEstado]);

  // Stats
  const totalWorkers = workers.length;
  const byCargo = workers.reduce((acc, w) => {
    const c = w.cargo || 'otro';
    acc[c] = (acc[c] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const totalPayroll = workers.reduce((sum, w) => {
    const activeContract = w.contratos?.find(c => c.estado === 'activo');
    return sum + (activeContract?.sueldo_base || w.sueldo_base || 0);
  }, 0);

  const exportCSV = () => {
    const csv = buildCSVPrevired(filtered);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `previred_trabajadores_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

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

  const cargos = [...new Set(workers.map(w => w.cargo).filter(Boolean))] as string[];
  const estados = [...new Set(workers.map(w => w.estado).filter(Boolean))] as string[];

  return (
    <div className="min-h-screen bg-zinc-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Link href="/admin" className="text-zinc-400 hover:text-zinc-600 transition">
              <Shield className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-zinc-900">Gestión de Empleados</h1>
              <p className="text-sm text-zinc-500">Todos los trabajadores del sistema</p>
            </div>
          </div>
          <button onClick={exportCSV} className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-xl text-sm font-medium hover:bg-violet-700 transition">
            <Download className="w-4 h-4" /> Exportar PREVIRED
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <div className="rounded-xl border border-zinc-200 bg-white p-4">
            <div className="flex items-center gap-2 mb-1">
              <Users className="w-4 h-4 text-blue-500" />
              <span className="text-xs text-zinc-500">Total Trabajadores</span>
            </div>
            <p className="text-2xl font-bold text-zinc-900">{totalWorkers}</p>
          </div>
          {Object.entries(byCargo).map(([cargo, count]) => (
            <div key={cargo} className="rounded-xl border border-zinc-200 bg-white p-4">
              <div className="flex items-center gap-2 mb-1">
                <BarChart3 className="w-4 h-4 text-zinc-400" />
                <span className="text-xs text-zinc-500">{cargoLabel[cargo] || cargo}</span>
              </div>
              <p className="text-2xl font-bold text-zinc-900">{count}</p>
            </div>
          ))}
          <div className="rounded-xl border border-zinc-200 bg-white p-4">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="w-4 h-4 text-emerald-500" />
              <span className="text-xs text-zinc-500">Costo Nómina</span>
            </div>
            <p className="text-2xl font-bold text-zinc-900">{formatCLP(totalPayroll)}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input
              type="text"
              placeholder="Buscar por nombre o RUT..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-zinc-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>
          <select
            value={filterCargo}
            onChange={(e) => setFilterCargo(e.target.value)}
            className="px-3 py-2 rounded-xl border border-zinc-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
          >
            <option value="">Todos los cargos</option>
            {cargos.map(c => <option key={c} value={c}>{cargoLabel[c] || c}</option>)}
          </select>
          <select
            value={filterEstado}
            onChange={(e) => setFilterEstado(e.target.value)}
            className="px-3 py-2 rounded-xl border border-zinc-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
          >
            <option value="">Todos los estados</option>
            {estados.map(e => <option key={e} value={e}>{e}</option>)}
          </select>
        </div>

        {/* Table */}
        <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-100 bg-zinc-50/50">
                  <th className="text-left px-4 py-3 font-medium text-zinc-500">Nombre</th>
                  <th className="text-left px-4 py-3 font-medium text-zinc-500">RUT</th>
                  <th className="text-left px-4 py-3 font-medium text-zinc-500">Cargo</th>
                  <th className="text-left px-4 py-3 font-medium text-zinc-500">Empleador</th>
                  <th className="text-right px-4 py-3 font-medium text-zinc-500">Sueldo</th>
                  <th className="text-left px-4 py-3 font-medium text-zinc-500">Estado</th>
                  <th className="text-left px-4 py-3 font-medium text-zinc-500">AFP</th>
                  <th className="text-left px-4 py-3 font-medium text-zinc-500">Salud</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((w) => {
                  const activeContract = w.contratos?.find(c => c.estado === 'activo');
                  const employer = activeContract?.empleadores;
                  const cargo = w.cargo || 'otro';
                  const badgeClass = cargoColors[cargo] || 'bg-zinc-100 text-zinc-600';
                  return (
                    <tr key={w.id} className="border-b border-zinc-50 hover:bg-zinc-50/50 transition cursor-pointer" onClick={() => window.location.href = `/admin/empleados/${w.id}`}>
                      <td className="px-4 py-3 font-medium text-zinc-900">
                        {w.nombre} {w.apellido_paterno}
                      </td>
                      <td className="px-4 py-3 text-zinc-600 font-mono text-xs">{w.rut}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${badgeClass}`}>
                          {cargoLabel[cargo] || cargo}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-zinc-600">{employer?.nombre || '—'}</td>
                      <td className="px-4 py-3 text-right text-zinc-900 font-medium">
                        {formatCLP(activeContract?.sueldo_base || w.sueldo_base)}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${w.estado === 'activo' ? 'bg-emerald-100 text-emerald-700' : 'bg-zinc-100 text-zinc-600'}`}>
                          {w.estado}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-zinc-500 text-xs">{w.afp_id || '—'}</td>
                      <td className="px-4 py-3 text-zinc-500 text-xs">{w.salud_id || '—'}</td>
                      <td className="px-4 py-3">
                        <ChevronRight className="w-4 h-4 text-zinc-300" />
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-4 py-8 text-center text-zinc-400">
                      No se encontraron trabajadores
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
