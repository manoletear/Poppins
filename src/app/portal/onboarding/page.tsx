'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Check, ChevronRight, ChevronLeft, User, Building, Shield,
  Loader2, AlertCircle,
} from 'lucide-react';
import { useAuth } from '@/lib/auth/context';
import { createClient } from '@/lib/supabase/client';

// ─── Types ────────────────────────────────────────────────────────────────────

interface DatosPersonales {
  nombre: string;
  apellido_paterno: string;
  apellido_materno: string;
  rut: string;
  email: string;
  telefono: string;
  fecha_nacimiento: string;
  sexo: 'M' | 'F' | '';
  estado_civil: 'soltero' | 'casado' | 'divorciado' | 'viudo' | '';
  nacionalidad: string;
  direccion: string;
  comuna: string;
  ciudad: string;
  region: string;
}

interface DatosBancarios {
  banco: string;
  tipo_cuenta: 'cuenta_vista' | 'cuenta_corriente' | 'cuenta_rut' | 'cuenta_ahorro' | '';
  numero_cuenta: string;
}

interface DatosPrevisionales {
  afp_id: string;
  salud_tipo: 'fonasa' | 'isapre' | '';
  salud_id: string;
  nombre_isapre: string;
  plan_salud_uf: string;
  cargas_simples: string;
  cargas_maternales: string;
  cargas_invalidez: string;
  es_pensionado: boolean;
}

const STEPS = [
  { label: 'Datos Personales', icon: User },
  { label: 'Datos Bancarios', icon: Building },
  { label: 'Previsión', icon: Shield },
];

const BANCOS = [
  'Banco Estado',
  'Santander',
  'BCI',
  'Banco de Chile',
  'Scotiabank',
  'Itau',
  'Banco Falabella',
  'BICE',
  'Security',
  'Consorcio',
  'Otro',
];

const AFPS = [
  { id: '1', nombre: 'AFP Capital' },
  { id: '2', nombre: 'AFP Cuprum' },
  { id: '3', nombre: 'AFP Habitat' },
  { id: '4', nombre: 'AFP Modelo' },
  { id: '5', nombre: 'AFP PlanVital' },
  { id: '6', nombre: 'AFP Provida' },
  { id: '7', nombre: 'AFP Uno' },
];

const SALUD_OPTIONS = [
  { id: '13', nombre: 'FONASA', tipo: 'fonasa' },
  { id: '8', nombre: 'Banmédica', tipo: 'isapre' },
  { id: '9', nombre: 'Colmena Golden Cross', tipo: 'isapre' },
  { id: '10', nombre: 'Consalud', tipo: 'isapre' },
  { id: '11', nombre: 'Cruz Blanca', tipo: 'isapre' },
  { id: '33', nombre: 'Esencial', tipo: 'isapre' },
  { id: '12', nombre: 'Nueva Masvida', tipo: 'isapre' },
  { id: '32', nombre: 'Vida Tres', tipo: 'isapre' },
];

const REGIONES = [
  'Región de Arica y Parinacota',
  'Región de Tarapacá',
  'Región de Antofagasta',
  'Región de Atacama',
  'Región de Coquimbo',
  'Región de Valparaíso',
  'Región Metropolitana de Santiago',
  "Región del Libertador General Bernardo O'Higgins",
  'Región del Maule',
  'Región de Ñuble',
  'Región del Biobío',
  'Región de La Araucanía',
  'Región de Los Ríos',
  'Región de Los Lagos',
  'Región de Aysén del General Carlos Ibáñez del Campo',
  'Región de Magallanes y de la Antártica Chilena',
];

// ─── Stepper ──────────────────────────────────────────────────────────────────

