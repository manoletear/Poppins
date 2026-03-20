'use client';

import { useEmployees } from '@/hooks/useBuk';

export default function AsistenciaPage() {
  const { data: employees, loading } = useEmployees();

  // Mock attendance for current week
  const days = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie'];
  const today = new Date().getDay(); // 0=Sun, 1=Mon...

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Asistencia</h1>
        <div className="text-sm text-gray-500">Semana del 9 - 13 Mar 2026</div>
      </div>

      {loading ? (
        <div className="text-sm text-gray-400">Cargando...</div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                <th className="px-5 py-3">Colaboradora</th>
                {days.map(d => (
                  <th key={d} className="px-3 py-3 text-center">{d}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {employees.filter(e => e.estado === 'activo').map(emp => (
                <tr key={emp.id} className="border-b border-gray-50 last:border-0">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0" style={{ background: emp.color }}>
                        {emp.iniciales}
                      </div>
                      <span className="font-medium text-gray-800">{emp.nombreCompleto}</span>
                    </div>
                  </td>
                  {days.map((d, dayIdx) => {
                    const dayNum = dayIdx + 1;
                    const isPast = dayNum < today || (today === 0 && dayNum <= 5);
                    const isToday = dayNum === today;
                    return (
                      <td key={d} className="px-3 py-3 text-center">
                        {isPast ? (
                          <span className="inline-block w-6 h-6 rounded-full bg-emerald-100 text-emerald-600 text-xs leading-6">✓</span>
                        ) : isToday ? (
                          <span className="inline-block w-6 h-6 rounded-full bg-blue-100 text-blue-600 text-xs leading-6 ring-2 ring-blue-300">✓</span>
                        ) : (
                          <span className="inline-block w-6 h-6 rounded-full bg-gray-100 text-gray-400 text-xs leading-6">—</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-xs text-gray-400">
        * La asistencia se sincronizará con BUK cuando se habilite el endpoint de marcaciones.
      </p>
    </div>
  );
}
