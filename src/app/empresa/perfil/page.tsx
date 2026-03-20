'use client';

import { useState } from 'react';
import {
  Pencil,
  Heart,
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  CreditCard,
  Dog,
  Cat,
  GripVertical,
  StickyNote,
} from 'lucide-react';

const tabs = ['Familia', 'Mascotas', 'Preferencias'] as const;
type Tab = (typeof tabs)[number];

const hijos = [
  {
    nombre: 'Sebastián Aravena Pérez',
    edad: 28,
    alergias: 'Ninguna',
    condiciones: 'Ninguna',
    badge: 'Adulto',
    badgeClass: 'bg-zinc-100 text-zinc-700',
    nota: null,
  },
  {
    nombre: 'Catalina Aravena Pérez',
    edad: 24,
    alergias: 'Frutos secos',
    condiciones: 'Ninguna',
    badge: 'Adulto',
    badgeClass: 'bg-zinc-100 text-zinc-700',
    nota: null,
  },
  {
    nombre: 'Martín Aravena Pérez',
    edad: 15,
    alergias: 'Ninguna',
    condiciones: 'Asma leve',
    badge: 'Menor',
    badgeClass: 'bg-amber-100 text-amber-700',
    nota: 'Requiere supervisión escolar',
  },
];

const mascotas = [
  {
    nombre: 'Rocky',
    tipo: 'Perro',
    raza: 'Golden Retriever',
    edad: 5,
    notas: 'Paseo diario 2 veces. Comida especial para alergia cutánea.',
    icon: 'dog' as const,
    colorFrom: 'from-amber-50',
    colorTo: 'to-amber-100',
    iconColor: 'text-amber-600',
    iconBg: 'bg-amber-100',
  },
  {
    nombre: 'Luna',
    tipo: 'Gata',
    raza: 'Siamés',
    edad: 3,
    notas: 'Solo comida húmeda. Arena sanitaria cambiar cada 2 días.',
    icon: 'cat' as const,
    colorFrom: 'from-violet-50',
    colorTo: 'to-violet-100',
    iconColor: 'text-violet-600',
    iconBg: 'bg-violet-100',
  },
];

const prioridades = [
  { titulo: 'Aseo y limpieza general', badge: 'Máxima' },
  { titulo: 'Cuidado de los niños', badge: null },
  { titulo: 'Cocina y preparación de alimentos', badge: null },
  { titulo: 'Lavado y planchado de ropa', badge: null },
  { titulo: 'Cuidado de mascotas', badge: null },
  { titulo: 'Orden y organización', badge: null },
  { titulo: 'Compras del hogar', badge: null },
  { titulo: 'Jardinería', badge: 'Baja' },
];

export default function PerfilEmpleadorPage() {
  const [activeTab, setActiveTab] = useState<Tab>('Familia');

  return (
    <div className="min-h-screen bg-zinc-50 p-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Mi Perfil</h1>
          <p className="text-sm text-zinc-500">Datos personales y familiares</p>
        </div>
        <button className="flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50">
          <Pencil className="h-4 w-4" />
          Editar Perfil
        </button>
      </div>

      {/* Layout */}
      <div className="flex flex-col gap-6 lg:flex-row">
        {/* Left Panel */}
        <div className="w-full lg:w-80 shrink-0">
          <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
            {/* Profile Card Header */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-6 pt-8 pb-6 flex flex-col items-center text-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-blue-700 text-2xl font-bold text-white mb-3">
                RA
              </div>
              <h2 className="text-base font-bold text-zinc-900">
                Rene Alejandro Aravena Riffo
              </h2>
              <p className="text-sm text-zinc-500">Empleador</p>
              <span className="mt-2 rounded-full bg-blue-100 px-3 py-0.5 text-xs font-semibold text-blue-700">
                Plan Premium
              </span>
            </div>

            {/* Personal Info */}
            <div className="px-5 py-4 space-y-3">
              <InfoField icon={<CreditCard className="h-4 w-4 text-zinc-400" />} label="RUT" value="6.836.579-1" />
              <InfoField icon={<Mail className="h-4 w-4 text-zinc-400" />} label="Email" value="manuel.aravenal@gmail.com" />
              <InfoField icon={<Phone className="h-4 w-4 text-zinc-400" />} label="Teléfono" value="+56 9 1234 5678" />
              <InfoField icon={<Calendar className="h-4 w-4 text-zinc-400" />} label="Fecha Nacimiento" value="19 octubre 1951" />
              <InfoField icon={<MapPin className="h-4 w-4 text-zinc-400" />} label="Dirección" value="Av. Principal 1234, Las Condes, Santiago" />
              <div>
                <dt className="text-[11px] font-medium uppercase text-zinc-400">
                  Cuentas Activas
                </dt>
                <dd className="text-sm font-medium text-amber-600">2 de 2</dd>
              </div>
            </div>
          </div>
        </div>

        {/* Right Panel */}
        <div className="flex-1 space-y-6">
          {/* Tab Bar */}
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

          {/* Tab Content */}
          {activeTab === 'Familia' && <FamiliaTab />}
          {activeTab === 'Mascotas' && <MascotasTab />}
          {activeTab === 'Preferencias' && <PreferenciasTab />}
        </div>
      </div>
    </div>
  );
}

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
        <dt className="text-[11px] font-medium uppercase text-zinc-400">
          {label}
        </dt>
        <dd className="text-sm font-medium text-zinc-900">{value}</dd>
      </div>
    </div>
  );
}

