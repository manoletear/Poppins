'use client';

import { useEffect, useState, useCallback } from 'react';
import { Plus, Pencil, Trash2, Heart, User, Dog, Cat, Bird, Fish, Phone, Mail, Loader2, AlertCircle, X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth/context';
import MiembrosHogar from './MiembrosHogar';
import { AvatarPicker } from '@/components/Avatar';

const ROLES_POR_TIPO: Record<string, string[]> = {
  conyuge: ['mama', 'papa'],
  hijo: ['hijo', 'hija', 'bebe'],
  otro: ['abuelo', 'abuela', 'mama', 'papa'],
};

const ROLES_MASCOTA: Record<string, string[]> = {
  perro: ['perro'],
  gato: ['gato'],
  ave: ['mascota', 'perro', 'gato'],
  pez: ['mascota', 'perro', 'gato'],
  otro: ['perro', 'gato', 'conejo', 'mascota'],
};

interface Familiar {
  id: string;
  empleador_id: string;
  tipo: 'conyuge' | 'hijo' | 'otro';
  nombre: string;
  apellido: string;
  fecha_nacimiento: string | null;
  alergias: string | null;
  condiciones_medicas: string | null;
  telefono: string | null;
  email: string | null;
  es_cuenta_activa: boolean;
  notas: string | null;
  foto_url: string | null;
}

interface Mascota {
  id: string;
  empleador_id: string;
  nombre: string;
  tipo: 'perro' | 'gato' | 'ave' | 'pez' | 'otro';
  raza: string | null;
  edad: number | null;
  instrucciones_cuidado: string | null;
  veterinario_nombre: string | null;
  veterinario_telefono: string | null;
  foto_url: string | null;
}

function Avatar({ src, fallback, size = 'md' }: { src: string | null; fallback: React.ReactNode; size?: 'sm' | 'md' }) {
  const s = size === 'sm' ? 'h-8 w-8' : 'h-10 w-10';
  return src ? <img src={src} alt="" className={`${s} rounded-full object-cover shrink-0`} /> : <>{fallback}</>;
}

type FamiliarForm = Omit<Familiar, 'id' | 'empleador_id'>;
type MascotaForm = Omit<Mascota, 'id' | 'empleador_id'>;

const emptyFamiliar: FamiliarForm = {
  tipo: 'hijo',
  nombre: '',
  apellido: '',
  fecha_nacimiento: null,
  alergias: null,
  condiciones_medicas: null,
  telefono: null,
  email: null,
  es_cuenta_activa: false,
  notas: null,
  foto_url: null,
};

const emptyMascota: MascotaForm = {
  nombre: '',
  tipo: 'perro',
  raza: null,
  edad: null,
  instrucciones_cuidado: null,
  veterinario_nombre: null,
  veterinario_telefono: null,
  foto_url: null,
};

function calcularEdad(fechaNacimiento: string | null): number | null {
  if (!fechaNacimiento) return null;
  const hoy = new Date();
  const nacimiento = new Date(fechaNacimiento);
  let edad = hoy.getFullYear() - nacimiento.getFullYear();
  const mes = hoy.getMonth() - nacimiento.getMonth();
  if (mes < 0 || (mes === 0 && hoy.getDate() < nacimiento.getDate())) {
    edad--;
  }
  return edad;
}

function getMascotaIcon(tipo: string) {
  switch (tipo) {
    case 'perro': return Dog;
    case 'gato': return Cat;
    case 'ave': return Bird;
    case 'pez': return Fish;
    default: return Dog;
  }
}

export default function FamiliaPage() {
  const { profile, loading: authLoading } = useAuth();
  const empleadorId = profile?.empleador_id || '';
  const [familiares, setFamiliares] = useState<Familiar[]>([]);
  const [mascotas, setMascotas] = useState<Mascota[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal state for familiares
  const [showFamiliarModal, setShowFamiliarModal] = useState(false);
  const [familiarForm, setFamiliarForm] = useState<FamiliarForm>(emptyFamiliar);
  const [editingFamiliarId, setEditingFamiliarId] = useState<string | null>(null);
  const [savingFamiliar, setSavingFamiliar] = useState(false);

  // Modal state for mascotas
  const [showMascotaModal, setShowMascotaModal] = useState(false);
  const [mascotaForm, setMascotaForm] = useState<MascotaForm>(emptyMascota);
  const [editingMascotaId, setEditingMascotaId] = useState<string | null>(null);
  const [savingMascota, setSavingMascota] = useState(false);

  // Delete confirmation
  const [deletingFamiliarId, setDeletingFamiliarId] = useState<string | null>(null);
  const [deletingMascotaId, setDeletingMascotaId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!empleadorId) return;
    setLoading(true);
    setError(null);
    try {
      const supabase = createClient();
      const [familiaresRes, mascotasRes] = await Promise.all([
        supabase.from('familiares_empleador').select('*').eq('empleador_id', empleadorId).order('tipo'),
        supabase.from('mascotas_empleador').select('*').eq('empleador_id', empleadorId),
      ]);
      if (familiaresRes.error) throw familiaresRes.error;
      if (mascotasRes.error) throw mascotasRes.error;
      setFamiliares(familiaresRes.data || []);
      setMascotas(mascotasRes.data || []);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al cargar los datos';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [empleadorId]);

  useEffect(() => {
    if (authLoading) return;
    if (!empleadorId) { setLoading(false); return; }
    fetchData();
  }, [fetchData]);

  // --- Familiar CRUD ---
  const openAddFamiliar = () => {
    setFamiliarForm(emptyFamiliar);
    setEditingFamiliarId(null);
    setShowFamiliarModal(true);
  };

  const openEditFamiliar = (f: Familiar) => {
    setFamiliarForm({
      tipo: f.tipo,
      nombre: f.nombre,
      apellido: f.apellido,
      fecha_nacimiento: f.fecha_nacimiento,
      alergias: f.alergias,
      condiciones_medicas: f.condiciones_medicas,
      telefono: f.telefono,
      email: f.email,
      es_cuenta_activa: f.es_cuenta_activa,
      notas: f.notas,
      foto_url: f.foto_url,
    });
    setEditingFamiliarId(f.id);
    setShowFamiliarModal(true);
  };

  const saveFamiliar = async () => {
    if (!familiarForm.nombre?.trim() || !familiarForm.apellido?.trim() || !familiarForm.fecha_nacimiento) {
      alert('Nombre, apellido y fecha de nacimiento son obligatorios.');
      return;
    }
    setSavingFamiliar(true);
    try {
      const supabase = createClient();
      if (editingFamiliarId) {
        const { error } = await supabase
          .from('familiares_empleador')
          .update(familiarForm)
          .eq('id', editingFamiliarId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('familiares_empleador')
          .insert({ ...familiarForm, empleador_id: empleadorId });
        if (error) throw error;
      }
      setShowFamiliarModal(false);
      await fetchData();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al guardar';
      alert(message);
    } finally {
      setSavingFamiliar(false);
    }
  };

  const deleteFamiliar = async (id: string) => {
    try {
      const supabase = createClient();
      const { error } = await supabase.from('familiares_empleador').delete().eq('id', id);
      if (error) throw error;
      setDeletingFamiliarId(null);
      await fetchData();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al eliminar';
      alert(message);
    }
  };

  // --- Mascota CRUD ---
  const openAddMascota = () => {
    setMascotaForm(emptyMascota);
    setEditingMascotaId(null);
    setShowMascotaModal(true);
  };

  const openEditMascota = (m: Mascota) => {
    setMascotaForm({
      nombre: m.nombre,
      tipo: m.tipo,
      raza: m.raza,
      edad: m.edad,
      instrucciones_cuidado: m.instrucciones_cuidado,
      veterinario_nombre: m.veterinario_nombre,
      veterinario_telefono: m.veterinario_telefono,
      foto_url: m.foto_url,
    });
    setEditingMascotaId(m.id);
    setShowMascotaModal(true);
  };

  const saveMascota = async () => {
    setSavingMascota(true);
    try {
      const supabase = createClient();
      if (editingMascotaId) {
        const { error } = await supabase
          .from('mascotas_empleador')
          .update(mascotaForm)
          .eq('id', editingMascotaId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('mascotas_empleador')
          .insert({ ...mascotaForm, empleador_id: empleadorId });
        if (error) throw error;
      }
      setShowMascotaModal(false);
      await fetchData();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al guardar';
      alert(message);
    } finally {
      setSavingMascota(false);
    }
  };

  const deleteMascota = async (id: string) => {
    try {
      const supabase = createClient();
      const { error } = await supabase.from('mascotas_empleador').delete().eq('id', id);
      if (error) throw error;
      setDeletingMascotaId(null);
      await fetchData();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al eliminar';
      alert(message);
    }
  };

  // --- Derived data ---
  const conyuges = familiares.filter((f) => f.tipo === 'conyuge');
  const hijos = familiares.filter((f) => f.tipo === 'hijo');
  const otros = familiares.filter((f) => f.tipo === 'otro');

  // --- Loading state ---
  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
        <span className="ml-3 text-sm text-zinc-500">Cargando datos de familia...</span>
      </div>
    );
  }

  // --- Error state ---
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <AlertCircle className="h-10 w-10 text-red-400" />
        <p className="text-sm text-red-600">{error}</p>
        <button
          onClick={fetchData}
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 transition-colors"
        >
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Mi Familia</h1>
          <p className="text-sm text-zinc-500">Gestiona los datos de tu familia</p>
        </div>
        <button
          onClick={openAddFamiliar}
          className="inline-flex items-center gap-2 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Agregar Familiar
        </button>
      </div>

      {/* Conyuge section */}
      <div className="rounded-xl border bg-white p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="rounded-lg bg-rose-50 p-2">
            <Heart className="h-5 w-5 text-rose-500" />
          </div>
          <h2 className="text-lg font-semibold text-zinc-900">Cónyuge / Pareja</h2>
        </div>
        {conyuges.length === 0 ? (
          <p className="text-sm text-zinc-400">No hay conyuge registrado.</p>
        ) : (
          <div className="space-y-4">
            {conyuges.map((c) => {
              const edad = calcularEdad(c.fecha_nacimiento);
              return (
                <div key={c.id} className="flex items-start gap-3 justify-between">
                  <Avatar src={c.foto_url} fallback={<div className="h-10 w-10 rounded-full bg-rose-100 flex items-center justify-center shrink-0"><Heart className="h-5 w-5 text-rose-500" /></div>} />
                  <div className="flex-1 space-y-2">
                    <p className="text-base font-medium text-zinc-900">
                      {c.nombre} {c.apellido}
                      {edad !== null && <span className="text-sm text-zinc-500 ml-2">({edad} anos)</span>}
                    </p>
                    {c.telefono && (
                      <div className="flex items-center gap-2 text-sm text-zinc-500">
                        <Phone className="h-4 w-4" />
                        <span>{c.telefono}</span>
                      </div>
                    )}
                    {c.email && (
                      <div className="flex items-center gap-2 text-sm text-zinc-500">
                        <Mail className="h-4 w-4" />
                        <span>{c.email}</span>
                      </div>
                    )}
                    {c.alergias && (
                      <p className="text-xs text-zinc-500">Alergias: {c.alergias}</p>
                    )}
                    {c.condiciones_medicas && (
                      <p className="text-xs text-zinc-500">Condiciones: {c.condiciones_medicas}</p>
                    )}
                    {c.notas && (
                      <p className="text-xs text-zinc-400">{c.notas}</p>
                    )}
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-sm text-zinc-500">Cuenta activa:</span>
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          c.es_cuenta_activa ? 'bg-green-100 text-green-700' : 'bg-zinc-100 text-zinc-500'
                        }`}
                      >
                        {c.es_cuenta_activa ? 'Si' : 'No'}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEditFamiliar(c)}
                      className="rounded-lg border border-zinc-200 p-2 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-50 transition-colors"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    {deletingFamiliarId === c.id ? (
                      <div className="flex items-center gap-1 ml-1">
                        <button
                          onClick={() => deleteFamiliar(c.id)}
                          className="rounded-lg bg-red-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-red-700 transition-colors"
                        >
                          Confirmar
                        </button>
                        <button
                          onClick={() => setDeletingFamiliarId(null)}
                          className="rounded-lg border border-zinc-200 px-2.5 py-1.5 text-xs text-zinc-500 hover:bg-zinc-50 transition-colors"
                        >
                          Cancelar
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setDeletingFamiliarId(c.id)}
                        className="rounded-lg border border-zinc-200 p-2 text-zinc-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Hijos section */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <h2 className="text-lg font-semibold text-zinc-900">Hijos</h2>
          <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-600">
            {hijos.length}
          </span>
        </div>
        {hijos.length === 0 ? (
          <p className="text-sm text-zinc-400">No hay hijos registrados.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {hijos.map((hijo) => {
              const edad = calcularEdad(hijo.fecha_nacimiento);
              const esMenor = edad !== null && edad < 18;
              return (
                <div key={hijo.id} className="rounded-xl border bg-white p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <Avatar src={hijo.foto_url} fallback={<div className="rounded-full bg-zinc-100 p-2"><User className="h-4 w-4 text-zinc-500" /></div>} size="sm" />
                      <div>
                        <p className="text-sm font-semibold text-zinc-900">
                          {hijo.nombre} {hijo.apellido}
                        </p>
                        {edad !== null && <p className="text-xs text-zinc-500">{edad} anos</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEditFamiliar(hijo)}
                        className="rounded-lg border border-zinc-200 p-1.5 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-50 transition-colors"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      {deletingFamiliarId === hijo.id ? (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => deleteFamiliar(hijo.id)}
                            className="rounded-lg bg-red-600 px-2 py-1 text-xs font-medium text-white hover:bg-red-700 transition-colors"
                          >
                            Si
                          </button>
                          <button
                            onClick={() => setDeletingFamiliarId(null)}
                            className="rounded-lg border border-zinc-200 px-2 py-1 text-xs text-zinc-500 hover:bg-zinc-50 transition-colors"
                          >
                            No
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setDeletingFamiliarId(hijo.id)}
                          className="rounded-lg border border-zinc-200 p-1.5 text-zinc-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 mb-3">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        esMenor ? 'bg-amber-100 text-amber-700' : 'bg-zinc-100 text-zinc-600'
                      }`}
                    >
                      {esMenor ? 'Menor' : 'Adulto'}
                    </span>
                    {hijo.es_cuenta_activa && (
                      <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">
                        Cuenta activa
                      </span>
                    )}
                  </div>
                  <ul className="space-y-1">
                    {hijo.alergias && (
                      <li className="text-xs text-zinc-500">Alergia: {hijo.alergias}</li>
                    )}
                    {hijo.condiciones_medicas && (
                      <li className="text-xs text-zinc-500">Condiciones: {hijo.condiciones_medicas}</li>
                    )}
                    {hijo.telefono && (
                      <li className="text-xs text-zinc-500">Tel: {hijo.telefono}</li>
                    )}
                    {hijo.email && (
                      <li className="text-xs text-zinc-500">Email: {hijo.email}</li>
                    )}
                    {hijo.notas && (
                      <li className="text-xs text-zinc-400">{hijo.notas}</li>
                    )}
                  </ul>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Otros familiares section */}
      {otros.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-lg font-semibold text-zinc-900">Otros Familiares</h2>
            <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-600">
              {otros.length}
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {otros.map((otro) => {
              const edad = calcularEdad(otro.fecha_nacimiento);
              return (
                <div key={otro.id} className="rounded-xl border bg-white p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <Avatar src={otro.foto_url} fallback={<div className="rounded-full bg-zinc-100 p-2"><User className="h-4 w-4 text-zinc-500" /></div>} size="sm" />
                      <div>
                        <p className="text-sm font-semibold text-zinc-900">
                          {otro.nombre} {otro.apellido}
                        </p>
                        {edad !== null && <p className="text-xs text-zinc-500">{edad} anos</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEditFamiliar(otro)}
                        className="rounded-lg border border-zinc-200 p-1.5 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-50 transition-colors"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      {deletingFamiliarId === otro.id ? (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => deleteFamiliar(otro.id)}
                            className="rounded-lg bg-red-600 px-2 py-1 text-xs font-medium text-white hover:bg-red-700 transition-colors"
                          >
                            Si
                          </button>
                          <button
                            onClick={() => setDeletingFamiliarId(null)}
                            className="rounded-lg border border-zinc-200 px-2 py-1 text-xs text-zinc-500 hover:bg-zinc-50 transition-colors"
                          >
                            No
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setDeletingFamiliarId(otro.id)}
                          className="rounded-lg border border-zinc-200 p-1.5 text-zinc-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                  <ul className="space-y-1">
                    {otro.alergias && <li className="text-xs text-zinc-500">Alergia: {otro.alergias}</li>}
                    {otro.condiciones_medicas && <li className="text-xs text-zinc-500">Condiciones: {otro.condiciones_medicas}</li>}
                    {otro.telefono && <li className="text-xs text-zinc-500">Tel: {otro.telefono}</li>}
                    {otro.email && <li className="text-xs text-zinc-500">Email: {otro.email}</li>}
                    {otro.notas && <li className="text-xs text-zinc-400">{otro.notas}</li>}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Mascotas section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-zinc-900">Mascotas</h2>
            <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-600">
              {mascotas.length}
            </span>
          </div>
          <button
            onClick={openAddMascota}
            className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Agregar Mascota
          </button>
        </div>
        {mascotas.length === 0 ? (
          <p className="text-sm text-zinc-400">No hay mascotas registradas.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {mascotas.map((mascota) => {
              const Icon = getMascotaIcon(mascota.tipo);
              return (
                <div key={mascota.id} className="rounded-xl border bg-white p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <Avatar src={mascota.foto_url} fallback={<div className="rounded-full bg-amber-50 p-2"><Icon className="h-5 w-5 text-amber-600" /></div>} />
                      <div>
                        <p className="text-sm font-semibold text-zinc-900">{mascota.nombre}</p>
                        <p className="text-xs text-zinc-500">
                          {mascota.tipo.charAt(0).toUpperCase() + mascota.tipo.slice(1)}
                          {mascota.raza && ` ${mascota.raza}`}
                          {mascota.edad !== null && ` · ${mascota.edad} anos`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEditMascota(mascota)}
                        className="rounded-lg border border-zinc-200 p-1.5 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-50 transition-colors"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      {deletingMascotaId === mascota.id ? (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => deleteMascota(mascota.id)}
                            className="rounded-lg bg-red-600 px-2 py-1 text-xs font-medium text-white hover:bg-red-700 transition-colors"
                          >
                            Si
                          </button>
                          <button
                            onClick={() => setDeletingMascotaId(null)}
                            className="rounded-lg border border-zinc-200 px-2 py-1 text-xs text-zinc-500 hover:bg-zinc-50 transition-colors"
                          >
                            No
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setDeletingMascotaId(mascota.id)}
                          className="rounded-lg border border-zinc-200 p-1.5 text-zinc-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                  <ul className="space-y-1.5 mt-2">
                    {mascota.instrucciones_cuidado && (
                      <li className="text-xs text-zinc-500">{mascota.instrucciones_cuidado}</li>
                    )}
                    {mascota.veterinario_nombre && (
                      <li className="text-xs text-zinc-500">
                        Veterinario: {mascota.veterinario_nombre}
                        {mascota.veterinario_telefono && ` - ${mascota.veterinario_telefono}`}
                      </li>
                    )}
                  </ul>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Acceso al Hogar */}
      <MiembrosHogar />

      {/* Modal Familiar */}
      {showFamiliarModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-semibold text-zinc-900">
                {editingFamiliarId ? 'Editar Familiar' : 'Agregar Familiar'}
              </h3>
              <button
                onClick={() => setShowFamiliarModal(false)}
                className="rounded-lg p-1.5 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">Tipo</label>
                <select
                  value={familiarForm.tipo}
                  onChange={(e) => setFamiliarForm({ ...familiarForm, tipo: e.target.value as Familiar['tipo'] })}
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
                >
                  <option value="conyuge">Cónyuge / Pareja</option>
                  <option value="hijo">Hijo/a</option>
                  <option value="otro">Otro familiar (vive en casa)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-2">Elegí un avatar</label>
                <AvatarPicker
                  roles={ROLES_POR_TIPO[familiarForm.tipo] || ['mama', 'papa']}
                  familyId={empleadorId}
                  memberId={editingFamiliarId || familiarForm.tipo}
                  value={familiarForm.foto_url}
                  onChange={(url) => setFamiliarForm({ ...familiarForm, foto_url: url })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">Nombre</label>
                  <input
                    type="text"
                    value={familiarForm.nombre}
                    onChange={(e) => setFamiliarForm({ ...familiarForm, nombre: e.target.value })}
                    className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">Apellido</label>
                  <input
                    type="text"
                    value={familiarForm.apellido}
                    onChange={(e) => setFamiliarForm({ ...familiarForm, apellido: e.target.value })}
                    className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">Fecha de nacimiento</label>
                <input
                  type="date"
                  value={familiarForm.fecha_nacimiento || ''}
                  onChange={(e) => setFamiliarForm({ ...familiarForm, fecha_nacimiento: e.target.value || null })}
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">Telefono (opcional)</label>
                  <input
                    type="text"
                    value={familiarForm.telefono || ''}
                    onChange={(e) => setFamiliarForm({ ...familiarForm, telefono: e.target.value || null })}
                    className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">Email (opcional)</label>
                  <input
                    type="text"
                    value={familiarForm.email || ''}
                    onChange={(e) => setFamiliarForm({ ...familiarForm, email: e.target.value || null })}
                    className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">Alergias (opcional)</label>
                <input
                  type="text"
                  value={familiarForm.alergias || ''}
                  onChange={(e) => setFamiliarForm({ ...familiarForm, alergias: e.target.value || null })}
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">Condiciones medicas (opcional)</label>
                <input
                  type="text"
                  value={familiarForm.condiciones_medicas || ''}
                  onChange={(e) => setFamiliarForm({ ...familiarForm, condiciones_medicas: e.target.value || null })}
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">Notas (opcional)</label>
                <textarea
                  value={familiarForm.notas || ''}
                  onChange={(e) => setFamiliarForm({ ...familiarForm, notas: e.target.value || null })}
                  rows={3}
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="es_cuenta_activa"
                  checked={familiarForm.es_cuenta_activa}
                  onChange={(e) => setFamiliarForm({ ...familiarForm, es_cuenta_activa: e.target.checked })}
                  className="h-4 w-4 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-900"
                />
                <label htmlFor="es_cuenta_activa" className="text-sm text-zinc-700">
                  Es cuenta activa
                </label>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 mt-6">
              <button
                onClick={() => setShowFamiliarModal(false)}
                className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={saveFamiliar}
                disabled={savingFamiliar || !familiarForm.nombre || !familiarForm.apellido}
                className="inline-flex items-center gap-2 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {savingFamiliar && <Loader2 className="h-4 w-4 animate-spin" />}
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Mascota */}
      {showMascotaModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-semibold text-zinc-900">
                {editingMascotaId ? 'Editar Mascota' : 'Agregar Mascota'}
              </h3>
              <button
                onClick={() => setShowMascotaModal(false)}
                className="rounded-lg p-1.5 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">Nombre</label>
                <input
                  type="text"
                  value={mascotaForm.nombre}
                  onChange={(e) => setMascotaForm({ ...mascotaForm, nombre: e.target.value })}
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-2">Elegí un avatar</label>
                <AvatarPicker
                  roles={ROLES_MASCOTA[mascotaForm.tipo] || ['perro', 'gato', 'mascota']}
                  familyId={empleadorId}
                  memberId={editingMascotaId || mascotaForm.tipo}
                  value={mascotaForm.foto_url}
                  onChange={(url) => setMascotaForm({ ...mascotaForm, foto_url: url })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">Tipo</label>
                  <select
                    value={mascotaForm.tipo}
                    onChange={(e) => setMascotaForm({ ...mascotaForm, tipo: e.target.value as Mascota['tipo'] })}
                    className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
                  >
                    <option value="perro">Perro</option>
                    <option value="gato">Gato</option>
                    <option value="ave">Ave</option>
                    <option value="pez">Pez</option>
                    <option value="otro">Otro</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">Raza</label>
                  <input
                    type="text"
                    value={mascotaForm.raza || ''}
                    onChange={(e) => setMascotaForm({ ...mascotaForm, raza: e.target.value || null })}
                    className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">Edad (anos)</label>
                <input
                  type="number"
                  min="0"
                  value={mascotaForm.edad ?? ''}
                  onChange={(e) => setMascotaForm({ ...mascotaForm, edad: e.target.value ? parseInt(e.target.value, 10) : null })}
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">Instrucciones de cuidado</label>
                <textarea
                  value={mascotaForm.instrucciones_cuidado || ''}
                  onChange={(e) => setMascotaForm({ ...mascotaForm, instrucciones_cuidado: e.target.value || null })}
                  rows={3}
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">Veterinario nombre</label>
                  <input
                    type="text"
                    value={mascotaForm.veterinario_nombre || ''}
                    onChange={(e) => setMascotaForm({ ...mascotaForm, veterinario_nombre: e.target.value || null })}
                    className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">Veterinario telefono</label>
                  <input
                    type="text"
                    value={mascotaForm.veterinario_telefono || ''}
                    onChange={(e) => setMascotaForm({ ...mascotaForm, veterinario_telefono: e.target.value || null })}
                    className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
                  />
                </div>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 mt-6">
              <button
                onClick={() => setShowMascotaModal(false)}
                className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={saveMascota}
                disabled={savingMascota || !mascotaForm.nombre}
                className="inline-flex items-center gap-2 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {savingMascota && <Loader2 className="h-4 w-4 animate-spin" />}
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
