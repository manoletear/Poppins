'use client';

import { useAbsences, useEmployees } from '@/hooks/useBuk';

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

export default function VacacionesPage() {
  const { data: absences, loading, error } = useAbsences();
  const { data: employees } = useEmployees();

  const empName = (id: number) => employees.find(e => e.id === id)?.nombreCompleto || `Empleado #${id}`;

  const pendientes = absences.filter(a => a.estado === 'pendiente');
  const resueltas = absences.filter(a => a.estado !== 'pendiente');

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Vacaciones y Permisos</h1>
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
                    <tr key={abs.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                      <td className="px-5 py-3">
                        <div className="font-medium text-gray-800">{empName(abs.empleadoId)}</div>
                        <div className="text-xs text-gray-400">{abs.tipo}</div>
                      </td>
                      <td className="px-3 py-3 text-gray-600">{abs.inicio} → {abs.fin}</td>
                      <td className="px-3 py-3 text-gray-600">{abs.dias} días</td>
                      <td className="px-3 py-3"><StatusBadge estado={abs.estado} /></td>
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
                    <tr key={abs.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
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
