'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth/context';
import { createClient } from '@/lib/supabase/client';
import {
  Loader2, Shield, CreditCard, Users, UserX, TrendingUp,
  Search, Filter, Receipt, DollarSign, AlertTriangle,
} from 'lucide-react';

interface Empleador {
  id: string;
  nombre: string;
  rut: string;
  email?: string;
  plan_tipo: string;
  estado: string;
  created_at: string;
  updated_at: string;
}

interface PagoInfo {
  empleador_id: string;
  count: number;
  last_paid?: string;
}

const planPrices: Record<string, number> = {
  free: 0,
  starter: 0,
  premium: 14990,
  casa: 14990,
  enterprise: 29990,
  hogar: 29990,
};

const planLabels: Record<string, string> = {
  free: 'Starter (Free)',
  starter: 'Starter (Free)',
  premium: 'Casa ($14.990)',
  casa: 'Casa ($14.990)',
  enterprise: 'Hogar ($29.990)',
  hogar: 'Hogar ($29.990)',
};

function formatCLP(n: number) { return '$' + (n ?? 0).toLocaleString('es-CL'); }

export default function AdminFacturacionPage() {
  const { profile, loading: authLoading } = useAuth();
  const [empleadores, setEmpleadores] = useState<Empleador[]>([]);
  const [pagosMap, setPagosMap] = useState<Record<string, PagoInfo>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterPlan, setFilterPlan] = useState('');
  const [filterPayment, setFilterPayment] = useState('');
  const [generando, setGenerando] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!profile || profile.rol !== 'admin') return;
    (async () => {
      const supabase = createClient();

      // All employers
      const { data: empData } = await supabase.from('empleadores').select('*').order('nombre');
      setEmpleadores((empData as Empleador[]) || []);

      // Pagos aggregation - get all pagos and aggregate client-side
      const { data: pagosData } = await supabase
        .from('pagos_empleador')
        .select('empleador_id, estado, created_at')
        .eq('estado', 'pagado')
        .order('created_at', { ascending: false });

      const map: Record<string, PagoInfo> = {};
      (pagosData || []).forEach((p: any) => {
        if (!map[p.empleador_id]) {
          map[p.empleador_id] = { empleador_id: p.empleador_id, count: 0, last_paid: p.created_at };
        }
        map[p.empleador_id].count++;
      });
      setPagosMap(map);
      setLoading(false);
    })();
  }, [profile, authLoading]);

  // Filter
  const filtered = useMemo(() => {
    let list = empleadores;
    if (search) {
      const s = search.toLowerCase();
      list = list.filter(e => `${e.nombre} ${e.rut} ${e.email || ''}`.toLowerCase().includes(s));
    }
    if (filterPlan) list = list.filter(e => e.plan_tipo === filterPlan);
    if (filterPayment === 'paid') list = list.filter(e => pagosMap[e.id]?.count > 0);
    if (filterPayment === 'unpaid') list = list.filter(e => !pagosMap[e.id] || pagosMap[e.id].count === 0);
    return list;
  }, [empleadores, search, filterPlan, filterPayment, pagosMap]);

  // Stats
  const paidPlans = empleadores.filter(e => (planPrices[e.plan_tipo] || 0) > 0);
  const mrr = paidPlans.reduce((sum, e) => sum + (planPrices[e.plan_tipo] || 0), 0);
  const totalPaid = paidPlans.length;
  const totalFree = empleadores.length - totalPaid;

  // Churn candidates: no update in 30 days
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();
  const churnCandidates = empleadores.filter(e => e.updated_at < thirtyDaysAgo).length;

  const generarFactura = async (empleadorId: string) => {
    setGenerando(empleadorId);
    const supabase = createClient();
    const emp = empleadores.find(e => e.id === empleadorId);
    if (!emp) { setGenerando(null); return; }
    const monto = planPrices[emp.plan_tipo] || 0;
    const periodo = new Date().toISOString().slice(0, 7);
    await supabase.from('facturas_poppins').insert({
      empleador_id: empleadorId,
      periodo,
      monto,
      plan: emp.plan_tipo,
      estado: 'emitida',
    });
    setGenerando(null);
    alert(`Factura generada para ${emp.nombre} - ${periodo} - ${formatCLP(monto)}`);
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

  const planes = [...new Set(empleadores.map(e => e.plan_tipo).filter(Boolean))];

  return (
    <div className="min-h-screen bg-zinc-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Link href="/admin" className="text-zinc-400 hover:text-zinc-600 transition">
            <Shield className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-zinc-900">Facturacion Poppins</h1>
            <p className="text-sm text-zinc-500">Billing y revenue de la plataforma</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <div className="rounded-xl border border-zinc-200 bg-white p-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-4 h-4 text-emerald-500" />
              <span className="text-xs text-zinc-500">MRR</span>
            </div>
            <p className="text-2xl font-bold text-emerald-600">{formatCLP(mrr)}</p>
          </div>
          <div className="rounded-xl border border-zinc-200 bg-white p-4">
            <div className="flex items-center gap-2 mb-1">
              <CreditCard className="w-4 h-4 text-violet-500" />
              <span className="text-xs text-zinc-500">Clientes Pagados</span>
            </div>
            <p className="text-2xl font-bold text-zinc-900">{totalPaid}</p>
          </div>
          <div className="rounded-xl border border-zinc-200 bg-white p-4">
            <div className="flex items-center gap-2 mb-1">
              <Users className="w-4 h-4 text-blue-500" />
              <span className="text-xs text-zinc-500">Clientes Free</span>
            </div>
            <p className="text-2xl font-bold text-zinc-900">{totalFree}</p>
          </div>
          <div className="rounded-xl border border-zinc-200 bg-white p-4">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <span className="text-xs text-zinc-500">Riesgo Churn</span>
            </div>
            <p className="text-2xl font-bold text-amber-600">{churnCandidates}</p>
            <p className="text-xs text-zinc-400">sin actividad 30d</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input
              type="text"
              placeholder="Buscar empleador..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-zinc-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>
          <select
            value={filterPlan}
            onChange={(e) => setFilterPlan(e.target.value)}
            className="px-3 py-2 rounded-xl border border-zinc-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
          >
            <option value="">Todos los planes</option>
            {planes.map(p => <option key={p} value={p}>{planLabels[p] || p}</option>)}
          </select>
          <select
            value={filterPayment}
            onChange={(e) => setFilterPayment(e.target.value)}
            className="px-3 py-2 rounded-xl border border-zinc-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
          >
            <option value="">Estado pago</option>
            <option value="paid">Con pagos</option>
            <option value="unpaid">Sin pagos</option>
          </select>
        </div>

        {/* Table */}
        <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-100 bg-zinc-50/50">
                  <th className="text-left px-4 py-3 font-medium text-zinc-500">Empleador</th>
                  <th className="text-left px-4 py-3 font-medium text-zinc-500">Plan</th>
                  <th className="text-right px-4 py-3 font-medium text-zinc-500">Precio/mes</th>
                  <th className="text-left px-4 py-3 font-medium text-zinc-500">Estado Pago</th>
                  <th className="text-left px-4 py-3 font-medium text-zinc-500">Ultimo Pago</th>
                  <th className="text-center px-4 py-3 font-medium text-zinc-500">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((emp) => {
                  const price = planPrices[emp.plan_tipo] || 0;
                  const pago = pagosMap[emp.id];
                  const hasPaid = pago && pago.count > 0;
                  return (
                    <tr key={emp.id} className="border-b border-zinc-50 hover:bg-zinc-50/50 transition">
                      <td className="px-4 py-3">
                        <p className="font-medium text-zinc-900">{emp.nombre}</p>
                        <p className="text-xs text-zinc-400">{emp.rut}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          price === 0 ? 'bg-zinc-100 text-zinc-600' :
                          price <= 15000 ? 'bg-blue-100 text-blue-700' :
                          'bg-violet-100 text-violet-700'
                        }`}>
                          {planLabels[emp.plan_tipo] || emp.plan_tipo}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-zinc-900">
                        {price === 0 ? 'Gratis' : formatCLP(price)}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${hasPaid ? 'bg-emerald-100 text-emerald-700' : 'bg-zinc-100 text-zinc-500'}`}>
                          {hasPaid ? `${pago.count} pagos` : 'Sin pagos'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-zinc-500 text-xs">
                        {pago?.last_paid ? new Date(pago.last_paid).toLocaleDateString('es-CL') : '—'}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {price > 0 && (
                          <button
                            onClick={() => generarFactura(emp.id)}
                            disabled={generando === emp.id}
                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-violet-600 text-white rounded-lg text-xs font-medium hover:bg-violet-700 transition disabled:opacity-50"
                          >
                            {generando === emp.id ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <Receipt className="w-3 h-3" />
                            )}
                            Generar Factura
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-zinc-400">
                      No se encontraron empleadores
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
