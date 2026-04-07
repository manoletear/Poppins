'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/lib/auth/context';
import { createClient } from '@/lib/supabase/client';
import { formatCLP } from '@/lib/formatters';
import {
  Loader2,
  ChevronLeft,
  ChevronRight,
  Receipt,
  FileText,
  CheckCircle2,
  Clock,
  DollarSign,
  Download,
} from 'lucide-react';

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

const ESTADO_FLOW: Record<string, string> = {
  borrador: 'aprobado',
  aprobado: 'firmada',
  firmada: 'pagada',
};

const ESTADO_BADGE: Record<string, string> = {
  borrador: 'bg-amber-100 text-amber-700',
  aprobado: 'bg-blue-100 text-blue-700',
  firmada: 'bg-emerald-100 text-emerald-700',
  pagada: 'bg-violet-100 text-violet-700',
};

const ESTADO_LABEL: Record<string, string> = {
  borrador: 'Borrador',
  aprobado: 'Aprobado',
  firmada: 'Firmada',
  pagada: 'Pagada',
};

interface Liquidacion {
  id: string;
  periodo: string;
  sueldo_base: number;
  total_haberes: number;
  total_descuentos: number;
  liquido: number;
  estado: string;
  trabajadores: { nombre: string; apellido_paterno: string } | null;
  contratos: { empleador_id: string; empleadores: { nombre: string } | null } | null;
}

