'use client';

import { Receipt } from 'lucide-react';

const meses = ['Marzo 2026', 'Febrero 2026', 'Enero 2026'];

const liquidaciones = [
  {
    nombre: 'María López Soto',
    labor: 'Empleada Doméstica',
    datos: [
      { mes: 'Marzo 2026', bruto: '$650.000', descuentos: '$130.000', liquido: '$520.000', estado: 'Procesando' },
      { mes: 'Febrero 2026', bruto: '$650.000', descuentos: '$130.000', liquido: '$520.000', estado: 'Pagado' },
      { mes: 'Enero 2026', bruto: '$650.000', descuentos: '$130.000', liquido: '$520.000', estado: 'Pagado' },
    ],
  },
  {
    nombre: 'Juan Pérez González',
    labor: 'Jardinero',
    datos: [
      { mes: 'Marzo 2026', bruto: '$350.000', descuentos: '$70.000', liquido: '$280.000', estado: 'Procesando' },
      { mes: 'Febrero 2026', bruto: '$350.000', descuentos: '$70.000', liquido: '$280.000', estado: 'Pagado' },
      { mes: 'Enero 2026', bruto: '$350.000', descuentos: '$70.000', liquido: '$280.000', estado: 'Pagado' },
    ],
  },
  {
    nombre: 'Pedro Soto Muñoz',
    labor: 'Piscinero',
    datos: [
      { mes: 'Marzo 2026', bruto: '$250.000', descuentos: '$50.000', liquido: '$200.000', estado: 'Procesando' },
      { mes: 'Febrero 2026', bruto: '$250.000', descuentos: '$50.000', liquido: '$200.000', estado: 'Pagado' },
      { mes: 'Enero 2026', bruto: '$250.000', descuentos: '$50.000', liquido: '$200.000', estado: 'Pagado' },
    ],
  },
];

export default function LiquidacionesEmpresaPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">Liquidaciones</h1>
        <p className="text-sm text-zinc-500 mt-1">
          Resumen de liquidaciones de sueldo de los últimos 3 meses
        </p>
      </div>

      {/* Per-employee tables */}
      <div className="space-y-6">
        {liquidaciones.map((emp) => (
          <div
            key={emp.nombre}
            className="rounded-xl border border-zinc-200 bg-white overflow-hidden"
          >
            <div className="border-b border-zinc-100 bg-zinc-50 px-4 py-3">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-200">
                  <Receipt className="h-4 w-4 text-zinc-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-zinc-900">{emp.nombre}</p>
                  <p className="text-xs text-zinc-500">{emp.labor}</p>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-100">
                    <th className="px-4 py-3 text-left font-medium text-zinc-500">Mes</th>
                    <th className="px-4 py-3 text-left font-medium text-zinc-500">Sueldo Bruto</th>
                    <th className="px-4 py-3 text-left font-medium text-zinc-500">Descuentos</th>
                    <th className="px-4 py-3 text-left font-medium text-zinc-500">Líquido</th>
                    <th className="px-4 py-3 text-left font-medium text-zinc-500">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {emp.datos.map((d) => (
                    <tr key={d.mes} className="hover:bg-zinc-50 transition-colors">
                      <td className="px-4 py-3 font-medium text-zinc-900">{d.mes}</td>
                      <td className="px-4 py-3 text-zinc-600">{d.bruto}</td>
                      <td className="px-4 py-3 text-zinc-600">{d.descuentos}</td>
                      <td className="px-4 py-3 font-medium text-zinc-900">{d.liquido}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            d.estado === 'Pagado'
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-blue-50 text-blue-700'
                          }`}
                        >
                          {d.estado}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
