'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth/context';
import { validateRut, isValidEmail, isValidChileanMobile } from '@/lib/validators';
import AddressAutocomplete from '@/components/AddressAutocomplete';
import { AvatarPicker } from '@/components/Avatar';
import {
  Pencil,
  Heart,
  Mail,
  Phone,
  MapPin,
  Calendar,
  CreditCard,
  Dog,
  Cat,
  X,
  Plus,
  ChevronUp,
  ChevronDown,
  Loader2,
  AlertCircle,
  Save,
  Trash2,
  Camera,
  Shield,
} from 'lucide-react';

const tabs = ['Preferencias'] as const;
type Tab = (typeof tabs)[number];

interface Empleador {
  id: string;
  cliente_id: string;
  nombre: string;
  apellido: string;
  rut: string;
  email: string;
  telefono: string;
  fecha_nacimiento: string;
  direccion: string;
  comuna: string;
  ciudad: string;
  plan: string;
  plan_tipo: string;
  max_cuentas: number;
  foto_url: string | null;
}

interface RegionData { region: string; ciudad: string; comuna: string; }

interface Familiar {
  id: string;
  empleador_id: string;
  tipo: string;
  nombre: string;
  apellido: string;
  fecha_nacimiento: string;
  alergias: string;
  condiciones_medicas: string;
  telefono: string;
  email: string;
  es_cuenta_activa: boolean;
  notas: string;
}

interface Mascota {
  id: string;
  empleador_id: string;
  nombre: string;
  tipo: string;
  raza: string;
  edad: number;
  instrucciones_cuidado: string;
  veterinario_nombre: string;
  veterinario_telefono: string;
}

interface Preferencia {
  id: string;
  empleador_id: string;
  prioridades: { titulo: string }[];
  notas_generales: string;
}

function calcularEdad(fechaNacimiento: string): number {
  const hoy = new Date();
  const nacimiento = new Date(fechaNacimiento);
  let edad = hoy.getFullYear() - nacimiento.getFullYear();
  const m = hoy.getMonth() - nacimiento.getMonth();
  if (m < 0 || (m === 0 && hoy.getDate() < nacimiento.getDate())) {
    edad--;
  }
  return edad;
}

function formatFecha(fecha: string): string {
  const d = new Date(fecha);
  const meses = [
    'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
  ];
  return `${d.getDate()} ${meses[d.getMonth()]} ${d.getFullYear()}`;
}

// --- Modal wrapper ---
function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-zinc-900">{title}</h2>
          <button onClick={onClose} className="rounded-full p-1 hover:bg-zinc-100">
            <X className="h-5 w-5 text-zinc-500" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

// --- Form field helper ---
function FormField({
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-zinc-500">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400"
      />
    </div>
  );
}

