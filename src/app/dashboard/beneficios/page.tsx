'use client';

import { useBenefits } from '@/hooks/useBuk';

export default function BeneficiosPage() {
  const { data: benefits, loading, error } = useBenefits();

  const fmt = (n: number) => '$' + n.toLocaleString('es-CL');

  const icons = ['🎁', '🏥', '🎓', '🚌', '🍽️', '💊'];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Beneficios</h1>
        <button className="px-4 py-2 bg-[#F0197A] text-white text-sm font-semibold rounded-lg hover:bg-[#d4166c] transition">
          + Nuevo Beneficio
        </button>
      </div>

      {error && <div className="text-red-500 text-sm">Error: {error}</div>}

      {loading ? (
        <div className="text-sm text-gray-400">Cargando beneficios...</div>
      ) : benefits.length === 0 ? (
        <div className="text-sm text-gray-400">Sin beneficios configurados</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {benefits.map((b, i) => (
            <div key={b.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition">
              <div className="flex items-start gap-3">
                <div className="text-2xl">{icons[i % icons.length]}</div>
                <div className="flex-1">
                  <div className="font-semibold text-gray-800">{b.name}</div>
                  <div className="text-xs text-gray-400 mt-0.5">{b.description}</div>
                  <div className="mt-3 text-lg font-bold text-[#F0197A]">{fmt(b.amount)}<span className="text-xs font-normal text-gray-400"> /mes</span></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
