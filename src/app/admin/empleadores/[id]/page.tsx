'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/context';
import { createClient } from '@/lib/supabase/client';
import {
  Loader2, ArrowLeft, Building2, Users, CreditCard, FileText,
  Calendar, MapPin, Phone, Mail, Shield, AlertTriangle
} from 'lucide-react';
import Link from 'next/link';

type Tab = 'resumen' | 'empleados' | 'pagos' | 'solicitudes';

interface Empleador {
  id: string;
  rut: string;
  nombre: string;
  email: string | null;
  telefono: string | null;
  direccion: string | null;
  comuna: string | null;
  region: string | null;
  plan_tipo: string;
  estado: string;
  fecha_nacimiento: string | null;
  genero: string | null;
  onboarding_completado: boolean;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

interface Contrato {
  id: string;
  trabajador_id: string;
  tipo_contrato: string;
  fecha_inicio: string;
  fecha_termino: string | null;
  sueldo_base: number;
  estado: string;
  trabajador?: { nombre: string; apellido_paterno: string; rut: string };
}

interface Pago {
  id: string;
  monto: number;
  estado: string;
  tipo: string | null;
  fecha_pago: string | null;
  descripcion: string | null;
  created_at: string;
}

interface Solicitud {
  id: string;
  tipo: string;
  estado: string;
  descripcion: string | null;
  created_at: string;
}

export default function EmpleadorDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { profile } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('resumen');
  const [loading, setLoading] = useState(true);
  const [empleador, setEmpleador] = useState<Empleador | null>(null);
  const [contratos, setContratos] = useState<Contrato[]>([]);
  const [pagos, setPagos] = useState<Pago[]>([]);
  const [solicitudes, setSolicitudes] = useState<Solicitud[]>([]);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (profile?.rol !== 'admin' || !id) return;
    async function load() {
      const supabase = createClient();

      const [empRes, contRes, pagRes, solRes] = await Promise.all([
        supabase.from('empleadores').select('*').eq('id', id).single(),
        supabase.from('contratos').select('id, trabajador_id, tipo_contrato, fecha_inicio, fecha_termino, sueldo_base, estado').eq('empleador_id', id),
        supabase.from('pagos_empleador').select('id, monto, estado, tipo, fecha_pago, descripcion, created_at').eq('empleador_id', id).order('created_at', { ascending: false }),
        supabase.from('solicitudes_empleado').select('id, tipo, estado, descripcion, created_at').eq('empleador_id', id).order('created_at', { ascending: false }),
      ]);

      if (empRes.data) setEmpleador(empRes.data as Empleador);

      // Enrich contratos with trabajador info
      if (contRes.data && contRes.data.length > 0) {
        const trabIds = contRes.data.map((c: { trabajador_id: string }) => c.trabajador_id);
        const { data: trabajadores } = await supabase
          .from('trabajadores')
          .select('id, nombre, apellido_paterno, rut')
          .in('id', trabIds);

        const trabMap: Record<string, { nombre: string; apellido_paterno: string; rut: string }> = {};
        for (const t of trabajadores || []) {
          trabMap[t.id] = t;
        }

        setContratos(
          contRes.data.map((c: Contrato) => ({
            ...c,
            trabajador: trabMap[c.trabajador_id] || undefined,
          }))
        );
      }

      setPagos((pagRes.data as Pago[]) || []);
      setSolicitudes((solRes.data as Solicitud[]) || []);
      setLoading(false);
    }
    load();
  }, [profile, id]);

  const handleChangePlan = async (newPlan: string) => {
    if (!empleador) return;
    setActionLoading(true);
    const supabase = createClient();
    await supabase.from('empleadores').update({ plan_tipo: newPlan }).eq('id', empleador.id);
    setEmpleador({ ...empleador, plan_tipo: newPlan });
    setActionLoading(false);
  };

  const handleToggleEstado = async () => {
    if (!empleador) return;
    setActionLoading(true);
    const newEstado = empleador.estado === 'activo' ? 'inactivo' : 'activo';
    const supabase = createClient();
    await supabase.from('empleadores').update({ estado: newEstado }).eq('id', empleador.id);
    setEmpleador({ ...empleador, estado: newEstado });
    setActionLoading(false);
  };

  if (profile?.rol !== 'admin') {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center">
        <p className="text-zinc-500">Acceso restringido a administradores.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-zinc-400" />
      </div>
    );
  }

  if (!empleador) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center">
        <p className="text-zinc-500">Empleador no encontrado.</p>
      </div>
    );
  }

  const tabs: { key: Tab; label: string; icon: React.ReactNode; count?: number }[] = [
    { key: 'resumen', label: 'Resumen', icon: <Building2 className="w-4 h-4" /> },
    { key: 'empleados', label: 'Empleados', icon: <Users className="w-4 h-4" />, count: contratos.length },
    { key: 'pagos', label: 'Pagos', icon: <CreditCard className="w-4 h-4" />, count: pagos.length },
    { key: 'solicitudes', label: 'Solicitudes', icon: <FileText className="w-4 h-4" />, count: solicitudes.length },
  ];

  const estadoColors: Record<string, string> = {
    activo: 'bg-emerald-100 text-emerald-700',
    inactivo: 'bg-zinc-100 text-zinc-600',
    pendiente: 'bg-amber-100 text-amber-700',
    pagado: 'bg-emerald-100 text-emerald-700',
    procesando: 'bg-blue-100 text-blue-700',
    fallido: 'bg-red-100 text-red-700',
    aprobada: 'bg-emerald-100 text-emerald-700',
    rechazada: 'bg-red-100 text-red-700',
  };

  const formatMoney = (n: number) =>
    new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(n);

  return (
    <div className="min-h-screen bg-zinc-50">
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => router.push('/admin/empleadores')}
            className="w-9 h-9 rounded-lg border border-zinc-200 bg-white flex items-center justify-center hover:bg-zinc-50 transition"
          >
            <ArrowLeft className="w-4 h-4 text-zinc-600" />
          </button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-zinc-900">{empleador.nombre}</h1>
            <p className="text-sm text-zinc-500">RUT: {empleador.rut}</p>
          </div>
          <span
            className={`text-xs px-3 py-1 rounded-full font-medium ${
              estadoColors[empleador.estado] || 'bg-zinc-100 text-zinc-600'
            }`}
          >
            {empleador.estado}
          </span>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-white rounded-xl border border-zinc-200 p-1">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 px-4 py-2 text-sm rounded-lg transition flex-1 justify-center ${
                tab === t.key
                  ? 'bg-violet-600 text-white font-medium'
                  : 'text-zinc-600 hover:bg-zinc-50'
              }`}
            >
              {t.icon}
              {t.label}
              {t.count !== undefined && (
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                    tab === t.key ? 'bg-violet-500 text-white' : 'bg-zinc-100 text-zinc-500'
                  }`}
                >
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {tab === 'resumen' && (
          <div className="space-y-4">
            {/* Info Grid */}
            <div className="rounded-xl border border-zinc-200 bg-white p-6">
              <h2 className="text-lg font-semibold text-zinc-900 mb-4">Información General</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { icon: <Mail className="w-4 h-4" />, label: 'Email', value: empleador.email || '-' },
                  { icon: <Phone className="w-4 h-4" />, label: 'Teléfono', value: empleador.telefono || '-' },
                  { icon: <MapPin className="w-4 h-4" />, label: 'Dirección', value: [empleador.direccion, empleador.comuna, empleador.region].filter(Boolean).join(', ') || '-' },
                  { icon: <Calendar className="w-4 h-4" />, label: 'Fecha Nacimiento', value: empleador.fecha_nacimiento || '-' },
                  { icon: <Shield className="w-4 h-4" />, label: 'Plan', value: empleador.plan_tipo },
                  { icon: <Calendar className="w-4 h-4" />, label: 'Registrado', value: new Date(empleador.created_at).toLocaleDateString('es-CL') },
                ].map((item) => (
                  <div key={item.label} className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-zinc-100 flex items-center justify-center text-zinc-500 flex-shrink-0">
                      {item.icon}
                    </div>
                    <div>
                      <p className="text-xs text-zinc-500">{item.label}</p>
                      <p className="text-sm font-medium text-zinc-900 capitalize">{item.value}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Admin Actions */}
            <div className="rounded-xl border border-zinc-200 bg-white p-6">
              <h2 className="text-lg font-semibold text-zinc-900 mb-4">Acciones de Admin</h2>
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-zinc-600 mb-2 block">Cambiar Plan</label>
                  <div className="flex gap-2">
                    {['free', 'premium', 'enterprise'].map((plan) => (
                      <button
                        key={plan}
                        onClick={() => handleChangePlan(plan)}
                        disabled={actionLoading || empleador.plan_tipo === plan}
                        className={`px-4 py-2 text-sm rounded-lg border transition capitalize ${
                          empleador.plan_tipo === plan
                            ? 'bg-violet-600 text-white border-violet-600'
                            : 'border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50'
                        } disabled:opacity-50`}
                      >
                        {plan}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="pt-3 border-t border-zinc-100">
                  <button
                    onClick={handleToggleEstado}
                    disabled={actionLoading}
                    className={`flex items-center gap-2 px-4 py-2 text-sm rounded-lg transition ${
                      empleador.estado === 'activo'
                        ? 'bg-red-50 text-red-600 border border-red-200 hover:bg-red-100'
                        : 'bg-emerald-50 text-emerald-600 border border-emerald-200 hover:bg-emerald-100'
                    } disabled:opacity-50`}
                  >
                    <AlertTriangle className="w-4 h-4" />
                    {empleador.estado === 'activo' ? 'Desactivar Empleador' : 'Activar Empleador'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {tab === 'empleados' && (
          <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
            {contratos.length === 0 ? (
              <div className="p-8 text-center text-zinc-400">
                <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>Sin empleados registrados</p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-zinc-50 border-b border-zinc-100">
                    <th className="text-left px-4 py-3 font-medium text-zinc-600">Trabajador</th>
                    <th className="text-left px-4 py-3 font-medium text-zinc-600">RUT</th>
                    <th className="text-left px-4 py-3 font-medium text-zinc-600">Tipo Contrato</th>
                    <th className="text-left px-4 py-3 font-medium text-zinc-600">Sueldo Base</th>
                    <th className="text-left px-4 py-3 font-medium text-zinc-600">Inicio</th>
                    <th className="text-left px-4 py-3 font-medium text-zinc-600">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {contratos.map((c) => (
                    <tr key={c.id} className="border-b border-zinc-50 hover:bg-zinc-50 transition">
                      <td className="px-4 py-3 font-medium text-zinc-900">
                        {c.trabajador ? `${c.trabajador.nombre} ${c.trabajador.apellido_paterno}` : c.trabajador_id}
                      </td>
                      <td className="px-4 py-3 text-zinc-600">{c.trabajador?.rut || '-'}</td>
                      <td className="px-4 py-3 text-zinc-600 capitalize">{c.tipo_contrato}</td>
                      <td className="px-4 py-3 text-zinc-700 font-medium">{formatMoney(c.sueldo_base)}</td>
                      <td className="px-4 py-3 text-zinc-500">
                        {new Date(c.fecha_inicio).toLocaleDateString('es-CL')}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${estadoColors[c.estado] || 'bg-zinc-100 text-zinc-600'}`}>
                          {c.estado}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {tab === 'pagos' && (
          <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
            {pagos.length === 0 ? (
              <div className="p-8 text-center text-zinc-400">
                <CreditCard className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>Sin pagos registrados</p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-zinc-50 border-b border-zinc-100">
                    <th className="text-left px-4 py-3 font-medium text-zinc-600">Fecha</th>
                    <th className="text-left px-4 py-3 font-medium text-zinc-600">Tipo</th>
                    <th className="text-left px-4 py-3 font-medium text-zinc-600">Descripción</th>
                    <th className="text-right px-4 py-3 font-medium text-zinc-600">Monto</th>
                    <th className="text-left px-4 py-3 font-medium text-zinc-600">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {pagos.map((p) => (
                    <tr key={p.id} className="border-b border-zinc-50 hover:bg-zinc-50 transition">
                      <td className="px-4 py-3 text-zinc-500">
                        {p.fecha_pago
                          ? new Date(p.fecha_pago).toLocaleDateString('es-CL')
                          : new Date(p.created_at).toLocaleDateString('es-CL')}
                      </td>
                      <td className="px-4 py-3 text-zinc-600 capitalize">{p.tipo || '-'}</td>
                      <td className="px-4 py-3 text-zinc-600">{p.descripcion || '-'}</td>
                      <td className="px-4 py-3 text-right font-medium text-zinc-900">{formatMoney(p.monto)}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${estadoColors[p.estado] || 'bg-zinc-100 text-zinc-600'}`}>
                          {p.estado}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {tab === 'solicitudes' && (
          <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
            {solicitudes.length === 0 ? (
              <div className="p-8 text-center text-zinc-400">
                <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>Sin solicitudes</p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-zinc-50 border-b border-zinc-100">
                    <th className="text-left px-4 py-3 font-medium text-zinc-600">Fecha</th>
                    <th className="text-left px-4 py-3 font-medium text-zinc-600">Tipo</th>
                    <th className="text-left px-4 py-3 font-medium text-zinc-600">Descripción</th>
                    <th className="text-left px-4 py-3 font-medium text-zinc-600">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {solicitudes.map((s) => (
                    <tr key={s.id} className="border-b border-zinc-50 hover:bg-zinc-50 transition">
                      <td className="px-4 py-3 text-zinc-500">
                        {new Date(s.created_at).toLocaleDateString('es-CL')}
                      </td>
                      <td className="px-4 py-3 text-zinc-600 capitalize">{s.tipo}</td>
                      <td className="px-4 py-3 text-zinc-600">{s.descripcion || '-'}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${estadoColors[s.estado] || 'bg-zinc-100 text-zinc-600'}`}>
                          {s.estado}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
