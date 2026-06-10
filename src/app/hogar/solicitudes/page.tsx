'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
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
  DollarSign,
  Upload,
  Download,
  FileText,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth/context';

type SectionKey = 'solicitudes' | 'anticipos';
type TabKey = 'pendientes' | 'aprobadas' | 'rechazadas' | 'todas';
type EstadoSolicitud = 'pendiente' | 'aprobada' | 'rechazada';
type EstadoAnticipo = 'pendiente' | 'aprobado' | 'rechazado' | 'transferido' | 'comprobante_ok' | 'procesado';
type MetodoTransferencia = 'transferencia' | 'efectivo' | 'cheque';

interface Anticipo {
  id: string;
  trabajador_id: string;
  periodo: string | null;
  monto: number;
  motivo: string | null;
  estado: EstadoAnticipo;
  fecha_aprobacion: string | null;
  motivo_rechazo: string | null;
  fecha_transferencia: string | null;
  comprobante_url: string | null;
  comprobante_nombre: string | null;
  metodo_transferencia: MetodoTransferencia | null;
  created_at: string;
  trabajadores?: { nombre: string; apellido_paterno: string };
}

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

function formatCLP(monto: number) {
  return monto.toLocaleString('es-CL', { style: 'currency', currency: 'CLP', minimumFractionDigits: 0 });
}

function getEstadoAnticipoStyle(estado: EstadoAnticipo): string {
  switch (estado) {
    case 'pendiente': return 'bg-amber-50 text-amber-700';
    case 'aprobado': return 'bg-blue-50 text-blue-700';
    case 'rechazado': return 'bg-red-50 text-red-700';
    case 'transferido': return 'bg-violet-50 text-violet-700';
    case 'comprobante_ok': return 'bg-emerald-50 text-emerald-700';
    case 'procesado': return 'bg-emerald-50 text-emerald-700';
  }
}

function getEstadoAnticipoLabel(estado: EstadoAnticipo): string {
  switch (estado) {
    case 'pendiente': return 'Pendiente';
    case 'aprobado': return 'Aprobado';
    case 'rechazado': return 'Rechazado';
    case 'transferido': return 'Transferido';
    case 'comprobante_ok': return 'Listo';
    case 'procesado': return 'Procesado';
  }
}

