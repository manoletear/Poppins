'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, Dog, Pill, ShoppingBag, ClipboardList, Loader2, CheckCircle2, MessageSquare } from 'lucide-react';
import { useAuth } from '@/lib/auth/context';
import { getRecordatorios, toggleRecordatorioActivo } from '@/lib/supabase/employer-queries';
import { createClient } from '@/lib/supabase/client';

interface Recordatorio {
  id: string;
  titulo: string;
  hora: string;
  dias_semana: number[] | string;
  tipo: string;
  activo: boolean;
  cumplido: boolean;
  fecha_cumplimiento: string | null;
  nota_empleado: string | null;
  trabajador_id?: string | null;
  trabajadores?: { nombre: string; apellido_paterno: string } | null;
}

const tipoConfig: Record<string, { icon: any; iconColor: string; borderColor: string }> = {
  mascota: { icon: Dog, iconColor: 'text-amber-500 bg-amber-50', borderColor: 'border-l-amber-500' },
  medicamento: { icon: Pill, iconColor: 'text-red-500 bg-red-50', borderColor: 'border-l-red-500' },
  compras: { icon: ShoppingBag, iconColor: 'text-blue-500 bg-blue-50', borderColor: 'border-l-blue-500' },
  tarea: { icon: ClipboardList, iconColor: 'text-zinc-500 bg-zinc-100', borderColor: 'border-l-zinc-400' },
};
const defaultConfig = { icon: ClipboardList, iconColor: 'text-zinc-500 bg-zinc-100', borderColor: 'border-l-zinc-400' };

