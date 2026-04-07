'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Stethoscope,
  Building2,
  Umbrella,
  Clock,
  Check,
  X,
  Send,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth/context';

type TabKey = 'pendientes' | 'aprobadas' | 'rechazadas' | 'todas';
type EstadoSolicitud = 'pendiente' | 'aprobada' | 'rechazada';

interface Solicitud {
  id: string;
  tipo: string;
  descripcion: string | null;
  fecha_inicio: string;
  fecha_fin: string | null;
  dias: number;
  estado: EstadoSolicitud;
  fecha_respuesta: string | null;
  created_at: string;
  trabajador_nombre: string;
  trabajador_apellido: string;
  numero_contrato: string | null;
  trabajadores?: { nombre: string; apellido_paterno: string; email?: string };
}

const tabs: { key: TabKey; label: string }[] = [
  { key: 'pendientes', label: 'Pendientes' },
  { key: 'aprobadas', label: 'Aprobadas' },
  { key: 'rechazadas', label: 'Rechazadas' },
  { key: 'todas', label: 'Todas' },
];

function getTipoIcon(tipo: string) {
  switch (tipo) {
    case 'permiso_medico': return { icon: Stethoscope, color: 'text-rose-500 bg-rose-50', label: 'Permiso Médico' };
    case 'vacaciones': return { icon: Umbrella, color: 'text-emerald-500 bg-emerald-50', label: 'Vacaciones' };
    case 'dia_administrativo': return { icon: Building2, color: 'text-blue-500 bg-blue-50', label: 'Día Administrativo' };
    case 'permiso_sin_goce': return { icon: Clock, color: 'text-zinc-500 bg-zinc-100', label: 'Permiso Sin Goce' };
    case 'antiguedad': return { icon: Clock, color: 'text-violet-500 bg-violet-50', label: 'Día Antigüedad' };
    default: return { icon: Send, color: 'text-zinc-500 bg-zinc-100', label: tipo };
  }
}

function getEstadoStyle(estado: EstadoSolicitud): string {
  switch (estado) {
    case 'pendiente': return 'bg-amber-50 text-amber-700';
    case 'aprobada': return 'bg-emerald-50 text-emerald-700';
    case 'rechazada': return 'bg-red-50 text-red-700';
  }
}

function getEstadoLabel(estado: EstadoSolicitud): string {
  switch (estado) {
    case 'pendiente': return 'Pendiente';
    case 'aprobada': return 'Aprobada';
    case 'rechazada': return 'Rechazada';
  }
}

