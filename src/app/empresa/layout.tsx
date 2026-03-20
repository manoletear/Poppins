'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
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

function SidebarContent({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  return (
    <div className="flex h-full flex-col">
      <div className="mb-6">
        <Link href="/empresa" className="text-xl font-bold text-zinc-900" onClick={onNavigate}>
          Poppins
        </Link>
        <p className="text-xs text-zinc-500">Portal Empleador</p>
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

      <button className="mt-auto flex items-center gap-3 rounded-lg p-2 hover:bg-zinc-100 transition-colors w-full text-left">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-blue-700 text-sm font-semibold text-white">
          RA
        </div>
        <div>
          <p className="text-sm font-medium text-zinc-900">Rene Alejandro</p>
          <p className="text-[11px] text-zinc-500">Mi Cuenta</p>
        </div>
      </button>
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
