'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Users,
  Plus,
  Clock,
  FileText,
  Calendar,
  Palmtree,
  ChevronRight,
} from 'lucide-react';

const empleados = [
  {
    id: 1,
    nombre: 'María López Soto',
    iniciales: 'ML',
    color: 'bg-rose-500',
    gradientFrom: 'from-rose-500',
    gradientTo: 'to-rose-600',
    labor: 'Empleada Doméstica',
    modalidad: 'Puertas Afuera',
    horario: 'L-V 08:00 - 17:00',
    contrato: '#PA-2024-001',
    sueldo: '$650.000',
    estado: 'Activa',
    antiguedad: '2 años, 1 mes',
    vacaciones: '8.5 días',
  },
  {
    id: 2,
    nombre: 'Juan Pérez González',
    iniciales: 'JP',
    color: 'bg-emerald-500',
    gradientFrom: 'from-emerald-500',
    gradientTo: 'to-emerald-600',
    labor: 'Jardinero',
    modalidad: 'Puertas Afuera',
    horario: 'L-Mi-V 08:00 - 13:00',
    contrato: '#PA-2024-002',
    sueldo: '$350.000',
    estado: 'Activo',
    antiguedad: '1 año, 6 meses',
    vacaciones: '5 días',
  },
  {
    id: 3,
    nombre: 'Pedro Soto Muñoz',
    iniciales: 'PS',
    color: 'bg-cyan-500',
    gradientFrom: 'from-cyan-500',
    gradientTo: 'to-cyan-600',
    labor: 'Piscinero',
    modalidad: 'Puertas Afuera',
    horario: 'Ma-Sá 09:00 - 11:00',
    contrato: '#PA-2024-003',
    sueldo: '$250.000',
    estado: 'Activo',
    antiguedad: '8 meses',
    vacaciones: '3 días',
  },
];

export default function EmpleadosPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Mis Colaboradores</h1>
          <p className="text-sm text-zinc-500 mt-1">3 empleados activos</p>
        </div>
        <button className="inline-flex items-center gap-2 rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 transition-colors">
          <Plus className="h-4 w-4" />
          Agregar Empleado
        </button>
      </div>

      {/* Employee grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {empleados.map((emp) => (
          <div
            key={emp.id}
            className="rounded-xl border border-zinc-200 bg-white overflow-hidden"
          >
            {/* Card header with gradient */}
            <div
              className={`bg-gradient-to-r ${emp.gradientFrom} ${emp.gradientTo} px-5 py-4`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-12 w-12 items-center justify-center rounded-full bg-white/20 text-base font-bold text-white`}
                >
                  {emp.iniciales}
                </div>
                <div>
                  <p className="text-base font-semibold text-white">{emp.nombre}</p>
                  <p className="text-sm text-white/80">{emp.labor}</p>
                </div>
              </div>
            </div>

            {/* Card body */}
            <div className="px-5 py-4 space-y-3">
              {/* Modalidad badge */}
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700">
                  {emp.modalidad}
                </span>
                <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
                  {emp.estado}
                </span>
              </div>

              {/* Details */}
              <div className="space-y-2 text-sm text-zinc-600">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-zinc-400" />
                  <span>{emp.horario}</span>
                </div>
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-zinc-400" />
                  <span>Contrato: {emp.contrato}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-zinc-400 text-base font-medium ml-0.5">$</span>
                  <span className="ml-0.5">Sueldo: {emp.sueldo}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-zinc-400" />
                  <span>Antigüedad: {emp.antiguedad}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Palmtree className="h-4 w-4 text-zinc-400" />
                  <span>Vacaciones pendientes: {emp.vacaciones}</span>
                </div>
              </div>

              {/* Action */}
              <Link
                href={`/empresa/empleados/${emp.id}`}
                className="mt-2 inline-flex w-full items-center justify-center gap-1 rounded-lg border border-zinc-200 px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 transition-colors"
              >
                Ver Detalle
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
