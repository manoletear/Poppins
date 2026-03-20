'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useEmployees } from '@/hooks/useBuk';
import type { PoppinsEmployee } from '@/types/buk';

function StatusBadge({ estado }: { estado: string }) {
  const colors: Record<string, string> = {
    activo: 'bg-emerald-100 text-emerald-700',
    inactivo: 'bg-gray-100 text-gray-500',
    licencia: 'bg-amber-100 text-amber-700',
  };
  return (
    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${colors[estado] || 'bg-gray-100 text-gray-500'}`}>
      {estado}
    </span>
  );
}

export default function ColaboradorasPage() {
  const router = useRouter();
  const { data: employees, loading, error } = useEmployees();
  const [search, setSearch] = useState('');

  const filtered = employees.filter(e =>
    e.nombreCompleto.toLowerCase().includes(search.toLowerCase()) ||
    e.cargo.toLowerCase().includes(search.toLowerCase()) ||
    e.rut.includes(search)
  );

  const fmt = (n: number) => '$' + n.toLocaleString('es-CL');
  const handleRowClick = (empId: number) => {
    router.push(`/dashboard/colaboradoras/${empId}`);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Colaboradoras</h1>
        <a href="/dashboard/colaboradoras/nuevo" className="px-4 py-2 bg-[#F0197A] text-white text-sm font-semibold rounded-lg hover:bg-[#d4166c] transition inline-block">
          + Nueva Colaboradora
        </a>
      </div>

      {/* Search */}
      <div className="flex items-center gap-2 bg-white rounded-lg px-3 h-10 shadow-sm border border-gray-100 max-w-sm">
        <span className="text-gray-400">🔍</span>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar por nombre, cargo o RUT..."
          className="border-none bg-transparent outline-none text-sm text-gray-700 w-full placeholder:text-gray-400"
        />
      </div>

      {error && <div className="text-red-500 text-sm">Error: {error}</div>}

      {loading ? (
        <div className="text-sm text-gray-400">Cargando colaboradoras...</div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                <th className="px-5 py-3">Colaboradora</th>
                <th className="px-3 py-3">Cargo</th>
                <th className="px-3 py-3">Contrato</th>
                <th className="px-3 py-3">Sueldo Base</th>
                <th className="px-3 py-3">Estado</th>
                <th className="px-3 py-3 text-right">Ingreso</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(emp => (
                <tr
                  key={emp.id}
                  className="border-b border-gray-50 hover:bg-gray-50/50 cursor-pointer"
                  onClick={() => handleRowClick(emp.id)}
                >
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold text-white shrink-0" style={{ background: emp.color }}>
                        {emp.iniciales}
                      </div>
                      <div>
                        <div className="font-medium text-gray-800">{emp.nombreCompleto}</div>
                        <div className="text-xs text-gray-400">{emp.rut}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3 text-gray-600">{emp.cargo}</td>
                  <td className="px-3 py-3 text-gray-600">{emp.tipoContrato}</td>
                  <td className="px-3 py-3 font-medium text-gray-800">{fmt(emp.sueldoBase)}</td>
                  <td className="px-3 py-3"><StatusBadge estado={emp.estado} /></td>
                  <td className="px-3 py-3 text-right text-gray-500">{emp.fechaIngreso}</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={6} className="px-5 py-8 text-center text-gray-400">Sin resultados</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
