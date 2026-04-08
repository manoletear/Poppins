"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useAuth } from "@/lib/auth/context";
import { getRedirectForRole } from "@/lib/auth/helpers";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, useScroll, useTransform } from "framer-motion";
import { Navbar } from "@/components/landing/Navbar";
import { SequentialCarousel } from "@/components/landing/SequentialCarousel";
import { Interactive3DCards } from "@/components/landing/Interactive3DCard";
import { ChatBot } from "@/components/landing/ChatBot";
import { 
  Shield, 
  Clock, 
  HandCoins, 
  CheckCircle2, 
  ArrowRight,
  Menu,
  X,
  CreditCard,
  BarChart3,
  Bot,
  Zap, 
  ShieldCheck, 
  LineChart, 
  Star,
  Umbrella
} from "lucide-react";

// ─── CardShowcase (inspired by Framer CardShowcase-3qxj) ─────────────────────

const SHOWCASE_CARDS = [
  {
    number: "01",
    tag: "Registro",
    title: "Configura tu hogar en minutos",
    description: "Registra a tus trabajadores, define sus contratos y programa todos los pagos del hogar desde un solo lugar.",
    icon: CreditCard,
    gradient: "from-violet-600 to-indigo-700",
  },
  {
    number: "02",
    tag: "Automatización",
    title: "Poppins paga por ti, cada mes",
    description: "Sueldos, cotizaciones, arriendo, servicios básicos — todo se ejecuta automáticamente el día que tú elijas.",
    icon: BarChart3,
    gradient: "from-pink-500 to-rose-600",
  },
  {
    number: "03",
    tag: "Cumplimiento",
    title: "Legal al día, sin esfuerzo",
    description: "Contratos, liquidaciones, PREVIRED y Dirección del Trabajo. Poppins asegura que tu hogar cumpla la normativa vigente.",
    icon: ShieldCheck,
    gradient: "from-emerald-500 to-teal-600",
  },
];

function CardShowcaseSection() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const DURATION = 5000;

  const startTimer = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setProgress(0);
    const step = 50;
    let elapsed = 0;
    intervalRef.current = setInterval(() => {
      elapsed += step;
      setProgress(Math.min((elapsed / DURATION) * 100, 100));
      if (elapsed >= DURATION) {
        setActiveIndex((prev) => (prev + 1) % SHOWCASE_CARDS.length);
        elapsed = 0;
        setProgress(0);
      }
    }, step);
  }, []);

  useEffect(() => {
    startTimer();
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [startTimer]);

  const handleClick = (idx: number) => {
    setActiveIndex(idx);
    startTimer();
  };

  return (
    <div className="flex flex-col md:flex-row gap-4 max-w-5xl mx-auto">
      {SHOWCASE_CARDS.map((card, idx) => {
        const isActive = idx === activeIndex;
        const Icon = card.icon;
        return (
          <motion.div
            key={idx}
            onClick={() => handleClick(idx)}
            animate={{ flex: isActive ? 3 : 1 }}
            transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
            className={`relative cursor-pointer rounded-2xl overflow-hidden bg-gradient-to-br ${card.gradient} min-h-[320px] md:min-h-[400px]`}
          >
            {/* Progress bar */}
            {isActive && (
              <div className="absolute top-0 left-0 right-0 h-1 bg-white/20">
                <motion.div
                  className="h-full bg-white"
                  style={{ width: `${progress}%` }}
                />
              </div>
            )}

            <div className="relative z-10 p-6 md:p-8 h-full flex flex-col justify-between text-white">
              {/* Top: number + tag */}
              <div className="flex items-center justify-between">
                <span className="text-4xl md:text-5xl font-black opacity-30">{card.number}</span>
                <span className="bg-white/20 backdrop-blur-sm rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wider">
                  {card.tag}
                </span>
              </div>

              {/* Bottom: content */}
              <div>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="text-lg md:text-xl font-bold leading-tight">{card.title}</h3>
                </div>

                <motion.div
                  animate={{ opacity: isActive ? 1 : 0, height: isActive ? "auto" : 0 }}
                  transition={{ duration: 0.3 }}
                  className="overflow-hidden"
                >
                  <p className="text-sm md:text-base text-white/80 leading-relaxed">
                    {card.description}
                  </p>
                </motion.div>
              </div>
            </div>

            {/* Decorative glow */}
            <div className="absolute -bottom-20 -right-20 w-60 h-60 bg-white/5 rounded-full blur-3xl" />
          </motion.div>
        );
      })}
    </div>
  );
}