function FamiliaTab() {
  return (
    <div className="space-y-6">
      {/* Cónyuge */}
      <div>
        <h3 className="mb-3 text-sm font-semibold text-zinc-700">Cónyuge</h3>
        <div className="rounded-xl border border-zinc-200 bg-white p-5">
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-rose-50">
              <Heart className="h-5 w-5 text-rose-500" />
            </div>
            <div className="flex-1">
              <h4 className="font-bold text-zinc-900">
                Carmen Gloria Pérez Muñoz
              </h4>
              <p className="text-xs text-zinc-500">Cónyuge</p>
              <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1">
                <div className="flex items-center gap-1.5 text-sm text-zinc-600">
                  <Phone className="h-3.5 w-3.5 text-zinc-400" />
                  +56 9 8765 4321
                </div>
                <div className="flex items-center gap-1.5 text-sm text-zinc-600">
                  <Mail className="h-3.5 w-3.5 text-zinc-400" />
                  carmen.perez@gmail.com
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Hijos */}
      <div>
        <div className="mb-3 flex items-center gap-2">
          <h3 className="text-sm font-semibold text-zinc-700">Hijos</h3>
          <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-600">
            3 hijos
          </span>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {hijos.map((hijo) => (
            <div
              key={hijo.nombre}
              className="rounded-xl border border-zinc-200 bg-white p-4"
            >
              <div className="mb-2 flex items-center justify-between">
                <h4 className="text-sm font-bold text-zinc-900">
                  {hijo.nombre}
                </h4>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${hijo.badgeClass}`}
                >
                  {hijo.badge}
                </span>
              </div>
              <div className="space-y-1.5">
                <div className="text-xs">
                  <span className="text-zinc-400">Edad: </span>
                  <span className="text-zinc-700">{hijo.edad} años</span>
                </div>
                <div className="text-xs">
                  <span className="text-zinc-400">Alergias: </span>
                  <span className="text-zinc-700">{hijo.alergias}</span>
                </div>
                <div className="text-xs">
                  <span className="text-zinc-400">Condiciones: </span>
                  <span className="text-zinc-700">{hijo.condiciones}</span>
                </div>
              </div>
              {hijo.nota && (
                <p className="mt-2 rounded-lg bg-amber-50 px-2.5 py-1.5 text-[11px] text-amber-700">
                  {hijo.nota}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function MascotasTab() {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {mascotas.map((mascota) => (
        <div
          key={mascota.nombre}
          className="rounded-xl border border-zinc-200 bg-white overflow-hidden"
        >
          <div
            className={`bg-gradient-to-r ${mascota.colorFrom} ${mascota.colorTo} px-5 py-4 flex items-center gap-3`}
          >
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-full ${mascota.iconBg}`}
            >
              {mascota.icon === 'dog' ? (
                <Dog className={`h-5 w-5 ${mascota.iconColor}`} />
              ) : (
                <Cat className={`h-5 w-5 ${mascota.iconColor}`} />
              )}
            </div>
            <div>
              <h4 className="text-sm font-bold text-zinc-900">
                {mascota.nombre}
              </h4>
              <p className="text-xs text-zinc-500">
                {mascota.tipo} &middot; {mascota.raza}
              </p>
            </div>
          </div>
          <div className="px-5 py-4 space-y-2">
            <div className="text-xs">
              <span className="text-zinc-400">Edad: </span>
              <span className="text-zinc-700">{mascota.edad} años</span>
            </div>
            <div className="text-xs">
              <span className="text-zinc-400">Notas: </span>
              <span className="text-zinc-700">{mascota.notas}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function PreferenciasTab() {
  return (
    <div className="space-y-6">
      {/* Prioridades de trabajo */}
      <div>
        <h3 className="mb-3 text-sm font-semibold text-zinc-700">
          Prioridades de trabajo
        </h3>
        <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
          {prioridades.map((item, index) => (
            <div
              key={item.titulo}
              className="flex items-center gap-3 border-b border-zinc-100 px-4 py-3 last:border-b-0"
            >
              <GripVertical className="h-4 w-4 text-zinc-300" />
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-zinc-900 text-xs font-bold text-white">
                {index + 1}
              </div>
              <span className="flex-1 text-sm font-medium text-zinc-800">
                {item.titulo}
              </span>
              {item.badge && (
                <span
                  className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${
                    item.badge === 'Máxima'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-zinc-100 text-zinc-500'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Notas generales */}
      <div>
        <h3 className="mb-3 text-sm font-semibold text-zinc-700">
          Notas generales
        </h3>
        <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-sm italic text-zinc-700">
          Me preocupa más el aseo que la cocina. La nana debe priorizar el orden
          y limpieza de la casa antes de cocinar. Los niños son la prioridad
          cuando están en casa (fines de semana y después de las 16:00). Rocky
          necesita paseo a las 7:00 y 18:00 sin falta.
        </div>
      </div>
    </div>
  );
}
