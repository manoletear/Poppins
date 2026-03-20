'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_ITEMS = [
  { section: 'Principal' },
  { id: 'dashboard', label: 'Dashboard', icon: '📊', href: '/dashboard' },
  { section: 'Administrativo' },
  { id: 'colaboradoras', label: 'Colaboradoras', icon: '👩‍💼', href: '/dashboard/colaboradoras' },
  { id: 'asistencia', label: 'Asistencia', icon: '📅', href: '/dashboard/asistencia' },
  { id: 'vacaciones', label: 'Vacaciones y Permisos', icon: '🏖️', href: '/dashboard/vacaciones' },
  { section: 'Remuneraciones' },
  { id: 'liquidaciones', label: 'Liquidaciones', icon: '💳', href: '/dashboard/liquidaciones' },
  { id: 'horasextra', label: 'Horas Extra', icon: '⏰', href: '/dashboard/horas-extra' },
  { section: 'Beneficios' },
  { id: 'beneficios', label: 'Beneficios', icon: '🎁', href: '/dashboard/beneficios' },
  { section: 'Sistema' },
  { id: 'configuracion', label: 'Configuración', icon: '⚙️', href: '/dashboard/configuracion' },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <nav className="w-[220px] min-w-[220px] bg-[#1B1564] flex flex-col overflow-y-auto h-full">
      {/* Brand */}
      <div className="px-4 py-[18px] flex items-center gap-[10px] border-b border-white/[0.07]">
        <div className="w-9 h-9 bg-[#F0197A] rounded-[10px] flex items-center justify-center text-lg">
          ☂️
        </div>
        <div>
          <div className="font-['Poppins'] text-[17px] font-extrabold text-white leading-none">
            Poppins
          </div>
          <div className="text-[9px] text-white/40 tracking-[0.06em] mt-[1px]">
            ERP Doméstico
          </div>
        </div>
      </div>

      {/* Nav Items */}
      <div className="flex-1">
        {NAV_ITEMS.map((item, i) => {
          if ('section' in item && item.section) {
            return (
              <div key={i} className="text-[9px] font-bold uppercase tracking-[0.12em] text-white/[0.28] px-4 pt-[14px] pb-1">
                {item.section}
              </div>
            );
          }
          const isActive = item.href === '/dashboard'
            ? pathname === '/dashboard'
            : pathname?.startsWith(item.href!);
          return (
            <Link
              key={item.id}
              href={item.href!}
              className={`flex items-center gap-[9px] px-4 py-2 text-[13px] border-l-[3px] transition-all ${
                isActive
                  ? 'bg-[#F0197A]/15 text-white border-l-[#F0197A] font-semibold'
                  : 'text-white/60 border-l-transparent hover:bg-white/[0.06] hover:text-white/90'
              }`}
            >
              <span className="text-[15px]">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </div>

      {/* User */}
      <div className="mt-auto px-4 py-[14px] border-t border-white/[0.07]">
        <div className="flex items-center gap-[9px]">
          <div className="w-8 h-8 rounded-full bg-[#F0197A]/70 flex items-center justify-center text-xs font-bold text-white shrink-0">
            RA
          </div>
          <div>
            <div className="text-xs font-semibold text-white">Rene Aravena</div>
            <div className="text-[10px] text-white/[0.38]">Administrador</div>
          </div>
        </div>
      </div>
    </nav>
  );
}
