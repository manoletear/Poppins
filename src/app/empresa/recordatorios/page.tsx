'use client';

import { useState } from 'react';
import {
  Plus,
  Dog,
  Pill,
  ShoppingBag,
  Trash2,
  Cat,
  ClipboardList,
} from 'lucide-react';

interface Recordatorio {
  id: number;
  titulo: string;
  horario: string;
  dias: string;
  asignado: string | null;
  tipo: string;
  iconColor: string;
  borderColor: string;
  activo: boolean;
}

const initialRecordatorios: Recordatorio[] = [
  {
    id: 1,
    titulo: 'Pasear a Rocky',
    horario: '07:00 y 18:00',
    dias: 'L-M-M-J-V',
    asignado: 'María',
    tipo: 'mascota',
    iconColor: 'text-amber-500 bg-amber-50',
    borderColor: 'border-l-amber-500',
    activo: true,
  },
  {
    id: 2,
    titulo: 'Remedio Martín (inhalador)',
    horario: '08:00 y 20:00',
    dias: 'Todos los días',
    asignado: null,
    tipo: 'medicamento',
    iconColor: 'text-red-500 bg-red-50',
    borderColor: 'border-l-red-500',
    activo: true,
  },
  {
    id: 3,
    titulo: 'Revisar stock limpieza',
    horario: '09:00',
    dias: 'Lunes',
    asignado: null,
    tipo: 'compras',
    iconColor: 'text-blue-500 bg-blue-50',
    borderColor: 'border-l-blue-500',
    activo: true,
  },
  {
    id: 4,
    titulo: 'Sacar basura',
    horario: '20:00',
    dias: 'Ma-J',
    asignado: null,
    tipo: 'tarea',
    iconColor: 'text-zinc-500 bg-zinc-100',
    borderColor: 'border-l-zinc-400',
    activo: true,
  },
  {
    id: 5,
    titulo: 'Cambiar arena Luna',
    horario: '10:00',
    dias: 'L-M-V',
    asignado: 'María',
    tipo: 'mascota',
    iconColor: 'text-violet-500 bg-violet-50',
    borderColor: 'border-l-violet-500',
    activo: true,
  },
];

function getIcon(tipo: string) {
  switch (tipo) {
    case 'mascota':
      return Dog;
    case 'medicamento':
      return Pill;
    case 'compras':
      return ShoppingBag;
    case 'tarea':
      return Trash2;
    default:
      return ClipboardList;
  }
}

export default function RecordatoriosPage() {
  const [recordatorios, setRecordatorios] = useState(initialRecordatorios);

  const toggleActivo = (id: number) => {
    setRecordatorios((prev) =>
      prev.map((r) => (r.id === id ? { ...r, activo: !r.activo } : r))
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold text-zinc-900">Recordatorios</h1>
        <button className="inline-flex items-center gap-2 rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 transition-colors">
          <Plus className="h-4 w-4" />
          Nuevo Recordatorio
        </button>
      </div>

      {/* Recordatorios list */}
      <div className="space-y-3">
        {recordatorios.map((rec) => {
          const Icon = getIcon(rec.tipo);
          // Use Cat icon for the second pet reminder to differentiate
          const DisplayIcon = rec.id === 5 ? Cat : Icon;

          return (
            <div
              key={rec.id}
              className={`rounded-lg border border-zinc-200 border-l-4 ${rec.borderColor} p-4 transition-opacity ${
                rec.activo ? 'opacity-100' : 'opacity-50'
              }`}
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-lg ${rec.iconColor}`}
                  >
                    <DisplayIcon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-zinc-900">{rec.titulo}</p>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      {rec.horario} &middot; {rec.dias}
                    </p>
                    {rec.asignado && (
                      <p className="text-xs text-zinc-400 mt-0.5">
                        Asignado: {rec.asignado}
                      </p>
                    )}
                  </div>
                </div>

                {/* Toggle */}
                <button
                  onClick={() => toggleActivo(rec.id)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    rec.activo ? 'bg-emerald-500' : 'bg-zinc-300'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      rec.activo ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
