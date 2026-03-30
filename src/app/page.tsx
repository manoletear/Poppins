'use client';

import { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/lib/auth/context';
import { getRedirectForRole } from '@/lib/auth/helpers';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Clock, AlertTriangle, ShieldAlert, Check, Brain, Scale, Database, Users,
  UserPlus, PenTool, CreditCard, Building, Shield, FileCheck, Menu, X,
  ChevronRight, Star, Quote, Umbrella,
} from 'lucide-react';

const NAVY = '#2D2D90';
const NAVY_DEEP = '#1B1B2F';
const PINK = '#F46BC1';
const PINK_LIGHT = '#FFD6EC';
const LAVENDER = '#EFE8FF';

export default function Home() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user && profile) {
      router.replace(getRedirectForRole(profile.rol));
    }
  }, [loading, user, profile, router]);

  if (!loading && user && profile) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-white">
        <p className="text-sm text-zinc-500">Redirigiendo a tu portal...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ fontFamily: 'var(--font-inter), system-ui, sans-serif' }}>
      <style jsx global>{`
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes fillBar1 { from { width: 0; } to { width: 100%; } }
        @keyframes fillBar2 { from { width: 0; } to { width: 75%; } }
        @keyframes fillBar3 { from { width: 0; } to { width: 90%; } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.6; } }
        @keyframes orbit { from { transform: rotate(0deg) translateX(60px) rotate(0deg); } to { transform: rotate(360deg) translateX(60px) rotate(-360deg); } }
        .fade-in { animation: fadeInUp 0.8s ease-out forwards; opacity: 0; }
        .fade-in-d1 { animation-delay: 0.1s; }
        .fade-in-d2 { animation-delay: 0.2s; }
        .fade-in-d3 { animation-delay: 0.3s; }
        .fade-in-d4 { animation-delay: 0.4s; }
      `}</style>
      <Navbar />
      <Hero />
      <PainPoints />
      <Solucion />
      <IASection />
      <Testimonios />
      <ComoFunciona />
      <Seguridad />
      <CTAFinal />
      <Footer />
    </div>
  );
}

