'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  CircleUser,
  Users,
  FileText,
  Receipt,
  UserX,
  TrendingUp,
  Clock,
  Umbrella,
  Gift,
  Menu,
  X,
} from 'lucide-react';

const navSections = [
  {
    label: 'Principal',
    items: [
      { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
      { name: 'Mi Ficha', href: '/dashboard/mi-ficha', icon: CircleUser },
      { name: 'Colaboradores', href: '/dashboard/trabajadoras', icon: Users },
      { name: 'Contratos', href: '/dashboard/contratos', icon: FileText },
    ],
  },
  {
    label: 'Remuneraciones',
    items: [
      { name: 'Liquidaciones', href: '/dashboard/liquidaciones', icon: Receipt },
      { name: 'Finiquitos', href: '/dashboard/finiquitos', icon: UserX },
      { name: 'Indicadores', href: '/dashboard/indicadores', icon: TrendingUp },
    ],
  },
  {
    label: 'Gestión',
    items: [
      { name: 'Asistencia', href: '/dashboard/asistencia', icon: Clock },
      { name: 'Vacaciones', href: '/dashboard/vacaciones', icon: Umbrella },
      { name: 'Beneficios', href: '/dashboard/beneficios', icon: Gift },
    ],
  },
];

function SidebarContent({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  return (
    <div className="flex h-full flex-col">
      <div className="mb-6">
        <Link href="/" className="text-xl font-bold text-zinc-900" onClick={onNavigate}>
          Poppins
        </Link>
        <p className="text-[11px] text-zinc-500">ERP RRHH Chile</p>
      </div>

      <nav className="flex-1 space-y-6">
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

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
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
