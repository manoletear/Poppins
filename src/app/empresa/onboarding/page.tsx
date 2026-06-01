'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Check, ChevronRight, ChevronLeft, User, Loader2, AlertCircle,
  Mail, Phone, MapPin, FileText, CreditCard, Sparkles, Shield,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/lib/auth/context';
import { createClient } from '@/lib/supabase/client';
import Image from 'next/image';
import { PLANES } from '@/lib/pagos/plans';
import type { PlanTipo, CicloFacturacion } from '@/lib/pagos/types';

// ─── Types ────────────────────────────────────────────────────────────────────

interface DatosContratante {
  nombre: string;
  apellido: string;
  rut: string;
  email: string;
  telefono: string;
  direccion: string;
  comuna: string;
  ciudad: string;
}

interface DatosContrato {
  tipo_servicio: string;
  frecuencia: string;
  fecha_inicio: string;
  acepta_terminos: boolean;
  acepta_politica_privacidad: boolean;
}

const STEPS = ['Bienvenida', 'Datos del Contratante', 'Contrato de Servicio', 'Plan', 'Confirmación'];

const SERVICIOS = [
  { value: 'integral', label: 'Servicio Integral', desc: 'Aseo, cocina y organización completa' },
  { value: 'aseo', label: 'Aseo y Limpieza', desc: 'Limpieza general del hogar' },
  { value: 'cocina', label: 'Cocina', desc: 'Preparación de comidas' },
  { value: 'cuidado_ninos', label: 'Cuidado de Niños', desc: 'Nana / cuidado infantil' },
  { value: 'cuidado_adultos', label: 'Cuidado de Adultos', desc: 'Acompañamiento adulto mayor' },
  { value: 'jardineria', label: 'Jardinería', desc: 'Mantención de jardín y exteriores' },
];

const FRECUENCIAS = [
  { value: 'diario', label: 'Lunes a Viernes' },
  { value: 'semanal', label: '1 vez por semana' },
  { value: 'quincenal', label: 'Cada 2 semanas' },
  { value: 'mensual', label: 'Mensual' },
];

// ─── Stepper ──────────────────────────────────────────────────────────────────

