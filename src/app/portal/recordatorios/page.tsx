'use client';

import { useState, useEffect, useCallback } from 'react';
import { CheckCircle2, Clock, MessageSquare, Loader2 } from 'lucide-react';
import { useAuth } from '@/lib/auth/context';
import { createClient } from '@/lib/supabase/client';

export default function RecordatoriosPortalPage() {
  const { profile, loading: authLoading } = useAuth();
  const trabajadorId = profile?.trabajador_id || '';
  const [recordatorios, setRecordatorios] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [nota, setNota] = useState<Record<string, string>>({});

  const loadData = useCallback(async () => {
    if (!trabajadorId) { setLoading(false); return; }
    const supabase = createClient();
    // Get empleadorId from contract
    const { data: cont } = await supabase.from('contratos').select('empleador_id')
      .eq('trabajador_id', trabajadorId).eq('estado', 'activo').limit(1).maybeSingle();
    if (!cont?.empleador_id) { setLoading(false); return; }

    const { data } = await supabase.from('recordatorios').select('*')
      .eq('empleador_id', cont.empleador_id).eq('activo', true)
      .order('hora');
    setRecordatorios(data || []);
    setLoading(false);
  }, [trabajadorId]);

  useEffect(() => { if (!authLoading) loadData(); }, [loadData, authLoading]);

  const marcarCumplido = async (id: string) => {
    const supabase = createClient();
    await supabase.from('recordatorios').update({
      cumplido: true, fecha_cumplimiento: new Date().toISOString(),
      nota_empleado: nota[id] || null,
    }).eq('id', id);
    loadData();
  };

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-zinc-400" /></div>;

  const pendientes = recordatorios.filter(r => !r.cumplido);
  const cumplidos = recordatorios.filter(r => r.cumplido);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-zinc-900">Mis Recordatorios</h1>
      <p className="text-sm text-zinc-500">{pendientes.length} pendientes · {cumplidos.length} cumplidos hoy</p>

      {pendientes.length === 0 && cumplidos.length === 0 && (
        <p className="text-sm text-zinc-400 text-center py-8">No hay recordatorios asignados</p>
      )}

      {pendientes.map(r => (
        <div key={r.id} className="rounded-xl border border-amber-200 bg-amber-50/50 p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-amber-600" />
              <div>
                <p className="text-sm font-semibold text-zinc-900">{r.titulo}</p>
                <p className="text-xs text-zinc-500">{r.hora || ''}</p>
              </div>
            </div>
          </div>
          <div className="flex gap-2 mt-3">
            <input value={nota[r.id] || ''} onChange={e => setNota(prev => ({ ...prev, [r.id]: e.target.value }))}
              placeholder="Nota (opcional)" className="flex-1 border border-zinc-200 rounded-lg px-3 py-1.5 text-xs" />
            <button onClick={() => marcarCumplido(r.id)}
              className="rounded-lg bg-emerald-600 text-white px-4 py-1.5 text-xs font-medium hover:bg-emerald-700 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Cumplido
            </button>
          </div>
        </div>
      ))}

      {cumplidos.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-zinc-700 mb-3">Cumplidos</h2>
          {cumplidos.map(r => (
            <div key={r.id} className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-3 mb-2 flex items-center gap-3">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <div className="flex-1">
                <p className="text-sm text-zinc-800">{r.titulo}</p>
                {r.nota_empleado && <p className="text-xs text-zinc-500 mt-0.5">"{r.nota_empleado}"</p>}
              </div>
              <span className="text-xs text-zinc-400">{r.fecha_cumplimiento ? new Date(r.fecha_cumplimiento).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }) : ''}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
