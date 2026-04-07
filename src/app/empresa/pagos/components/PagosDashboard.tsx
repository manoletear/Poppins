'use client';

import { useState, useEffect, useCallback } from 'react';
import { CreditCard, Check, ChevronDown, Zap, Droplets, Flame, Wifi, Home, Building2, User, Shield, Sparkles, Loader2, Receipt, Calendar } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

function formatCLP(n: number): string { return '$' + (n ?? 0).toLocaleString('es-CL'); }

const TIPO_ICONS: Record<string, { icon: any; color: string }> = {
  electricidad: { icon: Zap, color: 'bg-yellow-50 text-yellow-600' },
  luz: { icon: Zap, color: 'bg-yellow-50 text-yellow-600' },
  agua: { icon: Droplets, color: 'bg-cyan-50 text-cyan-600' },
  gas: { icon: Flame, color: 'bg-orange-50 text-orange-600' },
  internet: { icon: Wifi, color: 'bg-indigo-50 text-indigo-600' },
  arriendo: { icon: Home, color: 'bg-blue-50 text-blue-600' },
  gastos_comunes: { icon: Building2, color: 'bg-zinc-100 text-zinc-600' },
  sueldo_empleado: { icon: User, color: 'bg-rose-50 text-rose-600' },
  leyes_sociales: { icon: Shield, color: 'bg-violet-50 text-violet-600' },
  servicio_poppins: { icon: Sparkles, color: 'bg-amber-50 text-amber-600' },
};

interface Props {
  empleadorId: string;
  onOpenAgent: () => void;
}

