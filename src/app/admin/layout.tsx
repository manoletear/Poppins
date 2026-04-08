'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth/context';
import { getInitials, getRolLabel } from '@/lib/auth/helpers';
import { NotificacionesDropdown } from '@/components/NotificacionesDropdown';
import {
  LayoutDashboard,
  Users,
  Building2,
  FileText,
  CreditCard,
  Settings,
  UserCircle,
  Receipt,
  TrendingUp,
  Menu,
  X,
  LogOut,
  ChevronUp,
  Target,
  Activity,
} from 'lucide-react';

const navSections = [
  {
    label: 'Principal',
    items: [
      { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
      { name: 'Configuración', href: '/admin/configuracion', icon: Settings },
    ],
  },
  {
    label: 'CRM',
    items: [
      { name: 'Leads & Pipeline', href: '/admin/leads', icon: TrendingUp },
      { name: 'Deals', href: '/admin/deals', icon: Target },
      { name: 'Actividades', href: '/admin/actividades', icon: Activity },
      { name: 'Empleadores', href: '/admin/empleadores', icon: Building2 },
    ],
  },
  {
    label: 'RRHH',
    items: [
      { name: 'Empleados', href: '/admin/empleados', icon: Users },
      { name: 'Cierre de Mes', href: '/admin/cierre-mes', icon: FileText },
      { name: 'Liquidaciones', href: '/admin/liquidaciones', icon: Receipt },
    ],
  },
  {
    label: 'Finanzas',
    items: [
      { name: 'Facturación', href: '/admin/facturacion', icon: CreditCard },
    ],
  },
];

function AdminUserPopover({ onNavigate }: { onNavigate?: () => void }) {
  const [open, setOpen] = useState(false);
  const { profile, signOut } = useAuth();

  const handleCerrarSesion = () => {
    setOpen(false);
    onNavigate?.();
    signOut();
  };

  const displayName = profile
    ? `${profile.nombre}${profile.apellido ? ' ' + profile.apellido : ''}`
    : 'Cargando...';
  const displayShortName = profile?.nombre || 'Cargando...';
  const displayInitials = getInitials(profile?.nombre || '', profile?.apellido);
  const displayEmail = profile?.email || '';

  return (
    <div className="relative mt-auto">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-3 rounded-lg p-2 hover:bg-white/10 transition-colors text-left"
      >
        {profile?.avatar_url ? (
          <img src={profile.avatar_url} alt="" className="h-9 w-9 rounded-full object-cover shrink-0" />
        ) : (
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-violet-600 text-sm font-semibold text-white shrink-0">
            {displayInitials}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-zinc-100 truncate">{displayShortName}</p>
          <p className="text-[11px] text-zinc-400">Admin</p>
        </div>
        <ChevronUp className={`h-4 w-4 text-zinc-400 transition-transform ${open ? 'rotate-0' : 'rotate-180'}`} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute bottom-full left-0 right-0 mb-2 z-50 rounded-xl border border-zinc-700 bg-zinc-800 shadow-lg overflow-hidden">
            <div className="px-4 py-3 border-b border-zinc-700 bg-zinc-800/80">
              <p className="text-sm font-semibold text-zinc-100">{displayName}</p>
              <p className="text-xs text-zinc-400">{displayEmail}</p>
            </div>

            <div className="py-1">
              <a
                href="/admin/configuracion"
                onClick={() => { setOpen(false); onNavigate?.(); }}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-zinc-300 hover:bg-zinc-700 transition-colors"
              >
                <UserCircle className="h-4 w-4 text-zinc-400" />
                <p className="font-medium">Mi Perfil</p>
              </a>
            </div>

            <div className="border-t border-zinc-700 py-1">
              <button
                onClick={handleCerrarSesion}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
              >
                <LogOut className="h-4 w-4" />
                <p className="font-medium">Cerrar Sesión</p>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function SidebarContent({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  return (
    <div className="flex h-full flex-col">
      <div className="mb-6">
        <a href="/admin" className="text-xl font-bold text-white" onClick={onNavigate}>
          Poppins
        </a>
        <p className="text-xs text-zinc-400">Panel Administrador</p>
      </div>

      <nav className="flex-1 space-y-6 overflow-y-auto">
        {navSections.map((section) => (
          <div key={section.label}>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 mb-2">
              {section.label}
            </p>
            <div className="space-y-1">
              {section.items.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <a
                    key={item.href}
                    href={item.href}
                    onClick={onNavigate}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-violet-600 text-white'
                        : 'text-zinc-400 hover:bg-white/10 hover:text-zinc-100'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {item.name}
                  </a>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <AdminUserPopover onNavigate={onNavigate} />
    </div>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden">
      <a
        href="#admin-main"
        className="sr-only focus:not-sr-only focus:absolute focus:z-[60] focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-medium"
      >
        Saltar al contenido
      </a>

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-64 flex-col bg-zinc-900 p-4">
        <SidebarContent pathname={pathname} />
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-zinc-900 p-4 transition-transform duration-200 lg:hidden ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex justify-end mb-2">
          <button
            onClick={() => setMobileOpen(false)}
            className="rounded-lg p-1 text-zinc-400 hover:bg-white/10 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <SidebarContent pathname={pathname} onNavigate={() => setMobileOpen(false)} />
      </aside>

      {/* Main area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Mobile header */}
        <header className="sticky top-0 z-30 flex items-center border-b border-zinc-200 bg-white px-4 py-3 lg:hidden">
          <button
            onClick={() => setMobileOpen(true)}
            className="rounded-lg p-1.5 text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
          >
            <Menu className="h-5 w-5" />
          </button>
          <span className="ml-3 text-sm font-semibold text-zinc-900 flex-1">Poppins Admin</span>
          <NotificacionesDropdown />
        </header>

        <main id="admin-main" className="flex-1 overflow-y-auto bg-white p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