function Stepper({ currentStep }: { currentStep: number }) {
  return (
    <div className="flex items-center gap-2 mb-8 overflow-x-auto pb-2 scrollbar-hide">
      {STEPS.map((label, idx) => {
        const isActive = idx === currentStep;
        const isCompleted = idx < currentStep;
        return (
          <div key={idx} className="flex items-center gap-2 shrink-0">
            <div
              className={`
                h-1.5 rounded-full transition-all duration-300
                ${isActive ? 'w-12 bg-[#E91E8C]' : isCompleted ? 'w-8 bg-[#2D2D90]' : 'w-8 bg-zinc-200'}
              `}
            />
            <span className={`text-[10px] font-bold uppercase tracking-wider ${isActive ? 'text-[#E91E8C]' : isCompleted ? 'text-[#2D2D90]' : 'text-zinc-400'}`}>
              {label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Step 0: Bienvenida ───────────────────────────────────────────────────────

function StepWelcome({ nombre, onNext }: { nombre: string; onNext: () => void }) {
  return (
    <div className="relative min-h-[500px] flex flex-col md:flex-row items-center gap-12 overflow-hidden">
      <div className="flex-1 z-10">
        <div className="w-16 h-16 bg-poppins-pink/10 rounded-2xl flex items-center justify-center mb-6">
          <Sparkles className="w-8 h-8 text-[#E91E8C]" />
        </div>
        <h1 className="text-4xl md:text-5xl font-black text-[#2D2D90] leading-tight mb-6">
          ¡Hola {nombre || 'bienvenido'}!
        </h1>
        <p className="text-lg text-[#2D2D90]/70 mb-8 leading-relaxed max-w-md">
          Estamos felices de que hayas elegido <strong>Poppins</strong> como tu aliado para hacer de tu hogar un lugar más feliz y organizado.
        </p>
        <p className="text-sm text-[#2D2D90]/50 mb-8">
          En los siguientes pasos completarás tus datos, revisarás las condiciones del servicio y activarás tu cuenta con el primer pago.
        </p>
        <button
          onClick={onNext}
          className="group flex items-center gap-3 bg-[#2D2D90] hover:bg-[#1E1B4B] text-white px-8 py-4 rounded-full font-bold text-lg transition-all shadow-xl hover:scale-105 active:scale-95"
        >
          Comenzar <ChevronRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
        </button>
      </div>
      <div className="flex-1 relative flex justify-center items-center py-12">
        <div className="absolute w-[400px] h-[400px] bg-[#2D2D90] rounded-full opacity-[0.03] animate-pulse" />
        <div className="relative w-64 h-64 md:w-80 md:h-80">
          <Image src="/images/onboarding/victory-hand.png" alt="Bienvenida" fill className="object-contain" priority />
        </div>
      </div>
    </div>
  );
}

// ─── Step 1: Datos del Contratante ────────────────────────────────────────────

function StepContratante({
  data, onChange, onNext, onBack, error,
}: {
  data: DatosContratante;
  onChange: (d: DatosContratante) => void;
  onNext: () => void;
  onBack: () => void;
  error: string | null;
}) {
  const f = (field: keyof DatosContratante) => (e: React.ChangeEvent<HTMLInputElement>) =>
    onChange({ ...data, [field]: e.target.value });

  return (
    <div className="max-w-2xl mx-auto py-8">
      <Stepper currentStep={1} />
      <div className="bg-white rounded-3xl shadow-2xl shadow-navy-900/5 border border-zinc-100 p-8 md:p-12 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-5">
          <User className="w-24 h-24 text-[#2D2D90]" />
        </div>
        <h2 className="text-2xl font-black text-[#2D2D90] mb-2">Datos del Contratante</h2>
        <p className="text-zinc-500 mb-8">Estos datos quedarán registrados en tu contrato de servicio.</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <InputField label="Nombre" value={data.nombre} onChange={f('nombre')} placeholder="Ej: Manuel" />
          <InputField label="Apellido" value={data.apellido} onChange={f('apellido')} placeholder="Ej: Aravena" />
          <InputField label="RUT" value={data.rut} onChange={f('rut')} placeholder="12.345.678-9" />
          <InputField label="Teléfono" value={data.telefono} onChange={f('telefono')} placeholder="+56 9 ..." icon={<Phone className="w-4 h-4" />} type="tel" />
          <div className="md:col-span-2">
            <InputField label="Email" value={data.email} onChange={f('email')} placeholder="tu@email.com" icon={<Mail className="w-4 h-4" />} type="email" />
          </div>
          <div className="md:col-span-2">
            <InputField label="Dirección" value={data.direccion} onChange={f('direccion')} placeholder="Av. Providencia 1234, depto 56" icon={<MapPin className="w-4 h-4" />} />
          </div>
          <InputField label="Comuna" value={data.comuna} onChange={f('comuna')} placeholder="Providencia" />
          <InputField label="Ciudad" value={data.ciudad} onChange={f('ciudad')} placeholder="Santiago" />
        </div>

        {error && <ErrorBanner message={error} />}
        <StepNav onBack={onBack} onNext={onNext} nextLabel="Siguiente" />
      </div>
    </div>
  );
}

// ─── Step 2: Contrato y Condiciones ───────────────────────────────────────────

function StepContrato({
  data, onChange, onNext, onBack, error,
}: {
  data: DatosContrato;
  onChange: (d: DatosContrato) => void;
  onNext: () => void;
  onBack: () => void;
  error: string | null;
}) {
  return (
    <div className="max-w-2xl mx-auto py-8">
      <Stepper currentStep={2} />
      <div className="bg-white rounded-3xl shadow-2xl shadow-navy-900/5 border border-zinc-100 p-8 md:p-12 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-5">
          <FileText className="w-24 h-24 text-[#2D2D90]" />
        </div>
        <h2 className="text-2xl font-black text-[#2D2D90] mb-2">Contrato de Servicio</h2>
        <p className="text-zinc-500 mb-8">Selecciona el servicio y revisa las condiciones.</p>

        {/* Tipo de servicio */}
        <div className="mb-8">
          <label className="text-xs font-bold text-[#2D2D90] uppercase tracking-wider ml-1 mb-3 block">Tipo de Servicio</label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {SERVICIOS.map(s => (
              <button
                key={s.value}
                onClick={() => onChange({ ...data, tipo_servicio: s.value })}
                className={`text-left p-4 rounded-2xl border-2 transition-all ${
                  data.tipo_servicio === s.value
                    ? 'border-[#E91E8C] bg-[#E91E8C]/5'
                    : 'border-zinc-100 hover:border-zinc-200'
                }`}
              >
                <p className={`font-bold text-sm ${data.tipo_servicio === s.value ? 'text-[#E91E8C]' : 'text-[#2D2D90]'}`}>{s.label}</p>
                <p className="text-xs text-zinc-500 mt-0.5">{s.desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Frecuencia */}
        <div className="mb-8">
          <label className="text-xs font-bold text-[#2D2D90] uppercase tracking-wider ml-1 mb-3 block">Frecuencia</label>
          <div className="flex flex-wrap gap-3">
            {FRECUENCIAS.map(f => (
              <button
                key={f.value}
                onClick={() => onChange({ ...data, frecuencia: f.value })}
                className={`px-5 py-3 rounded-full text-sm font-bold transition-all ${
                  data.frecuencia === f.value
                    ? 'bg-[#2D2D90] text-white'
                    : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Fecha inicio */}
        <div className="mb-8">
          <InputField
            label="Fecha de Inicio del Servicio"
            value={data.fecha_inicio}
            onChange={(e) => onChange({ ...data, fecha_inicio: e.target.value })}
            type="date"
          />
        </div>

        {/* Plan: se elige en el siguiente paso */}
        <div className="bg-[#f7f8fc] p-6 rounded-3xl border border-zinc-100 mb-8">
          <p className="text-sm text-[#2D2D90]/70">
            En el <strong>siguiente paso</strong> elegís tu plan: <strong>Starter</strong> (30 días gratis, sin tarjeta)
            o <strong>Pro / Pro+</strong> con <strong>2 meses gratis</strong>.
          </p>
        </div>

        {/* Términos y condiciones */}
        <div className="bg-zinc-50 rounded-2xl p-5 mb-6 max-h-48 overflow-y-auto text-xs text-zinc-600 leading-relaxed border border-zinc-100">
          <h4 className="font-bold text-[#2D2D90] mb-2">Términos y Condiciones del Servicio Poppins</h4>
          <p className="mb-2">1. <strong>Objeto:</strong> Poppins provee una plataforma de gestión administrativa para la relación laboral entre el Contratante y su(s) trabajador(es) de casa particular, conforme a la legislación laboral chilena (Código del Trabajo, Título V, Capítulo V, Art. 146 y siguientes).</p>
          <p className="mb-2">2. <strong>Responsabilidad del Contratante:</strong> El Contratante es el empleador directo del trabajador. Poppins no actúa como intermediario laboral ni asume obligaciones derivadas del contrato de trabajo.</p>
          <p className="mb-2">3. <strong>Servicios incluidos:</strong> Cálculo de remuneraciones, emisión de liquidaciones, gestión de vacaciones, licencias, finiquitos, y pago de cotizaciones previsionales a través de la plataforma.</p>
          <p className="mb-2">4. <strong>Facturación:</strong> El servicio se cobra mensualmente. El primer cobro se realiza al activar la cuenta. Los cobros posteriores se realizan el día 1 de cada mes.</p>
          <p className="mb-2">5. <strong>Cancelación:</strong> El Contratante puede cancelar el servicio en cualquier momento. La cancelación será efectiva al final del período facturado.</p>
          <p className="mb-2">6. <strong>Protección de datos:</strong> Poppins cumple con la Ley 19.628 sobre Protección de la Vida Privada. Los datos personales se almacenan de forma segura y no se comparten con terceros sin consentimiento.</p>
          <p>7. <strong>Jurisdicción:</strong> Cualquier controversia será sometida a los tribunales ordinarios de justicia de Santiago de Chile.</p>
        </div>

        <div className="space-y-3 mb-6">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={data.acepta_terminos}
              onChange={(e) => onChange({ ...data, acepta_terminos: e.target.checked })}
              className="mt-1 h-4 w-4 rounded border-zinc-300 text-[#E91E8C] focus:ring-[#E91E8C]"
            />
            <span className="text-sm text-zinc-700">He leído y acepto los <strong>Términos y Condiciones</strong> del servicio Poppins.</span>
          </label>
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={data.acepta_politica_privacidad}
              onChange={(e) => onChange({ ...data, acepta_politica_privacidad: e.target.checked })}
              className="mt-1 h-4 w-4 rounded border-zinc-300 text-[#E91E8C] focus:ring-[#E91E8C]"
            />
            <span className="text-sm text-zinc-700">Acepto la <strong>Política de Privacidad</strong> y el tratamiento de mis datos personales conforme a la Ley 19.628.</span>
          </label>
        </div>

        {error && <ErrorBanner message={error} />}
        <StepNav onBack={onBack} onNext={onNext} nextLabel="Elegir Plan" nextIcon={<Sparkles className="w-5 h-5" />} />
      </div>
    </div>
  );
}

// ─── Step 3: Elección de Plan ─────────────────────────────────────────────────

function StepPlan({
  loading, error, onBack, onSelect,
}: {
  loading: boolean;
  error: string | null;
  onBack: () => void;
  onSelect: (plan: PlanTipo, ciclo: CicloFacturacion) => void;
}) {
  const [ciclo, setCiclo] = useState<CicloFacturacion>('mensual');
  const fmt = (n: number) => '$' + n.toLocaleString('es-CL');
  const pagos: PlanTipo[] = ['pro', 'pro_plus'];

  return (
    <div className="max-w-3xl mx-auto py-8">
      <Stepper currentStep={3} />
      <div className="bg-white rounded-3xl shadow-2xl shadow-navy-900/5 border border-zinc-100 p-8 md:p-12">
        <h2 className="text-2xl font-black text-[#2D2D90] mb-2">Elegí cómo empezar</h2>
        <p className="text-zinc-500 mb-6">Probá gratis con Starter, o arrancá con Pro/Pro+ y obtené <strong>2 meses gratis</strong>.</p>

        {/* Starter */}
        <div className="rounded-2xl border-2 border-zinc-100 p-6 mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <p className="font-black text-[#2D2D90] text-lg">Starter — 1 mes gratis</p>
            <p className="text-sm text-zinc-500">30 días sin costo y <strong>sin tarjeta</strong>. Al terminar elegís Pro o Pro+.</p>
          </div>
          <button
            onClick={() => onSelect('starter', 'mensual')}
            disabled={loading}
            className="shrink-0 rounded-full border-2 border-[#2D2D90] text-[#2D2D90] hover:bg-[#2D2D90] hover:text-white font-bold px-6 py-3 transition-colors disabled:opacity-50"
          >
            Empezar gratis
          </button>
        </div>

        {/* Toggle mensual/anual */}
        <div className="flex justify-center mb-5">
          <div className="inline-flex rounded-full border border-zinc-200 p-1 bg-zinc-50">
            {(['mensual', 'anual'] as CicloFacturacion[]).map((c) => (
              <button
                key={c}
                onClick={() => setCiclo(c)}
                className={`px-5 py-1.5 text-sm font-bold rounded-full transition-colors ${ciclo === c ? 'bg-white shadow text-[#2D2D90]' : 'text-zinc-400'}`}
              >
                {c === 'mensual' ? 'Mensual' : 'Anual'}
                {c === 'anual' && <span className="ml-1 text-[10px] text-emerald-600">2 meses gratis</span>}
              </button>
            ))}
          </div>
        </div>

        {/* Pro / Pro+ */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {pagos.map((tipo) => {
            const plan = PLANES[tipo];
            const precio = ciclo === 'anual' ? plan.precio_anual : plan.precio_mensual;
            return (
              <div key={tipo} className={`rounded-2xl border-2 p-6 ${tipo === 'pro_plus' ? 'border-[#E91E8C]' : 'border-zinc-200'}`}>
                <p className="font-black text-[#2D2D90] text-lg">{plan.nombre}</p>
                <p className="text-3xl font-black text-[#2D2D90] mt-1">
                  {fmt(precio)}<span className="text-sm font-normal text-zinc-400">{ciclo === 'anual' ? '/año' : '/mes'}</span>
                </p>
                <p className="text-xs text-emerald-600 font-bold mb-3">Primeros 2 meses gratis</p>
                <ul className="space-y-1.5 mb-5">
                  {plan.beneficios.map((b) => (
                    <li key={b} className="flex items-center gap-2 text-sm text-zinc-600">
                      <Check className="h-4 w-4 text-[#E91E8C] shrink-0" /> {b}
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => onSelect(tipo, ciclo)}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 rounded-full bg-[#E91E8C] hover:bg-[#D81B7D] text-white font-bold px-6 py-3 transition-colors disabled:opacity-50"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <CreditCard className="w-5 h-5" />}
                  Empezar con {plan.nombre}
                </button>
              </div>
            );
          })}
        </div>

        <div className="flex items-center gap-2 text-xs text-zinc-500 mt-6">
          <Shield className="w-4 h-4 text-green-500 shrink-0" />
          Cobro recurrente seguro vía Flow. Con 2 meses gratis no se cobra nada hoy; podés cancelar cuando quieras.
        </div>

        {error && <ErrorBanner message={error} />}

        <div className="mt-8">
          <button onClick={onBack} className="text-zinc-400 hover:text-[#2D2D90] font-bold text-sm transition-colors hover:underline underline-offset-4">
            ← Volver
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Step 4: Confirmación ─────────────────────────────────────────────────────

function StepSuccess({ router }: { router: ReturnType<typeof useRouter> }) {
  return (
    <div className="relative min-h-[500px] flex flex-col md:flex-row items-center gap-12 overflow-hidden">
      <div className="flex-1 z-10">
        <div className="w-16 h-16 bg-green-500/10 rounded-2xl flex items-center justify-center mb-6">
          <Check className="w-8 h-8 text-green-500" />
        </div>
        <h1 className="text-4xl md:text-5xl font-black text-[#2D2D90] leading-tight mb-6">
          ¡Estamos listos!
        </h1>
        <p className="text-lg text-[#2D2D90]/70 mb-6 leading-relaxed">
          Tu cuenta Poppins ha sido activada exitosamente.
        </p>
        <div className="bg-[#f7f8fc] p-6 rounded-3xl border border-zinc-100 mb-8 space-y-3">
          <p className="text-sm text-[#2D2D90]/60 leading-relaxed">
            <strong>📧 Revisa tu correo</strong> — Te hemos enviado un email de bienvenida con los próximos pasos, incluyendo un formulario para completar los datos de tu hogar.
          </p>
          <p className="text-sm text-[#2D2D90]/60 leading-relaxed">
            <strong>👤 Ejecutivo de Cuentas</strong> — Un ejecutivo se pondrá en contacto contigo para coordinar el inicio del servicio.
          </p>
        </div>
        <button
          onClick={() => router.push('/empresa')}
          className="flex items-center gap-3 bg-[#2D2D90] hover:bg-[#1E1B4B] text-white px-8 py-4 rounded-full font-bold text-lg transition-all shadow-xl hover:scale-105"
        >
          Ir a mi panel <ChevronRight className="w-6 h-6" />
        </button>
      </div>
      <div className="flex-1 relative flex justify-center items-center py-12">
        <div className="absolute w-[400px] h-[400px] bg-[#E91E8C] rounded-full opacity-[0.03] animate-pulse" />
        <div className="relative w-64 h-64 md:w-80 md:h-80">
          <Image src="/images/onboarding/ok-hand.png" alt="Éxito" fill className="object-contain" priority />
        </div>
      </div>
    </div>
  );
}

// ─── Shared UI Components ─────────────────────────────────────────────────────

function InputField({ label, value, onChange, placeholder, icon, type = 'text' }: {
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  icon?: React.ReactNode;
  type?: string;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-bold text-[#2D2D90] uppercase tracking-wider ml-1">{label}</label>
      <div className="relative">
        {icon && <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400">{icon}</span>}
        <input
          type={type}
          value={value}
          onChange={onChange}
          className={`w-full bg-zinc-50 border-none rounded-2xl ${icon ? 'pl-12' : 'px-5'} pr-5 py-4 text-sm focus:ring-2 focus:ring-[#E91E8C] transition-all`}
          placeholder={placeholder}
        />
      </div>
    </div>
  );
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-6 flex items-center gap-3 text-red-600 text-sm bg-red-50 p-4 rounded-2xl border border-red-100">
      <AlertCircle className="w-5 h-5 shrink-0" /> {message}
    </motion.div>
  );
}

function StepNav({ onBack, onNext, nextLabel, nextIcon, loading }: {
  onBack: () => void;
  onNext: () => void;
  nextLabel: string;
  nextIcon?: React.ReactNode;
  loading?: boolean;
}) {
  return (
    <div className="mt-10 flex flex-col md:flex-row items-center justify-between gap-4">
      <button onClick={onBack} className="text-zinc-400 hover:text-[#2D2D90] font-bold text-sm transition-colors hover:underline underline-offset-4">
        ← Volver
      </button>
      <button
        onClick={onNext}
        disabled={loading}
        className="w-full md:w-auto flex items-center justify-center gap-3 bg-[#E91E8C] hover:bg-[#D81B7D] text-white px-10 py-4 rounded-full font-bold shadow-lg shadow-pink-500/20 transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
      >
        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
        {nextIcon} {nextLabel} <ChevronRight className="w-5 h-5" />
      </button>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function OnboardingPage() {
  const { user, profile, refreshProfile } = useAuth();
  const router = useRouter();
  const supabase = createClient();

  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check if returning from Flow payment
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const flowStatus = params.get('flow_status');
    const contratoId = params.get('contrato_id');

    if (flowStatus === 'completed' && contratoId) {
      // Verify payment and advance to confirmation
      verifyPaymentAndComplete(contratoId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [contratante, setContratante] = useState<DatosContratante>({
    nombre: '', apellido: '', rut: '', email: '', telefono: '',
    direccion: '', comuna: '', ciudad: '',
  });

  const [contrato, setContrato] = useState<DatosContrato>({
    tipo_servicio: 'integral',
    frecuencia: 'mensual',
    fecha_inicio: new Date().toISOString().split('T')[0],
    acepta_terminos: false,
    acepta_politica_privacidad: false,
  });

  // Auto-fill from Google OAuth profile
  useEffect(() => {
    if (!user || !profile) return;
    const meta = user.user_metadata || {};
    const fullName = meta.full_name || meta.name || '';
    const parts = fullName.split(' ');

    setContratante(prev => ({
      ...prev,
      nombre: profile.nombre || parts[0] || '',
      apellido: profile.apellido || parts.slice(1).join(' ') || '',
      email: profile.email || user.email || '',
    }));
  }, [user, profile]);

  // Redirect if onboarding already completed
  useEffect(() => {
    if (profile?.onboarding_completado) {
      router.push('/empresa');
    }
  }, [profile, router]);

  async function verifyPaymentAndComplete(contratoId: string) {
    setLoading(true);
    try {
      const res = await fetch(`/api/onboarding/flow/verify?contrato_id=${contratoId}`);
      const result = await res.json();
      if (result.paid) {
        await refreshProfile();
        setStep(4);
      } else {
        setError('El pago no se ha confirmado aún. Intenta nuevamente.');
        setStep(3);
      }
    } catch {
      setError('Error al verificar el pago.');
      setStep(3);
    } finally {
      setLoading(false);
    }
  }

  async function handleContratanteNext() {
    const { nombre, apellido, rut, email, direccion, comuna, ciudad } = contratante;
    if (!nombre || !apellido || !rut || !email || !direccion || !comuna || !ciudad) {
      setError('Por favor completa todos los campos obligatorios.');
      return;
    }
    setError(null);
    setStep(2);
  }

  async function handleContratoNext() {
    if (!contrato.acepta_terminos || !contrato.acepta_politica_privacidad) {
      setError('Debes aceptar los términos y condiciones y la política de privacidad.');
      return;
    }
    setError(null);
    setStep(3);
  }

  async function handleElegirPlan(plan: PlanTipo, ciclo: CicloFacturacion) {
    setError(null);
    setLoading(true);
    try {
      const authUserId = user?.id;
      if (!authUserId) throw new Error('No hay sesión activa.');

      const precioMensual = plan === 'starter' ? 0 : PLANES[plan].precio_mensual;

      // 1. Guardar empleador con el plan elegido
      const { data: emp, error: empErr } = await supabase
        .from('empleadores')
        .upsert({
          auth_user_id: authUserId,
          nombre: contratante.nombre,
          apellido: contratante.apellido,
          rut: contratante.rut,
          email: contratante.email,
          telefono: contratante.telefono || null,
          direccion: contratante.direccion,
          comuna: contratante.comuna,
          ciudad: contratante.ciudad,
          plan_tipo: plan,
        }, { onConflict: 'auth_user_id' })
        .select('id')
        .single();
      if (empErr) throw empErr;

      // 2. Contrato de servicio (registro legal)
      const { error: csErr } = await supabase
        .from('contratos_servicio')
        .insert({
          empleador_id: emp.id,
          contratante_nombre: `${contratante.nombre} ${contratante.apellido}`,
          contratante_rut: contratante.rut,
          contratante_direccion: contratante.direccion,
          contratante_comuna: contratante.comuna,
          contratante_ciudad: contratante.ciudad,
          contratante_email: contratante.email,
          contratante_telefono: contratante.telefono,
          tipo_servicio: contrato.tipo_servicio,
          frecuencia: contrato.frecuencia,
          fecha_inicio: contrato.fecha_inicio,
          monto_mensual: precioMensual,
          acepta_terminos: contrato.acepta_terminos,
          acepta_politica_privacidad: contrato.acepta_politica_privacidad,
          ip_aceptacion: '',
          fecha_aceptacion: new Date().toISOString(),
          estado: 'activo',
        });
      if (csErr) throw csErr;

      // 3. Vincular perfil + marcar onboarding completo
      await supabase
        .from('user_profiles')
        .update({ empleador_id: emp.id, onboarding_completado: true })
        .eq('auth_user_id', authUserId);

      // 4. Pro/Pro+ → crear suscripción (camino A = 2 meses gratis). Starter no cobra (trial 30d).
      if (plan !== 'starter') {
        const res = await fetch('/api/suscripcion/iniciar', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ plan, ciclo, camino: 'A_inmediato' }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'No se pudo iniciar la suscripción.');
        // Flow real (camino A): redirigir al registro de tarjeta; la suscripción se
        // crea al volver (/empresa/suscripcion/confirmar). Simulado: ya quedó creada.
        if (data.requiereTarjeta && data.cardRegisterUrl) {
          window.location.href = data.cardRegisterUrl;
          return;
        }
      }

      // 5. Email de bienvenida
      await fetch('/api/onboarding/welcome-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ empleadorId: emp.id }),
      });

      await refreshProfile();
      setStep(4);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al activar tu plan.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#fcfdfe] relative overflow-hidden font-outfit">
      <div className="absolute top-0 right-0 w-1/3 h-full bg-[#2D2D90]/[0.02] -skew-x-12 origin-top" />
      <div className="absolute bottom-0 left-0 w-1/4 h-1/2 bg-[#E91E8C]/[0.02] blur-3xl rounded-full" />

      <header className="px-8 py-6 flex items-center justify-between relative z-20">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-[#2D2D90] rounded-xl flex items-center justify-center text-white font-black text-xl">P</div>
          <span className="text-2xl font-black text-[#2D2D90] tracking-tighter">Poppins</span>
        </div>
        <div className="hidden md:flex items-center gap-2 text-zinc-400 font-medium text-sm bg-white px-4 py-2 rounded-full border border-zinc-100 shadow-sm">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          Proceso de Onboarding Activo
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-8 py-12 relative z-10">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
          >
            {step === 0 && <StepWelcome nombre={contratante.nombre} onNext={() => setStep(1)} />}
            {step === 1 && (
              <StepContratante
                data={contratante}
                onChange={setContratante}
                onNext={handleContratanteNext}
                onBack={() => setStep(0)}
                error={error}
              />
            )}
            {step === 2 && (
              <StepContrato
                data={contrato}
                onChange={setContrato}
                onNext={handleContratoNext}
                onBack={() => setStep(1)}
                error={error}
              />
            )}
            {step === 3 && (
              <StepPlan
                loading={loading}
                error={error}
                onBack={() => setStep(2)}
                onSelect={handleElegirPlan}
              />
            )}
            {step === 4 && <StepSuccess router={router} />}
          </motion.div>
        </AnimatePresence>
      </main>

      <footer className="absolute bottom-8 left-0 right-0 text-center text-zinc-300 text-[10px] uppercase font-bold tracking-[0.2em] pointer-events-none">
        Poppins Chile · Plataforma de Gestión Doméstica
      </footer>
    </div>
  );
}
