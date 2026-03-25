'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Check, ChevronRight, ChevronLeft, User, Home, CreditCard,
  Users, Building2, Plus, Trash2, Loader2, AlertCircle, SkipForward,
} from 'lucide-react';
import { useAuth } from '@/lib/auth/context';
import { createClient } from '@/lib/supabase/client';
import CardSetup from '../pagos/components/CardSetup';
import AccountDiscovery from '../pagos/components/AccountDiscovery';

// ─── Types ────────────────────────────────────────────────────────────────────

interface DatosPersonales {
  nombre: string;
  apellido: string;
  rut: string;
  email: string;
  telefono: string;
  fecha_nacimiento: string;
  direccion: string;
  comuna: string;
  ciudad: string;
}

interface DatosVivienda {
  tipo: 'casa' | 'departamento' | 'parcela' | '';
  direccion: string;
  comuna: string;
  metros_construidos: string;
  pisos: string;
  dormitorios: string;
  banos: string;
  tiene_piscina: boolean;
  tiene_jardin: boolean;
  estacionamientos: string;
}

type Cargo =
  | 'asesora_hogar'
  | 'jardinero'
  | 'piscinero'
  | 'nana'
  | 'cocinera'
  | 'chofer'
  | 'otro';

interface Trabajador {
  nombre: string;
  apellido_paterno: string;
  rut: string;
  cargo: Cargo | '';
  sueldo_base: string;
  tipo_jornada: 'completa' | 'parcial' | 'art22' | '';
}

const CARGO_LABELS: Record<Cargo, string> = {
  asesora_hogar: 'Asesora del Hogar',
  jardinero: 'Jardinero',
  piscinero: 'Piscinero',
  nana: 'Nana',
  cocinera: 'Cocinera',
  chofer: 'Chofer',
  otro: 'Otro',
};

const STEPS = [
  { label: 'Tus Datos', icon: User },
  { label: 'Tu Vivienda', icon: Home },
  { label: 'Tu Tarjeta', icon: CreditCard },
  { label: 'Trabajadores', icon: Users },
  { label: 'Cuentas', icon: Building2 },
];

// ─── Stepper ──────────────────────────────────────────────────────────────────

