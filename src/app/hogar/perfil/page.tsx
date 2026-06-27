'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth/context';
import { validateRut, isValidEmail, isValidChileanMobile } from '@/lib/validators';
import AddressAutocomplete from '@/components/AddressAutocomplete';
import { AvatarPicker } from '@/components/Avatar';
import {
  Pencil,
  Mail,
  Phone,
  MapPin,
  Calendar,
  CreditCard,
  X,
  Loader2,
  AlertCircle,
  Save,
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

interface Preferencia {
  id: string;
  empleador_id: string;
  prioridades: { titulo: string }[];
  notas_generales: string;
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

      const [prefRes, cuentasRes] = await Promise.all([
        supabase.from('preferencias_trabajo').select('*').eq('empleador_id', empleadorId).maybeSingle(),
        supabase.from('cuentas_pago').select('*').eq('empleador_id', empleadorId).eq('activa', true),
      ]);

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