function formatDate(d: string) {
  return new Date(d + 'T12:00:00').toLocaleDateString('es-CL', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function SolicitudesPage() {
  const { profile } = useAuth();
  const empleadorId = profile?.empleador_id || '';
  const [activeTab, setActiveTab] = useState<TabKey>('todas');
  const [solicitudes, setSolicitudes] = useState<Solicitud[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const loadSolicitudes = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const supabase = createClient();
      const { data, error: err } = await supabase
        .from('solicitudes_empleado')
        .select('*, trabajadores!inner(nombre, apellido_paterno, email), contratos(numero_contrato)')
        .eq('empleador_id', empleadorId)
        .order('created_at', { ascending: false });

      if (err) throw err;

      const mapped: Solicitud[] = (data || []).map((s: any) => ({
        id: s.id,
        tipo: s.tipo,
        descripcion: s.descripcion,
        fecha_inicio: s.fecha_inicio,
        fecha_fin: s.fecha_fin,
        dias: s.dias,
        estado: s.estado,
        fecha_respuesta: s.fecha_respuesta,
        created_at: s.created_at,
        trabajador_nombre: s.trabajadores?.nombre || '',
        trabajador_apellido: s.trabajadores?.apellido_paterno || '',
        numero_contrato: s.contratos?.numero_contrato || null,
      }));

      setSolicitudes(mapped);
    } catch (e: any) {
      setError(e.message || 'Error al cargar solicitudes');
    } finally {
      setLoading(false);
    }
  }, [empleadorId]);

  useEffect(() => { loadSolicitudes(); }, [loadSolicitudes]);

  // Auto-refresh every 30 seconds to catch new requests
  useEffect(() => {
    const interval = setInterval(loadSolicitudes, 30000);
    return () => clearInterval(interval);
  }, [loadSolicitudes]);

  const handleAprobar = async (id: string) => {
    setProcessingId(id);
    try {
      const supabase = createClient();
      await supabase
        .from('solicitudes_empleado')
        .update({ estado: 'aprobada', fecha_respuesta: new Date().toISOString() })
        .eq('id', id);
      // Email al empleado
      const sol = solicitudes.find(s => s.id === id);
      if (sol?.trabajadores?.email) {
        fetch('/api/email/solicitud-resuelta', { method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: sol.trabajadores.email, nombre: sol.trabajadores.nombre, tipo: sol.tipo, estado: 'aprobada' }) }).catch(() => {});
      }
      await loadSolicitudes();
    } finally {
      setProcessingId(null);
    }
  };

  const handleRechazar = async (id: string) => {
    setProcessingId(id);
    try {
      const supabase = createClient();
      await supabase
        .from('solicitudes_empleado')
        .update({ estado: 'rechazada', fecha_respuesta: new Date().toISOString() })
        .eq('id', id);
      const sol = solicitudes.find(s => s.id === id);
      if (sol?.trabajadores?.email) {
        fetch('/api/email/solicitud-resuelta', { method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: sol.trabajadores.email, nombre: sol.trabajadores.nombre, tipo: sol.tipo, estado: 'rechazada' }) }).catch(() => {});
      }
      await loadSolicitudes();
    } finally {
      setProcessingId(null);
    }
  };

  const filtered =
    activeTab === 'todas'
      ? solicitudes
      : solicitudes.filter((s) => s.estado === (activeTab === 'pendientes' ? 'pendiente' : activeTab === 'aprobadas' ? 'aprobada' : 'rechazada'));

  const pendingCount = solicitudes.filter((s) => s.estado === 'pendiente').length;

  if (loading && solicitudes.length === 0) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
        <span className="ml-3 text-sm text-zinc-500">Cargando solicitudes...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <AlertCircle className="h-8 w-8 text-red-400" />
        <p className="text-sm text-red-600">{error}</p>
        <button onClick={loadSolicitudes} className="text-sm text-blue-600 hover:underline">Reintentar</button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-zinc-900">Solicitudes</h1>
          {pendingCount > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700 animate-pulse">
              <span className="h-2 w-2 rounded-full bg-amber-500" />
              {pendingCount} pendiente{pendingCount > 1 ? 's' : ''}
            </span>
          )}
        </div>
        <button
          onClick={loadSolicitudes}
          className="text-xs text-zinc-400 hover:text-zinc-600 transition-colors"
          title="Actualizar"
        >
          Actualizar
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-lg bg-zinc-100 p-1 w-fit">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? 'bg-white text-zinc-900 shadow-sm'
                : 'text-zinc-500 hover:text-zinc-700'
            }`}
          >
            {tab.label}
            {tab.key === 'pendientes' && pendingCount > 0 && (
              <span className="ml-1.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 text-[10px] font-bold text-white">
                {pendingCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Solicitudes list */}
      <div className="space-y-4">
        {filtered.map((sol) => {
          const { icon: Icon, color, label } = getTipoIcon(sol.tipo);
          const isProcessing = processingId === sol.id;

          return (
            <div key={sol.id} className={`rounded-xl border bg-white p-5 transition-all ${sol.estado === 'pendiente' ? 'border-amber-200 shadow-sm' : 'border-zinc-200'}`}>
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-lg shrink-0 ${color}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-zinc-900">{label}</p>
                    <p className="text-sm text-zinc-600 mt-0.5">
                      {sol.trabajador_nombre} {sol.trabajador_apellido}
                      {sol.numero_contrato && (
                        <span className="ml-2 text-xs text-zinc-400">#{sol.numero_contrato}</span>
                      )}
                    </p>
                    <p className="text-xs text-zinc-500 mt-1">
                      {formatDate(sol.fecha_inicio)}
                      {sol.fecha_fin && sol.fecha_fin !== sol.fecha_inicio && ` → ${formatDate(sol.fecha_fin)}`}
                      {' · '}{sol.dias} día{sol.dias > 1 ? 's' : ''}
                    </p>
                    {sol.descripcion && (
                      <p className="text-sm text-zinc-500 mt-2">{sol.descripcion}</p>
                    )}
                    {sol.fecha_respuesta && (
                      <p className="text-xs text-zinc-400 mt-1">
                        {sol.estado === 'aprobada' ? 'Aprobada' : 'Rechazada'} el {formatDate(sol.fecha_respuesta.split('T')[0])}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 sm:flex-col sm:items-end">
                  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors ${getEstadoStyle(sol.estado)}`}>
                    {getEstadoLabel(sol.estado)}
                  </span>

                  {sol.estado === 'pendiente' && (
                    <div className="flex gap-2 mt-0 sm:mt-2">
                      <button
                        onClick={() => handleAprobar(sol.id)}
                        disabled={isProcessing}
                        className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 transition-colors disabled:opacity-50"
                      >
                        {isProcessing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                        Aprobar
                      </button>
                      <button
                        onClick={() => handleRechazar(sol.id)}
                        disabled={isProcessing}
                        className="inline-flex items-center gap-1 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700 transition-colors disabled:opacity-50"
                      >
                        {isProcessing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <X className="h-3.5 w-3.5" />}
                        Rechazar
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="rounded-xl border border-zinc-200 bg-white p-8 text-center">
            <p className="text-sm text-zinc-500">
              {activeTab === 'pendientes' ? 'No hay solicitudes pendientes' : 'No hay solicitudes en esta categoría'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