/* ─── Anticipos Section ─── */
function AnticiposSection({ empleadorId }: { empleadorId: string }) {
  const [anticipos, setAnticipos] = useState<Anticipo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [rechazarId, setRechazarId] = useState<string | null>(null);
  const [motivoRechazo, setMotivoRechazo] = useState('');
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [metodoMap, setMetodoMap] = useState<Record<string, MetodoTransferencia>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadTargetId, setUploadTargetId] = useState<string | null>(null);

  const loadAnticipos = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const supabase = createClient();
      const { data, error: err } = await supabase
        .from('anticipos')
        .select('*, trabajadores(nombre, apellido_paterno)')
        .eq('empleador_id', empleadorId)
        .order('created_at', { ascending: false });
      if (err) throw err;
      setAnticipos((data || []) as Anticipo[]);
    } catch (e: any) {
      setError(e.message || 'Error al cargar anticipos');
    } finally {
      setLoading(false);
    }
  }, [empleadorId]);

  useEffect(() => { loadAnticipos(); }, [loadAnticipos]);

  const handleAprobar = async (id: string) => {
    setProcessingId(id);
    try {
      const supabase = createClient();
      await supabase
        .from('anticipos')
        .update({ estado: 'aprobado', fecha_aprobacion: new Date().toISOString() })
        .eq('id', id);
      await loadAnticipos();
    } finally {
      setProcessingId(null);
    }
  };

  const handleRechazar = async (id: string) => {
    if (!motivoRechazo.trim()) return;
    setProcessingId(id);
    try {
      const supabase = createClient();
      await supabase
        .from('anticipos')
        .update({ estado: 'rechazado', motivo_rechazo: motivoRechazo.trim() })
        .eq('id', id);
      setRechazarId(null);
      setMotivoRechazo('');
      await loadAnticipos();
    } finally {
      setProcessingId(null);
    }
  };

  const handleUploadComprobante = async (id: string, file: File) => {
    if (!['application/pdf', 'image/png', 'image/jpeg'].includes(file.type)) {
      alert('Formato no permitido. Subí PDF, PNG o JPG.');
      setUploadTargetId(null);
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert('El archivo supera el límite de 5 MB.');
      setUploadTargetId(null);
      return;
    }
    setUploadingId(id);
    try {
      const supabase = createClient();
      const ext = file.type === 'application/pdf' ? 'pdf' : file.type === 'image/png' ? 'png' : 'jpg';
      const filePath = `anticipos/${id}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from('comprobantes')
        .upload(filePath, file, { upsert: true, contentType: file.type });
      if (upErr) throw upErr;

      const { data: urlData } = supabase.storage.from('comprobantes').getPublicUrl(filePath);

      const metodo = metodoMap[id] || 'transferencia';
      await supabase
        .from('anticipos')
        .update({
          comprobante_url: urlData.publicUrl,
          comprobante_nombre: file.name,
          estado: 'comprobante_ok',
          fecha_transferencia: new Date().toISOString().split('T')[0],
          metodo_transferencia: metodo,
        })
        .eq('id', id);
      await loadAnticipos();
    } catch (e: any) {
      alert('Error al subir comprobante: ' + (e.message || e));
    } finally {
      setUploadingId(null);
      setUploadTargetId(null);
    }
  };

  const pendientes = anticipos.filter(a => a.estado === 'pendiente');
  const aprobados = anticipos.filter(a => a.estado === 'aprobado');
  const procesados = anticipos.filter(a => a.estado === 'comprobante_ok' || a.estado === 'procesado');
  const rechazados = anticipos.filter(a => a.estado === 'rechazado');
  const pendingCount = pendientes.length;

  if (loading && anticipos.length === 0) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
        <span className="ml-3 text-sm text-zinc-500">Cargando anticipos...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <AlertCircle className="h-8 w-8 text-red-400" />
        <p className="text-sm text-red-600">{error}</p>
        <button onClick={loadAnticipos} className="text-sm text-blue-600 hover:underline">Reintentar</button>
      </div>
    );
  }

  const renderAnticipoCard = (a: Anticipo) => {
    const isProcessing = processingId === a.id;
    const isUploading = uploadingId === a.id;
    const isRejecting = rechazarId === a.id;

    return (
      <div key={a.id} className={`rounded-xl border bg-white p-5 transition-all ${a.estado === 'pendiente' ? 'border-amber-200 shadow-sm' : 'border-zinc-200'}`}>
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg shrink-0 bg-green-50 text-green-600">
              <DollarSign className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-zinc-900">
                {a.trabajadores?.nombre} {a.trabajadores?.apellido_paterno}
              </p>
              <p className="text-lg font-bold text-zinc-900 mt-0.5">{formatCLP(a.monto)}</p>
              {a.motivo && <p className="text-sm text-zinc-500 mt-1">{a.motivo}</p>}
              {a.periodo && <p className="text-xs text-zinc-400 mt-0.5">Periodo: {a.periodo}</p>}
              <p className="text-xs text-zinc-400 mt-0.5">
                Solicitado: {formatDate(a.created_at.split('T')[0])}
              </p>
              {a.fecha_aprobacion && (
                <p className="text-xs text-zinc-400">Aprobado: {formatDate(a.fecha_aprobacion.split('T')[0])}</p>
              )}
              {a.motivo_rechazo && (
                <p className="text-xs text-red-500 mt-1">Motivo rechazo: {a.motivo_rechazo}</p>
              )}
              {a.fecha_transferencia && (
                <p className="text-xs text-zinc-400">Transferido: {formatDate(a.fecha_transferencia)}</p>
              )}
              {a.metodo_transferencia && (
                <p className="text-xs text-zinc-400 capitalize">Método: {a.metodo_transferencia}</p>
              )}
            </div>
          </div>

          <div className="flex flex-col items-end gap-2">
            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getEstadoAnticipoStyle(a.estado)}`}>
              {getEstadoAnticipoLabel(a.estado)}
            </span>

            {/* Pendiente: aprobar/rechazar */}
            {a.estado === 'pendiente' && !isRejecting && (
              <div className="flex gap-2 mt-1">
                <button
                  onClick={() => handleAprobar(a.id)}
                  disabled={isProcessing}
                  className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 transition-colors disabled:opacity-50"
                >
                  {isProcessing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                  Aprobar
                </button>
                <button
                  onClick={() => { setRechazarId(a.id); setMotivoRechazo(''); }}
                  disabled={isProcessing}
                  className="inline-flex items-center gap-1 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700 transition-colors disabled:opacity-50"
                >
                  <X className="h-3.5 w-3.5" />
                  Rechazar
                </button>
              </div>
            )}

            {/* Rechazo form */}
            {a.estado === 'pendiente' && isRejecting && (
              <div className="flex flex-col gap-2 mt-1 w-full sm:w-64">
                <input
                  type="text"
                  value={motivoRechazo}
                  onChange={(e) => setMotivoRechazo(e.target.value)}
                  placeholder="Motivo del rechazo..."
                  className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-300"
                  autoFocus
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => handleRechazar(a.id)}
                    disabled={isProcessing || !motivoRechazo.trim()}
                    className="inline-flex items-center gap-1 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700 transition-colors disabled:opacity-50"
                  >
                    {isProcessing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <X className="h-3.5 w-3.5" />}
                    Confirmar Rechazo
                  </button>
                  <button
                    onClick={() => setRechazarId(null)}
                    className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50 transition-colors"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}

            {/* Aprobado: subir comprobante */}
            {a.estado === 'aprobado' && (
              <div className="flex flex-col gap-2 mt-1">
                <select
                  value={metodoMap[a.id] || 'transferencia'}
                  onChange={(e) => setMetodoMap(prev => ({ ...prev, [a.id]: e.target.value as MetodoTransferencia }))}
                  className="rounded-lg border border-zinc-300 px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-300"
                >
                  <option value="transferencia">Transferencia</option>
                  <option value="efectivo">Efectivo</option>
                  <option value="cheque">Cheque</option>
                </select>
                <button
                  onClick={() => {
                    setUploadTargetId(a.id);
                    fileInputRef.current?.click();
                  }}
                  disabled={isUploading}
                  className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {isUploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                  Subir Comprobante
                </button>
              </div>
            )}

            {/* Procesado: descargar comprobante */}
            {(a.estado === 'comprobante_ok' || a.estado === 'procesado') && a.comprobante_url && (
              <a
                href={a.comprobante_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 transition-colors mt-1"
              >
                <Download className="h-3.5 w-3.5" />
                {a.comprobante_nombre || 'Comprobante'}
              </a>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.png,.jpg,.jpeg"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file && uploadTargetId) {
            handleUploadComprobante(uploadTargetId, file);
          }
          e.target.value = '';
        }}
      />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold text-zinc-900">Anticipos</h2>
          {pendingCount > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700 animate-pulse">
              <span className="h-2 w-2 rounded-full bg-amber-500" />
              {pendingCount} pendiente{pendingCount > 1 ? 's' : ''}
            </span>
          )}
        </div>
        <button onClick={loadAnticipos} className="text-xs text-zinc-400 hover:text-zinc-600 transition-colors">Actualizar</button>
      </div>

      {/* Pendientes */}
      {pendientes.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-amber-700">Pendientes de Aprobación</h3>
          {pendientes.map(renderAnticipoCard)}
        </div>
      )}

      {/* Aprobados */}
      {aprobados.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-blue-700">Aprobados — Pendiente Comprobante</h3>
          {aprobados.map(renderAnticipoCard)}
        </div>
      )}

      {/* Procesados */}
      {procesados.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-emerald-700">Procesados</h3>
          {procesados.map(renderAnticipoCard)}
        </div>
      )}

      {/* Rechazados */}
      {rechazados.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-red-700">Rechazados</h3>
          {rechazados.map(renderAnticipoCard)}
        </div>
      )}

      {anticipos.length === 0 && (
        <div className="rounded-xl border border-zinc-200 bg-white p-8 text-center">
          <p className="text-sm text-zinc-500">No hay anticipos registrados</p>
        </div>
      )}
    </div>
  );
}

