'use client';

import { useState, useEffect } from 'react';
import { useAbsences, useEmployees } from '@/hooks/useBuk';
import type { PoppinsVacacion } from '@/types/buk';

function StatusBadge({ estado }: { estado: string }) {
  const colors: Record<string, string> = {
    pendiente: 'bg-yellow-100 text-yellow-700',
    aprobada: 'bg-emerald-100 text-emerald-700',
    rechazada: 'bg-red-100 text-red-600',
  };
  return (
    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full transition-colors duration-300 ${colors[estado] || 'bg-gray-100 text-gray-500'}`}>
      {estado}
    </span>
  );
}

export default function VacacionesPage() {
  const { data: absences, loading, error } = useAbsences();
  const { data: employees } = useEmployees();

  const [localAbsences, setLocalAbsences] = useState<PoppinsVacacion[]>([]);

  // Sync from API data when it loads
  useEffect(() => {
    if (absences.length > 0) {
      setLocalAbsences(absences);
    }
  }, [absences]);

  const empName = (id: number) => employees.find(e => e.id === id)?.nombreCompleto || `Empleado #${id}`;

  const handleUpdateEstado = (id: number, nuevoEstado: 'aprobada' | 'rechazada') => {
    setLocalAbsences(prev =>
      prev.map(a => (a.id === id ? { ...a, estado: nuevoEstado } : a))
    );
  };

  const pendientes = localAbsences.filter(a => a.estado === 'pendiente');
  const resueltas = localAbsences.filter(a => a.estado !== 'pendiente');

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold text-gray-900">Vacaciones y Permisos</h1>
          {pendientes.length > 0 && (
            <span className="inline-flex items-center justify-center h-6 min-w-[24px] px-1.5 text-xs font-bold rounded-full bg-yellow-400 text-yellow-900 transition-all duration-300">
              {pendientes.length}
            </span>
          )}
        </div>
        <a href="/dashboard/vacaciones/nueva" className="px-4 py-2 bg-[#F0197A] text-white text-sm font-semibold rounded-lg hover:bg-[#d4166c] transition inline-block">
          + Nueva Solicitud
        </a>
      </div>

      {error && <div className="text-red-500 text-sm">Error: {error}</div>}

      {loading ? (
        <div className="text-sm text-gray-400">Cargando solicitudes...</div>
      ) : (
        <>
          {/* Pending */}
          {pendientes.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-100">
                <span className="text-sm font-semibold text-gray-800">Pendientes de Aprobación ({pendientes.length})</span>
              </div>
              <table className="w-full text-sm">
                <tbody>
                  {pendientes.map(abs => (
                    <tr key={abs.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-all duration-300">
                      <td className="px-5 py-3">
                        <div className="font-medium text-gray-800">{empName(abs.empleadoId)}</div>
                        <div className="text-xs text-gray-400">{abs.tipo}</div>
                      </td>
                      <td className="px-3 py-3 text-gray-600">{abs.inicio} → {abs.fin}</td>
                      <td className="px-3 py-3 text-gray-600">{abs.dias} días</td>
                      <td className="px-3 py-3"><StatusBadge estado={abs.estado} /></td>
                      <td className="px-3 py-3 text-right space-x-2">
                        <button
                          onClick={() => handleUpdateEstado(abs.id, 'aprobada')}
                          className="px-3 py-1 text-xs font-semibold rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 transition"
                        >
                          Aprobar
                        </button>
                        <button
                          onClick={() => handleUpdateEstado(abs.id, 'rechazada')}
                          className="px-3 py-1 text-xs font-semibold rounded-lg bg-red-100 text-red-600 hover:bg-red-200 transition"
                        >
                          Rechazar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {pendientes.length === 0 && localAbsences.length > 0 && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-5 py-4 text-sm text-emerald-700 font-medium">
              Todas las solicitudes han sido procesadas.
            </div>
          )}

          {/* Resolved */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100">
              <span className="text-sm font-semibold text-gray-800">Historial</span>
            </div>
            {resueltas.length === 0 ? (
              <div className="p-5 text-sm text-gray-400">Sin registros</div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    <th className="px-5 py-2">Colaboradora</th>
                    <th className="px-3 py-2">Tipo</th>
                    <th className="px-3 py-2">Fechas</th>
                    <th className="px-3 py-2">Días</th>
                    <th className="px-3 py-2">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {resueltas.map(abs => (
                    <tr key={abs.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-all duration-200">
                      <td className="px-5 py-2.5 font-medium text-gray-800">{empName(abs.empleadoId)}</td>
                      <td className="px-3 py-2.5 text-gray-600">{abs.tipo}</td>
                      <td className="px-3 py-2.5 text-gray-600">{abs.inicio} → {abs.fin}</td>
                      <td className="px-3 py-2.5 text-gray-600">{abs.dias}</td>
                      <td className="px-3 py-2.5"><StatusBadge estado={abs.estado} /></td>
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