// ─── Landing Page ────────────────────────────────────────────────────────────

export default function Home() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();
  const [isFormReady, setIsFormReady] = useState(false);

  // Redirect logged-in users to their portal
  useEffect(() => {
    if (!loading && user && profile) {
      router.replace(getRedirectForRole(profile.rol));
    }
  }, [loading, user, profile, router]);

  useEffect(() => {
    // HubSpot new embed format
    if (!document.querySelector('script[src*="js.hsforms.net/forms/embed"]')) {
      const script = document.createElement("script");
      script.src = "https://js.hsforms.net/forms/embed/51289712.js";
      script.defer = true;
      document.head.appendChild(script);
    }
    // Mark form ready after script loads
    setTimeout(() => setIsFormReady(true), 3000);
  }, []);

  if (loading) return null;

  const fadeInUp = {
    initial: { opacity: 0, y: 20 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true },
    transition: { duration: 0.6 }
  };

  return (
    <div className="relative min-h-screen bg-white">
      <Navbar />

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 overflow-hidden bg-poppins-light">
        <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-2 gap-12 items-center">
          <motion.div 
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            className="z-10"
          >
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-black text-poppins-navy leading-[1.15] mb-6">
              La primera app chilena que organiza todos los pagos de tu <span className="text-poppins-pink">hogar y empleo doméstico.</span>
            </h1>
            <p className="text-base md:text-lg text-poppins-navy/60 mb-4 max-w-lg leading-relaxed">
              Desde el sueldo y cotizaciones de tu nana hasta el arriendo, cuentas básicas y servicios: automatiza, controla y olvida el estrés.
            </p>
            <p className="text-sm text-poppins-pink font-medium mb-6">Un solo lugar. Una sola app. Sin olvidos. Sin enredos. Sin estrés.</p>

            <div className="space-y-2.5 mb-8">
              <Bullet text="Gestión eficiente de relaciones laborales" />
              <Bullet text="Control total de tus gastos domésticos." />
              <Bullet text="Olvida los pagos atrasados y el estrés organizativo." />
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <LinkButton href="#contact" variant="primary">
                Quiero la magia en mi casa <ArrowRight className="w-5 h-5" />
              </LinkButton>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="flex-1 flex justify-center lg:justify-end items-center mt-12 lg:mt-0"
          >
            <SequentialCarousel />
          </motion.div>
        </div>
      </section>

      {/* Cómo Funciona Section — CardShowcase */}
      <section id="how-it-works" className="py-24 bg-white relative overflow-hidden">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-poppins-navy mb-6 leading-tight">
              Cómo funciona Poppins
            </h2>
            <p className="text-lg text-gray-600 leading-relaxed">
              Automatización y control total de tus pagos del hogar. Una sola app, un solo pago, cero preocupaciones.
            </p>
          </div>

          <CardShowcaseSection />
        </div>
      </section>

      {/* Todo lo que necesitas — Interactive 3D Cards */}
      <section className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-black text-poppins-navy mb-3">Todo lo que necesitas, en un solo lugar</h2>
            <p className="text-poppins-navy/60 max-w-2xl mx-auto">
              Evita multas, atrasos y problemas judiciales. Con Poppins cumples la ley, te organizas y das seguridad a quienes trabajan en tu hogar.
            </p>
          </div>
          <Interactive3DCards />
        </div>
      </section>

      {/* Empezar es así de fácil */}
      <section className="py-20 bg-white">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-3xl md:text-4xl font-black text-poppins-navy mb-12">Empezar es así de fácil</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { step: '1', title: 'Ingresa los datos', desc: 'Completa la información del sueldo en nuestro calculador y déjanos tu email.' },
              { step: '2', title: 'Recibe el cálculo', desc: 'Obtén al instante el desglose del sueldo líquido y el costo total como empleador.' },
              { step: '3', title: 'Regístrate y gestiona', desc: 'Crea tu cuenta para generar contratos, liquidaciones y centralizar todos tus pagos.' },
            ].map((item, i) => (
              <div key={i} className="flex flex-col items-center">
                <div className="w-12 h-12 rounded-full bg-poppins-pink text-white flex items-center justify-center text-lg font-bold mb-4">{item.step}</div>
                <h3 className="font-bold text-poppins-navy mb-2">{item.title}</h3>
                <p className="text-sm text-poppins-navy/60">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Calcula el costo total mensual — usa formulario HubSpot existente */}
      <section id="contact" className="py-20 bg-[#f7f8fc]">
        <div className="max-w-xl mx-auto px-6">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-black text-poppins-navy mb-3">Empieza la magia hoy</h2>
            <p className="text-poppins-navy/60 text-sm">
              Registra tus datos y un ejecutivo te contactará para activar tu cuenta Poppins.
            </p>
          </div>
          <div className="bg-white p-8 rounded-2xl shadow-lg border border-gray-100">
            {!isFormReady && (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="w-10 h-10 border-3 border-poppins-pink border-t-transparent rounded-full animate-spin mb-3" />
                <p className="text-poppins-navy/50 text-sm">Cargando formulario...</p>
              </div>
            )}
            <div className="hs-form-frame" data-region="na1" data-form-id="5e8bb93c-bc8c-4eef-babf-904efc6c2280" data-portal-id="51289712" />
          </div>
        </div>
      </section>

      {/* Tu tranquilidad es nuestra prioridad */}
      <section className="py-16 bg-white">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h2 className="text-2xl font-black text-poppins-navy mb-6">Tu tranquilidad es nuestra prioridad</h2>
          <div className="flex flex-col md:flex-row justify-center gap-6 mb-8">
            {[
              'Cumplimiento con Dirección del Trabajo y Previred.',
              'Pagos y datos personales 100% seguros.',
              'Soporte experto para resolver tus dudas.',
            ].map((t, i) => (
              <div key={i} className="flex items-center gap-2 text-sm text-poppins-navy/70">
                <CheckCircle2 className="w-5 h-5 text-poppins-pink shrink-0" />
                <span>{t}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA final */}
      <section className="py-16 bg-[#f7f8fc]">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <p className="text-lg text-poppins-navy/80 italic mb-4">
            "Agenda una llamada y experimenta desde el comienzo la tranquilidad de usar Poppins."
          </p>
          <p className="text-xl font-black text-poppins-navy mb-6">¡Nos pondremos en contacto contigo muy pronto!</p>
          <LinkButton href="#contact" variant="primary">
            Quiero la magia en mi casa <ArrowRight className="w-5 h-5" />
          </LinkButton>
        </div>
      </section>

      {/* Plan Poppins */}
      <section className="py-20 bg-white">
        <div className="max-w-3xl mx-auto px-6">
          <div className="bg-gradient-to-br from-[#f7f8fc] to-white rounded-3xl border border-gray-100 shadow-xl p-8 md:p-12 flex flex-col md:flex-row items-center gap-8">
            <div className="text-center md:text-left shrink-0">
              <div className="flex items-center gap-2 mb-3 justify-center md:justify-start">
                <Umbrella className="w-6 h-6 text-poppins-pink" />
                <span className="font-bold text-poppins-navy text-lg">Plan Poppins</span>
              </div>
              <p className="text-4xl font-black text-poppins-navy">$24.770<span className="text-lg font-normal text-poppins-navy/50">/mes</span></p>
              <p className="text-xs text-poppins-navy/50 mt-1 max-w-[200px]">Todo lo indispensable para formalizar, pagar y administrar tu servicio doméstico con tranquilidad y en regla.</p>
              <LinkButton href="#contact" variant="primary">
                Elegir Plan
              </LinkButton>
            </div>
            <div className="flex-1">
              <ul className="space-y-3">
                {[
                  'Contrato digital y firma electrónica.',
                  'Gestión automática de sueldos e imposiciones.',
                  'Registro de asistencia y licencias.',
                  'Emisión de finiquitos y documentos legales.',
                  'Soporte experto (virtual y humano).',
                ].map((f, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm text-poppins-navy/70">
                    <CheckCircle2 className="w-4 h-4 text-poppins-pink shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-12">
            <Testimonial 
              text="Poppins me cambió la vida. Ahora tengo todas mis cuentas y el personal de casa bajo control absoluto."
              author="Consuelo T."
              role="Mamá y Emprendedora"
            />
            <Testimonial 
              text="La mejor parte es la tranquilidad mental. No tengo que recordar fechas de cotizaciones ni sueldos."
              author="Andrés K."
              role="Dueño de Casa"
            />
          </div>
        </div>
      </section>

      {/* Contact section moved to "Calcula el costo" above */}

      {/* Footer */}
      <footer className="py-12 bg-poppins-navy text-white/40 border-t border-white/5">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <div className="mb-6 flex justify-center gap-4 text-poppins-pink">
             <ShieldCheck className="w-6 h-6" />
             <span className="text-white/80 font-bold uppercase tracking-widest text-xs translate-y-1">Protocolo de Seguridad Poppins</span>
          </div>
          <p className="text-sm">© 2026 Poppins. Magia en tu casa. Todos los derechos reservados.</p>
          <div className="mt-4 flex justify-center gap-6 text-xs grayscale opacity-50">
             <span>VISA</span>
             <span>MASTERCARD</span>
             <span>AMEX</span>
          </div>
        </div>
      </footer>
      {/* Chatbot flotante */}
      <ChatBot />
    </div>
  );
}

// Sub-components for cleaner structure
const Bullet = ({ text }: { text: string }) => (
  <div className="flex items-center gap-3 text-poppins-navy/80 font-medium">
    <CheckCircle2 className="text-poppins-pink w-5 h-5 flex-shrink-0" />
    <span>{text}</span>
  </div>
);

const LinkButton = ({ href, children, variant = "primary" }: { href: string, children: React.ReactNode, variant?: "primary" | "secondary" }) => {
  const isExternal = href.startsWith("http") || href.startsWith("#");
  const Component = isExternal ? "a" : Link;

  return (
    <Component 
      href={href} 
      className={cn(
        "inline-flex items-center justify-center gap-2 px-8 py-4 rounded-full font-bold text-lg transition-all active:scale-95 shadow-xl",
        variant === "primary" ? "bg-poppins-pink text-white hover:bg-poppins-pink/90 hover:scale-105" : "bg-white text-poppins-navy hover:bg-poppins-light border border-poppins-navy/10"
      )}
    >
      {children}
    </Component>
  );
};

const FeatureCard = ({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) => (
  <motion.div 
    {...{ initial: { opacity: 0, y: 20 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true }, transition: { duration: 0.5 } }}
    className="p-8 rounded-[2rem] bg-poppins-light/50 border border-poppins-navy/5 hover:bg-white hover:shadow-2xl transition-all duration-300 group"
  >
    <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center mb-6 shadow-sm group-hover:scale-110 transition-transform">
      {icon}
    </div>
    <h3 className="text-xl font-black text-poppins-navy mb-4">{title}</h3>
    <p className="text-poppins-navy/60 leading-relaxed text-sm">{description}</p>
  </motion.div>
);

const Testimonial = ({ text, author, role }: { text: string, author: string, role: string }) => (
  <div className="p-8 border-l-4 border-poppins-pink bg-poppins-light/30 rounded-r-[2rem]">
    <div className="flex gap-1 mb-4">
      {[1, 2, 3, 4, 5].map(i => <Star key={i} className="w-4 h-4 fill-poppins-pink text-poppins-pink" />)}
    </div>
    <p className="text-xl font-medium text-poppins-navy leading-relaxed mb-6">"{text}"</p>
    <div>
      <p className="font-black text-poppins-navy uppercase tracking-widest text-xs">{author}</p>
      <p className="text-poppins-pink font-bold text-xs mt-1">{role}</p>
    </div>
  </div>
);

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(" ");
}