function Stepper({ currentStep, completedSteps }: { currentStep: number; completedSteps: Set<number> }) {
  return (
    <div className="flex items-center justify-between w-full max-w-2xl mx-auto mb-8 px-2">
      {STEPS.map((step, idx) => {
        const isCompleted = completedSteps.has(idx);
        const isCurrent = idx === currentStep;
        const StepIcon = step.icon;
        return (
          <div key={idx} className="flex items-center flex-1">
            <div className="flex flex-col items-center gap-1">
              <div
                className={`
                  w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold transition-all
                  ${isCompleted ? 'bg-green-500 text-white' : isCurrent ? 'bg-violet-600 text-white ring-4 ring-violet-100' : 'bg-zinc-100 text-zinc-400'}
                `}
              >
                {isCompleted ? <Check className="w-4 h-4" /> : <StepIcon className="w-4 h-4" />}
              </div>
              <span className={`text-xs font-medium hidden sm:block ${isCurrent ? 'text-violet-600' : isCompleted ? 'text-green-600' : 'text-zinc-400'}`}>
                {step.label}
              </span>
            </div>
            {idx < STEPS.length - 1 && (
              <div className={`flex-1 h-0.5 mx-1 mb-4 transition-all ${isCompleted ? 'bg-green-400' : 'bg-zinc-200'}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Step 1: Datos Personales ─────────────────────────────────────────────────

function StepDatosPersonales({
  data,
  onChange,
  onNext,
  loading,
  error,
}: {
  data: DatosPersonales;
  onChange: (d: DatosPersonales) => void;
  onNext: () => void;
  loading: boolean;
  error: string | null;
}) {
  const f = (field: keyof DatosPersonales) => (e: React.ChangeEvent<HTMLInputElement>) =>
    onChange({ ...data, [field]: e.target.value });

  const fields: { label: string; key: keyof DatosPersonales; type?: string; required?: boolean }[] = [
    { label: 'Nombre', key: 'nombre', required: true },
    { label: 'Apellido', key: 'apellido', required: true },
    { label: 'RUT (ej: 12345678-9)', key: 'rut', required: true },
    { label: 'Email', key: 'email', type: 'email', required: true },
    { label: 'Teléfono', key: 'telefono', type: 'tel' },
    { label: 'Fecha de Nacimiento', key: 'fecha_nacimiento', type: 'date' },
    { label: 'Dirección', key: 'direccion' },
    { label: 'Comuna', key: 'comuna' },
    { label: 'Ciudad', key: 'ciudad' },
  ];

  return (
    <div>
      <h2 className="text-xl font-bold text-zinc-900 mb-1">Datos Personales</h2>
      <p className="text-sm text-zinc-500 mb-6">Cuéntanos un poco sobre ti para personalizar tu cuenta.</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {fields.map(({ label, key, type = 'text', required }) => (
          <div key={key} className={key === 'direccion' ? 'sm:col-span-2' : ''}>
            <label className="block text-xs font-medium text-zinc-600 mb-1">
              {label}{required && <span className="text-red-400 ml-0.5">*</span>}
            </label>
            <input
              type={type}
              value={data[key]}
              onChange={f(key)}
              className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
            />
          </div>
        ))}
      </div>
      {error && (
        <div className="mt-4 flex items-center gap-2 text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          <AlertCircle className="w-4 h-4 shrink-0" /> {error}
        </div>
      )}
      <div className="mt-6 flex justify-end">
        <button
          onClick={onNext}
          disabled={loading}
          className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition disabled:opacity-60"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          Siguiente <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// ─── Step 2: Tu Vivienda ──────────────────────────────────────────────────────

function StepVivienda({
  data,
  onChange,
  onNext,
  onBack,
  loading,
  error,
}: {
  data: DatosVivienda;
  onChange: (d: DatosVivienda) => void;
  onNext: () => void;
  onBack: () => void;
  loading: boolean;
  error: string | null;
}) {
  const f = (field: keyof DatosVivienda) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    onChange({ ...data, [field]: e.target.value });

  const toggle = (field: 'tiene_piscina' | 'tiene_jardin') =>
    onChange({ ...data, [field]: !data[field] });

  return (
    <div>
      <h2 className="text-xl font-bold text-zinc-900 mb-1">Tu Vivienda</h2>
      <p className="text-sm text-zinc-500 mb-6">Datos de tu hogar para ayudarte a gestionar los servicios.</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Tipo */}
        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-zinc-600 mb-1">Tipo de vivienda<span className="text-red-400 ml-0.5">*</span></label>
          <div className="flex gap-3 flex-wrap">
            {(['casa', 'departamento', 'parcela'] as const).map((tipo) => (
              <button
                key={tipo}
                type="button"
                onClick={() => onChange({ ...data, tipo })}
                className={`px-4 py-2 rounded-lg border text-sm font-medium transition capitalize ${data.tipo === tipo ? 'border-violet-500 bg-violet-50 text-violet-700' : 'border-zinc-200 text-zinc-600 hover:border-zinc-300'}`}
              >
                {tipo === 'departamento' ? 'Departamento' : tipo.charAt(0).toUpperCase() + tipo.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Dirección */}
        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-zinc-600 mb-1">Dirección</label>
          <input
            type="text"
            value={data.direccion}
            onChange={f('direccion')}
            className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-zinc-600 mb-1">Comuna</label>
          <input type="text" value={data.comuna} onChange={f('comuna')} className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" />
        </div>

        <div>
          <label className="block text-xs font-medium text-zinc-600 mb-1">Metros Construidos</label>
          <input type="number" value={data.metros_construidos} onChange={f('metros_construidos')} className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" />
        </div>

        <div>
          <label className="block text-xs font-medium text-zinc-600 mb-1">Pisos</label>
          <input type="number" value={data.pisos} onChange={f('pisos')} min={1} className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" />
        </div>

        <div>
          <label className="block text-xs font-medium text-zinc-600 mb-1">Dormitorios</label>
          <input type="number" value={data.dormitorios} onChange={f('dormitorios')} min={1} className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" />
        </div>

        <div>
          <label className="block text-xs font-medium text-zinc-600 mb-1">Baños</label>
          <input type="number" value={data.banos} onChange={f('banos')} min={1} className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" />
        </div>

        <div>
          <label className="block text-xs font-medium text-zinc-600 mb-1">Estacionamientos</label>
          <input type="number" value={data.estacionamientos} onChange={f('estacionamientos')} min={0} className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" />
        </div>

        {/* Checkboxes */}
        <div className="sm:col-span-2 flex gap-4 flex-wrap">
          {(['tiene_piscina', 'tiene_jardin'] as const).map((field) => (
            <label key={field} className="flex items-center gap-2 cursor-pointer select-none">
              <div
                onClick={() => toggle(field)}
                className={`w-5 h-5 rounded border-2 flex items-center justify-center transition ${data[field] ? 'bg-violet-600 border-violet-600' : 'border-zinc-300'}`}
              >
                {data[field] && <Check className="w-3 h-3 text-white" />}
              </div>
              <span className="text-sm text-zinc-700">{field === 'tiene_piscina' ? 'Tiene piscina' : 'Tiene jardín'}</span>
            </label>
          ))}
        </div>
      </div>

      {error && (
        <div className="mt-4 flex items-center gap-2 text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          <AlertCircle className="w-4 h-4 shrink-0" /> {error}
        </div>
      )}

      <div className="mt-6 flex justify-between">
        <button onClick={onBack} className="flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-800 px-4 py-2 rounded-lg border border-zinc-200 hover:border-zinc-300 transition">
          <ChevronLeft className="w-4 h-4" /> Anterior
        </button>
        <button
          onClick={onNext}
          disabled={loading}
          className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition disabled:opacity-60"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          Siguiente <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// ─── Step 3: Tu Tarjeta ───────────────────────────────────────────────────────

function StepTarjeta({
  empleadorId,
  onNext,
  onBack,
}: {
  empleadorId: string | null;
  onNext: () => void;
  onBack: () => void;
}) {
  const [showCardSetup, setShowCardSetup] = useState(false);
  const [cardSaved, setCardSaved] = useState(false);
  const supabase = createClient();

  const handleSaveCard = async (card: { bin: string; ultimos4: string; detected: { banco?: string; tipo?: string } }) => {
    if (!empleadorId) return;
    await supabase.from('tarjetas_cliente').insert({
      empleador_id: empleadorId,
      bin: card.bin,
      ultimos4: card.ultimos4,
      banco: card.detected?.banco ?? null,
      tipo: card.detected?.tipo ?? null,
    });
    setCardSaved(true);
    setShowCardSetup(false);
    setTimeout(() => onNext(), 800);
  };

  if (showCardSetup) {
    return (
      <div>
        <CardSetup
          onSave={handleSaveCard}
          onClose={() => setShowCardSetup(false)}
        />
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-xl font-bold text-zinc-900 mb-1">Tu Tarjeta de Pago</h2>
      <p className="text-sm text-zinc-500 mb-6">
        Registra tu tarjeta para pagar cotizaciones, remuneraciones y servicios del hogar directamente desde Poppins.
      </p>

      {cardSaved ? (
        <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-xl p-4 text-green-700">
          <Check className="w-5 h-5 shrink-0" />
          <span className="font-medium">Tarjeta registrada correctamente.</span>
        </div>
      ) : (
        <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-6 flex flex-col items-center text-center gap-4">
          <div className="w-14 h-14 bg-violet-100 rounded-full flex items-center justify-center">
            <CreditCard className="w-7 h-7 text-violet-600" />
          </div>
          <div>
            <p className="font-semibold text-zinc-800">Añade tu tarjeta</p>
            <p className="text-sm text-zinc-500 mt-1">Solo guardamos los primeros 6 y últimos 4 dígitos para identificar tu tarjeta.</p>
          </div>
          <button
            onClick={() => setShowCardSetup(true)}
            className="bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold px-6 py-2.5 rounded-lg transition"
          >
            Registrar Tarjeta
          </button>
        </div>
      )}

      <div className="mt-6 flex justify-between">
        <button onClick={onBack} className="flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-800 px-4 py-2 rounded-lg border border-zinc-200 hover:border-zinc-300 transition">
          <ChevronLeft className="w-4 h-4" /> Anterior
        </button>
        <div className="flex items-center gap-3">
          <button onClick={onNext} className="flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-700 transition">
            <SkipForward className="w-4 h-4" /> Omitir por ahora
          </button>
          {cardSaved && (
            <button onClick={onNext} className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition">
              Siguiente <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Step 4: Tus Trabajadores ─────────────────────────────────────────────────

const EMPTY_WORKER: Trabajador = {
  nombre: '',
  apellido_paterno: '',
  rut: '',
  cargo: '',
  sueldo_base: '',
  tipo_jornada: '',
};

function StepTrabajadores({
  empleadorId,
  onNext,
  onBack,
  savedWorkers,
  onWorkersSaved,
  loading,
  error,
}: {
  empleadorId: string | null;
  onNext: () => void;
  onBack: () => void;
  savedWorkers: Trabajador[];
  onWorkersSaved: (w: Trabajador[]) => void;
  loading: boolean;
  error: string | null;
}) {
  const [workers, setWorkers] = useState<Trabajador[]>(savedWorkers.length > 0 ? savedWorkers : [{ ...EMPTY_WORKER }]);
  const [localError, setLocalError] = useState<string | null>(null);

  const updateWorker = (idx: number, field: keyof Trabajador, value: string) => {
    setWorkers(prev => prev.map((w, i) => i === idx ? { ...w, [field]: value } : w));
  };

  const addWorker = () => setWorkers(prev => [...prev, { ...EMPTY_WORKER }]);
  const removeWorker = (idx: number) => setWorkers(prev => prev.filter((_, i) => i !== idx));

  const handleNext = () => {
    for (const w of workers) {
      if (!w.nombre || !w.apellido_paterno || !w.rut || !w.cargo || !w.sueldo_base || !w.tipo_jornada) {
        setLocalError('Completa todos los campos requeridos para cada trabajador.');
        return;
      }
    }
    setLocalError(null);
    onWorkersSaved(workers);
    onNext();
  };

  return (
    <div>
      <h2 className="text-xl font-bold text-zinc-900 mb-1">Tus Trabajadores</h2>
      <p className="text-sm text-zinc-500 mb-6">Agrega al menos un trabajador para comenzar a gestionar sus contratos y pagos.</p>

      <div className="space-y-5">
        {workers.map((w, idx) => (
          <div key={idx} className="border border-zinc-200 rounded-xl p-4 bg-zinc-50 relative">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">Trabajador {idx + 1}</span>
              {workers.length > 1 && (
                <button onClick={() => removeWorker(idx)} className="text-zinc-400 hover:text-red-500 transition">
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Nombre */}
              <div>
                <label className="block text-xs font-medium text-zinc-600 mb-1">Nombre <span className="text-red-400">*</span></label>
                <input
                  type="text"
                  value={w.nombre}
                  onChange={e => updateWorker(idx, 'nombre', e.target.value)}
                  className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 bg-white"
                />
              </div>
              {/* Apellido */}
              <div>
                <label className="block text-xs font-medium text-zinc-600 mb-1">Apellido Paterno <span className="text-red-400">*</span></label>
                <input
                  type="text"
                  value={w.apellido_paterno}
                  onChange={e => updateWorker(idx, 'apellido_paterno', e.target.value)}
                  className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 bg-white"
                />
              </div>
              {/* RUT */}
              <div>
                <label className="block text-xs font-medium text-zinc-600 mb-1">RUT <span className="text-red-400">*</span></label>
                <input
                  type="text"
                  value={w.rut}
                  onChange={e => updateWorker(idx, 'rut', e.target.value)}
                  placeholder="12345678-9"
                  className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 bg-white"
                />
              </div>
              {/* Cargo */}
              <div>
                <label className="block text-xs font-medium text-zinc-600 mb-1">Cargo <span className="text-red-400">*</span></label>
                <select
                  value={w.cargo}
                  onChange={e => updateWorker(idx, 'cargo', e.target.value)}
                  className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 bg-white"
                >
                  <option value="">Seleccionar...</option>
                  {(Object.entries(CARGO_LABELS) as [Cargo, string][]).map(([val, label]) => (
                    <option key={val} value={val}>{label}</option>
                  ))}
                </select>
              </div>
              {/* Sueldo */}
              <div>
                <label className="block text-xs font-medium text-zinc-600 mb-1">Sueldo Base (CLP) <span className="text-red-400">*</span></label>
                <input
                  type="number"
                  value={w.sueldo_base}
                  onChange={e => updateWorker(idx, 'sueldo_base', e.target.value)}
                  min={0}
                  className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 bg-white"
                />
              </div>
              {/* Jornada */}
              <div>
                <label className="block text-xs font-medium text-zinc-600 mb-1">Tipo Jornada <span className="text-red-400">*</span></label>
                <select
                  value={w.tipo_jornada}
                  onChange={e => updateWorker(idx, 'tipo_jornada', e.target.value)}
                  className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 bg-white"
                >
                  <option value="">Seleccionar...</option>
                  <option value="completa">Jornada Completa (45 hrs)</option>
                  <option value="parcial">Jornada Parcial</option>
                  <option value="art22">Art. 22 (Sin horario fijo)</option>
                </select>
              </div>
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={addWorker}
        className="mt-4 flex items-center gap-2 text-sm text-violet-600 hover:text-violet-800 font-medium transition"
      >
        <Plus className="w-4 h-4" /> Agregar otro trabajador
      </button>

      {(localError || error) && (
        <div className="mt-4 flex items-center gap-2 text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          <AlertCircle className="w-4 h-4 shrink-0" /> {localError || error}
        </div>
      )}

      <div className="mt-6 flex justify-between">
        <button onClick={onBack} className="flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-800 px-4 py-2 rounded-lg border border-zinc-200 hover:border-zinc-300 transition">
          <ChevronLeft className="w-4 h-4" /> Anterior
        </button>
        <button
          onClick={handleNext}
          disabled={loading}
          className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition disabled:opacity-60"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          Siguiente <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// ─── Step 5: Cuentas de Pago ──────────────────────────────────────────────────

function StepCuentas({
  empleadorId,
  viviendaDireccion,
  rut,
  onFinish,
  onBack,
  loading,
}: {
  empleadorId: string | null;
  viviendaDireccion: string;
  rut: string;
  onFinish: () => void;
  onBack: () => void;
  loading: boolean;
}) {
  const [showDiscovery, setShowDiscovery] = useState(false);
  const supabase = createClient();

  const handleAddAccount = async (account: {
    tipo: string;
    proveedor: string;
    numero_cuenta: string;
    monto_fijo: number | null;
    fuente: 'api' | 'manual';
  }) => {
    if (!empleadorId) return;
    await supabase.from('cuentas_pago').insert({
      empleador_id: empleadorId,
      tipo: account.tipo,
      proveedor: account.proveedor,
      numero_cuenta: account.numero_cuenta,
      monto_fijo: account.monto_fijo,
      fuente: account.fuente,
    });
  };

  if (showDiscovery) {
    return (
      <div>
        <AccountDiscovery
          direccion={viviendaDireccion || null}
          rut={rut || null}
          onAddAccount={handleAddAccount}
          onClose={() => setShowDiscovery(false)}
          existingTypes={[]}
        />
        <div className="mt-4 flex justify-end">
          <button
            onClick={onFinish}
            disabled={loading}
            className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition disabled:opacity-60"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            Comenzar a usar Poppins <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-xl font-bold text-zinc-900 mb-1">Cuentas de Pago</h2>
      <p className="text-sm text-zinc-500 mb-6">
        Configura tus cuentas de servicios del hogar (agua, luz, gas, etc.) para pagarlas directamente desde Poppins. También puedes hacerlo más adelante.
      </p>

      <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-6 flex flex-col items-center text-center gap-4">
        <div className="w-14 h-14 bg-violet-100 rounded-full flex items-center justify-center">
          <Building2 className="w-7 h-7 text-violet-600" />
        </div>
        <div>
          <p className="font-semibold text-zinc-800">Descubre tus cuentas</p>
          <p className="text-sm text-zinc-500 mt-1">
            Podemos encontrar automáticamente tus cuentas de servicios según tu dirección o RUT.
          </p>
        </div>
        <button
          onClick={() => setShowDiscovery(true)}
          className="bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold px-6 py-2.5 rounded-lg transition"
        >
          Configurar Cuentas
        </button>
      </div>

      <div className="mt-6 flex justify-between">
        <button onClick={onBack} className="flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-800 px-4 py-2 rounded-lg border border-zinc-200 hover:border-zinc-300 transition">
          <ChevronLeft className="w-4 h-4" /> Anterior
        </button>
        <div className="flex items-center gap-3">
          <button onClick={onFinish} className="flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-700 transition">
            <SkipForward className="w-4 h-4" /> Configurar después
          </button>
          <button
            onClick={onFinish}
            disabled={loading}
            className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition disabled:opacity-60"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            Comenzar a usar Poppins <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Wizard ───────────────────────────────────────────────────────────────

export default function OnboardingPage() {
  const { user, profile, refreshProfile } = useAuth();
  const router = useRouter();
  const supabase = createClient();

  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [empleadorId, setEmpleadorId] = useState<string | null>(null);

  // Step data
  const [datosPersonales, setDatosPersonales] = useState<DatosPersonales>({
    nombre: '',
    apellido: '',
    rut: '',
    email: '',
    telefono: '',
    fecha_nacimiento: '',
    direccion: '',
    comuna: '',
    ciudad: '',
  });

  const [datosVivienda, setDatosVivienda] = useState<DatosVivienda>({
    tipo: '',
    direccion: '',
    comuna: '',
    metros_construidos: '',
    pisos: '',
    dormitorios: '',
    banos: '',
    tiene_piscina: false,
    tiene_jardin: false,
    estacionamientos: '',
  });

  const [savedWorkers, setSavedWorkers] = useState<Trabajador[]>([]);

  // Pre-fill from profile
  useEffect(() => {
    if (profile) {
      setDatosPersonales(prev => ({
        ...prev,
        nombre: profile.nombre || '',
        apellido: profile.apellido || '',
        email: profile.email || '',
      }));
      if (profile.empleador_id) {
        setEmpleadorId(profile.empleador_id);
      }
    }
  }, [profile]);

  // Redirect if already onboarded
  useEffect(() => {
    if (profile && profile.onboarding_completado) {
      router.push('/empresa');
    }
  }, [profile, router]);

  const markComplete = useCallback((step: number) => {
    setCompletedSteps(prev => new Set([...prev, step]));
  }, []);

  // ── Step 1 handler ────────────────────────────────────────────────────────

  const handleStep1Next = async () => {
    if (!datosPersonales.nombre || !datosPersonales.apellido || !datosPersonales.rut || !datosPersonales.email) {
      setError('Por favor completa los campos obligatorios (nombre, apellido, RUT y email).');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const authUserId = user?.id;
      if (!authUserId) throw new Error('No hay sesión activa.');

      // Upsert empleador
      const { data: emp, error: empErr } = await supabase
        .from('empleadores')
        .upsert(
          {
            auth_user_id: authUserId,
            nombre: datosPersonales.nombre,
            apellido: datosPersonales.apellido,
            rut: datosPersonales.rut,
            email: datosPersonales.email,
            telefono: datosPersonales.telefono || null,
            fecha_nacimiento: datosPersonales.fecha_nacimiento || null,
            direccion: datosPersonales.direccion || null,
            comuna: datosPersonales.comuna || null,
            ciudad: datosPersonales.ciudad || null,
          },
          { onConflict: 'auth_user_id' }
        )
        .select('id')
        .single();

      if (empErr) throw empErr;

      const newEmpleadorId = emp.id;
      setEmpleadorId(newEmpleadorId);

      // Update user_profiles.empleador_id if needed
      if (!profile?.empleador_id) {
        await supabase
          .from('user_profiles')
          .update({ empleador_id: newEmpleadorId })
          .eq('auth_user_id', authUserId);
        await refreshProfile();
      }

      markComplete(0);
      setCurrentStep(1);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al guardar los datos.');
    } finally {
      setLoading(false);
    }
  };

  // ── Step 2 handler ────────────────────────────────────────────────────────

  const handleStep2Next = async () => {
    if (!datosVivienda.tipo) {
      setError('Por favor selecciona el tipo de vivienda.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      if (!empleadorId) throw new Error('No se encontró el ID del empleador.');

      const { error: vivErr } = await supabase.from('viviendas_empleador').insert({
        empleador_id: empleadorId,
        tipo: datosVivienda.tipo,
        direccion: datosVivienda.direccion || null,
        comuna: datosVivienda.comuna || null,
        metros_construidos: datosVivienda.metros_construidos ? Number(datosVivienda.metros_construidos) : null,
        pisos: datosVivienda.pisos ? Number(datosVivienda.pisos) : null,
        dormitorios: datosVivienda.dormitorios ? Number(datosVivienda.dormitorios) : null,
        banos: datosVivienda.banos ? Number(datosVivienda.banos) : null,
        tiene_piscina: datosVivienda.tiene_piscina,
        tiene_jardin: datosVivienda.tiene_jardin,
        estacionamientos: datosVivienda.estacionamientos ? Number(datosVivienda.estacionamientos) : null,
      });

      if (vivErr) throw vivErr;

      markComplete(1);
      setCurrentStep(2);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al guardar los datos de vivienda.');
    } finally {
      setLoading(false);
    }
  };

  // ── Step 3 handler ────────────────────────────────────────────────────────

  const handleStep3Next = () => {
    markComplete(2);
    setCurrentStep(3);
  };

  // ── Step 4 handler ────────────────────────────────────────────────────────

  const handleStep4Next = async () => {
    setError(null);
    setLoading(true);
    try {
      if (!empleadorId) throw new Error('No se encontró el ID del empleador.');

      for (const w of savedWorkers) {
        // Create trabajador
        const { data: trab, error: trabErr } = await supabase
          .from('trabajadores')
          .insert({
            empleador_id: empleadorId,
            nombre: w.nombre,
            apellido_paterno: w.apellido_paterno,
            rut: w.rut,
            cargo: w.cargo,
            tipo_jornada: w.tipo_jornada,
          })
          .select('id')
          .single();

        if (trabErr) throw trabErr;

        // Create contrato
        await supabase.from('contratos').insert({
          trabajador_id: trab.id,
          empleador_id: empleadorId,
          sueldo_base: Number(w.sueldo_base),
          tipo_jornada: w.tipo_jornada,
          fecha_inicio: new Date().toISOString().split('T')[0],
          estado: 'activo',
        });
      }

      markComplete(3);
      setCurrentStep(4);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al guardar los trabajadores.');
    } finally {
      setLoading(false);
    }
  };

  // ── Finish handler ────────────────────────────────────────────────────────

  const handleFinish = async () => {
    setError(null);
    setLoading(true);
    try {
      if (!user?.id) throw new Error('No hay sesión activa.');

      await supabase
        .from('user_profiles')
        .update({ onboarding_completado: true })
        .eq('auth_user_id', user.id);

      await refreshProfile();
      markComplete(4);
      router.push('/empresa');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al finalizar el onboarding.');
      setLoading(false);
    }
  };

  const handleBack = () => {
    setError(null);
    setCurrentStep(prev => Math.max(0, prev - 1));
  };

  return (
    <div className="min-h-screen bg-zinc-50 flex items-start justify-center pt-8 pb-16 px-4">
      <div className="w-full max-w-2xl">
        {/* Logo / Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-violet-700 tracking-tight">Poppins</h1>
          <p className="text-zinc-500 text-sm mt-1">Configura tu cuenta en unos minutos</p>
        </div>

        {/* Stepper */}
        <Stepper currentStep={currentStep} completedSteps={completedSteps} />

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-zinc-200 p-6 sm:p-8">
          {currentStep === 0 && (
            <StepDatosPersonales
              data={datosPersonales}
              onChange={setDatosPersonales}
              onNext={handleStep1Next}
              loading={loading}
              error={error}
            />
          )}
          {currentStep === 1 && (
            <StepVivienda
              data={datosVivienda}
              onChange={setDatosVivienda}
              onNext={handleStep2Next}
              onBack={handleBack}
              loading={loading}
              error={error}
            />
          )}
          {currentStep === 2 && (
            <StepTarjeta
              empleadorId={empleadorId}
              onNext={handleStep3Next}
              onBack={handleBack}
            />
          )}
          {currentStep === 3 && (
            <StepTrabajadores
              empleadorId={empleadorId}
              onNext={handleStep4Next}
              onBack={handleBack}
              savedWorkers={savedWorkers}
              onWorkersSaved={setSavedWorkers}
              loading={loading}
              error={error}
            />
          )}
          {currentStep === 4 && (
            <StepCuentas
              empleadorId={empleadorId}
              viviendaDireccion={datosVivienda.direccion}
              rut={datosPersonales.rut}
              onFinish={handleFinish}
              onBack={handleBack}
              loading={loading}
            />
          )}
        </div>

        {/* Progress indicator */}
        <p className="text-center text-xs text-zinc-400 mt-4">
          Paso {currentStep + 1} de {STEPS.length}
        </p>
      </div>
    </div>
  );
}
