'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth/context';
import { createClient } from '@/lib/supabase/client';
import { Users, Building2, FileText, CreditCard, Loader2, Shield } from 'lucide-react';
import Link from 'next/link';

interface Stats {
  empleadores: number;
  trabajadores: number;
  liquidaciones: number;
  pagos: number;
  users: number;
}

export default function AdminPage() {
  const { profile } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      const supabase = createClient();
      const [emp, trab, liq, pag, usr] = await Promise.all([
        supabase.from('empleadores').select('id', { count: 'exact', head: true }),
        supabase.from('trabajadores').select('id', { count: 'exact', head: true }),
        supabase.from('liquidaciones').select('id', { count: 'exact', head: true }),
        supabase.from('pagos_empleador').select('id', { count: 'exact', head: true }),
        supabase.from('user_profiles').select('id', { count: 'exact', head: true }),
      ]);
      setStats({
        empleadores: emp.count || 0,
        trabajadores: trab.count || 0,
        liquidaciones: liq.count || 0,
        pagos: pag.count || 0,
        users: usr.count || 0,
      });
      setLoading(false);
    }
    loadStats();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-zinc-400" />
      </div>
    );
  }

  const cards = [
    { label: 'Usuarios', value: stats?.users || 0, icon: Users, color: 'bg-violet-500', href: '/admin' },
    { label: 'Empleadores', value: stats?.empleadores || 0, icon: Building2, color: 'bg-emerald-500', href: '/empresa' },
    { label: 'Trabajadores', value: stats?.trabajadores || 0, icon: Users, color: 'bg-blue-500', href: '/empresa/empleados' },
    { label: 'Liquidaciones', value: stats?.liquidaciones || 0, icon: FileText, color: 'bg-amber-500', href: '/empresa/liquidaciones' },
    { label: 'Pagos', value: stats?.pagos || 0, icon: CreditCard, color: 'bg-rose-500', href: '/empresa/pagos' },
  ];

  return (
    <div className="min-h-screen bg-zinc-50">
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 bg-violet-600 rounded-lg flex items-center justify-center">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-zinc-900">Panel Admin</h1>
            <p className="text-sm text-zinc-500">Bienvenido, {profile?.nombre || 'Admin'}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {cards.map((card) => {
            const Icon = card.icon;
            return (
              <Link key={card.label} href={card.href} className="rounded-xl border border-zinc-200 bg-white p-5 hover:shadow-md transition-shadow">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 ${card.color} rounded-lg flex items-center justify-center`}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-zinc-900">{card.value}</p>
                    <p className="text-sm text-zinc-500">{card.label}</p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-zinc-900 mb-4">Accesos Rápidos</h2>
          <div className="grid grid-cols-2 gap-3">
            <Link href="/empresa" className="rounded-lg border border-zinc-200 px-4 py-3 text-sm font-medium text-zinc-700 hover:bg-zinc-50 transition">
              Portal Empleador
            </Link>
            <Link href="/portal" className="rounded-lg border border-zinc-200 px-4 py-3 text-sm font-medium text-zinc-700 hover:bg-zinc-50 transition">
              Portal Empleado
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
