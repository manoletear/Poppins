'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth/context';
import { getInitials, getRolLabel } from '@/lib/auth/helpers';
import {
  LayoutDashboard,
  CircleUser,
  Home,
  Heart,
  Users,
  FileText,
  Clock,
  MessageSquare,
  CheckSquare,
  ShoppingCart,
  Bell,
  CreditCard,
  Receipt,
  Newspaper,
  Menu,
  X,
  LogOut,
  Crown,
  ChevronUp,
  Sparkles,
  Check,
} from 'lucide-react';

const navSections = [
  {
    label: 'Principal',
    items: [
      { name: 'Dashboard', href: '/empresa', icon: LayoutDashboard },
      { name: 'Mi Perfil', href: '/empresa/perfil', icon: CircleUser },
      { name: 'Mi Vivienda', href: '/empresa/vivienda', icon: Home },
      { name: 'Mi Familia', href: '/empresa/familia', icon: Heart },
    ],
  },
  {
    label: 'Colaboradores',
    items: [
      { name: 'Empleados', href: '/empresa/empleados', icon: Users },
      { name: 'Contratos', href: '/empresa/contratos', icon: FileText },
      { name: 'Horarios', href: '/empresa/horarios', icon: Clock },
      { name: 'Solicitudes', href: '/empresa/solicitudes', icon: MessageSquare },
    ],
  },
  {
    label: 'Gestión Diaria',
    items: [
      { name: 'Tareas del Día', href: '/empresa/tareas', icon: CheckSquare },
      { name: 'Lista de Compras', href: '/empresa/compras', icon: ShoppingCart },
      { name: 'Recordatorios', href: '/empresa/recordatorios', icon: Bell },
    ],
  },
  {
    label: 'Pagos',
    items: [
      { name: 'Pagos y Puntos', href: '/empresa/pagos', icon: CreditCard },
      { name: 'Liquidaciones', href: '/empresa/liquidaciones', icon: Receipt },
    ],
  },
  {
    label: 'Información',
    items: [
      { name: 'Noticias Legales', href: '/empresa/noticias', icon: Newspaper },
    ],
  },
];

const plans = [
  { id: 'free', name: 'Free', price: '$0', features: ['2 empleados', '1 cuenta acceso', 'Funciones básicas'] },
  { id: 'premium', name: 'Premium', price: '$49.990/mes', features: ['5 empleados', '2 cuentas acceso', 'Pagos con puntos', 'Listas de compras', 'Recordatorios'], current: true },
  { id: 'enterprise', name: 'Enterprise', price: '$99.990/mes', features: ['Empleados ilimitados', '5 cuentas acceso', 'API integrations', 'Soporte prioritario', 'Reportes avanzados'] },
];

