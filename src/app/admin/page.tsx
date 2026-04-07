'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth/context';
import { createClient } from '@/lib/supabase/client';
import {
  Users,
  Building2,
  FileText,
  CreditCard,
  Loader2,
  Shield,
  TrendingUp,
  Receipt,
  Settings,
  AlertCircle,
  Clock,
} from 'lucide-react';

interface Stats {
  empleadores: number;
  trabajadores: number;
  users: number;
  mrr: number;
  solicitudesPendientes: number;
  liquidacionesBorrador: number;
}

interface SolicitudReciente {
  id: string;
  tipo: string;
  estado: string;
  created_at: string;
  empleador_id: string;
}

export default function AdminPage() {
  const { profile, loading: authLoading } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [recientes, setRecientes] = useState<SolicitudReciente[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!profile || profile.rol !== 'admin') return;

    async function loadData() {
      try {
        const supabase = createClient();

        const [emp, trab, usr, pagos, solicitudes, liqs, recientesRes] = await Promise.all([
          supabase.from('empleadores').select('id', { count: 'exact', head: true }),
          supabase.from('trabajadores').select('id', { count: 'exact', head: true }),
          supabase.from('user_profiles').select('id', { count: 'exact', head: true }),
          supabase.from('pagos_empleador').select('monto').eq('estado', 'pagado'),
          supabase.from('solicitudes_empleado').select('id', { count: 'exact', head: true }).eq('estado', 'pendiente'),
          supabase.from('liquidaciones').select('id', { count: 'exact', head: true }).eq('estado', 'borrador'),
          supabase.from('solicitudes_empleado').select('id, tipo, estado, created_at, empleador_id').order('created_at', { ascending: false }).limit(5),
        ]);

        const totalMrr = (pagos.data || []).reduce((sum: number, p: any) => sum + (p.monto || 0), 0);

        setStats({
          empleadores: emp.count || 0,
          trabajadores: trab.count || 0,
          users: usr.count || 0,
          mrr: totalMrr,
          solicitudesPendientes: solicitudes.count || 0,
          liquidacionesBorrador: liqs.count || 0,
        });
        setRecientes(recientesRes.data || []);
      } catch (e) {
        setError('Error cargando datos del dashboard');
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [profile, authLoading]);

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="w-6 h-6 animate-spin text-zinc-400" />
      </div>
    );
  }

  if (!profile || profile.rol !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-center">
        <AlertCircle className="w-12 h-12 text-red-400 mb-4" />
        <h1 className="text-xl font-bold text-zinc-900 mb-2">Acceso no autorizado</h1>
        <p className="text-sm text-zinc-500 mb-6">No tienes permisos para acceder al panel de administración.</p>
        <a href="/" className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 transition-colors">
          Volver al inicio
        </a>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-center">
        <AlertCircle className="w-12 h-12 text-amber-400 mb-4" />
        <h1 className="text-xl font-bold text-zinc-900 mb-2">Error</h1>
        <p className="text-sm text-zinc-500">{error}</p>
      </div>
    );
  }

  const statCards = [
    { label: 'Empleadores', value: stats?.empleadores || 0, icon: Building2, color: 'bg-emerald-500', href: '/admin/empleadores' },
    { label: 'Trabajadores', value: stats?.trabajadores || 0, icon: Users, color: 'bg-violet-600', href: '/admin/empleados' },
    { label: 'Usuarios', value: stats?.users || 0, icon: Users, color: 'bg-blue-500', href: '/admin/leads' },
    {
      label: 'MRR',
      value: `$${(stats?.mrr || 0).toLocaleString('es-CL')}`,
      icon: TrendingUp,
      color: 'bg-emerald-600',
      href: '/admin/facturacion',
    },
    { label: 'Solicitudes Pendientes', value: stats?.solicitudesPendientes || 0, icon: Clock, color: 'bg-amber-500', href: '/admin/empleados' },
    { label: 'Liquidaciones Borrador', value: stats?.liquidacionesBorrador || 0, icon: Receipt, color: 'bg-rose-500', href: '/admin/liquidaciones' },
  ];

  const quickLinks = [
    { name: 'Empleadores', href: '/admin/empleadores', icon: Building2 },
    { name: 'Empleados', href: '/admin/empleados', icon: Users },
    { name: 'Liquidaciones', href: '/admin/liquidaciones', icon: Receipt },
    { name: 'Facturación', href: '/admin/facturacion', icon: CreditCard },
    { name: 'Leads', href: '/admin/leads', icon: TrendingUp },
    { name: 'Configuración', href: '/admin/configuracion', icon: Settings },
  ];

  const formatFecha = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString('es-CL', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  };

  const estadoBadge = (estado: string) => {
    const map: Record<string, string> = {
      pendiente: 'bg-amber-100 text-amber-700',
      aprobada: 'bg-emerald-100 text-emerald-700',
      rechazada: 'bg-red-100 text-red-700',
    };
    return map[estado] || 'bg-zinc-100 text-zinc-600';
  };

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 bg-violet-600 rounded-lg flex items-center justify-center">
          <Shield className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Panel Admin</h1>
          <p className="text-sm text-zinc-500">Bienvenido, {profile.nombre || 'Admin'}</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <a
              key={card.label}
              href={card.href}
              className="rounded-xl border border-zinc-200 bg-white p-5 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 ${card.color} rounded-lg flex items-center justify-center`}>
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-zinc-900">
                    {typeof card.value === 'number' ? card.value.toLocaleString('es-CL') : card.value}
                  </p>
                  <p className="text-sm text-zinc-500">{card.label}</p>
                </div>
              </div>
            </a>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activity */}
        <div className="lg:col-span-2 rounded-xl border border-zinc-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-zinc-900 mb-4">Actividad Reciente</h2>
          {recientes.length === 0 ? (
            <p className="text-sm text-zinc-400 py-4">No hay solicitudes recientes.</p>
          ) : (
            <div className="space-y-3">
              {recientes.map((s) => (
                <div key={s.id} className="flex items-center justify-between rounded-lg border border-zinc-100 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-zinc-900 truncate">
                      {s.tipo || 'Solicitud'}
                    </p>
                    <p className="text-xs text-zinc-400">{formatFecha(s.created_at)}</p>
                  </div>
                  <span className={`ml-3 inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${estadoBadge(s.estado)}`}>
                    {s.estado}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Links */}
        <div className="rounded-xl border border-zinc-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-zinc-900 mb-4">Accesos Rápidos</h2>
          <div className="space-y-2">
            {quickLinks.map((link) => {
              const Icon = link.icon;
              return (
                <a
                  key={link.href}
                  href={link.href}
                  className="flex items-center gap-3 rounded-lg border border-zinc-100 px-4 py-3 text-sm font-medium text-zinc-700 hover:bg-zinc-50 transition-colors"
                >
                  <Icon className="h-4 w-4 text-zinc-400" />
                  {link.name}
                </a>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