/* ==================== NAVBAR ==================== */
function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { label: 'Inicio', href: '#hero' },
    { label: 'Solución', href: '#solucion' },
    { label: 'Cómo Funciona', href: '#como-funciona' },
    { label: 'Seguridad', href: '#seguridad' },
  ];

  return (
    <nav
      className="fixed top-0 left-0 right-0 z-50 transition-all duration-300"
      style={{
        backgroundColor: scrolled ? 'rgba(255,255,255,0.9)' : 'transparent',
        backdropFilter: scrolled ? 'blur(12px)' : 'none',
        borderBottom: scrolled ? '1px solid rgba(0,0,0,0.05)' : 'none',
      }}
    >
      <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 flex items-center justify-center">
            <svg viewBox="0 0 40 44" fill="none" className="h-8 w-8">
              <path d="M20 4C20 4 6 10 6 20C6 24 8 26 10 26C10 26 10 28 12 28C14 28 14 26 14 26" stroke={scrolled ? NAVY : 'white'} strokeWidth="2.5" strokeLinecap="round"/>
              <path d="M20 4C20 4 34 10 34 20C34 24 32 26 30 26C30 26 30 28 28 28C26 28 26 26 26 26" stroke={scrolled ? NAVY : 'white'} strokeWidth="2.5" strokeLinecap="round"/>
              <line x1="20" y1="4" x2="20" y2="36" stroke={scrolled ? NAVY : 'white'} strokeWidth="2.5" strokeLinecap="round"/>
              <path d="M20 36C20 36 20 40 24 40" stroke={scrolled ? NAVY : 'white'} strokeWidth="2.5" strokeLinecap="round"/>
            </svg>
          </div>
          <div>
            <span className="text-lg font-bold" style={{ color: scrolled ? NAVY : PINK }}>Poppins</span>
            <span className="hidden sm:inline text-[10px] ml-2 tracking-wider uppercase" style={{ color: scrolled ? NAVY_DEEP : 'rgba(255,255,255,0.6)' }}>Magia en tu casa</span>
          </div>
        </div>
        <div className="hidden md:flex items-center gap-6">
          {navLinks.map((l) => (
            <a key={l.href} href={l.href} className="text-sm font-medium transition-colors hover:opacity-80"
              style={{ color: scrolled ? NAVY_DEEP : '#fff' }}>{l.label}</a>
          ))}
          <Link href="/auth/login" className="text-sm font-medium transition-colors hover:opacity-80"
            style={{ color: scrolled ? NAVY_DEEP : '#fff' }}>Iniciar Sesión</Link>
          <Link href="/auth/register"
            className="px-5 py-2 rounded-full text-sm font-semibold text-white transition-transform hover:scale-105"
            style={{ backgroundColor: PINK }}>Comenzar</Link>
        </div>
        <button onClick={() => setMenuOpen(!menuOpen)} className="md:hidden p-2"
          style={{ color: scrolled ? NAVY : '#fff' }}>
          {menuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>
      {menuOpen && (
        <div className="md:hidden bg-white border-t px-4 py-4 space-y-3">
          {navLinks.map((l) => (
            <a key={l.href} href={l.href} onClick={() => setMenuOpen(false)}
              className="block text-sm font-medium" style={{ color: NAVY_DEEP }}>{l.label}</a>
          ))}
          <Link href="/auth/login" className="block text-sm font-medium" style={{ color: NAVY_DEEP }}>Iniciar Sesión</Link>
          <Link href="/auth/register"
            className="block text-center px-5 py-2.5 rounded-full text-sm font-semibold text-white"
            style={{ backgroundColor: PINK }}>Comenzar</Link>
        </div>
      )}
    </nav>
  );
}

