'use client';

import { useState } from 'react';
import { usePayroll, useEmployees } from '@/hooks/useBuk';
import type { PoppinsLiquidacion } from '@/types/buk';

function LiquidacionDetail({ liq, empName, onClose }: { liq: PoppinsLiquidacion; empName: string; onClose: () => void }) {
  const fmt = (n: number) => '$' + n.toLocaleString('es-CL');
  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="bg-gradient-to-r from-[#1B1564] to-[#3730A3] p-5 text-white">
          <div className="text-lg font-bold">{empName}</div>
          <div className="text-white/60 text-sm">Liquidación {liq.periodo}</div>
        </div>
        <div className="p-5 space-y-3 text-sm">
          <div className="font-semibold text-gray-700 text-xs uppercase tracking-wide">Haberes</div>
          <div className="space-y-1">
            <div className="flex justify-between"><span className="text-gray-500">Sueldo Base</span><span className="font-medium">{fmt(liq.sueldoBase)}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Horas Extra</span><span className="font-medium">{fmt(liq.horasExtra)}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Bonos</span><span className="font-medium">{fmt(liq.bonos)}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Gratificación</span><span className="font-medium">{fmt(liq.gratificacion)}</span></div>
            <div className="flex justify-between border-t border-gray-100 pt-1 font-semibold"><span>Total Haberes</span><span>{fmt(liq.totalHaberes)}</span></div>
          </div>

          <div className="font-semibold text-gray-700 text-xs uppercase tracking-wide mt-3">Descuentos</div>
          <div className="space-y-1">
            <div className="flex justify-between"><span className="text-gray-500">Salud</span><span className="font-medium text-red-500">-{fmt(liq.descSalud)}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">AFP</span><span className="font-medium text-red-500">-{fmt(liq.descAfp)}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Cesantía</span><span className="font-medium text-red-500">-{fmt(liq.descCesantia)}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Impuesto Único</span><span className="font-medium text-red-500">-{fmt(liq.impuestoUnico)}</span></div>
            <div className="flex justify-between border-t border-gray-100 pt-1 font-semibold"><span>Total Descuentos</span><span className="text-red-500">-{fmt(liq.totalDescuentos)}</span></div>
          </div>

          <div className="flex justify-between border-t-2 border-gray-200 pt-2 text-base font-bold">
            <span>Líquido a Pagar</span>
            <span className="text-emerald-600">{fmt(liq.liquido)}</span>
          </div>

          <button onClick={onClose} className="w-full mt-2 py-2 rounded-lg bg-gray-100 text-sm font-medium text-gray-600 hover:bg-gray-200 transition">
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}

export default function LiquidacionesPage() {
  const { data: payroll, loading, error } = usePayroll();
  const { data: employees } = useEmployees();
  const [selected, setSelected] = useState<PoppinsLiquidacion | null>(null);

  const empName = (id: number) => employees.find(e => e.id === id)?.nombreCompleto || `Empleado #${id}`;
  const fmt = (n: number) => '$' + n.toLocaleString('es-CL');

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Liquidaciones</h1>
        <div className="text-sm text-gray-500">Período: Marzo 2026</div>
      </div>

      {error && <div className="text-red-500 text-sm">Error: {error}</div>}

      {loading ? (
        <div className="text-sm text-gray-400">Cargando liquidaciones...</div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                <th className="px-5 py-3">Colaboradora</th>
                <th className="px-3 py-3">Período</th>
                <th className="px-3 py-3 text-right">Bruto</th>
                <th className="px-3 py-3 text-right">Descuentos</th>
                <th className="px-3 py-3 text-right">Líquido</th>
                <th className="px-3 py-3">Estado</th>
              </tr>
            </thead>
            <tbody>
              {payroll.map(liq => (
                <tr
                  key={liq.id}
                  className="border-b border-gray-50 hover:bg-gray-50/50 cursor-pointer"
                  onClick={() => setSelected(liq)}
                >
                  <td className="px-5 py-3 font-medium text-gray-800">{empName(liq.empleadoId)}</td>
                  <td className="px-3 py-3 text-gray-600">{liq.periodo}</td>
                  <td className="px-3 py-3 text-right font-medium">{fmt(liq.sueldoBruto)}</td>
                  <td className="px-3 py-3 text-right text-red-500">-{fmt(liq.totalDescuentos)}</td>
                  <td className="px-3 py-3 text-right font-bold text-emerald-600">{fmt(liq.liquido)}</td>
                  <td className="px-3 py-3">
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                      liq.estado === 'pagado' ? 'bg-emerald-100 text-emerald-700' : 'bg-yellow-100 text-yellow-700'
                    }`}>
                      {liq.estado}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selected && <LiquidacionDetail liq={selected} empName={empName(selected.empleadoId)} onClose={() => setSelected(null)} />}
    </div>
  );
}