export default function PerfilEmpleadorPage() {
  const { profile, loading: authLoading } = useAuth();
  const empleadorId = profile?.empleador_id || '';
  const [activeTab, setActiveTab] = useState<Tab>('Preferencias');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [apodo, setApodo] = useState('');
  const [apodoEditing, setApodoEditing] = useState(false);
  const [apodoSaving, setApodoSaving] = useState(false);

  const [empleador, setEmpleador] = useState<Empleador | null>(null);
  const [conyuge, setConyuge] = useState<Familiar | null>(null);
  const [hijos, setHijos] = useState<Familiar[]>([]);
  const [mascotas, setMascotas] = useState<Mascota[]>([]);
  const [preferencias, setPreferencias] = useState<Preferencia | null>(null);
  const [cuentasActivas, setCuentasActivas] = useState(0);

  // Modals
  const [editPerfilOpen, setEditPerfilOpen] = useState(false);

  const fetchData = useCallback(async () => {
    if (!empleadorId) return;
    setLoading(true);
    setError(null);
    try {
      const supabase = createClient();
      const empRes = await supabase.from('empleadores').select('*').eq('id', empleadorId).maybeSingle();
      if (empRes.error || !empRes.data) throw new Error(empRes.error?.message || 'Perfil no encontrado');
      setEmpleador(empRes.data);

      const [famRes, mascRes, prefRes, cuentasRes] = await Promise.all([
        supabase.from('familiares_empleador').select('*').eq('empleador_id', empleadorId),
        supabase.from('mascotas_empleador').select('*').eq('empleador_id', empleadorId),
        supabase.from('preferencias_trabajo').select('*').eq('empleador_id', empleadorId).maybeSingle(),
        supabase.from('cuentas_pago').select('*').eq('empleador_id', empleadorId).eq('activa', true),
      ]);

      const familiares = (famRes.data || []) as Familiar[];
      setConyuge(familiares.find((f) => f.tipo === 'conyuge') || null);
      setHijos(familiares.filter((f) => f.tipo === 'hijo' || f.tipo === 'otro'));
      setMascotas((mascRes.data || []) as Mascota[]);
      setPreferencias((prefRes.data as Preferencia) || null);
      setCuentasActivas(cuentasRes.data?.length ?? 0);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  }, [empleadorId]);

  useEffect(() => {
    if (authLoading) return;
    if (!empleadorId) { setLoading(false); setError('No se encontró tu perfil de empleador'); return; }
    fetchData();
    // Cargar apodo desde user_empleadores
    const supabase = createClient();
    supabase
      .from('user_empleadores')
      .select('apodo')
      .eq('auth_user_id', (profile as { auth_user_id?: string }).auth_user_id ?? '')
      .eq('empleador_id', empleadorId)
      .maybeSingle()
      .then(({ data }: { data: { apodo: string | null } | null }) => {
        if (data?.apodo) setApodo(data.apodo);
      });
  }, [fetchData, authLoading, empleadorId, profile]);

  const saveApodo = async () => {
    setApodoSaving(true);
    try {
      await fetch('/api/hogar/miembros', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ auth_user_id: (profile as { auth_user_id?: string }).auth_user_id, apodo }),
      });
      setApodoEditing(false);
    } finally {
      setApodoSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <p className="text-sm text-zinc-500">Cargando perfil...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50">
        <div className="flex flex-col items-center gap-3 text-center">
          <AlertCircle className="h-8 w-8 text-red-500" />
          <p className="text-sm text-red-600">{error}</p>
          <button
            onClick={fetchData}
            className="mt-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  if (!empleador) {
    return loading ? null : (
      <div className="flex min-h-[50vh] items-center justify-center">
        <p className="text-sm text-zinc-500">No se pudo cargar el perfil. <button onClick={fetchData} className="text-violet-600 underline">Reintentar</button></p>
      </div>
    );
  }

  const initials = `${(empleador.nombre || '').charAt(0)}${(empleador.apellido || '').charAt(0)}`.toUpperCase();

  return (
    <div className="min-h-screen bg-zinc-50 p-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Mi Perfil</h1>
          <p className="text-sm text-zinc-500">Datos personales y familiares</p>
        </div>
        <button
          onClick={() => setEditPerfilOpen(true)}
          className="flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
        >
          <Pencil className="h-4 w-4" />
          Editar Perfil
        </button>
      </div>

      {/* Edit Profile Modal */}
      <EditPerfilModal
        open={editPerfilOpen}
        onClose={() => setEditPerfilOpen(false)}
        empleador={empleador}
        onSaved={fetchData}
      />

      {/* Layout */}
      <div className="flex flex-col gap-6 lg:flex-row">
        {/* Left Panel */}
        <div className="w-full lg:w-80 shrink-0">
          <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-6 pt-8 pb-6 flex flex-col items-center text-center">
              <div className="relative group">
                {empleador?.foto_url ? (
                  <img src={empleador.foto_url} alt="Foto" className="h-20 w-20 rounded-full object-cover border-2 border-white shadow" />
                ) : (
                  <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-blue-700 text-2xl font-bold text-white">
                    {initials}
                  </div>
                )}
                <label className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 group-hover:opacity-100 cursor-pointer transition">
                  <Pencil className="h-5 w-5 text-white" />
                  <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const supabase = createClient();
                    const ext = file.name.split('.').pop();
                    const path = `${empleador.id}/avatar.${ext}`;
                    await supabase.storage.from('avatars').upload(path, file, { upsert: true });
                    const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path);
                    const foto_url = urlData.publicUrl + '?t=' + Date.now();
                    await supabase.from('empleadores').update({ foto_url }).eq('id', empleador.id);
                    fetchData();
                  }} />
                </label>
              </div>
              <div className="mt-3 w-full max-w-[220px]">
                <p className="text-[11px] text-zinc-400 mb-1 text-center">o elegí un avatar Poppins</p>
                <div className="flex justify-center">
                  <AvatarPicker roles={['mama', 'papa']} familyId={empleador.id} memberId={empleador.id} value={empleador.foto_url}
                    size={40}
                    onChange={async (url) => { const supabase = createClient(); await supabase.from('empleadores').update({ foto_url: url }).eq('id', empleador.id); fetchData(); }} />
                </div>
              </div>
              <h2 className="text-base font-bold text-zinc-900 mt-3">
                {empleador.apellido && !(empleador.nombre || '').includes(empleador.apellido)
                  ? `${empleador.nombre} ${empleador.apellido}`
                  : empleador.nombre}
              </h2>
              <p className="text-sm text-zinc-500">Empleador</p>
              <span className="mt-2 rounded-full bg-blue-100 px-3 py-0.5 text-xs font-semibold text-blue-700">
                Plan {empleador.plan_tipo || empleador.plan || 'starter'}
              </span>

              {/* Apodo en el hogar */}
              <div className="mt-4 w-full">
                {apodoEditing ? (
                  <div className="flex items-center gap-1.5">
                    <input
                      autoFocus
                      type="text"
                      value={apodo}
                      onChange={(e) => setApodo(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') saveApodo(); if (e.key === 'Escape') setApodoEditing(false); }}
                      placeholder="Tu apodo en el hogar"
                      maxLength={30}
                      className="flex-1 rounded-lg border border-zinc-300 px-2.5 py-1.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-zinc-900"
                    />
                    <button
                      onClick={saveApodo}
                      disabled={apodoSaving}
                      className="rounded-lg bg-zinc-900 p-1.5 text-white hover:bg-zinc-700 disabled:opacity-50"
                    >
                      {apodoSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                    </button>
                    <button
                      onClick={() => setApodoEditing(false)}
                      className="rounded-lg border border-zinc-200 p-1.5 text-zinc-400 hover:bg-zinc-50"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setApodoEditing(true)}
                    className="group flex items-center gap-1.5 mx-auto text-sm text-zinc-400 hover:text-zinc-700 transition-colors"
                  >
                    <Pencil className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <span className={apodo ? 'font-medium text-zinc-600' : 'italic'}>
                      {apodo || 'Agregar apodo'}
                    </span>
                  </button>
                )}
              </div>
            </div>
            <div className="px-5 py-4 space-y-3">
              <InfoField icon={<CreditCard className="h-4 w-4 text-zinc-400" />} label="RUT" value={empleador.rut} />
              <InfoField icon={<Mail className="h-4 w-4 text-zinc-400" />} label="Email" value={empleador.email} />
              <InfoField icon={<Phone className="h-4 w-4 text-zinc-400" />} label="Teléfono" value={empleador.telefono} />
              <InfoField
                icon={<Calendar className="h-4 w-4 text-zinc-400" />}
                label="Fecha Nacimiento"
                value={empleador.fecha_nacimiento ? formatFecha(empleador.fecha_nacimiento) : '-'}
              />
              <InfoField
                icon={<MapPin className="h-4 w-4 text-zinc-400" />}
                label="Dirección"
                value={[empleador.direccion, empleador.comuna, empleador.ciudad].filter(Boolean).join(', ')}
              />
            </div>
          </div>
        </div>

        {/* Right Panel */}
        <div className="flex-1 space-y-6">
          <div className="flex gap-6 border-b border-zinc-200">
            {tabs.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`pb-2 text-sm font-medium transition-colors ${
                  activeTab === tab
                    ? 'border-b-2 border-zinc-900 text-zinc-900'
                    : 'border-b-2 border-transparent text-zinc-500 hover:text-zinc-700'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {activeTab === 'Preferencias' && (
            <PreferenciasTab preferencias={preferencias} onRefresh={fetchData} />
          )}
        </div>
      </div>
    </div>
  );
}

// --- Edit Profile Modal with hierarchical region/city/comuna ---
function EditPerfilModal({
  open,
  onClose,
  empleador,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  empleador: Empleador;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    nombre: empleador.nombre,
    apellido: empleador.apellido,
    rut: empleador.rut,
    email: empleador.email,
    telefono: empleador.telefono,
    fecha_nacimiento: empleador.fecha_nacimiento || '',
    direccion: empleador.direccion || '',
    region: '' as string,
    ciudad: empleador.ciudad || '',
    comuna: empleador.comuna || '',
  });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [regData, setRegData] = useState<RegionData[]>([]);

  useEffect(() => {
    if (open) {
      setForm({
        nombre: empleador.nombre,
        apellido: empleador.apellido,
        rut: empleador.rut,
        email: empleador.email,
        telefono: empleador.telefono,
        fecha_nacimiento: empleador.fecha_nacimiento || '',
        direccion: empleador.direccion || '',
        region: '',
        ciudad: empleador.ciudad || '',
        comuna: empleador.comuna || '',
      });
      // Load regions data
      const supabase = createClient();
      supabase.from('regiones_chile').select('*').order('region').order('ciudad').order('comuna').then(({ data }: { data: any }) => {
        const rows = (data || []) as RegionData[];
        setRegData(rows);
        // Auto-detect region from current city/comuna
        const match = rows.find(r => r.comuna === empleador.comuna || r.ciudad === empleador.ciudad);
        if (match) {
          setForm(prev => ({ ...prev, region: match.region, ciudad: match.ciudad, comuna: match.comuna }));
        }
      });
    }
  }, [open, empleador]);

  const regiones = [...new Set(regData.map(r => r.region))];
  const ciudades = [...new Set(regData.filter(r => r.region === form.region).map(r => r.ciudad))];
  const comunas = regData.filter(r => r.region === form.region && r.ciudad === form.ciudad).map(r => r.comuna);

  const handleSave = async () => {
    setFormError(null);
    if (form.rut && !validateRut(form.rut)) { setFormError('RUT inválido — revisá el dígito verificador.'); return; }
    if (form.email && !isValidEmail(form.email)) { setFormError('Email inválido.'); return; }
    if (form.telefono && !isValidChileanMobile(form.telefono)) { setFormError('Teléfono celular inválido (formato +569XXXXXXXX).'); return; }
    setSaving(true);
    const supabase = createClient();
    const { region: _, ...updateData } = form;
    const { error } = await supabase.from('empleadores').update(updateData).eq('id', empleador.id);
    setSaving(false);
    if (error) { setFormError('No se pudo guardar: ' + error.message); return; }
    onSaved();
    onClose();
  };

  const set = (field: string) => (v: string) => {
    setForm(prev => {
      const next = { ...prev, [field]: v };
      if (field === 'region') { next.ciudad = ''; next.comuna = ''; }
      if (field === 'ciudad') { next.comuna = ''; }
      return next;
    });
  };

  return (
    <Modal open={open} onClose={onClose} title="Editar Perfil">
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Nombre" value={form.nombre} onChange={set('nombre')} />
          <FormField label="Apellido" value={form.apellido} onChange={set('apellido')} />
        </div>
        <FormField label="RUT" value={form.rut} onChange={set('rut')} />
        <FormField label="Email" value={form.email} onChange={set('email')} type="email" />
        <FormField label="Teléfono" value={form.telefono} onChange={set('telefono')} />
        <FormField label="Fecha Nacimiento" value={form.fecha_nacimiento} onChange={set('fecha_nacimiento')} type="date" />
        <AddressAutocomplete onSelect={(a) => setForm(prev => ({ ...prev, direccion: a.direccion, ciudad: a.ciudad || prev.ciudad, comuna: a.comuna || prev.comuna, region: a.region || prev.region }))} />
        <FormField label="Dirección" value={form.direccion} onChange={set('direccion')} />

        {/* Región → Ciudad → Comuna */}
        <div>
          <label className="mb-1 block text-xs font-medium text-zinc-500">Región</label>
          <select value={form.region} onChange={e => set('region')(e.target.value)}
            className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white">
            <option value="">Seleccionar región...</option>
            {regiones.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-500">Ciudad</label>
            <select value={form.ciudad} onChange={e => set('ciudad')(e.target.value)} disabled={!form.region}
              className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white disabled:opacity-50">
              <option value="">Seleccionar...</option>
              {ciudades.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-500">Comuna</label>
            <select value={form.comuna} onChange={e => set('comuna')(e.target.value)} disabled={!form.ciudad}
              className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white disabled:opacity-50">
              <option value="">Seleccionar...</option>
              {comunas.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>
      </div>
      {formError && (
        <p className="mt-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{formError}</p>
      )}
      <div className="mt-5 flex justify-end gap-2">
        <button onClick={onClose} className="rounded-lg border px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50">Cancelar</button>
        <button onClick={handleSave} disabled={saving}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          Guardar
        </button>
      </div>
    </Modal>
  );
}

// --- Info field ---
function InfoField({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-2">
      <div className="mt-0.5">{icon}</div>
      <div>
        <dt className="text-[11px] font-medium uppercase text-zinc-400">{label}</dt>
        <dd className="text-sm font-medium text-zinc-900">{value}</dd>
      </div>
    </div>
  );
}

// --- Photo upload helper ---
async function uploadFamilyPhoto(bucket: string, folder: string, id: string, file: File): Promise<string> {
  const supabase = createClient();
  const ext = file.name.split('.').pop();
  const path = `${folder}/${id}.${ext}`;
  await supabase.storage.from(bucket).upload(path, file, { upsert: true });
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl + '?t=' + Date.now();
}

// --- Edit Familiar Modal ---
const EMPTY_FAMILIAR = { id: '', empleador_id: '', tipo: '', nombre: '', apellido: '', fecha_nacimiento: '', alergias: '', condiciones_medicas: '', telefono: '', email: '', es_cuenta_activa: false, notas: '', foto_url: '' } as Familiar & { foto_url: string };

function EditFamiliarModal({
  open,
  onClose,
  familiar,
  tipo,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  familiar: Familiar & { foto_url?: string };
  tipo: string;
  onSaved: () => void;
}) {
  const { profile } = useAuth();
  const empleadorId = profile?.empleador_id || '';
  const isNew = !familiar.id;
  const familiarId = familiar.id || '';
  const familiarFoto = (familiar as any).foto_url || null;
  const [form, setForm] = useState({
    nombre: '', apellido: '', fecha_nacimiento: '', alergias: '',
    condiciones_medicas: '', telefono: '', email: '', notas: '',
  });
  const [fotoFile, setFotoFile] = useState<File | null>(null);
  const [fotoPreview, setFotoPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (open) {
      setConfirmDelete(false);
      setFotoFile(null);
      setFotoPreview(familiarFoto);
      setForm(familiarId ? {
        nombre: familiar.nombre || '', apellido: familiar.apellido || '',
        fecha_nacimiento: familiar.fecha_nacimiento || '', alergias: familiar.alergias || '',
        condiciones_medicas: familiar.condiciones_medicas || '', telefono: familiar.telefono || '',
        email: familiar.email || '', notas: familiar.notas || '',
      } : { nombre: '', apellido: '', fecha_nacimiento: '', alergias: '', condiciones_medicas: '', telefono: '', email: '', notas: '' });
    }
  }, [open, familiarId, familiarFoto]);

  const handleSave = async () => {
    setSaving(true);
    const supabase = createClient();
    let foto_url = familiarFoto;

    if (isNew) {
      const { data } = await supabase.from('familiares_empleador').insert({ empleador_id: empleadorId, tipo, ...form }).select().single();
      if (data && fotoFile) {
        foto_url = await uploadFamilyPhoto('avatars', 'familiares', data.id, fotoFile);
        await supabase.from('familiares_empleador').update({ foto_url }).eq('id', data.id);
      }
    } else if (familiarId) {
      if (fotoFile) {
        foto_url = await uploadFamilyPhoto('avatars', 'familiares', familiarId, fotoFile);
      }
      await supabase.from('familiares_empleador').update({ ...form, foto_url }).eq('id', familiarId);
    }
    setSaving(false);
    onSaved();
    onClose();
  };

  const handleDelete = async () => {
    if (!familiarId) return;
    const supabase = createClient();
    await supabase.from('familiares_empleador').delete().eq('id', familiarId);
    onSaved();
    onClose();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) { setFotoFile(file); setFotoPreview(URL.createObjectURL(file)); }
  };

  const set = (field: string) => (v: string) => setForm((prev) => ({ ...prev, [field]: v }));
  const title = isNew ? (tipo === 'hijo' ? 'Agregar Hijo' : tipo === 'otro' ? 'Agregar Familiar' : 'Agregar Cónyuge') : (tipo === 'hijo' ? 'Editar Hijo' : tipo === 'otro' ? 'Editar Familiar' : 'Editar Cónyuge');

  return (
    <Modal open={open} onClose={onClose} title={title}>
      {confirmDelete ? (
        <div className="text-center py-4">
          <p className="text-sm text-zinc-700 mb-4">¿Eliminar a <strong>{familiar?.nombre}</strong>? Esta acción no se puede deshacer.</p>
          <div className="flex justify-center gap-3">
            <button onClick={() => setConfirmDelete(false)} className="rounded-lg border px-4 py-2 text-sm">Cancelar</button>
            <button onClick={handleDelete} className="rounded-lg bg-red-600 text-white px-4 py-2 text-sm">Eliminar</button>
          </div>
        </div>
      ) : (
        <>
          {/* Photo */}
          <div className="flex justify-center mb-4">
            <label className="relative cursor-pointer group">
              {fotoPreview ? (
                <img src={fotoPreview} alt="" className="h-20 w-20 rounded-full object-cover border-2 border-zinc-200" />
              ) : (
                <div className="h-20 w-20 rounded-full bg-zinc-100 flex items-center justify-center"><Camera className="h-6 w-6 text-zinc-400" /></div>
              )}
              <div className="absolute inset-0 rounded-full bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
                <Camera className="h-5 w-5 text-white" />
              </div>
              <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
            </label>
          </div>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Nombre" value={form.nombre} onChange={set('nombre')} />
              <FormField label="Apellido" value={form.apellido} onChange={set('apellido')} />
            </div>
            <FormField label="Fecha Nacimiento" value={form.fecha_nacimiento} onChange={set('fecha_nacimiento')} type="date" />
            <FormField label="Alergias" value={form.alergias} onChange={set('alergias')} placeholder="Ninguna" />
            <FormField label="Condiciones Médicas" value={form.condiciones_medicas} onChange={set('condiciones_medicas')} placeholder="Ninguna" />
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Teléfono" value={form.telefono} onChange={set('telefono')} />
              <FormField label="Email" value={form.email} onChange={set('email')} type="email" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-500">Notas</label>
              <textarea value={form.notas} onChange={(e) => setForm((prev) => ({ ...prev, notas: e.target.value }))}
                className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400" rows={2} />
            </div>
          </div>
          <div className="mt-5 flex justify-between">
            {!isNew ? (
              <button onClick={() => setConfirmDelete(true)} className="flex items-center gap-1 text-sm text-red-500 hover:text-red-700">
                <Trash2 className="h-4 w-4" /> Eliminar
              </button>
            ) : <div />}
            <div className="flex gap-2">
              <button onClick={onClose} className="rounded-lg border px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50">Cancelar</button>
              <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
                {saving && <Loader2 className="h-4 w-4 animate-spin" />} Guardar
              </button>
            </div>
          </div>
        </>
      )}
    </Modal>
  );
}

// --- Edit Mascota Modal ---
const TIPOS_MASCOTA = [
  { value: 'perro', label: 'Perro' },
  { value: 'gato', label: 'Gato' },
  { value: 'ave', label: 'Ave' },
  { value: 'pez', label: 'Pez' },
  { value: 'otro', label: 'Otro' },
];

const EMPTY_MASCOTA = { id: '', empleador_id: '', nombre: '', tipo: 'perro', raza: '', edad: 0, instrucciones_cuidado: '', veterinario_nombre: '', veterinario_telefono: '', foto_url: '' } as Mascota & { foto_url: string };

function EditMascotaModal({
  open, onClose, mascota, onSaved,
}: {
  open: boolean; onClose: () => void; mascota: Mascota & { foto_url?: string }; onSaved: () => void;
}) {
  const { profile } = useAuth();
  const empleadorId = profile?.empleador_id || '';
  const isNew = !mascota.id;
  const mascotaId = mascota.id || '';
  const mascotaFoto = (mascota as any).foto_url || null;
  const [form, setForm] = useState({ nombre: '', tipo: 'perro', raza: '', edad: 0, instrucciones_cuidado: '', veterinario_nombre: '', veterinario_telefono: '' });
  const [fotoFile, setFotoFile] = useState<File | null>(null);
  const [fotoPreview, setFotoPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (open) {
      setConfirmDelete(false);
      setFotoFile(null);
      setFotoPreview(mascotaFoto);
      setForm(mascotaId ? {
        nombre: mascota.nombre || '', tipo: mascota.tipo || 'perro', raza: mascota.raza || '',
        edad: mascota.edad || 0, instrucciones_cuidado: mascota.instrucciones_cuidado || '',
        veterinario_nombre: mascota.veterinario_nombre || '', veterinario_telefono: mascota.veterinario_telefono || '',
      } : { nombre: '', tipo: 'perro', raza: '', edad: 0, instrucciones_cuidado: '', veterinario_nombre: '', veterinario_telefono: '' });
    }
  }, [open, mascotaId, mascotaFoto]);

  const handleSave = async () => {
    if (!form.nombre || !form.tipo) return;
    setSaving(true);
    const supabase = createClient();
    let foto_url = mascotaFoto;

    if (isNew) {
      const { data } = await supabase.from('mascotas_empleador').insert({ empleador_id: empleadorId, ...form }).select().single();
      if (data && fotoFile) {
        foto_url = await uploadFamilyPhoto('avatars', 'mascotas', data.id, fotoFile);
        await supabase.from('mascotas_empleador').update({ foto_url }).eq('id', data.id);
      }
    } else if (mascotaId) {
      if (fotoFile) foto_url = await uploadFamilyPhoto('avatars', 'mascotas', mascotaId, fotoFile);
      await supabase.from('mascotas_empleador').update({ ...form, foto_url }).eq('id', mascotaId);
    }
    setSaving(false);
    onSaved();
    onClose();
  };

  const handleDelete = async () => {
    const supabase = createClient();
    if (!mascotaId) return;
    await supabase.from('mascotas_empleador').delete().eq('id', mascotaId);
    onSaved();
    onClose();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) { setFotoFile(file); setFotoPreview(URL.createObjectURL(file)); }
  };

  const set = (field: string) => (v: string) => setForm((prev) => ({ ...prev, [field]: v }));

  return (
    <Modal open={open} onClose={onClose} title={isNew ? 'Agregar Mascota' : 'Editar Mascota'}>
      {confirmDelete ? (
        <div className="text-center py-4">
          <p className="text-sm text-zinc-700 mb-4">¿Eliminar a <strong>{mascota?.nombre}</strong>?</p>
          <div className="flex justify-center gap-3">
            <button onClick={() => setConfirmDelete(false)} className="rounded-lg border px-4 py-2 text-sm">Cancelar</button>
            <button onClick={handleDelete} className="rounded-lg bg-red-600 text-white px-4 py-2 text-sm">Eliminar</button>
          </div>
        </div>
      ) : (
        <>
          <div className="flex justify-center mb-4">
            <label className="relative cursor-pointer group">
              {fotoPreview ? (
                <img src={fotoPreview} alt="" className="h-20 w-20 rounded-full object-cover border-2 border-zinc-200" />
              ) : (
                <div className="h-20 w-20 rounded-full bg-zinc-100 flex items-center justify-center"><Camera className="h-6 w-6 text-zinc-400" /></div>
              )}
              <div className="absolute inset-0 rounded-full bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
                <Camera className="h-5 w-5 text-white" />
              </div>
              <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
            </label>
          </div>
          <div className="space-y-3">
            <FormField label="Nombre" value={form.nombre} onChange={set('nombre')} />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-500">Tipo</label>
                <select value={form.tipo} onChange={e => setForm(prev => ({ ...prev, tipo: e.target.value }))}
                  className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white">
                  {TIPOS_MASCOTA.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <FormField label="Raza" value={form.raza} onChange={set('raza')} />
            </div>
            <FormField label="Edad (años)" value={String(form.edad)} onChange={(v) => setForm((prev) => ({ ...prev, edad: parseInt(v) || 0 }))} type="number" />
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-500">Instrucciones de Cuidado</label>
              <textarea value={form.instrucciones_cuidado} onChange={(e) => setForm((prev) => ({ ...prev, instrucciones_cuidado: e.target.value }))}
                className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400" rows={3} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Veterinario" value={form.veterinario_nombre} onChange={set('veterinario_nombre')} />
              <FormField label="Tel. Veterinario" value={form.veterinario_telefono} onChange={set('veterinario_telefono')} />
            </div>
          </div>
          <div className="mt-5 flex justify-between">
            {!isNew ? (
              <button onClick={() => setConfirmDelete(true)} className="flex items-center gap-1 text-sm text-red-500 hover:text-red-700">
                <Trash2 className="h-4 w-4" /> Eliminar
              </button>
            ) : <div />}
            <div className="flex gap-2">
              <button onClick={onClose} className="rounded-lg border px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50">Cancelar</button>
              <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
                {saving && <Loader2 className="h-4 w-4 animate-spin" />} Guardar
              </button>
            </div>
          </div>
        </>
      )}
    </Modal>
  );
}

// --- Familia Tab ---
function FamiliaTab({
  conyuge,
  hijos,
  onRefresh,
}: {
  conyuge: Familiar | null;
  hijos: Familiar[];
  onRefresh: () => void;
}) {
  const [editFamiliar, setEditFamiliar] = useState<Familiar | null>(null);
  const [editTipo, setEditTipo] = useState<string>('hijo');
  const [modalOpen, setModalOpen] = useState(false);

  const openEdit = (fam: Familiar | null, tipo: string) => {
    setEditFamiliar(fam);
    setEditTipo(tipo);
    setModalOpen(true);
  };

  return (
    <div className="space-y-6">
      <EditFamiliarModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        familiar={editFamiliar || EMPTY_FAMILIAR}
        tipo={editTipo}
        onSaved={onRefresh}
      />

      {/* Conyuge */}
      <div>
        <h3 className="mb-3 text-sm font-semibold text-zinc-700">Cónyuge</h3>
        {conyuge ? (
          <div className="rounded-xl border border-zinc-200 bg-white p-5">
            <div className="flex items-start gap-4">
              {(conyuge as any).foto_url ? (
                <img src={(conyuge as any).foto_url} alt="" className="h-10 w-10 rounded-full object-cover shrink-0" />
              ) : (
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-rose-50">
                  <Heart className="h-5 w-5 text-rose-500" />
                </div>
              )}
              <div className="flex-1">
                <h4 className="font-bold text-zinc-900">
                  {conyuge.nombre} {conyuge.apellido}
                </h4>
                <p className="text-xs text-zinc-500">Cónyuge</p>
                <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1">
                  {conyuge.telefono && (
                    <div className="flex items-center gap-1.5 text-sm text-zinc-600">
                      <Phone className="h-3.5 w-3.5 text-zinc-400" />
                      {conyuge.telefono}
                    </div>
                  )}
                  {conyuge.email && (
                    <div className="flex items-center gap-1.5 text-sm text-zinc-600">
                      <Mail className="h-3.5 w-3.5 text-zinc-400" />
                      {conyuge.email}
                    </div>
                  )}
                </div>
              </div>
              <button
                onClick={() => openEdit(conyuge, 'conyuge')}
                className="rounded-lg p-1.5 hover:bg-zinc-100"
                title="Editar"
              >
                <Pencil className="h-4 w-4 text-zinc-400" />
              </button>
            </div>
          </div>
        ) : (
          <button onClick={() => openEdit(null, 'conyuge')} className="flex items-center gap-2 text-sm text-violet-600 hover:underline">
            <Plus className="h-4 w-4" /> Agregar cónyuge
          </button>
        )}
      </div>

      {/* Hijos */}
      <div>
        <div className="mb-3 flex items-center gap-2">
          <h3 className="text-sm font-semibold text-zinc-700">Hijos</h3>
          <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-600">
            {hijos.length} {hijos.length === 1 ? 'hijo' : 'hijos'}
          </span>
          <button
            onClick={() => openEdit(null, 'hijo')}
            className="ml-auto flex items-center gap-1 rounded-lg border px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
          >
            <Plus className="h-3.5 w-3.5" />
            Agregar Hijo
          </button>
        </div>
        {hijos.length === 0 ? (
          <p className="text-sm text-zinc-400 italic">Sin hijos registrados.</p>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {hijos.map((hijo) => {
              const edad = hijo.fecha_nacimiento ? calcularEdad(hijo.fecha_nacimiento) : null;
              const esMenor = edad !== null && edad < 18;
              return (
                <div key={hijo.id} className="rounded-xl border border-zinc-200 bg-white p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <h4 className="text-sm font-bold text-zinc-900">
                      {hijo.nombre} {hijo.apellido}
                    </h4>
                    <div className="flex items-center gap-1">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                          esMenor ? 'bg-amber-100 text-amber-700' : 'bg-zinc-100 text-zinc-700'
                        }`}
                      >
                        {esMenor ? 'Menor' : 'Adulto'}
                      </span>
                      <button
                        onClick={() => openEdit(hijo, 'hijo')}
                        className="rounded-lg p-1 hover:bg-zinc-100"
                        title="Editar"
                      >
                        <Pencil className="h-3.5 w-3.5 text-zinc-400" />
                      </button>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    {edad !== null && (
                      <div className="text-xs">
                        <span className="text-zinc-400">Edad: </span>
                        <span className="text-zinc-700">{edad} años</span>
                      </div>
                    )}
                    <div className="text-xs">
                      <span className="text-zinc-400">Alergias: </span>
                      <span className="text-zinc-700">{hijo.alergias || 'Ninguna'}</span>
                    </div>
                    <div className="text-xs">
                      <span className="text-zinc-400">Condiciones: </span>
                      <span className="text-zinc-700">{hijo.condiciones_medicas || 'Ninguna'}</span>
                    </div>
                  </div>
                  {hijo.notas && (
                    <p className="mt-2 rounded-lg bg-amber-50 px-2.5 py-1.5 text-[11px] text-amber-700">
                      {hijo.notas}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// --- Mascotas Tab ---
function MascotasTab({
  mascotas,
  onRefresh,
}: {
  mascotas: Mascota[];
  onRefresh: () => void;
}) {
  const [editMascota, setEditMascota] = useState<Mascota | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const openEdit = (m: Mascota | null) => {
    setEditMascota(m);
    setModalOpen(true);
  };

  const getMascotaStyle = (tipo: string) => {
    const t = tipo.toLowerCase();
    if (t.includes('perr') || t === 'dog') {
      return {
        icon: 'dog' as const,
        colorFrom: 'from-amber-50',
        colorTo: 'to-amber-100',
        iconColor: 'text-amber-600',
        iconBg: 'bg-amber-100',
      };
    }
    return {
      icon: 'cat' as const,
      colorFrom: 'from-violet-50',
      colorTo: 'to-violet-100',
      iconColor: 'text-violet-600',
      iconBg: 'bg-violet-100',
    };
  };

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <button
          onClick={() => openEdit(null)}
          className="flex items-center gap-1 rounded-lg border px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
        >
          <Plus className="h-3.5 w-3.5" />
          Agregar Mascota
        </button>
      </div>

      <EditMascotaModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        mascota={editMascota || EMPTY_MASCOTA}
        onSaved={onRefresh}
      />

      {mascotas.length === 0 ? (
        <p className="text-sm text-zinc-400 italic">Sin mascotas registradas.</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {mascotas.map((mascota) => {
            const style = getMascotaStyle(mascota.tipo);
            return (
              <div
                key={mascota.id}
                className="rounded-xl border border-zinc-200 bg-white overflow-hidden"
              >
                <div
                  className={`bg-gradient-to-r ${style.colorFrom} ${style.colorTo} px-5 py-4 flex items-center gap-3`}
                >
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-full ${style.iconBg}`}
                  >
                    {style.icon === 'dog' ? (
                      <Dog className={`h-5 w-5 ${style.iconColor}`} />
                    ) : (
                      <Cat className={`h-5 w-5 ${style.iconColor}`} />
                    )}
                  </div>
                  <div className="flex-1">
                    <h4 className="text-sm font-bold text-zinc-900">{mascota.nombre}</h4>
                    <p className="text-xs text-zinc-500">
                      {mascota.tipo} &middot; {mascota.raza}
                    </p>
                  </div>
                  <button
                    onClick={() => openEdit(mascota)}
                    className="rounded-lg p-1.5 hover:bg-white/50"
                    title="Editar"
                  >
                    <Pencil className="h-4 w-4 text-zinc-400" />
                  </button>
                </div>
                <div className="px-5 py-4 space-y-2">
                  <div className="text-xs">
                    <span className="text-zinc-400">Edad: </span>
                    <span className="text-zinc-700">{mascota.edad} años</span>
                  </div>
                  {mascota.instrucciones_cuidado && (
                    <div className="text-xs">
                      <span className="text-zinc-400">Cuidado: </span>
                      <span className="text-zinc-700">{mascota.instrucciones_cuidado}</span>
                    </div>
                  )}
                  {mascota.veterinario_nombre && (
                    <div className="text-xs">
                      <span className="text-zinc-400">Veterinario: </span>
                      <span className="text-zinc-700">
                        {mascota.veterinario_nombre}
                        {mascota.veterinario_telefono ? ` (${mascota.veterinario_telefono})` : ''}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// --- Preferencias Tab ---
function PreferenciasTab({
  preferencias,
  onRefresh,
}: {
  preferencias: Preferencia | null;
  onRefresh: () => void;
}) {
  const { profile } = useAuth();
  const empleadorId = profile?.empleador_id || '';
  const [notas, setNotas] = useState(preferencias?.notas_generales || '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [emailLiqEnabled, setEmailLiqEnabled] = useState(false);
  const [savingEmailPref, setSavingEmailPref] = useState(false);

  useEffect(() => {
    setNotas(preferencias?.notas_generales || '');
  }, [preferencias]);

  // Cargar preferencias del empleador (separadas de preferencias_trabajo)
  useEffect(() => {
    fetch('/api/empresa/preferencias')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.ok) setEmailLiqEnabled(!!d.preferencias?.email_liquidacion_enabled); })
      .catch(() => {});
  }, []);

  async function toggleEmailLiquidacion(next: boolean) {
    setSavingEmailPref(true);
    setEmailLiqEnabled(next); // optimistic
    try {
      const r = await fetch('/api/empresa/preferencias', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email_liquidacion_enabled: next }),
      });
      if (!r.ok) setEmailLiqEnabled(!next); // revert
    } catch { setEmailLiqEnabled(!next); }
    finally { setSavingEmailPref(false); }
  }

  const handleSave = async () => {
    setSaving(true);
    const supabase = createClient();
    if (preferencias) {
      await supabase.from('preferencias_trabajo').update({ notas_generales: notas }).eq('id', preferencias.id);
    } else {
      await supabase.from('preferencias_trabajo').insert({ empleador_id: empleadorId, notas_generales: notas });
    }
    setSaving(false); setSaved(true); onRefresh();
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Notificaciones */}
      <div className="rounded-xl border border-zinc-200 bg-white p-5">
        <h3 className="text-sm font-semibold text-zinc-700 mb-3">Notificaciones</h3>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <p className="text-sm font-medium text-zinc-800">Enviar liquidación por email al trabajador</p>
            <p className="text-xs text-zinc-500 mt-1">
              Al cerrar el mes, cada trabajador recibirá automáticamente su liquidación en PDF
              al email registrado. Trabajadores sin email se omiten.
            </p>
          </div>
          <button
            onClick={() => toggleEmailLiquidacion(!emailLiqEnabled)}
            disabled={savingEmailPref}
            className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition disabled:opacity-50 ${
              emailLiqEnabled ? 'bg-emerald-500' : 'bg-zinc-300'
            }`}
            aria-label="Toggle email liquidación"
          >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
              emailLiqEnabled ? 'translate-x-6' : 'translate-x-1'
            }`} />
          </button>
        </div>
      </div>

      {/* Instrucciones del hogar */}
      <div>
        <h3 className="mb-1 text-sm font-semibold text-zinc-700">Instrucciones del Hogar</h3>
        <p className="text-xs text-zinc-500 mb-3">
          Define las reglas, expectativas y condiciones de trabajo para tu trabajadora.
          Estos lineamientos quedarán registrados y serán visibles para ella en su portal.
        </p>
        <textarea
          value={notas}
          onChange={(e) => setNotas(e.target.value)}
          placeholder={"Ejemplo:\n\n— Horario de trabajo: Lunes a Viernes 08:00 a 17:00 con 1 hora de colación.\n— No usar cloro ni productos abrasivos en pisos de madera.\n— Los miércoles Martín sale del colegio a las 12:30, debe ser recogido.\n— Luna (gata) no puede salir al jardín sin supervisión.\n— Mantener stock mínimo de productos de limpieza y avisar cuando falte.\n— Ropa delicada se lava a mano, no en lavadora.\n— En caso de emergencia médica de los niños, llamar primero a Catalina (+56 9 1234 5678).\n— Se espera orden y limpieza general al término de cada jornada."}
          className="w-full rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-700 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400"
          rows={10}
        />
      </div>

      {/* Marco regulador */}
      <div className="rounded-xl border border-zinc-200 bg-white p-5">
        <h3 className="text-sm font-semibold text-zinc-700 mb-3">Marco Regulador Aplicable</h3>
        <div className="space-y-2 text-sm text-zinc-600">
          <div className="flex items-start gap-2">
            <Shield className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
            <div><strong>Código del Trabajo, Art. 146-152</strong> — Régimen especial para trabajadores de casa particular.</div>
          </div>
          <div className="flex items-start gap-2">
            <Shield className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
            <div><strong>Ley 21.561 (Ley 40 Horas)</strong> — Jornada máxima 42h semanales desde abril 2026.</div>
          </div>
          <div className="flex items-start gap-2">
            <Shield className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
            <div><strong>Ley 21.643 (Ley Karin)</strong> — Protocolo de prevención de acoso laboral y sexual.</div>
          </div>
          <div className="flex items-start gap-2">
            <Shield className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
            <div><strong>Ley 20.786</strong> — Igualdad de derechos para trabajadores de casa particular (jornada, descanso, feriados).</div>
          </div>
          <div className="flex items-start gap-2">
            <Shield className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
            <div><strong>Ingreso Mínimo Mensual</strong> — $500.000 desde enero 2026. El sueldo no puede ser inferior.</div>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button onClick={handleSave} disabled={saving}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {saved ? 'Guardado ✓' : 'Guardar Instrucciones'}
        </button>
      </div>
    </div>
  );
}