export default function PagosDashboard({ empleadorId, onOpenAgent }: Props) {
  const [cuentas, setCuentas] = useState<any[]>([]);
  const [historial, setHistorial] = useState<any[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [showHistorial, setShowHistorial] = useState(false);
  const [paying, setPaying] = useState(false);
  const [paySuccess, setPaySuccess] = useState(false);

  const loadData = useCallback(async () => {
    if (!empleadorId) { setLoading(false); return; }
    const supabase = createClient();
    const [cRes, hRes] = await Promise.all([
      supabase.from('cuentas_pago').select('*').eq('empleador_id', empleadorId).eq('activa', true).order('tipo'),
      supabase.from('pagos_empleador').select('*, cuenta_pago:cuenta_pago_id(alias, proveedor, tipo)').eq('empleador_id', empleadorId).order('created_at', { ascending: false }).limit(20),
    ]);
    const cuentasData = cRes.data || [];
    setCuentas(cuentasData);
    setSelected(new Set(cuentasData.map((c: any) => c.id)));
    setHistorial(hRes.data || []);
    setLoading(false);
  }, [empleadorId]);

  useEffect(() => { loadData(); }, [loadData]);

  const toggleCuenta = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const selectAll = () => setSelected(new Set(cuentas.map(c => c.id)));
  const selectNone = () => setSelected(new Set());

  const selectedCuentas = cuentas.filter(c => selected.has(c.id));
  const totalSelected = selectedCuentas.reduce((s, c) => s + (c.monto_fijo || 0), 0);
  const puntosEstimados = Math.floor(totalSelected / 1000);

  const handlePagar = async () => {
    if (selectedCuentas.length === 0) return;
    setPaying(true);
    const supabase = createClient();
    const periodo = new Date().toISOString().substring(0, 7);

    // Crear pagos para cada cuenta seleccionada
    const pagos = selectedCuentas.map(c => ({
      empleador_id: empleadorId,
      tipo: c.tipo,
      monto: c.monto_fijo || 0,
      estado: 'pendiente',
      periodo,
      cuenta_pago_id: c.id,
      descripcion: c.alias || `${c.proveedor} - ${c.tipo}`,
    }));

    await supabase.from('pagos_empleador').insert(pagos);
    setPaying(false);
    setPaySuccess(true);
    setTimeout(() => { setPaySuccess(false); loadData(); }, 2000);
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-zinc-400" /></div>;

  return (
    <div className="space-y-6">
      {/* Resumen */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-xl bg-gradient-to-br from-violet-600 to-indigo-700 p-5 text-white">
          <p className="text-sm text-white/70">Total del mes</p>
          <p className="text-3xl font-bold mt-1">{formatCLP(totalSelected)}</p>
          <p className="text-xs text-white/50 mt-2">{selectedCuentas.length} de {cuentas.length} cuentas seleccionadas</p>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-5">
          <p className="text-sm text-zinc-500">Cuentas Activas</p>
          <p className="text-3xl font-bold text-zinc-900 mt-1">{cuentas.length}</p>
          <button onClick={onOpenAgent} className="text-xs text-violet-600 hover:underline mt-2">+ Agregar cuenta</button>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-5">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <p className="text-sm text-zinc-500">Puntos estimados</p>
          </div>
          <p className="text-3xl font-bold text-zinc-900 mt-1">{puntosEstimados.toLocaleString('es-CL')}</p>
          <p className="text-xs text-zinc-400 mt-2">1 punto por cada $1.000</p>
        </div>
      </div>

      {/* Lista de cuentas con checkbox */}
      <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
        <div className="px-5 py-4 border-b border-zinc-100 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-zinc-900">Cuentas a pagar este mes</h3>
          <div className="flex gap-2">
            <button onClick={selectAll} className="text-xs text-violet-600 hover:underline">Todas</button>
            <span className="text-zinc-300">|</span>
            <button onClick={selectNone} className="text-xs text-zinc-500 hover:underline">Ninguna</button>
          </div>
        </div>

        {cuentas.length === 0 ? (
          <div className="px-5 py-8 text-center">
            <CreditCard className="w-8 h-8 text-zinc-300 mx-auto mb-2" />
            <p className="text-sm text-zinc-500 mb-2">No tienes cuentas configuradas</p>
            <button onClick={onOpenAgent} className="text-sm text-violet-600 font-medium hover:underline">Agregar con Poppins</button>
          </div>
        ) : (
          <div className="divide-y divide-zinc-50">
            {cuentas.map(c => {
              const isSelected = selected.has(c.id);
              const tipoInfo = TIPO_ICONS[c.tipo] || { icon: CreditCard, color: 'bg-zinc-100 text-zinc-600' };
              const Icon = tipoInfo.icon;
              return (
                <div key={c.id} className={`px-5 py-3 flex items-center gap-4 transition cursor-pointer hover:bg-zinc-50 ${!isSelected ? 'opacity-50' : ''}`}
                  onClick={() => toggleCuenta(c.id)}>
                  <button className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition ${isSelected ? 'bg-violet-600 border-violet-600 text-white' : 'border-zinc-300'}`}>
                    {isSelected && <Check className="w-3 h-3" />}
                  </button>
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${tipoInfo.color}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-zinc-900 truncate">{c.alias || c.proveedor || c.tipo}</p>
                    <p className="text-xs text-zinc-400">{c.proveedor} · {c.numero_cuenta || ''}</p>
                  </div>
                  <p className="text-sm font-semibold text-zinc-900 shrink-0">{c.monto_fijo ? formatCLP(c.monto_fijo) : '-'}</p>
                </div>
              );
            })}
          </div>
        )}

        {/* Total + botón pagar */}
        {cuentas.length > 0 && (
          <div className="px-5 py-4 bg-zinc-50 border-t border-zinc-100">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-sm text-zinc-500">Total a pagar</p>
                <p className="text-2xl font-bold text-zinc-900">{formatCLP(totalSelected)}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-zinc-400">Ganarás</p>
                <p className="text-sm font-semibold text-amber-600">{puntosEstimados} puntos</p>
              </div>
            </div>
            <button onClick={handlePagar} disabled={paying || selectedCuentas.length === 0 || paySuccess}
              className={`w-full rounded-xl py-3 text-sm font-semibold transition flex items-center justify-center gap-2 ${
                paySuccess ? 'bg-emerald-600 text-white' : 'bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-50'
              }`}>
              {paying ? <Loader2 className="w-4 h-4 animate-spin" /> :
               paySuccess ? <><Check className="w-4 h-4" /> Pagos registrados</> :
               <><CreditCard className="w-4 h-4" /> Pagar {formatCLP(totalSelected)}</>}
            </button>
          </div>
        )}
      </div>

      {/* Historial */}
      <div>
        <button onClick={() => setShowHistorial(!showHistorial)} className="flex items-center gap-2 text-sm text-zinc-600 hover:text-zinc-900 transition">
          <ChevronDown className={`w-4 h-4 transition-transform ${showHistorial ? 'rotate-180' : ''}`} />
          Historial de pagos ({historial.length})
        </button>
        {showHistorial && historial.length > 0 && (
          <div className="mt-3 rounded-xl border border-zinc-200 bg-white overflow-hidden">
            <table className="w-full text-sm">
              <thead><tr className="border-b bg-zinc-50">
                <th className="px-4 py-2 text-left font-medium text-zinc-500">Cuenta</th>
                <th className="px-4 py-2 text-left font-medium text-zinc-500">Período</th>
                <th className="px-4 py-2 text-right font-medium text-zinc-500">Monto</th>
                <th className="px-4 py-2 text-right font-medium text-zinc-500">Estado</th>
              </tr></thead>
              <tbody className="divide-y divide-zinc-50">
                {historial.map(p => (
                  <tr key={p.id} className="hover:bg-zinc-50">
                    <td className="px-4 py-2 text-zinc-800">{p.descripcion || p.cuenta_pago?.alias || p.tipo}</td>
                    <td className="px-4 py-2 text-zinc-500">{p.periodo}</td>
                    <td className="px-4 py-2 text-right font-medium">{formatCLP(p.monto)}</td>
                    <td className="px-4 py-2 text-right">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        p.estado === 'pagado' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                      }`}>{p.estado}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