export default function LiquidacionesAdminPage() {
  const { profile, loading: authLoading } = useAuth();
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth());
  const [liquidaciones, setLiquidaciones] = useState<Liquidacion[]>([]);
  const [loading, setLoading] = useState(true);

  const periodo = `${year}-${String(month + 1).padStart(2, '0')}`;

  const prevMonth = () => {
    if (month === 0) { setMonth(11); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (month === 11) { setMonth(0); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  };

  const loadData = useCallback(async () => {
    if (!profile || profile.rol !== 'admin') return;
    setLoading(true);
    const supabase = createClient();
    const { data } = await supabase
      .from('liquidaciones')
      .select('*, trabajadores(nombre, apellido_paterno), contratos!inner(empleador_id, empleadores(nombre))')
      .eq('periodo', periodo)
      .order('created_at', { ascending: false });
    setLiquidaciones((data as Liquidacion[]) || []);
    setLoading(false);
  }, [profile, periodo]);

  useEffect(() => { loadData(); }, [loadData]);

  const updateEstado = async (id: string, nextEstado: string) => {
    const supabase = createClient();
    await supabase.from('liquidaciones').update({ estado: nextEstado }).eq('id', id);
    setLiquidaciones(prev =>
      prev.map(l => l.id === id ? { ...l, estado: nextEstado } : l)
    );
  };

  const aprobarTodas = async () => {
    const borradores = liquidaciones.filter(l => l.estado === 'borrador');
    if (borradores.length === 0) return;
    const supabase = createClient();
    const ids = borradores.map(l => l.id);
    await supabase.from('liquidaciones').update({ estado: 'aprobado' }).in('id', ids);
    setLiquidaciones(prev =>
      prev.map(l => l.estado === 'borrador' ? { ...l, estado: 'aprobado' } : l)
    );
  };

  const exportCSV = () => {
    const headers = ['Trabajador', 'Empleador', 'Sueldo Base', 'Total Haberes', 'Total Descuentos', 'Líquido', 'Estado'];
    const rows = liquidaciones.map(l => [
      `${l.trabajadores?.nombre || ''} ${l.trabajadores?.apellido_paterno || ''}`.trim(),
      l.contratos?.empleadores?.nombre || '',
      l.sueldo_base,
      l.total_haberes,
      l.total_descuentos,
      l.liquido,
      l.estado,
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `liquidaciones_${periodo}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Stats
  const total = liquidaciones.length;
  const borradores = liquidaciones.filter(l => l.estado === 'borrador').length;
  const firmadas = liquidaciones.filter(l => l.estado === 'firmada').length;
  const pagadas = liquidaciones.filter(l => l.estado === 'pagada').length;
  const montoLiquido = liquidaciones.reduce((sum, l) => sum + (l.liquido || 0), 0);

  if (authLoading) {
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
    { label: 'Total', value: total, icon: Receipt, color: 'text-zinc-600' },
    { label: 'Borradores', value: borradores, icon: Clock, color: 'text-amber-600' },
    { label: 'Firmadas', value: firmadas, icon: CheckCircle2, color: 'text-emerald-600' },
    { label: 'Pagadas', value: pagadas, icon: DollarSign, color: 'text-violet-600' },
    { label: 'Monto Líquido', value: formatCLP(montoLiquido), icon: DollarSign, color: 'text-blue-600', isText: true },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <FileText className="h-6 w-6 text-violet-600" />
          <h1 className="text-2xl font-bold text-zinc-900">Liquidaciones</h1>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={prevMonth} className="rounded-lg border border-zinc-200 p-2 hover:bg-zinc-50 transition-colors">
            <ChevronLeft className="h-4 w-4 text-zinc-600" />
          </button>
          <span className="min-w-[160px] text-center text-sm font-semibold text-zinc-700">
            {MESES[month]} {year}
          </span>
          <button onClick={nextMonth} className="rounded-lg border border-zinc-200 p-2 hover:bg-zinc-50 transition-colors">
            <ChevronRight className="h-4 w-4 text-zinc-600" />
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {statCards.map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="rounded-xl border border-zinc-200 bg-white p-4 text-center">
              <Icon className={`h-5 w-5 mx-auto mb-1 ${s.color}`} />
              <p className={`font-bold text-zinc-900 ${s.isText ? 'text-lg' : 'text-2xl'}`}>{s.value}</p>
              <p className="text-xs text-zinc-500">{s.label}</p>
            </div>
          );
        })}
      </div>

      {/* Bulk Actions */}
      <div className="flex items-center gap-3">
        <button
          onClick={aprobarTodas}
          disabled={borradores === 0}
          className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Aprobar Todas ({borradores})
        </button>
        <button
          onClick={exportCSV}
          disabled={total === 0}
          className="flex items-center gap-2 rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <Download className="h-4 w-4" />
          Exportar CSV
        </button>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex h-40 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-violet-600" />
        </div>
      ) : liquidaciones.length === 0 ? (
        <div className="rounded-xl border border-zinc-200 bg-white p-12 text-center">
          <Receipt className="h-10 w-10 text-zinc-300 mx-auto mb-3" />
          <p className="text-sm text-zinc-500">No hay liquidaciones para {MESES[month]} {year}.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-zinc-200 bg-white overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-100 bg-zinc-50">
                <th className="px-4 py-3 text-left font-medium text-zinc-600">Trabajador</th>
                <th className="px-4 py-3 text-left font-medium text-zinc-600">Empleador</th>
                <th className="px-4 py-3 text-right font-medium text-zinc-600">Sueldo Base</th>
                <th className="px-4 py-3 text-right font-medium text-zinc-600">Haberes</th>
                <th className="px-4 py-3 text-right font-medium text-zinc-600">Descuentos</th>
                <th className="px-4 py-3 text-right font-medium text-zinc-600">Líquido</th>
                <th className="px-4 py-3 text-center font-medium text-zinc-600">Estado</th>
                <th className="px-4 py-3 text-center font-medium text-zinc-600">Acción</th>
              </tr>
            </thead>
            <tbody>
              {liquidaciones.map((l) => {
                const nextEstado = ESTADO_FLOW[l.estado];
                return (
                  <tr key={l.id} className="border-b border-zinc-50 hover:bg-zinc-50 transition-colors">
                    <td className="px-4 py-3 text-zinc-900 font-medium whitespace-nowrap">
                      {l.trabajadores?.nombre || ''} {l.trabajadores?.apellido_paterno || ''}
                    </td>
                    <td className="px-4 py-3 text-zinc-600 whitespace-nowrap">
                      {l.contratos?.empleadores?.nombre || '-'}
                    </td>
                    <td className="px-4 py-3 text-right text-zinc-700 font-mono">{formatCLP(l.sueldo_base)}</td>
                    <td className="px-4 py-3 text-right text-zinc-700 font-mono">{formatCLP(l.total_haberes)}</td>
                    <td className="px-4 py-3 text-right text-red-600 font-mono">{formatCLP(l.total_descuentos)}</td>
                    <td className="px-4 py-3 text-right text-zinc-900 font-bold font-mono">{formatCLP(l.liquido)}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${ESTADO_BADGE[l.estado] || 'bg-zinc-100 text-zinc-600'}`}>
                        {ESTADO_LABEL[l.estado] || l.estado}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {nextEstado ? (
                        <button
                          onClick={() => updateEstado(l.id, nextEstado)}
                          className="rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-violet-700 transition-colors"
                        >
                          {ESTADO_LABEL[nextEstado]}
                        </button>
                      ) : (
                        <span className="text-xs text-zinc-400">Completada</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
