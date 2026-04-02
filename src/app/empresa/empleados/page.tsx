'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
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
  const { profile } = useAuth();
  const empleadorId = profile?.empleador_id || '';
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [loading, setLoading] = useState(true);

  const loadEmpleados = useCallback(async () => {
    if (!empleadorId) return;
    const supabase = createClient();
    const { data } = await supabase
      .from('trabajadores')
      .select('*, contratos(*)')
      .order('nombre');

    setEmpleados(data || []);
    setLoading(false);
  }, [empleadorId]);

  useEffect(() => { loadEmpleados(); }, [loadEmpleados]);

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-zinc-400" />
      </div>
    );
  }

  const activos = empleados.filter((e) => e.estado !== 'inactivo');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Mis Colaboradores</h1>
          <p className="text-sm text-zinc-500 mt-1">{activos.length} empleado{activos.length !== 1 ? 's' : ''} activo{activos.length !== 1 ? 's' : ''}</p>
        </div>
        <button className="inline-flex items-center gap-2 rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 transition-colors">
          <Plus className="h-4 w-4" />
          Agregar Empleado
        </button>
      </div>

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
