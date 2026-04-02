'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { FileText, ChevronRight, Loader2, Calendar, DollarSign, Clock } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth/context';

interface Contrato {
  id: string;
  numero_contrato: string;
  tipo_contrato: string;
  tipo_jornada: string;
  horas_semanales: number;
  sueldo_base: number;
  fecha_inicio: string;
  estado: string;
  cargo: string | null;
  trabajador_id: string;
  trabajadores?: { nombre: string; apellido_paterno: string; cargo: string } | null;
}

function formatCLP(n: number): string {
  return '$' + (n ?? 0).toLocaleString('es-CL');
}

export default function ContratosPage() {
  const { profile } = useAuth();
  const [contratos, setContratos] = useState<Contrato[]>([]);
  const [loading, setLoading] = useState(true);

  const loadContratos = useCallback(async () => {
    if (!profile?.empleador_id) return;
    const supabase = createClient();
    const { data } = await supabase
      .from('contratos')
      .select('*, trabajadores(nombre, apellido_paterno, cargo)')
      .eq('empleador_id', profile.empleador_id)
      .order('fecha_inicio', { ascending: false });

    setContratos(data || []);
    setLoading(false);
  }, [profile?.empleador_id]);

  useEffect(() => { loadContratos(); }, [loadContratos]);

  if (loading) {
    return <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-zinc-400" /></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">Contratos</h1>
        <p className="text-sm text-zinc-500 mt-1">{contratos.length} contrato{contratos.length !== 1 ? 's' : ''} registrado{contratos.length !== 1 ? 's' : ''}</p>
      </div>

      {contratos.length === 0 ? (
        <div className="rounded-xl border border-zinc-200 bg-white p-8 text-center">
          <FileText className="w-10 h-10 text-zinc-300 mx-auto mb-3" />
          <p className="text-sm text-zinc-500">No hay contratos registrados</p>
        </div>
      ) : (
        <div className="space-y-3">
          {contratos.map((c) => {
            const workerName = c.trabajadores
              ? `${c.trabajadores.nombre} ${c.trabajadores.apellido_paterno}`
              : 'Trabajador';

            return (
              <Link
                key={c.id}
                href={`/empresa/empleados/${c.trabajador_id}?tab=contrato`}
                className="block rounded-xl border border-zinc-200 bg-white p-5 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-violet-100 flex items-center justify-center">
                      <FileText className="w-5 h-5 text-violet-600" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-zinc-900">#{c.numero_contrato}</p>
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          c.estado === 'activo' ? 'bg-emerald-50 text-emerald-700' : 'bg-zinc-100 text-zinc-600'
                        }`}>
                          {c.estado}
                        </span>
                      </div>
                      <p className="text-sm text-zinc-600 mt-0.5">{workerName} — {c.cargo || c.trabajadores?.cargo || 'Sin cargo'}</p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-zinc-400" />
                </div>

                <div className="mt-3 flex flex-wrap gap-4 text-xs text-zinc-500">
                  <span className="flex items-center gap-1">
                    <DollarSign className="w-3.5 h-3.5" /> {formatCLP(c.sueldo_base)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" /> {c.horas_semanales}h/sem · {c.tipo_jornada}
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" /> Desde {new Date(c.fecha_inicio).toLocaleDateString('es-CL')}
                  </span>
                  <span className="capitalize">{c.tipo_contrato}</span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
