'use client';

import { useState, useEffect, useCallback } from 'react';
import { Loader2 } from 'lucide-react';
import { getNoticiasLegales } from '@/lib/supabase/employer-queries';

type FilterKey = 'todas' | 'laboral' | 'impuestos' | 'prevision' | 'salud';

interface Noticia {
  id: string;
  titulo: string;
  fecha_publicacion: string;
  fuente: string;
  categoria: string;
  resumen: string;
  contenido?: string;
  url_fuente?: string;
}

const categoriaColors: Record<string, string> = {
  laboral: 'bg-blue-50 text-blue-700',
  impuestos: 'bg-amber-50 text-amber-700',
  prevision: 'bg-emerald-50 text-emerald-700',
  salud: 'bg-rose-50 text-rose-700',
};

const categoriaLabels: Record<string, string> = {
  laboral: 'Laboral',
  impuestos: 'Impuestos',
  prevision: 'Previsión',
  salud: 'Salud',
};

const filters: { key: FilterKey; label: string }[] = [
  { key: 'todas', label: 'Todas' },
  { key: 'laboral', label: 'Laboral' },
  { key: 'impuestos', label: 'Impuestos' },
  { key: 'prevision', label: 'Previsión' },
  { key: 'salud', label: 'Salud' },
];

export default function NoticiasPage() {
  const [activeFilter, setActiveFilter] = useState<FilterKey>('todas');
  const [noticias, setNoticias] = useState<Noticia[]>([]);
  const [loading, setLoading] = useState(true);

  const loadNoticias = useCallback(async () => {
    setLoading(true);
    const categoria = activeFilter === 'todas' ? undefined : activeFilter;
    const data = await getNoticiasLegales(categoria);
    setNoticias(data || []);
    setLoading(false);
  }, [activeFilter]);

  useEffect(() => { loadNoticias(); }, [loadNoticias]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">Noticias Legales</h1>
        <p className="text-sm text-zinc-500 mt-1">Actualizaciones de legislación laboral e impuestos</p>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 rounded-lg bg-zinc-100 p-1 w-fit">
        {filters.map((f) => (
          <button
            key={f.key}
            onClick={() => setActiveFilter(f.key)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              activeFilter === f.key ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* News cards */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-zinc-400" />
        </div>
      ) : (
        <div className="space-y-4">
          {noticias.map((noticia) => (
            <div key={noticia.id} className="rounded-xl border border-zinc-200 bg-white p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${categoriaColors[noticia.categoria] || 'bg-zinc-100 text-zinc-700'}`}>
                      {categoriaLabels[noticia.categoria] || noticia.categoria}
                    </span>
                    <span className="text-xs text-zinc-400">
                      {new Date(noticia.fecha_publicacion).toLocaleDateString('es-CL', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                  </div>
                  <h3 className="text-base font-semibold text-zinc-900">{noticia.titulo}</h3>
                  {noticia.fuente && <p className="text-xs text-zinc-500 mt-1">Fuente: {noticia.fuente}</p>}
                  <p className="text-sm text-zinc-600 mt-3 leading-relaxed">{noticia.resumen}</p>
                  {noticia.url_fuente && (
                    <a href={noticia.url_fuente} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-zinc-900 hover:text-zinc-700 transition-colors">
                      Leer más <span aria-hidden="true">&rarr;</span>
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))}

          {noticias.length === 0 && (
            <div className="rounded-xl border border-zinc-200 bg-white p-8 text-center">
              <p className="text-sm text-zinc-500">No hay noticias en esta categoría</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
