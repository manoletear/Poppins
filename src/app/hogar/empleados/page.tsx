'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { validateRut, isValidEmail } from '@/lib/validators';
import { validarCamposTrabajador } from '@/lib/validaciones/trabajador';
import {
  Users,
  Plus,
  Clock,
  FileText,
  Calendar,
  Palmtree,
  ChevronRight,
  DollarSign,
  CalendarClock,
  Loader2,
  AlertTriangle,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth/context';

interface Empleado {
  id: string;
  nombre: string;
  apellido_paterno: string;
  apellido_materno?: string;
  cargo?: string;
  estado?: string;
  sueldo_base?: number;
  fecha_inicio_laboral?: string;
  tipo_jornada?: string;
  contratos?: {
    id: string;
    numero_contrato: string;
    tipo_contrato: string;
    puertas_adentro: boolean;
    fecha_inicio: string;
    sueldo_base: number;
    horas_semanales?: number;
  }[];
}

const gradientColors = [
  { from: 'from-rose-500', to: 'to-rose-600', bg: 'bg-rose-500' },
  { from: 'from-emerald-500', to: 'to-emerald-600', bg: 'bg-emerald-500' },
  { from: 'from-cyan-500', to: 'to-cyan-600', bg: 'bg-cyan-500' },
  { from: 'from-violet-500', to: 'to-violet-600', bg: 'bg-violet-500' },
  { from: 'from-amber-500', to: 'to-amber-600', bg: 'bg-amber-500' },
];

const AFP_OPTIONS: { id: number; label: string }[] = [
  { id: 1, label: 'AFP Capital' },
  { id: 2, label: 'AFP Cuprum' },
  { id: 3, label: 'AFP Habitat' },
  { id: 4, label: 'AFP Modelo' },
  { id: 5, label: 'AFP PlanVital' },
  { id: 6, label: 'AFP Provida' },
  { id: 7, label: 'AFP Uno' },
];

const ISAPRE_OPTIONS: { id: number; label: string }[] = [
  { id: 8, label: 'Banmédica' },
  { id: 9, label: 'Colmena Golden Cross' },
  { id: 10, label: 'Consalud' },
  { id: 11, label: 'Cruz Blanca' },
  { id: 12, label: 'Nueva Masvida' },
  { id: 32, label: 'Vida Tres' },
  { id: 33, label: 'Esencial' },
];

const FONASA_SALUD_ID = 13;

function getInitials(nombre: string, apellido: string): string {
  return `${nombre.charAt(0)}${apellido.charAt(0)}`.toUpperCase();
}

function formatCLP(amount: number): string {
  return `$${amount.toLocaleString('es-CL')}`;
}

function calcAntiguedad(fechaInicio: string): string {
  const start = new Date(fechaInicio);
  const now = new Date();
  const months = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
  const years = Math.floor(months / 12);
  const remainingMonths = months % 12;
  if (years === 0) return `${remainingMonths} meses`;
  if (remainingMonths === 0) return `${years} año${years > 1 ? 's' : ''}`;
  return `${years} año${years > 1 ? 's' : ''}, ${remainingMonths} mes${remainingMonths > 1 ? 'es' : ''}`;
}

export default function EmpleadosPage() {
  const { profile, loading: authLoading } = useAuth();
  const empleadorId = profile?.empleador_id || '';
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newEmp, setNewEmp] = useState({
    // Datos personales
    nombre: '', apellido_paterno: '', apellido_materno: '', segundo_nombre: '',
    rut: '', fecha_nacimiento: '', sexo: '', estado_civil: '', nacionalidad: 'Chilena',
    // Contacto
    email: '', telefono: '', direccion: '', comuna: '', region: '',
    // Contrato
    cargo: 'asesora_hogar', fecha_inicio: new Date().toISOString().split('T')[0],
    tipo_contrato: 'indefinido', tipo_jornada: 'completa', sueldo_base: '',
    tipo_gratificacion: 'art_50',
    // Previsión
    afp_id: '', salud_tipo: 'fonasa', salud_id: '', plan_salud_uf: '',
    // Cargas familiares
    cargas_simples: '0', cargas_maternales: '0', cargas_invalidez: '0',
    // Datos de pago
    banco: '', tipo_cuenta: '', numero_cuenta: '',
  });
  const [savingEmp, setSavingEmp] = useState(false);
  const [empError, setEmpError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const handleSync = async () => {
    setSyncing(true);
    try {
      const res = await fetch('/api/buk/import', { method: 'POST' });
      const d = await res.json();
      if (d.ok) { alert(d.imported > 0 ? `Se importaron ${d.imported} empleado(s).` : 'No hay empleados nuevos para importar.'); await loadEmpleados(); }
      else alert('No se pudo sincronizar, intentá más tarde.');
    } catch { alert('No se pudo sincronizar, intentá más tarde.'); }
    finally { setSyncing(false); }
  };

  const loadEmpleados = useCallback(async () => {
    if (!empleadorId) { setLoading(false); return; }
    setLoading(true);
    const supabase = createClient();
    const { data } = await supabase
      .from('contratos')
      .select('trabajador_id, trabajadores(*)')
      .eq('empleador_id', empleadorId)
      .eq('estado', 'activo');

    const trabs = (data || []).map((c: any) => c.trabajadores).filter(Boolean);
    // Load contratos for each
    const supabase2 = createClient();
    const trabIds = trabs.map((t: any) => t.id);
    const { data: contData } = await supabase2.from('contratos')
      .select('*').in('trabajador_id', trabIds.length > 0 ? trabIds : ['none']).eq('estado', 'activo');

    const withContratos = trabs.map((t: any) => ({
      ...t,
      contratos: (contData || []).filter((c: any) => c.trabajador_id === t.id),
    }));

    setEmpleados(withContratos);
    setLoading(false);
  }, [empleadorId]);

  useEffect(() => {
    if (!authLoading) loadEmpleados();
  }, [loadEmpleados, authLoading]);

  const activos = empleados.filter((e: any) => e.estado !== 'inactivo');

  const resetNewEmp = () => setNewEmp({
    nombre: '', apellido_paterno: '', apellido_materno: '', segundo_nombre: '',
    rut: '', fecha_nacimiento: '', sexo: '', estado_civil: '', nacionalidad: 'Chilena',
    email: '', telefono: '', direccion: '', comuna: '', region: '',
    cargo: 'asesora_hogar', fecha_inicio: new Date().toISOString().split('T')[0],
    tipo_contrato: 'indefinido', tipo_jornada: 'completa', sueldo_base: '',
    tipo_gratificacion: 'art_50',
    afp_id: '', salud_tipo: 'fonasa', salud_id: '', plan_salud_uf: '',
    cargas_simples: '0', cargas_maternales: '0', cargas_invalidez: '0',
    banco: '', tipo_cuenta: '', numero_cuenta: '',
  });

  const requiredBasicsOk = !!(
    newEmp.nombre && newEmp.apellido_paterno && newEmp.rut && newEmp.fecha_nacimiento &&
    newEmp.cargo && newEmp.fecha_inicio && newEmp.tipo_jornada &&
    Number(newEmp.sueldo_base) > 0 && newEmp.afp_id && newEmp.salud_tipo &&
    (newEmp.salud_tipo === 'fonasa' || newEmp.salud_id)
  );

  const handleAddEmpleado = async () => {
    if (!empleadorId) return;
    setSavingEmp(true);
    setEmpError(null);
    // Validación obligatoria
    if (!newEmp.nombre || !newEmp.apellido_paterno || !newEmp.rut || !newEmp.fecha_nacimiento ||
        !newEmp.cargo || !newEmp.fecha_inicio || !newEmp.tipo_jornada) {
      setEmpError('Completá los campos obligatorios (marcados con *).');
      setSavingEmp(false);
      return;
    }
    if (!validateRut(newEmp.rut)) {
      setEmpError('RUT inválido — revisá el dígito verificador (ej: 12345678-5).');
      setSavingEmp(false);
      return;
    }
    if (newEmp.email && !isValidEmail(newEmp.email)) {
      setEmpError('Email inválido.');
      setSavingEmp(false);
      return;
    }
    if (!(Number(newEmp.sueldo_base) > 0)) {
      setEmpError('El sueldo base debe ser mayor a 0.');
      setSavingEmp(false);
      return;
    }
    if (!newEmp.afp_id) {
      setEmpError('Seleccioná una AFP.');
      setSavingEmp(false);
      return;
    }
    if (newEmp.salud_tipo === 'isapre' && !newEmp.salud_id) {
      setEmpError('Seleccioná una Isapre.');
      setSavingEmp(false);
      return;
    }

    const isIsapre = newEmp.salud_tipo === 'isapre';
    const saludId = isIsapre ? Number(newEmp.salud_id) : FONASA_SALUD_ID;
    const orNull = (v: string) => (v && v.trim() !== '' ? v.trim() : null);

    const supabase = createClient();
    // id generado en cliente: evita .select() (RETURNING choca con la policy de SELECT
    // porque el trabajador recién creado aún no tiene contrato que lo enlace).
    const trabId = crypto.randomUUID();
    const { error: trabErr } = await supabase.from('trabajadores').insert({
      id: trabId,
      nombre: newEmp.nombre,
      apellido_paterno: newEmp.apellido_paterno,
      apellido_materno: orNull(newEmp.apellido_materno),
      segundo_nombre: orNull(newEmp.segundo_nombre),
      rut: newEmp.rut,
      fecha_nacimiento: newEmp.fecha_nacimiento,
      sexo: orNull(newEmp.sexo),
      estado_civil: orNull(newEmp.estado_civil),
      nacionalidad: orNull(newEmp.nacionalidad),
      email: orNull(newEmp.email),
      telefono: orNull(newEmp.telefono),
      direccion: orNull(newEmp.direccion),
      comuna: orNull(newEmp.comuna),
      region: orNull(newEmp.region),
      afp_id: Number(newEmp.afp_id),
      salud_id: saludId,
      salud_tipo: newEmp.salud_tipo,
      plan_salud_uf: isIsapre && newEmp.plan_salud_uf ? Number(newEmp.plan_salud_uf) : null,
      cargas_simples: Number(newEmp.cargas_simples) || 0,
      cargas_maternales: Number(newEmp.cargas_maternales) || 0,
      cargas_invalidez: Number(newEmp.cargas_invalidez) || 0,
      tipo_gratificacion: newEmp.tipo_gratificacion,
      cargo: newEmp.cargo,
      banco: orNull(newEmp.banco),
      tipo_cuenta: orNull(newEmp.tipo_cuenta),
      numero_cuenta: orNull(newEmp.numero_cuenta),
      estado: 'activo',
    });
    if (trabErr) {
      setEmpError(`No se pudo crear el empleado: ${trabErr.message}`);
      setSavingEmp(false);
      return;
    }
    const horasMap: Record<string, number> = { completa: 45, parcial: 30, art22: 45 };
    const { error: contErr } = await supabase.from('contratos').insert({
      trabajador_id: trabId, empleador_id: empleadorId,
      numero_contrato: `PA-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 9000) + 1000)}`,
      sueldo_base: Number(newEmp.sueldo_base),
      tipo_contrato: newEmp.tipo_contrato,
      tipo_jornada: newEmp.tipo_jornada,
      horas_semanales: horasMap[newEmp.tipo_jornada] || 45,
      fecha_inicio: newEmp.fecha_inicio,
      tipo_gratificacion: newEmp.tipo_gratificacion,
      tiene_gratificacion: newEmp.tipo_gratificacion !== 'sin',
      cargo: newEmp.cargo, estado: 'activo',
    });
    if (contErr) {
      setEmpError(`Empleado creado pero falló el contrato: ${contErr.message}`);
      setSavingEmp(false);
      loadEmpleados();
      return;
    }
    resetNewEmp();
    setShowAddForm(false);
    setSavingEmp(false);
    loadEmpleados();
  };

  if (loading) {
    return <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-zinc-400" /></div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Mis Colaboradores</h1>
          <p className="text-sm text-zinc-500 mt-1">{activos.length} empleado{activos.length !== 1 ? 's' : ''} activo{activos.length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={handleSync} disabled={syncing} className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-4 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 transition-colors">
          {syncing ? 'Sincronizando...' : 'Sincronizar empleados'}
        </button>
        <button onClick={() => setShowAddForm(!showAddForm)} className="inline-flex items-center gap-2 rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 transition-colors">
          <Plus className="h-4 w-4" />
          Agregar Empleado
        </button>
      </div>

      {/* Add employee form */}
      {showAddForm && (
        <div className="rounded-xl border border-zinc-200 bg-white p-5 space-y-6">
          <h3 className="text-sm font-semibold text-zinc-900">Nuevo Empleado</h3>

          {/* Datos personales */}
          <section className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Datos personales</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input placeholder="Nombre *" value={newEmp.nombre} onChange={e => setNewEmp(p => ({ ...p, nombre: e.target.value }))}
                className="border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-300" />
              <input placeholder="Segundo nombre" value={newEmp.segundo_nombre} onChange={e => setNewEmp(p => ({ ...p, segundo_nombre: e.target.value }))}
                className="border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-300" />
              <input placeholder="Apellido paterno *" value={newEmp.apellido_paterno} onChange={e => setNewEmp(p => ({ ...p, apellido_paterno: e.target.value }))}
                className="border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-300" />
              <input placeholder="Apellido materno" value={newEmp.apellido_materno} onChange={e => setNewEmp(p => ({ ...p, apellido_materno: e.target.value }))}
                className="border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-300" />
              <input placeholder="RUT (12345678-9) *" value={newEmp.rut} onChange={e => setNewEmp(p => ({ ...p, rut: e.target.value }))}
                className="border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-300" />
              <label className="flex flex-col text-xs text-zinc-500 gap-1">
                Fecha de nacimiento *
                <input type="date" value={newEmp.fecha_nacimiento} onChange={e => setNewEmp(p => ({ ...p, fecha_nacimiento: e.target.value }))}
                  className="border border-zinc-200 rounded-lg px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-300" />
              </label>
              <select value={newEmp.sexo} onChange={e => setNewEmp(p => ({ ...p, sexo: e.target.value }))}
                className="border border-zinc-200 rounded-lg px-3 py-2 text-sm bg-white">
                <option value="">Sexo</option>
                <option value="F">Femenino</option>
                <option value="M">Masculino</option>
                <option value="otro">Otro</option>
              </select>
              <select value={newEmp.estado_civil} onChange={e => setNewEmp(p => ({ ...p, estado_civil: e.target.value }))}
                className="border border-zinc-200 rounded-lg px-3 py-2 text-sm bg-white">
                <option value="">Estado civil</option>
                <option value="soltero">Soltero/a</option>
                <option value="casado">Casado/a</option>
                <option value="conviviente_civil">Conviviente civil</option>
                <option value="divorciado">Divorciado/a</option>
                <option value="viudo">Viudo/a</option>
              </select>
              <input placeholder="Nacionalidad" value={newEmp.nacionalidad} onChange={e => setNewEmp(p => ({ ...p, nacionalidad: e.target.value }))}
                className="border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-300" />
            </div>
          </section>

          {/* Contacto */}
          <section className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Contacto</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input placeholder="Email (para invitar al portal)" type="email" value={newEmp.email} onChange={e => setNewEmp(p => ({ ...p, email: e.target.value }))}
                className="border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-300" />
              <input placeholder="Teléfono" value={newEmp.telefono} onChange={e => setNewEmp(p => ({ ...p, telefono: e.target.value }))}
                className="border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-300" />
              <input placeholder="Dirección" value={newEmp.direccion} onChange={e => setNewEmp(p => ({ ...p, direccion: e.target.value }))}
                className="border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-300" />
              <input placeholder="Comuna" value={newEmp.comuna} onChange={e => setNewEmp(p => ({ ...p, comuna: e.target.value }))}
                className="border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-300" />
              <input placeholder="Región" value={newEmp.region} onChange={e => setNewEmp(p => ({ ...p, region: e.target.value }))}
                className="border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-300" />
            </div>
          </section>

          {/* Contrato */}
          <section className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Contrato</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <select value={newEmp.cargo} onChange={e => setNewEmp(p => ({ ...p, cargo: e.target.value }))}
                className="border border-zinc-200 rounded-lg px-3 py-2 text-sm bg-white">
                <option value="asesora_hogar">Asesora del Hogar</option>
                <option value="jardinero">Jardinero</option>
                <option value="piscinero">Piscinero</option>
                <option value="nana">Nana</option>
                <option value="cocinera">Cocinera</option>
                <option value="chofer">Chofer</option>
                <option value="otro">Otro</option>
              </select>
              <label className="flex flex-col text-xs text-zinc-500 gap-1">
                Fecha de ingreso *
                <input type="date" value={newEmp.fecha_inicio} onChange={e => setNewEmp(p => ({ ...p, fecha_inicio: e.target.value }))}
                  className="border border-zinc-200 rounded-lg px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-300" />
              </label>
              <select value={newEmp.tipo_contrato} onChange={e => setNewEmp(p => ({ ...p, tipo_contrato: e.target.value }))}
                className="border border-zinc-200 rounded-lg px-3 py-2 text-sm bg-white">
                <option value="indefinido">Indefinido</option>
                <option value="plazo_fijo">Plazo fijo</option>
                <option value="por_obra">Por obra o faena</option>
              </select>
              <select value={newEmp.tipo_jornada} onChange={e => setNewEmp(p => ({ ...p, tipo_jornada: e.target.value }))}
                className="border border-zinc-200 rounded-lg px-3 py-2 text-sm bg-white">
                <option value="completa">Jornada Completa (45h)</option>
                <option value="parcial">Jornada Parcial</option>
                <option value="art22">Art. 22</option>
              </select>
              <input placeholder="Sueldo base bruto (CLP) *" type="number" value={newEmp.sueldo_base} onChange={e => setNewEmp(p => ({ ...p, sueldo_base: e.target.value }))}
                className="border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-300" />
              <select value={newEmp.tipo_gratificacion} onChange={e => setNewEmp(p => ({ ...p, tipo_gratificacion: e.target.value }))}
                className="border border-zinc-200 rounded-lg px-3 py-2 text-sm bg-white">
                <option value="art_50">Art. 50 (25%, tope 4,75 IMM)</option>
                <option value="art_47">Art. 47 (utilidades)</option>
                <option value="sin">Sin gratificación</option>
              </select>
            </div>
          </section>

          {/* Previsión */}
          <section className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Previsión</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <select value={newEmp.afp_id} onChange={e => setNewEmp(p => ({ ...p, afp_id: e.target.value }))}
                className="border border-zinc-200 rounded-lg px-3 py-2 text-sm bg-white">
                <option value="">AFP *</option>
                {AFP_OPTIONS.map(a => <option key={a.id} value={a.id}>{a.label}</option>)}
              </select>
              <select value={newEmp.salud_tipo}
                onChange={e => setNewEmp(p => ({ ...p, salud_tipo: e.target.value, salud_id: '', plan_salud_uf: '' }))}
                className="border border-zinc-200 rounded-lg px-3 py-2 text-sm bg-white">
                <option value="fonasa">FONASA</option>
                <option value="isapre">ISAPRE</option>
              </select>
              {newEmp.salud_tipo === 'isapre' && (
                <>
                  <select value={newEmp.salud_id} onChange={e => setNewEmp(p => ({ ...p, salud_id: e.target.value }))}
                    className="border border-zinc-200 rounded-lg px-3 py-2 text-sm bg-white">
                    <option value="">Isapre *</option>
                    {ISAPRE_OPTIONS.map(i => <option key={i.id} value={i.id}>{i.label}</option>)}
                  </select>
                  <input placeholder="Plan pactado (UF)" type="number" step="0.01" value={newEmp.plan_salud_uf} onChange={e => setNewEmp(p => ({ ...p, plan_salud_uf: e.target.value }))}
                    className="border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-300" />
                </>
              )}
            </div>
          </section>

          {/* Cargas familiares */}
          <section className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Cargas familiares</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="flex flex-col text-xs text-zinc-500 gap-1">
                Cargas simples
                <input type="number" min="0" value={newEmp.cargas_simples} onChange={e => setNewEmp(p => ({ ...p, cargas_simples: e.target.value }))}
                  className="border border-zinc-200 rounded-lg px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-300" />
              </label>
              <label className="flex flex-col text-xs text-zinc-500 gap-1">
                Cargas maternales
                <input type="number" min="0" value={newEmp.cargas_maternales} onChange={e => setNewEmp(p => ({ ...p, cargas_maternales: e.target.value }))}
                  className="border border-zinc-200 rounded-lg px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-300" />
              </label>
              <label className="flex flex-col text-xs text-zinc-500 gap-1">
                Cargas de invalidez
                <input type="number" min="0" value={newEmp.cargas_invalidez} onChange={e => setNewEmp(p => ({ ...p, cargas_invalidez: e.target.value }))}
                  className="border border-zinc-200 rounded-lg px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-300" />
              </label>
            </div>
            <p className="text-xs text-zinc-400">Afectan la asignación familiar.</p>
          </section>

          {/* Datos de pago */}
          <section className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Datos de pago (opcional)</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input placeholder="Banco" value={newEmp.banco} onChange={e => setNewEmp(p => ({ ...p, banco: e.target.value }))}
                className="border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-300" />
              <select value={newEmp.tipo_cuenta} onChange={e => setNewEmp(p => ({ ...p, tipo_cuenta: e.target.value }))}
                className="border border-zinc-200 rounded-lg px-3 py-2 text-sm bg-white">
                <option value="">Tipo de cuenta</option>
                <option value="corriente">Cuenta Corriente</option>
                <option value="vista">Cuenta Vista</option>
                <option value="rut">Cuenta RUT</option>
                <option value="ahorro">Ahorro</option>
              </select>
              <input placeholder="Número de cuenta" value={newEmp.numero_cuenta} onChange={e => setNewEmp(p => ({ ...p, numero_cuenta: e.target.value }))}
                className="border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-300" />
            </div>
          </section>

          {empError && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{empError}</p>
          )}
          <div className="flex gap-2 justify-end">
            <button onClick={() => setShowAddForm(false)} className="px-4 py-2 text-sm text-zinc-600 border border-zinc-200 rounded-lg hover:bg-zinc-50">Cancelar</button>
            <button onClick={handleAddEmpleado} disabled={savingEmp || !requiredBasicsOk}
              className="px-4 py-2 text-sm bg-zinc-900 text-white rounded-lg hover:bg-zinc-800 disabled:opacity-50">
              {savingEmp ? 'Guardando...' : 'Guardar Empleado'}
            </button>
          </div>
        </div>
      )}

      {empleados.length === 0 ? (
        <div className="rounded-xl border border-zinc-200 bg-white p-8 text-center">
          <Users className="w-10 h-10 text-zinc-300 mx-auto mb-3" />
          <p className="text-sm text-zinc-500">No tienes empleados registrados aún</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {empleados.map((emp, idx) => {
            const color = gradientColors[idx % gradientColors.length];
            const contrato = emp.contratos?.[0];
            const iniciales = getInitials(emp.nombre, emp.apellido_paterno);
            const sueldo = contrato?.sueldo_base || emp.sueldo_base || 0;
            const fechaInicio = contrato?.fecha_inicio || emp.fecha_inicio_laboral;
            const modalidad = contrato?.puertas_adentro ? 'Puertas Adentro' : 'Puertas Afuera';
            const validacion = validarCamposTrabajador(emp as any);

            return (
              <div key={emp.id} className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
                <div className={`bg-gradient-to-r ${color.from} ${color.to} px-5 py-4`}>
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/20 text-base font-bold text-white">
                      {iniciales}
                    </div>
                    <div>
                      <p className="text-base font-semibold text-white">{emp.nombre} {emp.apellido_paterno}</p>
                      <p className="text-sm text-white/80">{emp.cargo || 'Empleado'}</p>
                    </div>
                  </div>
                </div>

                <div className="px-5 py-4 space-y-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700">
                      {modalidad}
                    </span>
                    <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
                      {emp.estado === 'activo' ? 'Activo' : emp.estado || 'Activo'}
                    </span>
                    {!validacion.ok && (
                      <span
                        title={`Faltan: ${validacion.faltantes.join(', ')}`}
                        className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-800 border border-amber-200"
                      >
                        <AlertTriangle className="h-3 w-3" />
                        {validacion.faltantes.length} dato{validacion.faltantes.length === 1 ? '' : 's'} pendiente{validacion.faltantes.length === 1 ? '' : 's'}
                      </span>
                    )}
                  </div>

                  <div className="space-y-2 text-sm text-zinc-600">
                    {contrato?.horas_semanales && (
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-zinc-400" />
                        <span>{contrato.horas_semanales}h semanales</span>
                      </div>
                    )}
                    {contrato && (
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-zinc-400" />
                        <span>Contrato: </span>
                        <span className="font-semibold text-zinc-900">
                          #{contrato.numero_contrato || contrato.tipo_contrato}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <span className="text-zinc-400 text-base font-medium ml-0.5">$</span>
                      <span className="ml-0.5">Sueldo: {formatCLP(sueldo)}</span>
                    </div>
                    {fechaInicio && (
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-zinc-400" />
                        <span>Antigüedad: {calcAntiguedad(fechaInicio)}</span>
                      </div>
                    )}
                  </div>

                  <Link
                    href={`/hogar/empleados/${emp.id}`}
                    className="mt-2 inline-flex w-full items-center justify-center gap-1 rounded-lg border border-zinc-200 px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 transition-colors"
                  >
                    Ver Detalle
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