export default function SolicitudesPage() {
  const { profile } = useAuth();
  const empleadorId = profile?.empleador_id || '';
  const [activeSection, setActiveSection] = useState<SectionKey>('solicitudes');
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
      await fetch(`/api/solicitudes/${id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado: 'aprobada' }),
      });
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
      await fetch(`/api/solicitudes/${id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado: 'rechazada' }),
      });
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
        <h1 className="text-2xl font-bold text-zinc-900">Solicitudes y Anticipos</h1>
      </div>

      {/* Section Toggle */}
      <div className="flex gap-1 rounded-lg bg-zinc-100 p-1 w-fit">
        <button
          onClick={() => setActiveSection('solicitudes')}
          className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
            activeSection === 'solicitudes' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'
          }`}
        >
          <span className="inline-flex items-center gap-1.5">
            <FileText className="h-4 w-4" />
            Solicitudes
            {pendingCount > 0 && (
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 text-[10px] font-bold text-white">
                {pendingCount}
              </span>
            )}
          </span>
        </button>
        <button
          onClick={() => setActiveSection('anticipos')}
          className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
            activeSection === 'anticipos' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'
          }`}
        >
          <span className="inline-flex items-center gap-1.5">
            <DollarSign className="h-4 w-4" />
            Anticipos
          </span>
        </button>
      </div>

      {/* Anticipos Section */}
      {activeSection === 'anticipos' && <AnticiposSection empleadorId={empleadorId} />}

      {/* Solicitudes Section */}
      {activeSection === 'solicitudes' && (<>
      {/* Solicitudes Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold text-zinc-900">Solicitudes</h2>
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
      </>)}
    </div>
  );
}
