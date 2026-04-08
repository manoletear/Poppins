'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth/context';
import { getInitials, getRolLabel } from '@/lib/auth/helpers';
import { NotificacionesDropdown } from '@/components/NotificacionesDropdown';
import {
  LayoutDashboard,
  ClipboardCheck,
  Clock,
  CircleUser,
  Receipt,
  CreditCard,
  Umbrella,
  FolderOpen,
  ShoppingCart,
  Gift,
  HeartPulse,
  Send,
  HelpCircle,
  Menu,
  X,
  LogOut,
  ChevronUp,
  Crown,
  Bell,
  CalendarCheck,
} from 'lucide-react';

const navSections = [
  {
    label: 'Mi Día',
    items: [
      { name: 'Dashboard', href: '/portal', icon: LayoutDashboard },
      { name: 'Mis Tareas', href: '/portal/tareas', icon: ClipboardCheck },
      { name: 'Marcaje Horario', href: '/portal/marcaje', icon: Clock },
      { name: 'Recordatorios', href: '/portal/recordatorios', icon: Bell },
      { name: 'Mis Visitas', href: '/portal/visitas', icon: CalendarCheck },
    ],
  },
  {
    label: 'Mi Información',
    items: [
      { name: 'Mi Ficha', href: '/portal/mi-ficha', icon: CircleUser },
      { name: 'Mis Liquidaciones', href: '/portal/liquidaciones', icon: Receipt },
      { name: 'Anticipos', href: '/portal/anticipos', icon: CreditCard },
      { name: 'Mis Vacaciones', href: '/portal/vacaciones', icon: Umbrella },
      { name: 'Mis Documentos', href: '/portal/documentos', icon: FolderOpen },
    ],
  },
  {
    label: 'Servicios',
    items: [
      { name: 'Lista de Compras', href: '/portal/compras', icon: ShoppingCart },
      { name: 'Beneficios', href: '/portal/beneficios', icon: Gift },
      { name: 'Ayuda Médica', href: '/portal/ayuda-medica', icon: HeartPulse },
    ],
  },
  {
    label: 'Comunicación',
    items: [
      { name: 'Solicitudes', href: '/portal/solicitudes', icon: Send },
      { name: 'Dudas y Ayuda', href: '/portal/ayuda', icon: HelpCircle },
    ],
  },
];

function UserAccountPopover({ onNavigate }: { onNavigate?: () => void }) {
  const [open, setOpen] = useState(false);
  const [showPlan, setShowPlan] = useState(false);
  const { profile, signOut } = useAuth();

  const displayName = profile ? `${profile.nombre}${profile.apellido ? ' ' + profile.apellido : ''}` : 'Cargando...';
  const displayShortName = profile?.nombre || 'Cargando...';
  const displayInitials = getInitials(profile?.nombre || '', profile?.apellido);
  const displayEmail = profile?.email || '';
  const displayRole = profile ? getRolLabel(profile.rol) : 'Empleado';

  return (
    <>
      <div className="relative mt-auto">
        <button
          onClick={() => setOpen(!open)}
          className="flex w-full items-center gap-3 rounded-lg p-2 hover:bg-zinc-100 transition-colors text-left"
        >
          {profile?.avatar_url ? (
            <img src={profile.avatar_url} alt="" className="h-9 w-9 rounded-full object-cover shrink-0" />
          ) : (
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-emerald-700 text-sm font-semibold text-white shrink-0">
              {displayInitials}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-zinc-900 truncate">{displayShortName}</p>
            <p className="text-[11px] text-zinc-500">{displayRole}</p>
          </div>
          <ChevronUp className={`h-4 w-4 text-zinc-400 transition-transform ${open ? 'rotate-0' : 'rotate-180'}`} />
        </button>

        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <div className="absolute bottom-full left-0 right-0 mb-2 z-50 rounded-xl border border-zinc-200 bg-white shadow-lg overflow-hidden">
              <div className="px-4 py-3 border-b border-zinc-100 bg-zinc-50">
                <p className="text-sm font-semibold text-zinc-900">{displayName}</p>
                <p className="text-xs text-zinc-500">{displayEmail}</p>
              </div>
              <div className="py-1">
                <button
                  onClick={() => { setOpen(false); setShowPlan(true); }}
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-zinc-700 hover:bg-zinc-50 transition-colors"
                >
                  <Crown className="h-4 w-4 text-emerald-500" />
                  <div className="text-left">
                    <p className="font-medium">Mi Plan</p>
                    <p className="text-[11px] text-zinc-400">Empleado - Acceso gratuito</p>
                  </div>
                </button>
                <Link
                  href="/portal/mi-ficha"
                  onClick={() => { setOpen(false); onNavigate?.(); }}
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-zinc-700 hover:bg-zinc-50 transition-colors"
                >
                  <CircleUser className="h-4 w-4 text-zinc-400" />
                  <p className="font-medium">Mi Ficha</p>
                </Link>
              </div>
              <div className="border-t border-zinc-100 py-1">
                <button
                  onClick={() => { setOpen(false); onNavigate?.(); signOut(); }}
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                  <p className="font-medium">Cerrar Sesión</p>
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {showPlan && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 bg-gradient-to-r from-emerald-700 to-emerald-500">
              <div>
                <h2 className="text-lg font-bold text-white">Tu Plan Poppins</h2>
                <p className="text-sm text-emerald-100">Portal Empleado</p>
              </div>
              <button onClick={() => setShowPlan(false)} className="rounded-lg p-1.5 text-emerald-100 hover:text-white hover:bg-white/10 transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50">
                <Crown className="h-8 w-8 text-emerald-600" />
              </div>
              <h3 className="text-lg font-bold text-zinc-900">Empleado</h3>
              <p className="text-2xl font-bold text-emerald-600 mt-1">Acceso Gratuito</p>
              <p className="text-sm text-zinc-500 mt-3">
                Tu empleador gestiona tu cuenta. Tienes acceso completo al portal de empleado sin costo.
              </p>
              <div className="mt-4 rounded-lg bg-emerald-50 py-2 text-sm font-medium text-emerald-700">
                Plan Activo
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function SidebarContent({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  return (
    <div className="flex h-full flex-col">
      <div className="mb-6">
        <Link href="/portal" className="text-xl font-bold text-zinc-900" onClick={onNavigate}>
          Poppins
        </Link>
        <p className="text-xs text-emerald-600">Portal Empleado</p>
      </div>

      <nav className="flex-1 space-y-6 overflow-y-auto">
        {navSections.map((section) => (
          <div key={section.label}>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 mb-2">
              {section.label}
            </p>
            <div className="space-y-1">
              {section.items.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onNavigate}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-emerald-600 text-white'
                        : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {item.name}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <UserAccountPopover onNavigate={onNavigate} />
    </div>
  );
}

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Skip to content */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-[60] focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-medium"
      >
        Saltar al contenido
      </a>

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-64 flex-col border-r border-zinc-200 bg-zinc-50 p-4">
        <SidebarContent pathname={pathname} />
      </aside>

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 border-r border-zinc-200 bg-zinc-50 p-4 transition-transform duration-200 lg:hidden ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex justify-end mb-2">
          <button
            onClick={() => setMobileOpen(false)}
            className="rounded-lg p-1 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900"
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
          <span className="ml-3 text-sm font-semibold text-zinc-900 flex-1">Poppins</span>
          <NotificacionesDropdown />
        </header>

        <main id="main-content" className="flex-1 overflow-y-auto bg-white p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
