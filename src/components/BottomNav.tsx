'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Users, Wallet, MoreHorizontal } from 'lucide-react';

const items = [
  { href: '/hogar',                label: 'Inicio',  icon: Home,             match: (p: string) => p === '/hogar' },
  { href: '/hogar/empleados',      label: 'Equipo',  icon: Users,            match: (p: string) => p.startsWith('/hogar/empleados') },
  { href: '/hogar/pagar-mes',      label: 'Pagar',   icon: Wallet,           match: (p: string) => p.startsWith('/hogar/pagar-mes') || p.startsWith('/hogar/remuneraciones') || p.startsWith('/hogar/liquidaciones') },
  { href: '/hogar/mas',            label: 'Más',     icon: MoreHorizontal,   match: (p: string) => p.startsWith('/hogar/mas') || p.startsWith('/hogar/configuracion') },
];

export default function BottomNav() {
  const pathname = usePathname() ?? '';
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 border-t border-zinc-200 bg-white lg:hidden">
      <div className="grid grid-cols-4">
        {items.map((it) => {
          const Icon = it.icon;
          const active = it.match(pathname);
          return (
            <Link
              key={it.href}
              href={it.href}
              className={`flex flex-col items-center justify-center gap-0.5 py-2.5 text-[10px] font-medium transition ${
                active ? 'text-emerald-600' : 'text-zinc-500'
              }`}
            >
              <Icon className={`h-5 w-5 ${active ? 'text-emerald-600' : 'text-zinc-500'}`} />
              <span>{it.label}</span>
              {active && <span className="absolute top-0 h-0.5 w-8 rounded-b bg-emerald-600" />}
            </Link>
          );
        })}
      </div>
      <div className="h-[env(safe-area-inset-bottom)]" />
    </nav>
  );
}
