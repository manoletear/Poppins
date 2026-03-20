'use client';

import { Plus, Pencil, Heart, User, Dog, Cat, Phone, Mail } from 'lucide-react';

const hijos = [
  {
    name: 'Sebastián',
    age: 28,
    status: 'Adulto',
    livesHome: false,
    details: ['Independiente', 'No vive en casa'],
  },
  {
    name: 'Catalina',
    age: 24,
    status: 'Adulta',
    livesHome: true,
    details: ['Vive en casa', 'Alergia: frutos secos'],
  },
  {
    name: 'Martín',
    age: 15,
    status: 'Menor',
    livesHome: true,
    details: [
      'Vive en casa',
      'Asma leve',
      'Colegio: Santiago College',
      'Horario escolar: 8:00 - 16:00',
    ],
  },
];

const mascotas = [
  {
    name: 'Rocky',
    type: 'Perro',
    breed: 'Golden Retriever',
    age: '5 años',
    icon: Dog,
    details: [
      'Paseo: 7:00 y 18:00',
      'Comida: Royal Canin Dermacomfort 2 veces/día',
      'Veterinario: Dr. Martínez - +56 9 5555 1234',
    ],
  },
  {
    name: 'Luna',
    type: 'Gata',
    breed: 'Siamés',
    age: '3 años',
    icon: Cat,
    details: [
      'Comida: Solo húmeda, 3 veces/día',
      'Arena: Cambio cada 2 días',
      'Veterinario: Dr. Martínez - +56 9 5555 1234',
    ],
  },
];

export default function FamiliaPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Mi Familia</h1>
          <p className="text-sm text-zinc-500">Gestiona los datos de tu familia</p>
        </div>
        <button className="inline-flex items-center gap-2 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 transition-colors">
          <Plus className="h-4 w-4" />
          Agregar Familiar
        </button>
      </div>

      {/* Cónyuge */}
      <div className="rounded-xl border bg-white p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="rounded-lg bg-rose-50 p-2">
            <Heart className="h-5 w-5 text-rose-500" />
          </div>
          <h2 className="text-lg font-semibold text-zinc-900">Cónyuge</h2>
        </div>
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <p className="text-base font-medium text-zinc-900">Carmen Gloria Pérez Muñoz</p>
            <div className="flex items-center gap-2 text-sm text-zinc-500">
              <Phone className="h-4 w-4" />
              <span>+56 9 8765 4321</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-zinc-500">
              <Mail className="h-4 w-4" />
              <span>carmen.perez@gmail.com</span>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-sm text-zinc-500">Cuenta activa:</span>
              <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">
                Sí
              </span>
              <span className="text-xs text-zinc-400">Acceso #2 de 2</span>
            </div>
          </div>
          <button className="rounded-lg border border-zinc-200 p-2 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-50 transition-colors">
            <Pencil className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Hijos */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <h2 className="text-lg font-semibold text-zinc-900">Hijos</h2>
          <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-600">
            3
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {hijos.map((hijo) => (
            <div key={hijo.name} className="rounded-xl border bg-white p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="rounded-full bg-zinc-100 p-2">
                    <User className="h-4 w-4 text-zinc-500" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-zinc-900">{hijo.name}</p>
                    <p className="text-xs text-zinc-500">{hijo.age} años</p>
                  </div>
                </div>
                <button className="rounded-lg border border-zinc-200 p-1.5 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-50 transition-colors">
                  <Pencil className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="flex items-center gap-2 mb-3">
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    hijo.status === 'Menor'
                      ? 'bg-amber-100 text-amber-700'
                      : 'bg-zinc-100 text-zinc-600'
                  }`}
                >
                  {hijo.status}
                </span>
                {hijo.livesHome ? (
                  <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">
                    Vive en casa
                  </span>
                ) : (
                  <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-500">
                    No vive en casa
                  </span>
                )}
              </div>
              <ul className="space-y-1">
                {hijo.details
                  .filter((d) => d !== 'Independiente' && d !== 'Vive en casa' && d !== 'No vive en casa')
                  .map((detail) => (
                    <li key={detail} className="text-xs text-zinc-500">
                      {detail}
                    </li>
                  ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Mascotas */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <h2 className="text-lg font-semibold text-zinc-900">Mascotas</h2>
          <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-600">
            2
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {mascotas.map((mascota) => {
            const Icon = mascota.icon;
            return (
              <div key={mascota.name} className="rounded-xl border bg-white p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="rounded-full bg-amber-50 p-2">
                      <Icon className="h-5 w-5 text-amber-600" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-zinc-900">{mascota.name}</p>
                      <p className="text-xs text-zinc-500">
                        {mascota.type} {mascota.breed} &middot; {mascota.age}
                      </p>
                    </div>
                  </div>
                  <button className="rounded-lg border border-zinc-200 p-1.5 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-50 transition-colors">
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                </div>
                <ul className="space-y-1.5 mt-2">
                  {mascota.details.map((detail) => (
                    <li key={detail} className="text-xs text-zinc-500">
                      {detail}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
