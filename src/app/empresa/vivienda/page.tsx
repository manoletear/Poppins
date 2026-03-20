'use client';

import { Pencil, Home, TreePine, Waves, Check, X } from 'lucide-react';

const stats = [
  { label: 'Superficie construida', value: '350 m²' },
  { label: 'Terreno total', value: '780 m²' },
  { label: 'Pisos', value: '2' },
  { label: 'Dormitorios', value: '5' },
  { label: 'Baños', value: '4' },
  { label: 'Estacionamientos', value: '3' },
];

const features = [
  { name: 'Piscina', has: true },
  { name: 'Jardín (250 m²)', has: true },
  { name: 'Terraza', has: true },
  { name: 'Quincho', has: true },
  { name: 'Patio Interior (100 m²)', has: true },
  { name: 'Ascensor', has: false },
];

const services = [
  {
    title: 'Empleada Doméstica',
    icon: Home,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    lines: [
      '350m² requieren limpieza diaria',
      '5 dormitorios, 4 baños',
      'Recomendado: Jornada completa',
    ],
  },
  {
    title: 'Jardinero',
    icon: TreePine,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    lines: [
      '250m² de jardín + 100m² patio',
      'Mantención semanal recomendada',
      'Incluye poda y riego',
    ],
  },
  {
    title: 'Piscinero',
    icon: Waves,
    color: 'text-cyan-600',
    bgColor: 'bg-cyan-50',
    lines: [
      'Piscina activa',
      'Mantención 2 veces por semana',
      'Control pH, cloro, limpieza filtros',
    ],
  },
];

export default function ViviendaPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Mi Vivienda</h1>
          <p className="text-sm text-zinc-500">Detalles de tu propiedad</p>
        </div>
        <button className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 transition-colors">
          <Pencil className="h-4 w-4" />
          Editar
        </button>
      </div>

      {/* Main Grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main Info Card */}
        <div className="lg:col-span-2 rounded-xl border bg-white p-6">
          <div className="flex items-center gap-3 mb-1">
            <h2 className="text-lg font-semibold text-zinc-900">Casa en Las Condes</h2>
            <span className="rounded-full bg-blue-100 px-3 py-0.5 text-xs font-medium text-blue-700">
              Casa
            </span>
          </div>
          <p className="text-sm text-zinc-500">Av. Principal 1234, Las Condes, Santiago</p>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-6">
            {stats.map((stat) => (
              <div key={stat.label} className="rounded-lg bg-zinc-50 p-4 text-center">
                <p className="text-xs text-zinc-500">{stat.label}</p>
                <p className="mt-1 text-lg font-semibold text-zinc-900">{stat.value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Features Card */}
        <div className="rounded-xl border bg-white p-6">
          <h3 className="text-base font-semibold text-zinc-900 mb-4">Características</h3>
          <div className="space-y-0">
            {features.map((feature) => (
              <div
                key={feature.name}
                className="flex items-center gap-3 py-2.5 border-b border-zinc-50"
              >
                {feature.has ? (
                  <Check className="h-5 w-5 text-emerald-500 shrink-0" />
                ) : (
                  <X className="h-5 w-5 text-zinc-300 shrink-0" />
                )}
                <span className={`text-sm ${feature.has ? 'text-zinc-700' : 'text-zinc-400'}`}>
                  {feature.name}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Service Implications Card */}
        <div className="lg:col-span-3 rounded-xl border bg-white p-6">
          <h3 className="text-base font-semibold text-zinc-900 mb-4">
            Servicios Requeridos según Vivienda
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {services.map((service) => {
              const Icon = service.icon;
              return (
                <div
                  key={service.title}
                  className="rounded-xl border border-dashed p-4"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`rounded-lg ${service.bgColor} p-2`}>
                      <Icon className={`h-5 w-5 ${service.color}`} />
                    </div>
                    <h4 className="text-sm font-semibold text-zinc-900">{service.title}</h4>
                  </div>
                  <ul className="space-y-1.5">
                    {service.lines.map((line) => (
                      <li key={line} className="text-xs text-zinc-500">
                        {line}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
