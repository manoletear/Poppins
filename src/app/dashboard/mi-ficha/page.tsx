'use client';

import { useState } from 'react';
import { Pencil, ChevronUp, ChevronDown } from 'lucide-react';

const tabs = ['Resumen', 'Liquidaciones', 'Documentos', 'Historial'] as const;

const resumenData = [
  { label: 'Cargo', value: 'Gerente General' },
  { label: 'Empresa', value: 'Rene Alejandro Aravena Riffo' },
  { label: 'Supervisor', value: 'Aravena, Rene Alejandro' },
  {
    label: 'Equipo',
    value: (
      <span className="text-blue-600 hover:text-blue-700 cursor-pointer">
        4 Colaboradores
      </span>
    ),
  },
  {
    label: 'Sueldo Base',
    value: (
      <>
        $3.500.000
        <span className="text-zinc-400 text-xs ml-2">(Líquido: $2.934.522)</span>
      </>
    ),
  },
  { label: 'Tipo Contrato', value: 'Indefinido' },
  { label: 'Jornada Laboral', value: 'Mensual 45.0 hrs. (L, M, M, J, V)' },
  {
    label: 'Fecha Ingreso',
    value: (
      <>
        1 de febrero 2026
        <span className="text-zinc-400 text-xs ml-2">(alrededor de 2 meses)</span>
      </>
    ),
  },
  { label: 'Saldo Vacaciones', value: '2.0 días' },
  { label: 'AFP', value: 'Cuprum (11.44%)' },
  { label: 'Salud', value: 'Banmédica (ISAPRE, 8.5 UF)' },
  { label: 'Cargas Familiares', value: '3' },
];

const infoFields = [
  { label: 'Identificación (RUT)', value: '6.836.579-1' },
  { label: 'Correo Corporativo', value: 'manuel.aravenal@gmail.com' },
  { label: 'Cumpleaños', value: '19-10-1951 (74 años)' },
  { label: 'Dirección', value: 'Av. Principal 1234' },
  { label: 'Teléfono', value: '+56 9 1234 5678' },
];

export default function MiFichaPage() {
  const [activeTab, setActiveTab] = useState<string>('Resumen');
  const [infoOpen, setInfoOpen] = useState(true);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-zinc-900">Mi Ficha</h2>
        <p className="text-sm text-zinc-500">Perfil del colaborador</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left sidebar */}
        <div className="w-full lg:w-72 shrink-0 rounded-xl border border-zinc-200 bg-white">
          {/* Header section */}
          <div className="bg-gradient-to-br from-indigo-50 via-blue-50 to-sky-50 px-6 pt-8 pb-6 rounded-t-xl flex flex-col items-center text-center">
            <div className="h-20 w-20 rounded-full bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center text-2xl font-bold text-white shadow-lg shadow-indigo-200">
              RA
            </div>
            <h3 className="mt-4 text-base font-bold text-zinc-900">
              Rene Alejandro Aravena Riffo
            </h3>
            <p className="text-sm text-zinc-500">Gerente General</p>
            <span className="mt-2 rounded-full bg-indigo-100 px-3 py-0.5 text-xs font-semibold text-indigo-700">
              Ficha: F1
            </span>
            <button className="mt-4 inline-flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 transition-colors">
              <Pencil className="h-3.5 w-3.5" />
              Actualizar Datos
            </button>
          </div>

          {/* Info section */}
          <div className="px-5 py-4">
            <button
              onClick={() => setInfoOpen(!infoOpen)}
              className="flex w-full items-center justify-between text-sm font-semibold text-zinc-700"
            >
              Información General
              {infoOpen ? (
                <ChevronUp className="h-4 w-4 text-zinc-400" />
              ) : (
                <ChevronDown className="h-4 w-4 text-zinc-400" />
              )}
            </button>

            {infoOpen && (
              <dl className="mt-4 space-y-4">
                {infoFields.map((field) => (
                  <div key={field.label}>
                    <dt className="text-[11px] font-medium text-zinc-400 uppercase tracking-wide">
                      {field.label}
                    </dt>
                    <dd className="text-sm text-zinc-900 font-medium">
                      {field.value}
                    </dd>
                  </div>
                ))}
              </dl>
            )}
          </div>
        </div>

        {/* Right content area */}
        <div className="flex-1 min-w-0">
          {/* Tabs bar */}
          <div className="border-b border-zinc-200">
            <nav className="flex gap-0">
              {tabs.map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === tab
                      ? 'border-zinc-900 text-zinc-900'
                      : 'border-transparent text-zinc-500 hover:text-zinc-700'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </nav>
          </div>

          {/* Tab content */}
          {activeTab === 'Resumen' && (
            <div className="mt-6 rounded-xl border border-zinc-200 bg-white">
              <dl className="divide-y divide-zinc-100">
                {resumenData.map((row, idx) => (
                  <div
                    key={idx}
                    className="grid grid-cols-3 gap-4 px-6 py-3.5 hover:bg-zinc-50/50 transition-colors"
                  >
                    <dt className="text-sm font-medium text-zinc-500">
                      {row.label}
                    </dt>
                    <dd className="col-span-2 text-sm text-zinc-900 font-medium">
                      {row.value}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