function Stepper({ currentStep, completedSteps }: { currentStep: number; completedSteps: Set<number> }) {
  return (
    <div className="flex items-center justify-between w-full max-w-lg mx-auto mb-8 px-2">
      {STEPS.map((step, idx) => {
        const isCompleted = completedSteps.has(idx);
        const isCurrent = idx === currentStep;
        const StepIcon = step.icon;
        return (
          <div key={idx} className="flex items-center flex-1">
            <div className="flex flex-col items-center gap-1">
              <div
                className={`
                  w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold transition-all
                  ${isCompleted ? 'bg-emerald-500 text-white' : isCurrent ? 'bg-violet-600 text-white ring-4 ring-violet-100' : 'bg-zinc-100 text-zinc-400'}
                `}
              >
                {isCompleted ? <Check className="w-4 h-4" /> : <StepIcon className="w-4 h-4" />}
              </div>
              <span className={`text-xs font-medium text-center ${isCurrent ? 'text-violet-600' : isCompleted ? 'text-emerald-600' : 'text-zinc-400'}`}>
                {step.label}
              </span>
            </div>
            {idx < STEPS.length - 1 && (
              <div className={`flex-1 h-0.5 mx-2 mt-[-16px] ${isCompleted ? 'bg-emerald-400' : 'bg-zinc-200'}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Field helpers ─────────────────────────────────────────────────────────────

function Label({ children }: { children: React.ReactNode }) {
  return <label className="block text-sm font-medium text-zinc-700 mb-1">{children}</label>;
}

function Input({
  value,
  onChange,
  placeholder,
  type = 'text',
  readOnly = false,
  required = false,
}: {
  value: string;
  onChange?: (v: string) => void;
  placeholder?: string;
  type?: string;
  readOnly?: boolean;
  required?: boolean;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={e => onChange?.(e.target.value)}
      placeholder={placeholder}
      readOnly={readOnly}
      required={required}
      className={`
        w-full px-3 py-2.5 rounded-xl border text-sm transition-colors
        ${readOnly
          ? 'bg-zinc-100 border-zinc-200 text-zinc-500 cursor-not-allowed'
          : 'bg-white border-zinc-200 text-zinc-800 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent'
        }
      `}
    />
  );
}

function Select({
  value,
  onChange,
  children,
  required = false,
}: {
  value: string;
  onChange: (v: string) => void;
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      required={required}
      className="w-full px-3 py-2.5 rounded-xl border border-zinc-200 bg-white text-sm text-zinc-800 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
    >
      {children}
    </select>
  );
}

// ─── Step 1: Datos Personales ──────────────────────────────────────────────────

function StepPersonal({
  data,
  setData,
}: {
  data: DatosPersonales;
  setData: (d: DatosPersonales) => void;
}) {
  const set = (field: keyof DatosPersonales) => (value: string) =>
    setData({ ...data, [field]: value });

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label>Nombre {data.nombre && <span className="text-xs text-zinc-400">(ingresado por empleador)</span>}</Label>
          <Input value={data.nombre} onChange={set('nombre')} placeholder="Tu nombre" readOnly={!!data.nombre} />
        </div>
        <div>
          <Label>Apellido paterno {data.apellido_paterno && <span className="text-xs text-zinc-400">(ingresado por empleador)</span>}</Label>
          <Input value={data.apellido_paterno} onChange={set('apellido_paterno')} placeholder="Apellido paterno" readOnly={!!data.apellido_paterno} />
        </div>
        <div>
          <Label>Apellido materno</Label>
          <Input value={data.apellido_materno} onChange={set('apellido_materno')} placeholder="Apellido materno" />
        </div>
        <div>
          <Label>RUT <span className="text-xs text-zinc-400">(ingresado por empleador)</span></Label>
          <Input value={data.rut} readOnly />
        </div>
        <div>
          <Label>Email</Label>
          <Input value={data.email} onChange={set('email')} placeholder="tu@email.com" type="email" required />
        </div>
        <div>
          <Label>Teléfono</Label>
          <Input value={data.telefono} onChange={set('telefono')} placeholder="+56 9 1234 5678" type="tel" />
        </div>
        <div>
          <Label>Fecha de nacimiento</Label>
          <Input value={data.fecha_nacimiento} onChange={set('fecha_nacimiento')} type="date" />
        </div>
        <div>
          <Label>Sexo</Label>
          <Select value={data.sexo} onChange={set('sexo')}>
            <option value="">Selecciona...</option>
            <option value="M">Masculino</option>
            <option value="F">Femenino</option>
          </Select>
        </div>
        <div>
          <Label>Estado civil</Label>
          <Select value={data.estado_civil} onChange={set('estado_civil')}>
            <option value="">Selecciona...</option>
            <option value="soltero">Soltero/a</option>
            <option value="casado">Casado/a</option>
            <option value="divorciado">Divorciado/a</option>
            <option value="viudo">Viudo/a</option>
          </Select>
        </div>
        <div>
          <Label>Nacionalidad</Label>
          <Input value={data.nacionalidad} onChange={set('nacionalidad')} placeholder="Chilena" />
        </div>
      </div>

      <div>
        <Label>Dirección</Label>
        <Input value={data.direccion} onChange={set('direccion')} placeholder="Calle y número" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <Label>Comuna</Label>
          <Input value={data.comuna} onChange={set('comuna')} placeholder="Comuna" />
        </div>
        <div>
          <Label>Ciudad</Label>
          <Input value={data.ciudad} onChange={set('ciudad')} placeholder="Ciudad" />
        </div>
        <div>
          <Label>Región</Label>
          <Select value={data.region} onChange={set('region')}>
            <option value="">Selecciona...</option>
            {REGIONES.map(r => (
              <option key={r} value={r}>{r}</option>
            ))}
          </Select>
        </div>
      </div>
    </div>
  );
}

// ─── Step 2: Datos Bancarios ───────────────────────────────────────────────────

function StepBancario({
  data,
  setData,
}: {
  data: DatosBancarios;
  setData: (d: DatosBancarios) => void;
}) {
  const set = (field: keyof DatosBancarios) => (value: string) =>
    setData({ ...data, [field]: value });

  return (
    <div className="space-y-5">
      <div className="rounded-xl bg-violet-50 border border-violet-100 p-4 text-sm text-violet-700">
        <p className="font-medium mb-1">¿Para qué sirve esta información?</p>
        <p className="text-violet-600">Tu empleador usará estos datos para depositar tu sueldo. La información es confidencial y segura.</p>
      </div>

      <div>
        <Label>Banco <span className="text-red-500">*</span></Label>
        <Select value={data.banco} onChange={set('banco')} required>
          <option value="">Selecciona tu banco...</option>
          {BANCOS.map(b => (
            <option key={b} value={b}>{b}</option>
          ))}
        </Select>
      </div>

      <div>
        <Label>Tipo de cuenta <span className="text-red-500">*</span></Label>
        <Select value={data.tipo_cuenta} onChange={set('tipo_cuenta') as (v: string) => void} required>
          <option value="">Selecciona el tipo...</option>
          <option value="cuenta_vista">Cuenta Vista</option>
          <option value="cuenta_corriente">Cuenta Corriente</option>
          <option value="cuenta_rut">Cuenta RUT</option>
          <option value="cuenta_ahorro">Cuenta de Ahorro</option>
        </Select>
      </div>

      <div>
        <Label>Número de cuenta <span className="text-red-500">*</span></Label>
        <Input
          value={data.numero_cuenta}
          onChange={set('numero_cuenta')}
          placeholder="Ej: 000123456789"
          required
        />
        <p className="text-xs text-zinc-400 mt-1">Ingresa solo números, sin guiones ni espacios.</p>
      </div>
    </div>
  );
}

// ─── Step 3: Datos Previsionales ──────────────────────────────────────────────

function StepPrevisional({
  data,
  setData,
}: {
  data: DatosPrevisionales;
  setData: (d: DatosPrevisionales) => void;
}) {
  const set = (field: keyof DatosPrevisionales) => (value: string | boolean) =>
    setData({ ...data, [field]: value });

  return (
    <div className="space-y-5">
      {/* AFP */}
      <div>
        <Label>AFP (Administradora de Fondos de Pensiones)</Label>
        <Select value={data.afp_id} onChange={set('afp_id') as (v: string) => void}>
          <option value="">Selecciona tu AFP...</option>
          {AFPS.map(a => (
            <option key={a.id} value={a.id}>{a.nombre}</option>
          ))}
        </Select>
      </div>

      {/* Pensionado */}
      <div className="flex items-center gap-3">
        <input
          id="es_pensionado"
          type="checkbox"
          checked={data.es_pensionado}
          onChange={e => set('es_pensionado')(e.target.checked)}
          className="w-4 h-4 rounded accent-violet-600"
        />
        <label htmlFor="es_pensionado" className="text-sm text-zinc-700">
          Soy pensionado/a (jubilado)
        </label>
      </div>

      {/* Salud */}
      <div>
        <Label>Previsión de salud</Label>
        <div className="flex gap-3 mt-1">
          {(['fonasa', 'isapre'] as const).map(opt => (
            <button
              key={opt}
              type="button"
              onClick={() => {
                set('salud_tipo')(opt);
                if (opt === 'fonasa') {
                  set('salud_id')('13');
                  set('nombre_isapre')('');
                } else {
                  set('salud_id')('');
                }
              }}
              className={`
                flex-1 py-2.5 rounded-xl border text-sm font-medium transition-all
                ${data.salud_tipo === opt
                  ? 'bg-violet-600 border-violet-600 text-white'
                  : 'bg-white border-zinc-200 text-zinc-600 hover:border-violet-300'
                }
              `}
            >
              {opt === 'fonasa' ? 'FONASA' : 'ISAPRE'}
            </button>
          ))}
        </div>
      </div>

      {/* Isapre fields */}
      {data.salud_tipo === 'isapre' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pl-2 border-l-2 border-violet-200">
          <div>
            <Label>ISAPRE</Label>
            <Select value={data.salud_id} onChange={(v: string) => { set('salud_id')(v); const isapre = SALUD_OPTIONS.find(s => s.id === v); if (isapre) set('nombre_isapre')(isapre.nombre); }}>
              <option value="">Selecciona tu ISAPRE...</option>
              {SALUD_OPTIONS.filter(s => s.tipo === 'isapre').map(s => (
                <option key={s.id} value={s.id}>{s.nombre}</option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Plan de salud (UF)</Label>
            <Input
              value={data.plan_salud_uf}
              onChange={set('plan_salud_uf') as (v: string) => void}
              placeholder="Ej: 2.50"
              type="number"
            />
          </div>
        </div>
      )}

      {/* Cargas familiares */}
      <div>
        <p className="text-sm font-medium text-zinc-700 mb-2">Cargas familiares</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <Label>Cargas simples</Label>
            <Input
              value={data.cargas_simples}
              onChange={set('cargas_simples') as (v: string) => void}
              placeholder="0"
              type="number"
            />
          </div>
          <div>
            <Label>Cargas maternales</Label>
            <Input
              value={data.cargas_maternales}
              onChange={set('cargas_maternales') as (v: string) => void}
              placeholder="0"
              type="number"
            />
          </div>
          <div>
            <Label>Cargas con invalidez</Label>
            <Input
              value={data.cargas_invalidez}
              onChange={set('cargas_invalidez') as (v: string) => void}
              placeholder="0"
              type="number"
            />
          </div>
        </div>
        <p className="text-xs text-zinc-400 mt-1">
          Las cargas familiares afectan tu asignación familiar. Puedes dejar en 0 si no tienes.
        </p>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function PortalOnboardingPage() {
  const router = useRouter();
  const { profile, refreshProfile } = useAuth();
  const supabase = createClient();

  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [noTrabajador, setNoTrabajador] = useState(false);

  const [personalData, setPersonalData] = useState<DatosPersonales>({
    nombre: '',
    apellido_paterno: '',
    apellido_materno: '',
    rut: '',
    email: '',
    telefono: '',
    fecha_nacimiento: '',
    sexo: '',
    estado_civil: '',
    nacionalidad: '',
    direccion: '',
    comuna: '',
    ciudad: '',
    region: '',
  });

  const [bancarioData, setBancarioData] = useState<DatosBancarios>({
    banco: '',
    tipo_cuenta: '',
    numero_cuenta: '',
  });

  const [previsionalData, setPrevisionalData] = useState<DatosPrevisionales>({
    afp_id: '',
    salud_tipo: '',
    salud_id: '',
    nombre_isapre: '',
    plan_salud_uf: '',
    cargas_simples: '0',
    cargas_maternales: '0',
    cargas_invalidez: '0',
    es_pensionado: false,
  });

  // Load existing trabajador data
  const loadTrabajador = useCallback(async () => {
    if (!profile?.trabajador_id) {
      setNoTrabajador(true);
      setLoading(false);
      return;
    }

    const { data, error: err } = await supabase
      .from('trabajadores')
      .select('*')
      .eq('id', profile.trabajador_id)
      .single();

    if (err || !data) {
      setNoTrabajador(true);
      setLoading(false);
      return;
    }

    // Pre-fill personal data
    setPersonalData({
      nombre: data.nombre || '',
      apellido_paterno: data.apellido_paterno || '',
      apellido_materno: data.apellido_materno || '',
      rut: data.rut || '',
      email: data.email || profile.email || '',
      telefono: data.telefono || '',
      fecha_nacimiento: data.fecha_nacimiento || '',
      sexo: data.sexo || '',
      estado_civil: data.estado_civil || '',
      nacionalidad: data.nacionalidad || '',
      direccion: data.direccion || '',
      comuna: data.comuna || '',
      ciudad: data.ciudad || '',
      region: data.region || '',
    });

    // Pre-fill bank data
    setBancarioData({
      banco: data.banco || '',
      tipo_cuenta: data.tipo_cuenta || '',
      numero_cuenta: data.numero_cuenta || '',
    });

    // Pre-fill previsional data
    setPrevisionalData({
      afp_id: data.afp_id?.toString() || '',
      salud_tipo: data.salud_tipo || '',
      salud_id: data.salud_id?.toString() || '',
      nombre_isapre: '',
      plan_salud_uf: data.plan_salud_uf?.toString() || '',
      cargas_simples: data.cargas_simples?.toString() || '0',
      cargas_maternales: data.cargas_maternales?.toString() || '0',
      cargas_invalidez: data.cargas_invalidez?.toString() || '0',
      es_pensionado: data.es_pensionado || false,
    });

    setLoading(false);
  }, [profile, supabase]);

  useEffect(() => {
    if (profile !== null) {
      loadTrabajador();
    }
  }, [profile, loadTrabajador]);

  const saveStep = async (step: number): Promise<boolean> => {
    if (!profile?.trabajador_id) return false;
    setSaving(true);
    setError(null);

    let payload: Record<string, unknown> = {};

    if (step === 0) {
      payload = {
        nombre: personalData.nombre || null,
        apellido_paterno: personalData.apellido_paterno || null,
        apellido_materno: personalData.apellido_materno || null,
        email: personalData.email || null,
        telefono: personalData.telefono || null,
        fecha_nacimiento: personalData.fecha_nacimiento || null,
        sexo: personalData.sexo || null,
        estado_civil: personalData.estado_civil || null,
        nacionalidad: personalData.nacionalidad || null,
        direccion: personalData.direccion || null,
        comuna: personalData.comuna || null,
        ciudad: personalData.ciudad || null,
        region: personalData.region || null,
      };
    } else if (step === 1) {
      payload = {
        banco: bancarioData.banco || null,
        tipo_cuenta: bancarioData.tipo_cuenta || null,
        numero_cuenta: bancarioData.numero_cuenta || null,
      };
    } else if (step === 2) {
      payload = {
        afp_id: previsionalData.afp_id ? parseInt(previsionalData.afp_id) : null,
        salud_tipo: previsionalData.salud_tipo || null,
        salud_id: previsionalData.salud_id ? parseInt(previsionalData.salud_id) : null,
        plan_salud_uf: previsionalData.plan_salud_uf ? parseFloat(previsionalData.plan_salud_uf) : null,
        cargas_simples: parseInt(previsionalData.cargas_simples || '0'),
        cargas_maternales: parseInt(previsionalData.cargas_maternales || '0'),
        cargas_invalidez: parseInt(previsionalData.cargas_invalidez || '0'),
        es_pensionado: previsionalData.es_pensionado,
      };
    }

    const { error: updateErr } = await supabase
      .from('trabajadores')
      .update(payload)
      .eq('id', profile.trabajador_id);

    setSaving(false);

    if (updateErr) {
      setError(`Error al guardar: ${updateErr.message}`);
      return false;
    }

    return true;
  };

  const handleNext = async () => {
    const ok = await saveStep(currentStep);
    if (!ok) return;

    setCompletedSteps(prev => new Set([...prev, currentStep]));

    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      // Final step — mark onboarding complete
      setSaving(true);
      const { error: profileErr } = await supabase
        .from('user_profiles')
        .update({ onboarding_completado: true })
        .eq('id', profile!.id);

      setSaving(false);

      if (profileErr) {
        setError(`Error al completar registro: ${profileErr.message}`);
        return;
      }

      await refreshProfile();
      router.push('/portal');
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) setCurrentStep(currentStep - 1);
  };

  // ── Loading ──
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-violet-50 to-white flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
      </div>
    );
  }

  // ── No trabajador record ──
  if (noTrabajador) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-violet-50 to-white flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-zinc-800 mb-2">Registro no encontrado</h2>
          <p className="text-zinc-500 text-sm">
            Tu empleador aún no ha creado tu ficha en el sistema. Por favor, contacta a tu empleador para que complete el registro.
          </p>
        </div>
      </div>
    );
  }

  const isLastStep = currentStep === STEPS.length - 1;

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-indigo-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">

        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-violet-600 text-white mb-4 shadow-md">
            <User className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-bold text-zinc-800">Bienvenido/a a Poppins</h1>
          <p className="text-zinc-500 mt-1 text-sm">Completa tus datos para comenzar a usar el portal</p>
        </div>

        {/* Stepper */}
        <Stepper currentStep={currentStep} completedSteps={completedSteps} />

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-zinc-100 p-6 sm:p-8">

          {/* Step title */}
          <h2 className="text-lg font-semibold text-zinc-800 mb-5">
            {currentStep === 0 && 'Tus Datos Personales'}
            {currentStep === 1 && 'Datos Bancarios'}
            {currentStep === 2 && 'Datos Previsionales'}
          </h2>

          {/* Error banner */}
          {error && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl p-3 mb-5 text-sm text-red-600">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Step content */}
          {currentStep === 0 && (
            <StepPersonal data={personalData} setData={setPersonalData} />
          )}
          {currentStep === 1 && (
            <StepBancario data={bancarioData} setData={setBancarioData} />
          )}
          {currentStep === 2 && (
            <StepPrevisional data={previsionalData} setData={setPrevisionalData} />
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between mt-8 pt-5 border-t border-zinc-100">
            <button
              type="button"
              onClick={handlePrev}
              disabled={currentStep === 0 || saving}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-medium text-zinc-600 hover:bg-zinc-100 disabled:opacity-0 disabled:pointer-events-none transition-all"
            >
              <ChevronLeft className="w-4 h-4" />
              Anterior
            </button>

            <span className="text-xs text-zinc-400">
              Paso {currentStep + 1} de {STEPS.length}
            </span>

            <button
              type="button"
              onClick={handleNext}
              disabled={saving}
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-semibold bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-60 transition-all shadow-sm"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Guardando...
                </>
              ) : isLastStep ? (
                <>
                  <Check className="w-4 h-4" />
                  Completar Registro
                </>
              ) : (
                <>
                  Siguiente
                  <ChevronRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>

        {/* Footer note */}
        <p className="text-center text-xs text-zinc-400 mt-6">
          Puedes actualizar esta información más adelante desde tu perfil.
        </p>
      </div>
    </div>
  );
}