export default function RecordatoriosPage() {
  const { profile } = useAuth();
  const [recordatorios, setRecordatorios] = useState<Recordatorio[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newRec, setNewRec] = useState<{ titulo: string; hora: string; tipo: string; dias: number[] }>({ titulo: '', hora: '08:00', tipo: 'tarea', dias: [1, 2, 3, 4, 5] });
  const [saving, setSaving] = useState(false);

  const empleadorId = profile?.empleador_id;

  const loadData = useCallback(async () => {
    if (!empleadorId) return;
    setLoading(true);
    const data = await getRecordatorios(empleadorId);
    setRecordatorios(data || []);
    setLoading(false);
  }, [empleadorId]);

  useEffect(() => { loadData(); }, [loadData]);

  async function handleToggle(id: string, currentActivo: boolean) {
    setRecordatorios(prev => prev.map(r => r.id === id ? { ...r, activo: !currentActivo } : r));
    await toggleRecordatorioActivo(id, !currentActivo);
  }

  async function handleResetCumplimiento(id: string) {
    const supabase = createClient();
    await supabase.from('recordatorios').update({ cumplido: false, fecha_cumplimiento: null, nota_empleado: null }).eq('id', id);
    setRecordatorios(prev => prev.map(r => r.id === id ? { ...r, cumplido: false, fecha_cumplimiento: null, nota_empleado: null } : r));
  }

  async function handleAddRecordatorio() {
    if (!empleadorId || !newRec.titulo || newRec.dias.length === 0) return;
    setSaving(true);
    const supabase = createClient();
    const diasLiteral = `{${[...newRec.dias].sort((a, b) => a - b).join(',')}}`;
    await supabase.from('recordatorios').insert({ empleador_id: empleadorId, titulo: newRec.titulo, hora: newRec.hora, tipo: newRec.tipo, activo: true, dias_semana: diasLiteral });
    setNewRec({ titulo: '', hora: '08:00', tipo: 'tarea', dias: [1, 2, 3, 4, 5] });
    setShowAdd(false);
    setSaving(false);
    loadData();
  }

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-zinc-400" /></div>;

  const cumplidos = recordatorios.filter(r => r.cumplido).length;
  const activos = recordatorios.filter(r => r.activo).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Recordatorios</h1>
          <p className="text-sm text-zinc-500">{cumplidos}/{activos} cumplidos hoy</p>
        </div>
        <button onClick={() => setShowAdd(!showAdd)} className="inline-flex items-center gap-2 rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 transition-colors">
          <Plus className="h-4 w-4" /> Nuevo Recordatorio
        </button>
      </div>

      {showAdd && (
        <div className="rounded-xl border border-zinc-200 bg-white p-4 space-y-3">
          <input placeholder="Título del recordatorio" value={newRec.titulo} onChange={e => setNewRec(p => ({ ...p, titulo: e.target.value }))}
            className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-300" />
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-zinc-500 mr-1">Días:</span>
            {([[1, 'L'], [2, 'M'], [3, 'M'], [4, 'J'], [5, 'V'], [6, 'S'], [7, 'D']] as [number, string][]).map(([d, lbl], i) => (
              <button key={i} type="button"
                onClick={() => setNewRec(p => ({ ...p, dias: p.dias.includes(d) ? p.dias.filter(x => x !== d) : [...p.dias, d] }))}
                className={`w-7 h-7 rounded-full text-xs font-medium transition-colors ${newRec.dias.includes(d) ? 'bg-zinc-900 text-white' : 'bg-zinc-100 text-zinc-500 hover:bg-zinc-200'}`}>
                {lbl}
              </button>
            ))}
          </div>
          <div className="flex gap-3">
            <input type="time" value={newRec.hora} onChange={e => setNewRec(p => ({ ...p, hora: e.target.value }))}
              className="border border-zinc-200 rounded-lg px-3 py-2 text-sm" />
            <select value={newRec.tipo} onChange={e => setNewRec(p => ({ ...p, tipo: e.target.value }))}
              className="border border-zinc-200 rounded-lg px-3 py-2 text-sm bg-white flex-1">
              <option value="tarea">Tarea</option>
              <option value="mascota">Mascota</option>
              <option value="medicamento">Medicamento</option>
              <option value="compras">Compras</option>
            </select>
            <button onClick={handleAddRecordatorio} disabled={saving || !newRec.titulo}
              className="bg-zinc-900 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50">Crear</button>
          </div>
        </div>
      )}

      {recordatorios.length === 0 ? (
        <div className="rounded-xl border border-zinc-200 bg-white p-8 text-center">
          <p className="text-sm text-zinc-500">No hay recordatorios configurados</p>
        </div>
      ) : (
        <div className="space-y-3">
          {recordatorios.map(rec => {
            const config = tipoConfig[rec.tipo] || defaultConfig;
            const Icon = config.icon;
            const asignado = rec.trabajadores ? `${rec.trabajadores.nombre} ${rec.trabajadores.apellido_paterno || ''}`.trim() : null;

            return (
              <div key={rec.id} className={`rounded-lg border border-zinc-200 border-l-4 ${config.borderColor} p-4 transition-opacity ${rec.activo ? '' : 'opacity-50'}`}>
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4 flex-1">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${config.iconColor} shrink-0`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-zinc-900">{rec.titulo}</p>
                        {rec.cumplido && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                            <CheckCircle2 className="w-3 h-3" /> Cumplido
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-zinc-500 mt-0.5">
                        {rec.hora || ''} {rec.dias_semana ? `· ${Array.isArray(rec.dias_semana) ? rec.dias_semana.map((d: number) => ['','L','M','M','J','V','S','D'][d] || d).join('-') : rec.dias_semana}` : ''}
                      </p>
                      {asignado && <p className="text-xs text-zinc-400 mt-0.5">Asignado: {asignado}</p>}
                      {rec.nota_empleado && (
                        <div className="mt-2 flex items-start gap-1.5 bg-blue-50 rounded-lg px-3 py-2">
                          <MessageSquare className="w-3.5 h-3.5 text-blue-500 mt-0.5 shrink-0" />
                          <p className="text-xs text-blue-700">{rec.nota_empleado}</p>
                        </div>
                      )}
                      {rec.cumplido && rec.fecha_cumplimiento && (
                        <div className="mt-1 flex items-center gap-2">
                          <p className="text-xs text-zinc-400">Completado {new Date(rec.fecha_cumplimiento).toLocaleString('es-CL')}</p>
                          <button onClick={() => handleResetCumplimiento(rec.id)} className="text-xs text-violet-600 hover:underline">Reabrir</button>
                        </div>
                      )}
                    </div>
                  </div>

                  <button onClick={() => handleToggle(rec.id, rec.activo)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors shrink-0 ${rec.activo ? 'bg-emerald-500' : 'bg-zinc-300'}`}>
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${rec.activo ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
