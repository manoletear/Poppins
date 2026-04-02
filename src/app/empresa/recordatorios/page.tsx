'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, Dog, Pill, ShoppingBag, Trash2, ClipboardList, Loader2 } from 'lucide-react';
import { useAuth } from '@/lib/auth/context';
import { getRecordatorios, toggleRecordatorioActivo } from '@/lib/supabase/employer-queries';

interface Recordatorio {
  id: string;
  titulo: string;
  hora: string;
  dias_semana: number[] | string;
  tipo: string;
  activo: boolean;
  trabajador_id?: string | null;
  trabajadores?: { nombre: string; apellido_paterno: string } | null;
}

const tipoConfig: Record<string, { icon: any; iconColor: string; borderColor: string }> = {
  mascota: { icon: Dog, iconColor: 'text-amber-500 bg-amber-50', borderColor: 'border-l-amber-500' },
  medicamento: { icon: Pill, iconColor: 'text-red-500 bg-red-50', borderColor: 'border-l-red-500' },
  compras: { icon: ShoppingBag, iconColor: 'text-blue-500 bg-blue-50', borderColor: 'border-l-blue-500' },
  tarea: { icon: Trash2, iconColor: 'text-zinc-500 bg-zinc-100', borderColor: 'border-l-zinc-400' },
};

const defaultConfig = { icon: ClipboardList, iconColor: 'text-zinc-500 bg-zinc-100', borderColor: 'border-l-zinc-400' };

export default function RecordatoriosPage() {
  const { profile } = useAuth();
  const [recordatorios, setRecordatorios] = useState<Recordatorio[]>([]);
  const [loading, setLoading] = useState(true);

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
    setRecordatorios((prev) => prev.map((r) => r.id === id ? { ...r, activo: !currentActivo } : r));
    await toggleRecordatorioActivo(id, !currentActivo);
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-zinc-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold text-zinc-900">Recordatorios</h1>
        <button className="inline-flex items-center gap-2 rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 transition-colors">
          <Plus className="h-4 w-4" />
          Nuevo Recordatorio
        </button>
      </div>

      {/* Recordatorios list */}
      {recordatorios.length === 0 ? (
        <div className="rounded-xl border border-zinc-200 bg-white p-8 text-center">
          <p className="text-sm text-zinc-500">No hay recordatorios configurados</p>
        </div>
      ) : (
        <div className="space-y-3">
          {recordatorios.map((rec) => {
            const config = tipoConfig[rec.tipo] || defaultConfig;
            const Icon = config.icon;
            const asignado = rec.trabajadores
              ? `${rec.trabajadores.nombre} ${rec.trabajadores.apellido_paterno || ''}`.trim()
              : null;

            return (
              <div
                key={rec.id}
                className={`rounded-lg border border-zinc-200 border-l-4 ${config.borderColor} p-4 transition-opacity ${
                  rec.activo ? 'opacity-100' : 'opacity-50'
                }`}
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${config.iconColor}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-zinc-900">{rec.titulo}</p>
                      <p className="text-xs text-zinc-500 mt-0.5">
                        {rec.hora || ''} {rec.dias_semana ? `· ${Array.isArray(rec.dias_semana) ? rec.dias_semana.map((d: number) => ['','L','M','M','J','V','S','D'][d] || d).join('-') : rec.dias_semana}` : ''}
                      </p>
                      {asignado && (
                        <p className="text-xs text-zinc-400 mt-0.5">Asignado: {asignado}</p>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => handleToggle(rec.id, rec.activo)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      rec.activo ? 'bg-emerald-500' : 'bg-zinc-300'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        rec.activo ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
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