/* ==================== HERO ==================== */
function Hero() {
  return (
    <section id="hero" className="relative overflow-hidden pt-32 pb-20 px-4"
      style={{ background: `linear-gradient(180deg, ${NAVY} 0%, ${LAVENDER} 60%, ${PINK_LIGHT} 100%)` }}>
      <div className="max-w-5xl mx-auto text-center">
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white leading-tight fade-in">
          El sueldo de tu nana, el arriendo,{' '}
          <span style={{ color: PINK }}>el súper, la bodega,</span>{' '}
          y mucho más.
        </h1>
        <p className="mt-6 text-base sm:text-lg max-w-2xl mx-auto fade-in fade-in-d1" style={{ color: 'rgba(255,255,255,0.85)' }}>
          Crea contratos, liquida sueldos, paga cotizaciones y cumple la ley chilena — todo desde una app simple, segura y humana.
        </p>
        {/* Animated contract card */}
        <div className="mt-10 mx-auto max-w-sm bg-white rounded-2xl shadow-2xl p-6 fade-in fade-in-d2">
          <p className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: NAVY }}>Contrato de Trabajo</p>
          <div className="space-y-3">
            {[
              { label: 'Datos personales', w: '100%', delay: '0.5s' },
              { label: 'Jornada laboral', w: '75%', delay: '1s' },
              { label: 'Remuneración', w: '90%', delay: '1.5s' },
            ].map((bar) => (
              <div key={bar.label}>
                <div className="flex justify-between text-xs mb-1">
                  <span style={{ color: NAVY_DEEP }}>{bar.label}</span>
                </div>
                <div className="h-2 rounded-full" style={{ backgroundColor: LAVENDER }}>
                  <div className="h-2 rounded-full" style={{
                    backgroundColor: PINK,
                    animation: `fillBar1 1.5s ease-out ${bar.delay} forwards`, width: 0,
                  } as React.CSSProperties} />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 flex items-center gap-2 text-sm font-medium" style={{ color: '#22C55E' }}>
            <Check className="h-4 w-4" /> Contrato firmado digitalmente
          </div>
        </div>
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4 fade-in fade-in-d3">
          <Link href="/auth/register"
            className="px-8 py-3.5 rounded-full text-base font-semibold text-white shadow-lg hover:shadow-xl transition-all hover:scale-105"
            style={{ backgroundColor: PINK }}>Crear mi Contrato Gratis</Link>
          <a href="#como-funciona" className="text-white text-sm font-medium hover:opacity-80 flex items-center gap-1">
            Ver cómo funciona <ChevronRight className="h-4 w-4" />
          </a>
        </div>
      </div>
    </section>
  );
}

/* ==================== PAIN POINTS ==================== */
function PainPoints() {
  const items = [
    { icon: Clock, title: 'Horas perdidas en trámites y planillas', desc: 'El tiempo que podrías dedicar a tu familia' },
    { icon: AlertTriangle, title: 'Errores en pagos, cotizaciones o vacaciones', desc: 'Cálculos complejos que generan incertidumbre' },
    { icon: ShieldAlert, title: 'Miedo a multas o sanciones', desc: 'La preocupación constante de no estar cumpliendo' },
  ];
  return (
    <section className="py-20 px-4 bg-white">
      <div className="max-w-5xl mx-auto text-center">
        <h2 className="text-2xl sm:text-3xl font-bold" style={{ color: NAVY }}>
          Cuando hacer las cosas bien parece imposible
        </h2>
        <p className="mt-3 text-base max-w-2xl mx-auto" style={{ color: NAVY_DEEP }}>
          En Chile, 3 de cada 4 relaciones laborales domésticas son informales. No por falta de voluntad, sino por falta de simplicidad.
        </p>
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.title} className="rounded-xl bg-white p-6 shadow-sm border-l-4 text-left hover:shadow-md transition-shadow"
                style={{ borderLeftColor: PINK }}>
                <Icon className="h-8 w-8 mb-4" style={{ color: PINK }} />
                <h3 className="font-semibold text-base" style={{ color: NAVY }}>{item.title}</h3>
                <p className="mt-2 text-sm" style={{ color: NAVY_DEEP }}>{item.desc}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ==================== SOLUCIÓN ==================== */
function Solucion() {
  const [tab, setTab] = useState(0);
  const tabs = ['Contrato Inteligente', 'Liquidaciones y Pagos', 'Cumplimiento Automático'];
  return (
    <section id="solucion" className="py-20 px-4" style={{ backgroundColor: LAVENDER }}>
      <div className="max-w-5xl mx-auto">
        <h2 className="text-2xl sm:text-3xl font-bold text-center" style={{ color: NAVY }}>Legalidad sin Fricción</h2>
        <div className="mt-8 flex justify-center gap-2 flex-wrap">
          {tabs.map((t, i) => (
            <button key={t} onClick={() => setTab(i)}
              className="px-5 py-2 rounded-full text-sm font-medium transition-all"
              style={{
                backgroundColor: tab === i ? PINK : 'white',
                color: tab === i ? 'white' : NAVY_DEEP,
              }}>{t}</button>
          ))}
        </div>
        <div className="mt-8 bg-white rounded-2xl shadow-sm p-8 min-h-[200px]">
          {tab === 0 && (
            <div className="space-y-4">
              {['Campo autocompletado con validación legal', 'Validación en tiempo real de datos laborales', 'Listo para firmar digitalmente en segundos'].map((item) => (
                <div key={item} className="flex items-center gap-3">
                  <div className="h-6 w-6 rounded-full flex items-center justify-center" style={{ backgroundColor: '#DCFCE7' }}>
                    <Check className="h-4 w-4" style={{ color: '#22C55E' }} />
                  </div>
                  <span className="text-sm font-medium" style={{ color: NAVY_DEEP }}>{item}</span>
                </div>
              ))}
            </div>
          )}
          {tab === 1 && (
            <div className="max-w-xs mx-auto rounded-xl border p-5" style={{ borderColor: PINK_LIGHT }}>
              <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: NAVY }}>Liquidación Marzo 2026</p>
              {[
                { label: 'Sueldo Base', amount: '$450.000', positive: true },
                { label: 'AFP (10%)', amount: '-$45.000', positive: false },
                { label: 'Salud (7%)', amount: '-$31.500', positive: false },
              ].map((row) => (
                <div key={row.label} className="flex justify-between py-2 border-b text-sm" style={{ borderColor: '#f3f4f6' }}>
                  <span style={{ color: NAVY_DEEP }}>{row.label}</span>
                  <span className="font-medium" style={{ color: row.positive ? NAVY : '#EF4444' }}>{row.amount}</span>
                </div>
              ))}
              <div className="flex justify-between pt-3 text-base font-bold" style={{ color: '#22C55E' }}>
                <span>Líquido</span><span>$373.500</span>
              </div>
            </div>
          )}
          {tab === 2 && (
            <div className="flex items-center justify-center py-8">
              <div className="relative h-40 w-40">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="h-16 w-16 rounded-full flex items-center justify-center" style={{ backgroundColor: NAVY }}>
                    <Umbrella className="h-8 w-8 text-white" />
                  </div>
                </div>
                {['AFP', 'Isapre', 'SII'].map((label, i) => (
                  <div key={label} className="absolute text-xs font-bold px-3 py-1 rounded-full text-white"
                    style={{
                      backgroundColor: PINK,
                      top: i === 0 ? '0' : i === 1 ? '70%' : '70%',
                      left: i === 0 ? '50%' : i === 1 ? '0' : '100%',
                      transform: i === 0 ? 'translateX(-50%)' : i === 1 ? 'translateX(-20%)' : 'translateX(-80%)',
                      animation: `pulse 2s ease-in-out ${i * 0.5}s infinite`,
                    }}>{label}</div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

/* ==================== IA ==================== */
function IASection() {
  const nodes = [
    { icon: Brain, title: 'Head of AI', desc: 'Motor cognitivo que automatiza decisiones legales' },
    { icon: Scale, title: 'Legal & Ethics', desc: 'Cumplimiento normativo permanente y ético' },
    { icon: Database, title: 'Data Pod', desc: 'Datos encriptados y protegidos en la nube' },
    { icon: Users, title: 'UX Squad', desc: 'Experiencia simple para todos los usuarios' },
  ];
  return (
    <section className="py-20 px-4 bg-white">
      <div className="max-w-5xl mx-auto text-center">
        <h2 className="text-2xl sm:text-3xl font-bold" style={{ color: NAVY }}>IA con conciencia humana</h2>
        <p className="mt-3 text-base max-w-xl mx-auto" style={{ color: NAVY_DEEP }}>
          Detrás de POPPINS™ hay un sistema cognitivo completo — no un algoritmo.
        </p>
        <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-6">
          {nodes.map((n) => {
            const Icon = n.icon;
            return (
              <div key={n.title} className="rounded-xl p-5 text-center hover:shadow-md transition-shadow" style={{ backgroundColor: LAVENDER }}>
                <div className="h-12 w-12 rounded-xl flex items-center justify-center mx-auto mb-3" style={{ backgroundColor: NAVY }}>
                  <Icon className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-sm font-bold" style={{ color: NAVY }}>{n.title}</h3>
                <p className="mt-1 text-xs" style={{ color: NAVY_DEEP }}>{n.desc}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ==================== TESTIMONIOS ==================== */
function Testimonios() {
  const testimonials = [
    { name: 'Carolina', location: 'Ñuñoa', text: 'Antes no sabía si estaba cumpliendo. Hoy POPPINS me avisa todo.', initials: 'CG' },
    { name: 'María', location: 'Trabajadora', text: 'Recibo mis liquidaciones en mi correo, todo claro y al día.', initials: 'ML' },
    { name: 'Rodrigo', location: 'Las Condes', text: 'Me ahorro horas cada mes. Todo se paga automáticamente y sin errores.', initials: 'RP' },
  ];
  return (
    <section className="py-20 px-4" style={{ backgroundColor: LAVENDER }}>
      <div className="max-w-5xl mx-auto">
        <h2 className="text-2xl sm:text-3xl font-bold text-center" style={{ color: NAVY }}>Lo que dicen nuestros usuarios</h2>
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
          {testimonials.map((t) => (
            <div key={t.name} className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
              <Quote className="h-6 w-6 mb-3" style={{ color: PINK }} />
              <p className="text-sm italic leading-relaxed" style={{ color: NAVY_DEEP }}>"{t.text}"</p>
              <div className="mt-4 flex items-center gap-3">
                <div className="h-10 w-10 rounded-full flex items-center justify-center text-white text-xs font-bold"
                  style={{ backgroundColor: NAVY }}>{t.initials}</div>
                <div>
                  <p className="text-sm font-semibold" style={{ color: NAVY }}>{t.name}</p>
                  <p className="text-xs" style={{ color: NAVY_DEEP }}>{t.location}</p>
                </div>
              </div>
              <div className="mt-3 flex gap-0.5">
                {[1, 2, 3, 4, 5].map((s) => <Star key={s} className="h-3.5 w-3.5 fill-current" style={{ color: '#FBBF24' }} />)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ==================== CÓMO FUNCIONA ==================== */
function ComoFunciona() {
  const steps = [
    { num: '01', icon: UserPlus, title: 'Completa el perfil', desc: 'POPPINS genera el contrato legal automáticamente' },
    { num: '02', icon: PenTool, title: 'Firma digital segura', desc: 'Sin imprimir, sin moverte. Validación legal instantánea' },
    { num: '03', icon: CreditCard, title: 'Pago automático y PreviRed', desc: 'Todo listo en un clic. Tu tranquilidad asegurada' },
  ];
  return (
    <section id="como-funciona" className="py-20 px-4 bg-white">
      <div className="max-w-5xl mx-auto text-center">
        <h2 className="text-2xl sm:text-3xl font-bold" style={{ color: NAVY }}>Tan simple como 1, 2, 3</h2>
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-8 relative">
          {steps.map((step, i) => {
            const Icon = step.icon;
            return (
              <div key={step.num} className="relative text-center">
                {i < 2 && (
                  <div className="hidden md:block absolute top-8 right-0 w-full h-0.5" style={{
                    borderTop: `2px dashed ${PINK_LIGHT}`,
                    left: '60%', width: '80%',
                  }} />
                )}
                <div className="mx-auto h-16 w-16 rounded-2xl flex items-center justify-center mb-4"
                  style={{ backgroundColor: PINK_LIGHT }}>
                  <Icon className="h-8 w-8" style={{ color: PINK }} />
                </div>
                <span className="text-xs font-bold tracking-wider" style={{ color: PINK }}>PASO {step.num}</span>
                <h3 className="text-base font-bold mt-2" style={{ color: NAVY }}>{step.title}</h3>
                <p className="text-sm mt-1" style={{ color: NAVY_DEEP }}>{step.desc}</p>
              </div>
            );
          })}
        </div>
        <Link href="/auth/register"
          className="mt-10 inline-block px-8 py-3.5 rounded-full text-base font-semibold text-white shadow-lg hover:shadow-xl transition-all hover:scale-105"
          style={{ backgroundColor: PINK }}>
          Empieza ahora — gratis y legal
        </Link>
      </div>
    </section>
  );
}

/* ==================== SEGURIDAD ==================== */
function Seguridad() {
  const integrations = [
    { icon: Building, title: 'SII', desc: 'Declaraciones automáticas ante el Servicio de Impuestos Internos' },
    { icon: Shield, title: 'PreviRed', desc: 'Imposiciones previsionales pagadas correctamente' },
    { icon: FileCheck, title: 'Dirección del Trabajo', desc: 'Registro de contratos conforme a la ley' },
  ];
  return (
    <section id="seguridad" className="py-20 px-4 text-white" style={{ backgroundColor: NAVY }}>
      <div className="max-w-5xl mx-auto text-center">
        <h2 className="text-2xl sm:text-3xl font-bold">Legalidad real. Privacidad real. Tranquilidad real.</h2>
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
          {integrations.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.title} className="rounded-xl p-6 border border-white/20 hover:border-white/40 transition-colors">
                <Icon className="h-10 w-10 mx-auto mb-4" style={{ color: PINK }} />
                <h3 className="text-lg font-bold">{item.title}</h3>
                <p className="mt-2 text-sm text-white/70">{item.desc}</p>
              </div>
            );
          })}
        </div>
        <p className="mt-10 text-sm text-white/50">Infraestructura certificada. Tus datos, solo tuyos.</p>
      </div>
    </section>
  );
}

/* ==================== CTA FINAL ==================== */
function CTAFinal() {
  return (
    <section className="py-20 px-4 text-center"
      style={{ background: `linear-gradient(180deg, ${LAVENDER} 0%, ${PINK_LIGHT} 100%)` }}>
      <div className="max-w-3xl mx-auto">
        <h2 className="text-2xl sm:text-3xl font-bold" style={{ color: NAVY }}>
          Tu hogar en regla, tu conciencia tranquila
        </h2>
        <p className="mt-3 text-base" style={{ color: NAVY_DEEP }}>Simplemente legal. Humanamente digital.</p>
        <Link href="/auth/register"
          className="mt-8 inline-block px-10 py-4 rounded-full text-lg font-bold text-white shadow-xl hover:shadow-2xl transition-all hover:scale-105"
          style={{ backgroundColor: NAVY }}>
          Formaliza ahora con POPPINS™
        </Link>
        <p className="mt-6 text-sm font-medium" style={{ color: PINK }}>
          POPPINS™ — Hacerlo Bien Nunca Fue Tan Simple
        </p>
      </div>
    </section>
  );
}

/* ==================== FOOTER ==================== */
function Footer() {
  return (
    <footer className="py-10 px-4" style={{ backgroundColor: NAVY_DEEP }}>
      <div className="max-w-5xl mx-auto">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 flex items-center justify-center">
              <svg viewBox="0 0 40 44" fill="none" className="h-7 w-7">
                <path d="M20 4C20 4 6 10 6 20C6 24 8 26 10 26C10 26 10 28 12 28C14 28 14 26 14 26" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
                <path d="M20 4C20 4 34 10 34 20C34 24 32 26 30 26C30 26 30 28 28 28C26 28 26 26 26 26" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
                <line x1="20" y1="4" x2="20" y2="36" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
                <path d="M20 36C20 36 20 40 24 40" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
              </svg>
            </div>
            <span className="font-bold" style={{ color: PINK }}>Poppins</span>
            <span className="text-white/40 text-xs ml-1">Magia en tu casa</span>
          </div>
          <div className="flex gap-6 text-sm text-white/60">
            <a href="#hero" className="hover:text-white transition-colors">Inicio</a>
            <a href="#solucion" className="hover:text-white transition-colors">Solución</a>
            <a href="#como-funciona" className="hover:text-white transition-colors">Cómo Funciona</a>
            <a href="#seguridad" className="hover:text-white transition-colors">Seguridad</a>
            <Link href="/auth/login" className="hover:text-white transition-colors">Iniciar Sesión</Link>
          </div>
        </div>
        <div className="mt-8 border-t border-white/10 pt-6 text-center text-xs text-white/40">
          © 2026 POPPINS. Cumplimiento legal para el hogar chileno.
        </div>
      </div>
    </footer>
  );
}
