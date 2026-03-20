'use client';

import {
  CreditCard,
  Home,
  Building2,
  User,
  Briefcase,
  FileText,
  Sparkles,
} from 'lucide-react';

const pagosDelMes = [
  {
    id: 1,
    concepto: 'Arriendo',
    monto: '$1.200.000',
    fecha: 'Pagado 5 Mar',
    puntos: '+1.200 pts',
    estado: 'Pagado',
    estadoColor: 'bg-emerald-50 text-emerald-700',
    icon: Home,
    iconColor: 'text-blue-500 bg-blue-50',
  },
  {
    id: 2,
    concepto: 'Gastos Comunes',
    monto: '$180.000',
    fecha: null,
    puntos: null,
    estado: 'Pendiente',
    estadoColor: 'bg-amber-50 text-amber-700',
    icon: Building2,
    iconColor: 'text-zinc-500 bg-zinc-100',
  },
  {
    id: 3,
    concepto: 'Sueldo María (Nana)',
    monto: '$650.000',
    fecha: null,
    puntos: '+650 pts',
    estado: 'Procesando',
    estadoColor: 'bg-blue-50 text-blue-700',
    icon: User,
    iconColor: 'text-rose-500 bg-rose-50',
  },
  {
    id: 4,
    concepto: 'Sueldo Juan (Jardinero)',
    monto: '$350.000',
    fecha: null,
    puntos: '+350 pts',
    estado: 'Procesando',
    estadoColor: 'bg-blue-50 text-blue-700',
    icon: User,
    iconColor: 'text-emerald-500 bg-emerald-50',
  },
  {
    id: 5,
    concepto: 'Sueldo Pedro (Piscinero)',
    monto: '$250.000',
    fecha: null,
    puntos: '+250 pts',
    estado: 'Procesando',
    estadoColor: 'bg-blue-50 text-blue-700',
    icon: User,
    iconColor: 'text-cyan-500 bg-cyan-50',
  },
  {
    id: 6,
    concepto: 'Leyes Sociales (total)',
    monto: '$385.000',
    fecha: null,
    puntos: null,
    estado: 'Procesando',
    estadoColor: 'bg-blue-50 text-blue-700',
    icon: Briefcase,
    iconColor: 'text-violet-500 bg-violet-50',
  },
];

const historial = [
  {
    mes: 'Febrero 2026',
    items: [
      { concepto: 'Arriendo', monto: '$1.200.000', fecha: '5 Feb', estado: 'Pagado' },
      { concepto: 'Gastos Comunes', monto: '$175.000', fecha: '10 Feb', estado: 'Pagado' },
      { concepto: 'Sueldos (total)', monto: '$1.250.000', fecha: '28 Feb', estado: 'Pagado' },
      { concepto: 'Leyes Sociales', monto: '$385.000', fecha: '28 Feb', estado: 'Pagado' },
    ],
  },
  {
    mes: 'Enero 2026',
    items: [
      { concepto: 'Arriendo', monto: '$1.200.000', fecha: '5 Ene', estado: 'Pagado' },
      { concepto: 'Gastos Comunes', monto: '$175.000', fecha: '10 Ene', estado: 'Pagado' },
      { concepto: 'Sueldos (total)', monto: '$1.250.000', fecha: '30 Ene', estado: 'Pagado' },
      { concepto: 'Leyes Sociales', monto: '$385.000', fecha: '30 Ene', estado: 'Pagado' },
    ],
  },
  {
    mes: 'Diciembre 2025',
    items: [
      { concepto: 'Arriendo', monto: '$1.200.000', fecha: '5 Dic', estado: 'Pagado' },
      { concepto: 'Gastos Comunes', monto: '$170.000', fecha: '10 Dic', estado: 'Pagado' },
      { concepto: 'Sueldos (total)', monto: '$1.250.000', fecha: '30 Dic', estado: 'Pagado' },
      { concepto: 'Leyes Sociales', monto: '$385.000', fecha: '30 Dic', estado: 'Pagado' },
      { concepto: 'Aguinaldo', monto: '$180.000', fecha: '20 Dic', estado: 'Pagado' },
    ],
  },
];

export default function PagosPage() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">Pagos y Puntos</h1>
        <p className="text-sm text-zinc-500 mt-1">Gestiona tus pagos y acumula puntos</p>
      </div>

      {/* Points summary */}
      <div className="rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 p-6 text-white">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-white/80" />
              <p className="text-sm text-white/80">Puntos acumulados</p>
            </div>
            <p className="text-3xl font-bold mt-1">12.450 puntos</p>
            <p className="text-sm text-white/70 mt-1">Equivalente a $12.450 en descuentos</p>
          </div>
          <div className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-white/60" />
            <span className="text-sm text-white/80">Tarjeta ****4521</span>
          </div>
        </div>
      </div>

      {/* Pagos del Mes */}
      <div>
        <h2 className="text-lg font-semibold text-zinc-900 mb-4">Pagos del Mes</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {pagosDelMes.map((pago) => {
            const Icon = pago.icon;
            return (
              <div
                key={pago.id}
                className="rounded-xl border border-zinc-200 bg-white p-4"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-lg ${pago.iconColor}`}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-zinc-900">{pago.concepto}</p>
                      <p className="text-lg font-bold text-zinc-900 mt-0.5">{pago.monto}</p>
                      {pago.fecha && (
                        <p className="text-xs text-zinc-500 mt-0.5">{pago.fecha}</p>
                      )}
                      {pago.puntos && (
                        <p className="text-xs text-violet-600 font-medium mt-0.5">
                          {pago.puntos}
                        </p>
                      )}
                    </div>
                  </div>
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${pago.estadoColor}`}
                  >
                    {pago.estado}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Payment history */}
      <div>
        <h2 className="text-lg font-semibold text-zinc-900 mb-4">Historial de Pagos</h2>
        <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-100 bg-zinc-50">
                  <th className="px-4 py-3 text-left font-medium text-zinc-500">Período</th>
                  <th className="px-4 py-3 text-left font-medium text-zinc-500">Concepto</th>
                  <th className="px-4 py-3 text-left font-medium text-zinc-500">Monto</th>
                  <th className="px-4 py-3 text-left font-medium text-zinc-500">Fecha</th>
                  <th className="px-4 py-3 text-left font-medium text-zinc-500">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {historial.map((periodo) =>
                  periodo.items.map((item, idx) => (
                    <tr key={`${periodo.mes}-${idx}`} className="hover:bg-zinc-50 transition-colors">
                      <td className="px-4 py-3 text-zinc-600">
                        {idx === 0 ? periodo.mes : ''}
                      </td>
                      <td className="px-4 py-3 font-medium text-zinc-900">{item.concepto}</td>
                      <td className="px-4 py-3 text-zinc-600">{item.monto}</td>
                      <td className="px-4 py-3 text-zinc-500">{item.fecha}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
                          {item.estado}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
