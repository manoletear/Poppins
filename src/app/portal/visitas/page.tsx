'use client';

import { useState, useEffect, useCallback } from 'react';
import { Calendar, CheckCircle2, Plus, Loader2, Package } from 'lucide-react';
import { useAuth } from '@/lib/auth/context';
import { createClient } from '@/lib/supabase/client';

function formatCLP(n: number): string { return '$' + (n ?? 0).toLocaleString('es-CL'); }

export default function VisitasPortalPage() {
  const { profile, loading: authLoading } = useAuth();
  const trabajadorId = profile?.trabajador_id || '';
  const [visitas, setVisitas] = useState<any[]>([]);
  const [materiales, setMateriales] = useState<Record<string, any[]>>({});
  const [loading, setLoading] = useState(true);
  const [showAddMat, setShowAddMat] = useState<string | null>(null);
  const [matNombre, setMatNombre] = useState('');
  const [matCosto, setMatCosto] = useState('');

  const loadData = useCallback(async () => {
    if (!trabajadorId) { setLoading(false); return; }
    const supabase = createClient();
    const { data } = await supabase.from('visitas_servicio').select('*')
      .eq('trabajador_id', trabajadorId).order('fecha', { ascending: false });
    setVisitas(data || []);

    const ids = (data || []).map((v: any) => v.id);
    if (ids.length > 0) {
      const { data: mats } = await supabase.from('materiales_visita').select('*').in('visita_id', ids);
      const byVisita: Record<string, any[]> = {};
      (mats || []).forEach((m: any) => { if (!byVisita[m.visita_id]) byVisita[m.visita_id] = []; byVisita[m.visita_id].push(m); });
      setMateriales(byVisita);
    }
    setLoading(false);
  }, [trabajadorId]);

  useEffect(() => { if (!authLoading) loadData(); }, [loadData, authLoading]);

  const marcarCompletada = async (id: string) => {
    const supabase = createClient();
    await supabase.from('visitas_servicio').update({
      estado: 'completada', completada_por_empleado: true, completada_at: new Date().toISOString(),
    }).eq('id', id);
    loadData();
  };

  const agregarMaterial = async (visitaId: string) => {
    if (!matNombre || !matCosto) return;
    const supabase = createClient();
    await supabase.from('materiales_visita').insert({
      visita_id: visitaId, nombre: matNombre, cantidad: 1, costo: Number(matCosto), aprobado: false,
    });
    setMatNombre(''); setMatCosto(''); setShowAddMat(null);
    loadData();
  };

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-zinc-400" /></div>;

  const hoy = new Date().toLocaleDateString('en-CA');
  const proximas = visitas.filter(v => v.estado === 'programada');
  const completadas = visitas.filter(v => v.estado === 'completada' || v.estado === 'aprobada');

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-zinc-900">Mis Visitas</h1>

      {/* Calendar grid */}
      <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
        {visitas.slice(0, 28).map(v => {
          const bg = v.estado === 'aprobada' ? 'bg-emerald-500 text-white' :
                     v.estado === 'completada' ? 'bg-blue-500 text-white' :
                     v.estado === 'no_realizada' ? 'bg-red-500 text-white' :
                     new Date(v.fecha) < new Date() ? 'bg-red-100 text-red-700' :
                     'bg-zinc-100 text-zinc-600';
          return (
            <div key={v.id} className={`rounded-lg p-2 text-center ${bg}`}>
              <p className="text-[10px]">{new Date(v.fecha).toLocaleDateString('es-CL', { month: 'short' })}</p>
              <p className="text-lg font-bold">{new Date(v.fecha).getDate()}</p>
            </div>
          );
        })}
      </div>

      {/* Próximas visitas con acción */}
      {proximas.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-zinc-700 mb-3">Próximas Visitas</h2>
          <div className="space-y-2">
            {proximas.map(v => (
              <div key={v.id} className="rounded-lg border border-zinc-200 bg-white p-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-zinc-900">
                    {new Date(v.fecha).toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' })}
                  </p>
                  <p className="text-xs text-zinc-500">{formatCLP(v.costo_visita)} por visita</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setShowAddMat(showAddMat === v.id ? null : v.id)}
                    className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs text-zinc-600 hover:bg-zinc-50">
                    <Package className="w-3.5 h-3.5 inline mr-1" /> Material
                  </button>
                  {v.fecha <= hoy && (
                    <button onClick={() => marcarCompletada(v.id)}
                      className="rounded-lg bg-emerald-600 text-white px-3 py-1.5 text-xs font-medium hover:bg-emerald-700">
                      <CheckCircle2 className="w-3.5 h-3.5 inline mr-1" /> Completada
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add material form */}
      {showAddMat && (
        <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 flex gap-3 items-end">
          <div className="flex-1">
            <label className="text-xs text-zinc-500 block mb-1">Material</label>
            <input value={matNombre} onChange={e => setMatNombre(e.target.value)} placeholder="Nombre del material"
              className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm" />
          </div>
          <div style={{ width: 120 }}>
            <label className="text-xs text-zinc-500 block mb-1">Costo</label>
            <input value={matCosto} onChange={e => setMatCosto(e.target.value)} type="number" placeholder="$"
              className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm" />
          </div>
          <button onClick={() => agregarMaterial(showAddMat)} className="bg-zinc-900 text-white px-4 py-2 rounded-lg text-sm">Agregar</button>
        </div>
      )}

      {/* Historial */}
      <div>
        <h2 className="text-sm font-semibold text-zinc-700 mb-3">Historial ({completadas.length} visitas)</h2>
        <div className="space-y-2">
          {completadas.map(v => {
            const mats = materiales[v.id] || [];
            return (
              <div key={v.id} className={`rounded-lg border p-3 ${v.estado === 'aprobada' ? 'border-emerald-200 bg-emerald-50/50' : 'border-blue-200 bg-blue-50/50'}`}>
                <div className="flex justify-between">
                  <p className="text-sm text-zinc-800">{new Date(v.fecha).toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
                  <span className={`text-xs font-medium ${v.estado === 'aprobada' ? 'text-emerald-700' : 'text-blue-700'}`}>
                    {v.estado === 'aprobada' ? '✅ Aprobada' : '🔵 Pendiente aprobación'}
                  </span>
                </div>
                {mats.length > 0 && (
                  <div className="mt-2 text-xs text-zinc-600">
                    {mats.map((m: any) => <span key={m.id} className="mr-3">{m.nombre} {formatCLP(m.costo)}{m.aprobado ? ' ✓' : ' ⏳'}</span>)}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