function UserAccountPopover({ onNavigate }: { onNavigate?: () => void }) {
  const [open, setOpen] = useState(false);
  const [showPlan, setShowPlan] = useState(false);
  const { profile, signOut } = useAuth();

  const handleCerrarSesion = () => {
    setOpen(false);
    onNavigate?.();
    signOut();
  };

  const displayName = profile ? `${profile.nombre}${profile.apellido ? ' ' + profile.apellido : ''}` : 'Cargando...';
  const displayShortName = profile?.nombre || 'Cargando...';
  const displayInitials = getInitials(profile?.nombre || '', profile?.apellido);
  const displayEmail = profile?.email || '';

  const handleVerPlan = () => {
    setOpen(false);
    setShowPlan(true);
  };

  return (
    <>
      {/* User button */}
      <div className="relative mt-auto">
        <button
          onClick={() => setOpen(!open)}
          className="flex w-full items-center gap-3 rounded-lg p-2 hover:bg-zinc-100 transition-colors text-left"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-blue-700 text-sm font-semibold text-white shrink-0">
            {displayInitials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-zinc-900 truncate">{displayShortName}</p>
            <p className="text-[11px] text-zinc-500">Plan Premium</p>
          </div>
          <ChevronUp className={`h-4 w-4 text-zinc-400 transition-transform ${open ? 'rotate-0' : 'rotate-180'}`} />
        </button>

        {/* Popover menu */}
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <div className="absolute bottom-full left-0 right-0 mb-2 z-50 rounded-xl border border-zinc-200 bg-white shadow-lg overflow-hidden">
              {/* User info header */}
              <div className="px-4 py-3 border-b border-zinc-100 bg-zinc-50">
                <p className="text-sm font-semibold text-zinc-900">{displayName}</p>
                <p className="text-xs text-zinc-500">{displayEmail}</p>
              </div>

              {/* Actions */}
              <div className="py-1">
                <button
                  onClick={handleVerPlan}
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-zinc-700 hover:bg-zinc-50 transition-colors"
                >
                  <Crown className="h-4 w-4 text-amber-500" />
                  <div className="text-left">
                    <p className="font-medium">Mi Plan</p>
                    <p className="text-[11px] text-zinc-400">Premium · Ver detalles o hacer upgrade</p>
                  </div>
                </button>

                <Link
                  href="/empresa/perfil"
                  onClick={() => { setOpen(false); onNavigate?.(); }}
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-zinc-700 hover:bg-zinc-50 transition-colors"
                >
                  <CircleUser className="h-4 w-4 text-zinc-400" />
                  <p className="font-medium">Mi Perfil</p>
                </Link>
              </div>

              <div className="border-t border-zinc-100 py-1">
                <button
                  onClick={handleCerrarSesion}
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

      {/* Plan Modal */}
      {showPlan && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-3xl rounded-2xl bg-white shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 bg-gradient-to-r from-zinc-900 to-zinc-700">
              <div>
                <h2 className="text-lg font-bold text-white">Tu Plan Poppins</h2>
                <p className="text-sm text-zinc-300">Gestiona tu suscripción</p>
              </div>
              <button onClick={() => setShowPlan(false)} className="rounded-lg p-1.5 text-zinc-300 hover:text-white hover:bg-white/10 transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Plans grid */}
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {plans.map((plan) => (
                  <div
                    key={plan.id}
                    className={`relative rounded-xl border-2 p-5 transition-all ${
                      plan.current
                        ? 'border-blue-500 bg-blue-50/50 shadow-md'
                        : 'border-zinc-200 hover:border-zinc-300'
                    }`}
                  >
                    {plan.current && (
                      <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 inline-flex items-center gap-1 rounded-full bg-blue-600 px-3 py-0.5 text-[10px] font-bold text-white uppercase tracking-wider">
                        <Sparkles className="h-3 w-3" /> Plan Actual
                      </span>
                    )}
                    <div className="text-center mb-4 mt-1">
                      <h3 className="text-lg font-bold text-zinc-900">{plan.name}</h3>
                      <p className="text-2xl font-bold text-zinc-900 mt-1">{plan.price}</p>
                    </div>
                    <ul className="space-y-2">
                      {plan.features.map((f) => (
                        <li key={f} className="flex items-center gap-2 text-sm text-zinc-600">
                          <Check className={`h-4 w-4 shrink-0 ${plan.current ? 'text-blue-500' : 'text-zinc-400'}`} />
                          {f}
                        </li>
                      ))}
                    </ul>
                    <div className="mt-4">
                      {plan.current ? (
                        <div className="w-full rounded-lg bg-blue-100 py-2 text-center text-sm font-medium text-blue-700">
                          Plan Actual
                        </div>
                      ) : plan.id === 'enterprise' ? (
                        <button className="w-full rounded-lg bg-zinc-900 py-2 text-sm font-medium text-white hover:bg-zinc-800 transition-colors">
                          Hacer Upgrade
                        </button>
                      ) : (
                        <button className="w-full rounded-lg border border-zinc-300 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-50 transition-colors" disabled>
                          Downgrade
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <p className="text-xs text-zinc-400 text-center mt-4">
                Los cambios de plan se aplican en el siguiente ciclo de facturación.
                ¿Necesitas ayuda? Escríbenos a soporte@poppins.cl
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function SidebarContent({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  const { profile } = useAuth();

  return (
    <div className="flex h-full flex-col">
      <div className="mb-6">
        <Link href="/empresa" className="text-xl font-bold text-zinc-900" onClick={onNavigate}>
          Poppins
        </Link>
        <p className="text-xs text-zinc-500">{profile ? `Portal ${getRolLabel(profile.rol)}` : 'Portal Empleador'}</p>
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
                        ? 'bg-zinc-900 text-white'
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

export default function EmpresaLayout({ children }: { children: React.ReactNode }) {
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
          <span className="ml-3 text-sm font-semibold text-zinc-900">Poppins</span>
        </header>

        <main id="main-content" className="flex-1 overflow-y-auto bg-white p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
