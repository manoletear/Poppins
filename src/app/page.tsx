"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth/context";
import { getRedirectForRole } from "@/lib/auth/helpers";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, useScroll, useTransform } from "framer-motion";
import { Navbar } from "@/components/landing/Navbar";
import { StoryPhone } from "@/components/landing/StoryPhone";
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
    // HubSpot Form initialization with proper event handling
    const portalId = "51289712";
    const formId = "5e8bb93c-bc8c-4eef-babf-904efc6c2280";

    const loadHubSpot = () => {
      if ((window as any).hbspt) {
        (window as any).hbspt.forms.create({
          region: "na1",
          portalId: portalId,
          formId: formId,
          target: "#hubspot-form-container",
          onFormReady: () => {
            console.log("HubSpot Form Ready");
            setIsFormReady(true);
          },
        });
        
        // Fallback: Si en 5 segundos no ha disparado el evento (posible error 403 o red), ocultar el loader
        setTimeout(() => setIsFormReady(true), 5000);
      }
    };

    if (!document.querySelector('script[src*="js.hsforms.net"]')) {
      const script = document.createElement("script");
      script.src = "https://js.hsforms.net/forms/v2.js";
      script.async = true;
      script.onload = loadHubSpot;
      document.body.appendChild(script);
    } else {
      loadHubSpot();
    }
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
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-poppins-navy leading-[1.1] mb-6">
              El hogar que <span className="text-poppins-pink">siempre soñaste</span>, bajo control.
            </h1>
            <p className="text-lg md:text-xl text-poppins-navy/70 mb-8 max-w-lg leading-relaxed">
              La primera plataforma que centraliza y automatiza toda la administración del hogar en Latinoamérica. 
              Sueldos, gastos y servicios, en un solo lugar.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 mb-10">
              <LinkButton href="#contact" variant="primary">
                Pide tu acceso ahora <ArrowRight className="w-5 h-5" />
              </LinkButton>
            </div>

            <div className="space-y-3">
              <Bullet text="Sueldos y cotizaciones automáticas" />
              <Bullet text="Control total de gastos domésticos" />
              <Bullet text="Cero estrés organizativo" />
            </div>
          </motion.div>

          <div className="flex-1 flex justify-center lg:justify-end items-center mt-12 lg:mt-0">
            <div className="w-full max-w-[320px] sm:max-w-[380px]">
              <StoryPhone />
            </div>
          </div>
        </div>
      </section>

      {/* Cómo Funciona Section */}
      <section id="how-it-works" className="py-24 bg-white relative overflow-hidden">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-poppins-navy mb-6 leading-tight">
              Cómo funciona Poppins: Automatización y control total de tus pagos del hogar
            </h2>
            <p className="text-lg text-gray-600 leading-relaxed">
              Por una tarifa fija, centralizas todo lo que tu casa necesita para administrar gastos y servicios desde un solo lugar, donde además podrás acceder a recordatorios e informes mensuales para ordenar y optimizar sus gastos. Una sola app, un sólo pago, cero preocupaciones. Sin olvidos, sin enredos, sin estrés.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="bg-white p-10 rounded-2xl shadow-[0_5_15_rgba(0,0,0,0.05)] border border-gray-100 flex flex-col items-center text-center group hover:translate-y-[-10px] transition-all duration-300">
              <div className="w-20 h-20 bg-poppins-pink rounded-2xl flex items-center justify-center mb-8 shadow-lg shadow-poppins-pink/20">
                <CreditCard className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-4 px-2">
                Programación automática de pagos
              </h3>
              <p className="text-gray-600 leading-relaxed">
                Evita olvidos o atrasos: establece pagos recurrentes y Poppins los ejecuta por ti al día.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-white p-10 rounded-2xl shadow-[0_5_15_rgba(0,0,0,0.05)] border border-gray-100 flex flex-col items-center text-center group hover:translate-y-[-10px] transition-all duration-300">
              <div className="w-20 h-20 bg-poppins-pink rounded-2xl flex items-center justify-center mb-8 shadow-lg shadow-poppins-pink/20">
                <BarChart3 className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-4 px-2">
                Historial consolidado de gastos domésticos
              </h3>
              <p className="text-gray-600 leading-relaxed">
                Presupuestos claros, con reportes por categoría que te permiten visualizar en un solo lugar el flujo financiero de tu hogar.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-white p-10 rounded-2xl shadow-[0_5_15_rgba(0,0,0,0.05)] border border-gray-100 flex flex-col items-center text-center group hover:translate-y-[-10px] transition-all duration-300">
              <div className="w-20 h-20 bg-poppins-pink rounded-2xl flex items-center justify-center mb-8 shadow-lg shadow-poppins-pink/20">
                <Bot className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-4 px-2">
                Asistente Virtual Inteligente (AVI)
              </h3>
              <p className="text-gray-600 leading-relaxed">
                Recibe recomendaciones personalizadas, optimización de gastos y alertas sobre ofertas o condiciones favorables con tus tarjetas.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Content */}
      <section id="features" className="py-24 bg-white relative">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-black text-poppins-navy mb-4">
              Una plataforma, infinitas soluciones
            </h2>
            <p className="text-poppins-navy/60 max-w-2xl mx-auto">
              Diseñada para dueños de casa que valoran su tiempo y buscan profesionalizar su hogar.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <FeatureCard 
              icon={<Zap className="text-poppins-pink" />}
              title="Automatización Total"
              description="Establece pagos recurrentes y Poppins los ejecuta por ti. Nunca más un pago atrasado."
            />
            <FeatureCard 
              icon={<LineChart className="text-poppins-pink" />}
              title="Reportes Consolidados"
              description="Visualiza el flujo financiero de tu hogar con presupuestos claros y reportes por categoría."
            />
            <FeatureCard 
              icon={<ShieldCheck className="text-poppins-pink" />}
              title="Seguridad Legal"
              description="Cumple con todas las normativas laborales de forma automática, sin enredos legales."
            />
          </div>
        </div>
      </section>

      {/* Interactive Detail Section */}
      <section className="py-24 bg-poppins-navy text-white overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-2 gap-16 items-center">
          <motion.div {...fadeInUp}>
            <span className="text-poppins-pink font-bold tracking-widest text-sm mb-4 block uppercase">Magia en tus manos</span>
            <h2 className="text-4xl md:text-5xl font-black mb-8 leading-tight">
              AVI: Tu Asistente Virtual Inteligente
            </h2>
            <div className="space-y-6">
              <div className="bg-white/5 border border-white/10 p-6 rounded-2xl backdrop-blur-sm">
                <p className="text-lg text-white/80 leading-relaxed italic">
                  "AVI me recomienda cuándo cargar mis tarjetas para maximizar millas y me avisa si un gasto sale de lo habitual en mi presupuesto mensual."
                </p>
                <p className="mt-4 font-bold text-poppins-pink">— María José, Fundadora Poppins</p>
              </div>
            </div>
          </motion.div>
          
          <div className="relative flex justify-center">
             <div className="absolute inset-0 bg-poppins-pink/20 blur-[120px] rounded-full" />
             <div className="relative w-64 h-64 bg-gradient-to-br from-poppins-pink to-poppins-navy rounded-full flex items-center justify-center p-1 shadow-2xl">
                <div className="w-full h-full bg-poppins-navy rounded-full flex flex-center items-center justify-center overflow-hidden">
                   <div className="text-6xl animate-pulse">🪄</div>
                </div>
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

      {/* Contact Section */}
      <section id="contact" className="py-24 bg-poppins-light">
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-black text-poppins-navy mb-4">Empieza la magia hoy</h2>
            <p className="text-poppins-navy/60">Registra tus datos y un ejecutivo te contactará en minutos.</p>
          </div>
          
          <div className="relative bg-white p-8 rounded-[2rem] shadow-2xl border border-poppins-navy/5">
            {!isFormReady && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-white rounded-[2rem] z-10 transition-opacity duration-500">
                <div className="w-12 h-12 border-4 border-poppins-pink border-t-transparent rounded-full animate-spin mb-4" />
                <p className="text-poppins-navy/60 font-medium tracking-wide">Inspirando magia...</p>
              </div>
            )}
            <div id="hubspot-form-container" className="min-h-[400px]" />
          </div>
        </div>
      </section>

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
