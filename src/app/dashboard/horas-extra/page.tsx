'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useOvertime, useEmployees } from '@/hooks/useBuk';
import { Clock } from 'lucide-react';

interface OvertimeRecord {
  id: number;
  employee_id: number;
  date: string;
  hours: number;
  overtime_type: '50%' | '100%';
  status: 'pendiente' | 'aprobada' | 'rechazada';
  observations?: string;
}

function StatusBadge({ estado }: { estado: string }) {
  const colors: Record<string, string> = {
    pendiente: 'bg-yellow-100 text-yellow-700',
    aprobada: 'bg-emerald-100 text-emerald-700',
    rechazada: 'bg-red-100 text-red-600',
  };
  return (
    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${colors[estado] || 'bg-gray-100 text-gray-500'}`}>
      {estado}
    </span>
  );
}

export default function HorasExtraPage() {
  const router = useRouter();
  const { data: overtime, loading, error } = useOvertime();
  const { data: employees } = useEmployees();

  const overtimeRecords = (overtime || []) as OvertimeRecord[];
  const empName = (id: number) => employees.find(e => e.id === id)?.nombreCompleto || `Empleado #${id}`;

  const totalHours = overtimeRecords.reduce((sum, r) => sum + (r.hours || 0), 0);
  const pendingCount = overtimeRecords.filter(r => r.status === 'pendiente').length;

  // Estimate cost (mock calculation: assume $15,000 per hour for 50%, $20,000 for 100%)
  const estimatedCost = overtimeRecords.reduce((sum, r) => {
    const hourlyRate = r.overtime_type === '100%' ? 20000 : 15000;
    return sum + (r.hours * hourlyRate);
  }, 0);

  const pendingOvertimes = overtimeRecords.filter(r => r.status === 'pendiente');
  const approvedOvertimes = overtimeRecords.filter(r => r.status !== 'pendiente');

  const fmt = (n: number) => '$' + n.toLocaleString('es-CL');

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Horas Extra</h1>
        <button
          onClick={() => router.push('/dashboard/horas-extra/nueva')}
          className="px-4 py-2 bg-[#F0197A] text-white text-sm font-semibold rounded-lg hover:bg-[#d4166c] transition"
        >
          + Registrar Horas Extra
        </button>
      </div>

      {error && <div className="text-red-500 text-sm">Error: {error}</div>}

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-gray-500 text-sm font-medium">Total Horas Mes</div>
              <div className="text-3xl font-bold text-gray-900 mt-1">{totalHours}h</div>
            </div>
            <div className="p-2.5 bg-[#F0197A]/10 rounded-lg">
              <Clock size={20} className="text-[#F0197A]" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-gray-500 text-sm font-medium">Costo Estimado</div>
              <div className="text-3xl font-bold text-gray-900 mt-1">{fmt(estimatedCost)}</div>
            </div>
            <div className="p-2.5 bg-emerald-100 rounded-lg">
              <span className="text-xl">💰</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-gray-500 text-sm font-medium">Pendientes Aprobación</div>
              <div className="text-3xl font-bold text-gray-900 mt-1">{pendingCount}</div>
            </div>
            <div className="p-2.5 bg-yellow-100 rounded-lg">
              <span className="text-xl">⏳</span>
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-sm text-gray-400">Cargando horas extra...</div>
      ) : overtimeRecords.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center">
          <div className="text-4xl mb-2">📋</div>
          <p className="text-gray-600">Sin registros de horas extra</p>
        </div>
      ) : (
        <>
          {/* Pending */}
          {pendingOvertimes.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-100">
                <span className="text-sm font-semibold text-gray-800">
                  Pendientes de Aprobación ({pendingOvertimes.length})
                </span>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    <th className="px-5 py-3">Colaborador</th>
                    <th className="px-3 py-3">Fecha</th>
                    <th className="px-3 py-3">Horas</th>
                    <th className="px-3 py-3">Tipo</th>
                    <th className="px-3 py-3">Estado</th>
                    <th className="px-3 py-3 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingOvertimes.map(ot => (
                    <tr key={ot.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                      <td className="px-5 py-3 font-medium text-gray-800">{empName(ot.employee_id)}</td>
                      <td className="px-3 py-3 text-gray-600">{ot.date}</td>
                      <td className="px-3 py-3 text-gray-600 font-medium">{ot.hours}h</td>
                      <td className="px-3 py-3 text-gray-600">{ot.overtime_type}</td>
                      <td className="px-3 py-3">
                        <StatusBadge estado={ot.status} />
                      </td>
                      <td className="px-3 py-3 text-right space-x-2">
                        <button className="px-3 py-1 text-xs font-semibold rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 transition">
                          Aprobar
                        </button>
                        <button className="px-3 py-1 text-xs font-semibold rounded-lg bg-red-100 text-red-600 hover:bg-red-200 transition">
                          Rechazar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Resolved */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100">
              <span className="text-sm font-semibold text-gray-800">Historial</span>
            </div>
            {approvedOvertimes.length === 0 ? (
              <div className="p-5 text-sm text-gray-400">Sin registros</div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    <th className="px-5 py-3">Colaborador</th>
                    <th className="px-3 py-3">Fecha</th>
                    <th className="px-3 py-3">Horas</th>
                    <th className="px-3 py-3">Tipo</th>
                    <th className="px-3 py-3">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {approvedOvertimes.map(ot => (
                    <tr key={ot.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                      <td className="px-5 py-3 font-medium text-gray-800">{empName(ot.employee_id)}</td>
                      <td className="px-3 py-3 text-gray-600">{ot.date}</td>
                      <td className="px-3 py-3 text-gray-600 font-medium">{ot.hours}h</td>
                      <td className="px-3 py-3 text-gray-600">{ot.overtime_type}</td>
                      <td className="px-3 py-3">
                        <StatusBadge estado={ot.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </div>
  );
}
