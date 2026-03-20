'use client';

import { useState } from 'react';
import { ExternalLink } from 'lucide-react';

type FilterKey = 'todas' | 'laboral' | 'impuestos' | 'prevision' | 'salud';

const noticias = [
  {
    id: 1,
    titulo: 'Nuevo Salario Mínimo 2026: $500.000 a partir de julio',
    fecha: '15 Mar 2026',
    fuente: 'Dirección del Trabajo',
    categoria: 'laboral' as const,
    categoriaLabel: 'Laboral',
    categoriaColor: 'bg-blue-50 text-blue-700',
    resumen:
      'El salario mínimo subirá a $500.000 mensuales a partir del 1 de julio de 2026, según la nueva ley de reajuste aprobada por el Congreso. Los empleadores deberán actualizar los contratos vigentes que estén bajo este monto.',
  },
  {
    id: 2,
    titulo: 'Modificación en cotización AFC: nuevas tasas desde abril',
    fecha: '12 Mar 2026',
    fuente: 'Superintendencia de Pensiones',
    categoria: 'prevision' as const,
    categoriaLabel: 'Previsión',
    categoriaColor: 'bg-emerald-50 text-emerald-700',
    resumen:
      'Se han modificado las tasas de cotización del Seguro de Cesantía (AFC). A partir de abril, la cotización del empleador pasará del 2,4% al 2,6% para contratos indefinidos. Los trabajadores mantienen su aporte del 0,6%.',
  },
  {
    id: 3,
    titulo: 'Ley de conciliación laboral-familiar: nuevos derechos',
    fecha: '8 Mar 2026',
    fuente: 'Ministerio del Trabajo',
    categoria: 'laboral' as const,
    categoriaLabel: 'Laboral',
    categoriaColor: 'bg-blue-50 text-blue-700',
    resumen:
      'La nueva ley establece derechos adicionales para trabajadores con hijos menores de 12 años, incluyendo flexibilidad horaria y permisos especiales. Aplica tanto a trabajadores de casa particular como a otros sectores.',
  },
  {
    id: 4,
    titulo: 'Cambios en tabla de impuesto único: tramos actualizados',
    fecha: '1 Mar 2026',
    fuente: 'SII',
    categoria: 'impuestos' as const,
    categoriaLabel: 'Impuestos',
    categoriaColor: 'bg-amber-50 text-amber-700',
    resumen:
      'El Servicio de Impuestos Internos ha actualizado los tramos del impuesto único de segunda categoría para el año tributario 2026. Los nuevos tramos reflejan el ajuste por IPC acumulado.',
  },
];

const filters: { key: FilterKey; label: string }[] = [
  { key: 'todas', label: 'Todas' },
  { key: 'laboral', label: 'Laboral' },
  { key: 'impuestos', label: 'Impuestos' },
  { key: 'prevision', label: 'Previsión' },
  { key: 'salud', label: 'Salud' },
];

export default function NoticiasPage() {
  const [activeFilter, setActiveFilter] = useState<FilterKey>('todas');

  const filtered =
    activeFilter === 'todas'
      ? noticias
      : noticias.filter((n) => n.categoria === activeFilter);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">Noticias Legales</h1>
        <p className="text-sm text-zinc-500 mt-1">
          Actualizaciones de legislación laboral e impuestos
        </p>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 rounded-lg bg-zinc-100 p-1 w-fit">
        {filters.map((f) => (
          <button
            key={f.key}
            onClick={() => setActiveFilter(f.key)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              activeFilter === f.key
                ? 'bg-white text-zinc-900 shadow-sm'
                : 'text-zinc-500 hover:text-zinc-700'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* News cards */}
      <div className="space-y-4">
        {filtered.map((noticia) => (
          <div
            key={noticia.id}
            className="rounded-xl border border-zinc-200 bg-white p-5"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${noticia.categoriaColor}`}
                  >
                    {noticia.categoriaLabel}
                  </span>
                  <span className="text-xs text-zinc-400">{noticia.fecha}</span>
                </div>
                <h3 className="text-base font-semibold text-zinc-900">
                  {noticia.titulo}
                </h3>
                <p className="text-xs text-zinc-500 mt-1">Fuente: {noticia.fuente}</p>
                <p className="text-sm text-zinc-600 mt-3 leading-relaxed">
                  {noticia.resumen}
                </p>
                <button className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-zinc-900 hover:text-zinc-700 transition-colors">
                  Leer más
                  <span aria-hidden="true">&rarr;</span>
                </button>
              </div>
            </div>
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="rounded-xl border border-zinc-200 bg-white p-8 text-center">
            <p className="text-sm text-zinc-500">No hay noticias en esta categoría</p>
          </div>
        )}
      </div>
    </div>
  );
}
