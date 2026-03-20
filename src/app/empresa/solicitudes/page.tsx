'use client';

import { useState } from 'react';
import {
  Stethoscope,
  Building2,
  Palmtree,
  Clock,
  Check,
  X,
} from 'lucide-react';

type TabKey = 'pendientes' | 'aprobadas' | 'rechazadas' | 'todas';

type EstadoSolicitud = 'pendiente' | 'aprobada' | 'rechazada';

const solicitudes: { id: number; tipo: string; icon: typeof Stethoscope; iconColor: string; empleado: string; fecha: string; duracion: string; motivo: string; estado: EstadoSolicitud; estadoLabel: string; estadoColor: string; aprobadaEl: string | null }[] = [
  {
    id: 1,
    tipo: 'Permiso Médico',
    icon: Stethoscope,
    iconColor: 'text-rose-500 bg-rose-50',
    empleado: 'María López',
    fecha: '22 Mar 2026',
    duracion: '1 día',
    motivo: 'Control médico rutinario',
    estado: 'pendiente',
    estadoLabel: 'Pendiente',
    estadoColor: 'bg-amber-50 text-amber-700',
    aprobadaEl: null,
  },
  {
    id: 2,
    tipo: 'Día Administrativo',
    icon: Building2,
    iconColor: 'text-blue-500 bg-blue-50',
    empleado: 'Juan Pérez',
    fecha: '25 Mar 2026',
    duracion: '1 día',
    motivo: 'Trámite en Registro Civil',
    estado: 'pendiente' as const,
    estadoLabel: 'Pendiente',
    estadoColor: 'bg-amber-50 text-amber-700',
    aprobadaEl: null,
  },
  {
    id: 3,
    tipo: 'Vacaciones',
    icon: Palmtree,
    iconColor: 'text-emerald-500 bg-emerald-50',
    empleado: 'María López',
    fecha: '1 - 10 Abr 2026',
    duracion: '8 días',
    motivo: 'Vacaciones familiares',
    estado: 'aprobada' as const,
    estadoLabel: 'Aprobada',
    estadoColor: 'bg-emerald-50 text-emerald-700',
    aprobadaEl: 'Aprobada el 15 Mar',
  },
  {
    id: 4,
    tipo: 'Permiso sin goce',
    icon: Clock,
    iconColor: 'text-zinc-500 bg-zinc-100',
    empleado: 'Pedro Soto',
    fecha: '5 Mar 2026',
    duracion: '1 día',
    motivo: 'Asunto personal',
    estado: 'aprobada' as const,
    estadoLabel: 'Aprobada',
    estadoColor: 'bg-emerald-50 text-emerald-700',
    aprobadaEl: 'Aprobada el 3 Mar',
  },
];

const tabs: { key: TabKey; label: string }[] = [
  { key: 'pendientes', label: 'Pendientes' },
  { key: 'aprobadas', label: 'Aprobadas' },
  { key: 'rechazadas', label: 'Rechazadas' },
  { key: 'todas', label: 'Todas' },
];

export default function SolicitudesPage() {
  const [activeTab, setActiveTab] = useState<TabKey>('todas');

  const filtered =
    activeTab === 'todas'
      ? solicitudes
      : solicitudes.filter((s) =>
          activeTab === 'pendientes'
            ? s.estado === 'pendiente'
            : activeTab === 'aprobadas'
            ? s.estado === 'aprobada'
            : s.estado === 'rechazada'
        );

  const pendingCount = solicitudes.filter((s) => s.estado === 'pendiente').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-zinc-900">Solicitudes</h1>
          <span className="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700">
            {pendingCount} pendientes
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-lg bg-zinc-100 p-1 w-fit">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? 'bg-white text-zinc-900 shadow-sm'
                : 'text-zinc-500 hover:text-zinc-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Solicitudes list */}
      <div className="space-y-4">
        {filtered.map((sol) => {
          const Icon = sol.icon;
          return (
            <div
              key={sol.id}
              className="rounded-xl border border-zinc-200 bg-white p-5"
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-lg ${sol.iconColor}`}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-zinc-900">{sol.tipo}</p>
                    <p className="text-sm text-zinc-600 mt-0.5">{sol.empleado}</p>
                    <p className="text-xs text-zinc-500 mt-1">
                      {sol.fecha} &middot; {sol.duracion}
                    </p>
                    <p className="text-sm text-zinc-500 mt-2">{sol.motivo}</p>
                    {sol.aprobadaEl && (
                      <p className="text-xs text-zinc-400 mt-1">{sol.aprobadaEl}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 sm:flex-col sm:items-end">
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${sol.estadoColor}`}
                  >
                    {sol.estadoLabel}
                  </span>

                  {sol.estado === 'pendiente' && (
                    <div className="flex gap-2 mt-0 sm:mt-2">
                      <button className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 transition-colors">
                        <Check className="h-3.5 w-3.5" />
                        Aprobar
                      </button>
                      <button className="inline-flex items-center gap-1 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700 transition-colors">
                        <X className="h-3.5 w-3.5" />
                        Rechazar
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="rounded-xl border border-zinc-200 bg-white p-8 text-center">
            <p className="text-sm text-zinc-500">No hay solicitudes en esta categoría</p>
          </div>
        )}
      </div>
    </div>
  );
}
