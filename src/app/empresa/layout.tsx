'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth/context';
import { getInitials, getRolLabel } from '@/lib/auth/helpers';
import { NotificacionesDropdown } from '@/components/NotificacionesDropdown';
import { PLANES } from '@/lib/pagos/plans';
import type { PlanTipo, CicloFacturacion } from '@/lib/pagos/types';
import SuscripcionBanner from './components/SuscripcionBanner';
import PoppinsChat from '@/components/PoppinsChat';
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

interface EstadoSus {
  estado: string;
  soloLectura: boolean;
  enTrial: boolean;
  diasRestantesTrial: number;
  plan_tipo: PlanTipo;
  ciclo: string | null;
}

const ORDEN: Record<PlanTipo, number> = { starter: 0, pro: 1, pro_plus: 2 };
const PLAN_LIST: PlanTipo[] = ['starter', 'pro', 'pro_plus'];
const fmtCLP = (n: number) => '$' + n.toLocaleString('es-CL');

function UserAccountPopover({ onNavigate }: { onNavigate?: () => void }) {
  const [open, setOpen] = useState(false);
  const [showPlan, setShowPlan] = useState(false);
  const [estado, setEstado] = useState<EstadoSus | null>(null);
  const [ciclo, setCiclo] = useState<CicloFacturacion>('mensual');
  const [submitting, setSubmitting] = useState<PlanTipo | null>(null);
  const { profile, signOut } = useAuth();

  async function cargarEstado() {
    try {
      const res = await fetch('/api/suscripcion/estado');
      if (res.ok) setEstado(await res.json());
    } catch {
      /* sin estado: el modal usa starter por defecto */
    }
  }

  useEffect(() => {
    cargarEstado();
  }, []);

  const currentPlan: PlanTipo = estado?.plan_tipo ?? 'starter';
  const currentNombre = PLANES[currentPlan].nombre;

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

  async function handleCambiarPlan(plan: PlanTipo) {
    if (plan === 'starter' || plan === currentPlan) return;
    setSubmitting(plan);
    try {
      const res = await fetch('/api/suscripcion/iniciar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // camino B = suscripción estándar desde el portal (el bonus de 2 meses
        // del camino A es exclusivo del onboarding con tarjeta al inicio).
        body: JSON.stringify({ plan, ciclo, camino: 'B_post_trial' }),
      });
      const data = await res.json().catch(() => ({}));
      // Flow real: si pide registrar tarjeta, redirigir; simulado: refrescar estado.
      if (res.ok && data.requiereTarjeta && data.cardRegisterUrl) {
        window.location.href = data.cardRegisterUrl;
        return;
      }
      if (res.ok) await cargarEstado();
    } finally {
      setSubmitting(null);
    }
  }

  return (
    <>
      {/* User button */}
      <div className="relative mt-auto">
        <button
          onClick={() => setOpen(!open)}
          className="flex w-full items-center gap-3 rounded-lg p-2 hover:bg-zinc-100 transition-colors text-left"
        >
          {profile?.avatar_url ? (
            <img src={profile.avatar_url} alt="" className="h-9 w-9 rounded-full object-cover shrink-0" />
          ) : (
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-blue-700 text-sm font-semibold text-white shrink-0">
              {displayInitials}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-zinc-900 truncate">{displayShortName}</p>
            <p className="text-[11px] text-zinc-500">
              Plan {currentNombre}
              {estado?.enTrial ? ` · prueba (${estado.diasRestantesTrial}d)` : ''}
            </p>
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
                    <p className="text-[11px] text-zinc-400">{currentNombre} · Ver detalles o cambiar</p>
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

            <div className="p-6">
              {/* Toggle mensual / anual */}
              <div className="flex justify-center mb-5">
                <div className="inline-flex rounded-lg border border-zinc-200 p-1 bg-zinc-50">
                  {(['mensual', 'anual'] as CicloFacturacion[]).map((c) => (
                    <button
                      key={c}
                      onClick={() => setCiclo(c)}
                      className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
                        ciclo === c ? 'bg-white shadow text-zinc-900' : 'text-zinc-500'
                      }`}
                    >
                      {c === 'mensual' ? 'Mensual' : 'Anual'}
                      {c === 'anual' && <span className="ml-1 text-[10px] text-emerald-600 font-bold">2 meses gratis</span>}
                    </button>
                  ))}
                </div>
              </div>

              {/* Plans grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {PLAN_LIST.map((tipo) => {
                  const plan = PLANES[tipo];
                  const current = tipo === currentPlan;
                  const precio = ciclo === 'anual' ? plan.precio_anual : plan.precio_mensual;
                  const sufijo = tipo === 'starter' ? '' : ciclo === 'anual' ? '/año' : '/mes';
                  const esUpgrade = ORDEN[tipo] > ORDEN[currentPlan];
                  return (
                    <div
                      key={tipo}
                      className={`relative rounded-xl border-2 p-5 transition-all ${
                        current ? 'border-blue-500 bg-blue-50/50 shadow-md' : 'border-zinc-200 hover:border-zinc-300'
                      }`}
                    >
                      {current && (
                        <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 inline-flex items-center gap-1 rounded-full bg-blue-600 px-3 py-0.5 text-[10px] font-bold text-white uppercase tracking-wider">
                          <Sparkles className="h-3 w-3" /> Plan Actual
                        </span>
                      )}
                      <div className="text-center mb-4 mt-1">
                        <h3 className="text-lg font-bold text-zinc-900">{plan.nombre}</h3>
                        <p className="text-2xl font-bold text-zinc-900 mt-1">
                          {precio === 0 ? 'Gratis' : fmtCLP(precio)}
                          {sufijo && <span className="text-sm font-normal text-zinc-500">{sufijo}</span>}
                        </p>
                        {tipo === 'starter' && <p className="text-[11px] text-zinc-400">30 días de prueba</p>}
                      </div>
                      <ul className="space-y-2">
                        {plan.beneficios.map((f) => (
                          <li key={f} className="flex items-center gap-2 text-sm text-zinc-600">
                            <Check className={`h-4 w-4 shrink-0 ${current ? 'text-blue-500' : 'text-zinc-400'}`} />
                            {f}
                          </li>
                        ))}
                      </ul>
                      <div className="mt-4">
                        {current ? (
                          <div className="w-full rounded-lg bg-blue-100 py-2 text-center text-sm font-medium text-blue-700">
                            Plan Actual
                          </div>
                        ) : tipo === 'starter' ? (
                          <div className="w-full rounded-lg bg-zinc-50 py-2 text-center text-sm font-medium text-zinc-400">
                            Incluido al inicio
                          </div>
                        ) : (
                          <button
                            onClick={() => handleCambiarPlan(tipo)}
                            disabled={submitting !== null}
                            className={`w-full rounded-lg py-2 text-sm font-medium transition-colors disabled:opacity-50 ${
                              esUpgrade
                                ? 'bg-zinc-900 text-white hover:bg-zinc-800'
                                : 'border border-zinc-300 text-zinc-600 hover:bg-zinc-50'
                            }`}
                          >
                            {submitting === tipo ? 'Procesando…' : esUpgrade ? `Subir a ${plan.nombre}` : `Cambiar a ${plan.nombre}`}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <p className="text-xs text-zinc-400 text-center mt-4">
                Anual: pagás 10 meses y lo usás los 365 días. ¿Necesitas ayuda? Escríbenos a soporte@poppins.cl
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
                  <a
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
                  </a>
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
          <span className="ml-3 text-sm font-semibold text-zinc-900 flex-1">Poppins</span>
          <NotificacionesDropdown />
        </header>

        <main id="main-content" className="flex-1 overflow-y-auto bg-white p-4 sm:p-6 lg:p-8">
          <SuscripcionBanner />
          {children}
        </main>
      </div>
      <PoppinsChat />
    </div>
  );
}
