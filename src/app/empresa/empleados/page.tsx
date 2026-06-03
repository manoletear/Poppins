'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { validateRut, isValidEmail } from '@/lib/validators';
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
  const [newEmp, setNewEmp] = useState({ nombre: '', apellido_paterno: '', rut: '', email: '', cargo: 'asesora_hogar', sueldo_base: '', tipo_jornada: 'completa' });
  const [savingEmp, setSavingEmp] = useState(false);
  const [empError, setEmpError] = useState<string | null>(null);

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

  const handleAddEmpleado = async () => {
    if (!empleadorId || !newEmp.nombre || !newEmp.apellido_paterno || !newEmp.rut) return;
    setSavingEmp(true);
    setEmpError(null);
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
    const supabase = createClient();
    // id generado en cliente: evita .select() (RETURNING choca con la policy de SELECT
    // porque el trabajador recién creado aún no tiene contrato que lo enlace).
    const trabId = crypto.randomUUID();
    const { error: trabErr } = await supabase.from('trabajadores').insert({
      id: trabId,
      nombre: newEmp.nombre, apellido_paterno: newEmp.apellido_paterno,
      rut: newEmp.rut, email: newEmp.email || null, cargo: newEmp.cargo, estado: 'activo',
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
      sueldo_base: Number(newEmp.sueldo_base) || 500000,
      tipo_contrato: 'indefinido', tipo_jornada: newEmp.tipo_jornada,
      horas_semanales: horasMap[newEmp.tipo_jornada] || 45,
      fecha_inicio: new Date().toISOString().split('T')[0],
      cargo: newEmp.cargo, estado: 'activo',
    });
    if (contErr) {
      setEmpError(`Empleado creado pero falló el contrato: ${contErr.message}`);
      setSavingEmp(false);
      loadEmpleados();
      return;
    }
    setNewEmp({ nombre: '', apellido_paterno: '', rut: '', email: '', cargo: 'asesora_hogar', sueldo_base: '', tipo_jornada: 'completa' });
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
        <button onClick={() => setShowAddForm(!showAddForm)} className="inline-flex items-center gap-2 rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 transition-colors">
          <Plus className="h-4 w-4" />
          Agregar Empleado
        </button>
      </div>

      {/* Add employee form */}
      {showAddForm && (
        <div className="rounded-xl border border-zinc-200 bg-white p-5 space-y-3">
          <h3 className="text-sm font-semibold text-zinc-900">Nuevo Empleado</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input placeholder="Nombre *" value={newEmp.nombre} onChange={e => setNewEmp(p => ({ ...p, nombre: e.target.value }))}
              className="border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-300" />
            <input placeholder="Apellido Paterno *" value={newEmp.apellido_paterno} onChange={e => setNewEmp(p => ({ ...p, apellido_paterno: e.target.value }))}
              className="border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-300" />
            <input placeholder="RUT (12345678-9) *" value={newEmp.rut} onChange={e => setNewEmp(p => ({ ...p, rut: e.target.value }))}
              className="border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-300" />
            <input placeholder="Email (para invitar al portal)" type="email" value={newEmp.email} onChange={e => setNewEmp(p => ({ ...p, email: e.target.value }))}
              className="border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-300" />
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
            <input placeholder="Sueldo Base (CLP)" type="number" value={newEmp.sueldo_base} onChange={e => setNewEmp(p => ({ ...p, sueldo_base: e.target.value }))}
              className="border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-300" />
            <select value={newEmp.tipo_jornada} onChange={e => setNewEmp(p => ({ ...p, tipo_jornada: e.target.value }))}
              className="border border-zinc-200 rounded-lg px-3 py-2 text-sm bg-white">
              <option value="completa">Jornada Completa (45h)</option>
              <option value="parcial">Jornada Parcial</option>
              <option value="art22">Art. 22</option>
            </select>
          </div>
          {empError && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{empError}</p>
          )}
          <div className="flex gap-2 justify-end">
            <button onClick={() => setShowAddForm(false)} className="px-4 py-2 text-sm text-zinc-600 border border-zinc-200 rounded-lg hover:bg-zinc-50">Cancelar</button>
            <button onClick={handleAddEmpleado} disabled={savingEmp || !newEmp.nombre || !newEmp.rut}
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
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700">
                      {modalidad}
                    </span>
                    <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
                      {emp.estado === 'activo' ? 'Activo' : emp.estado || 'Activo'}
                    </span>
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
                    href={`/empresa/empleados/${emp.id}`}
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
