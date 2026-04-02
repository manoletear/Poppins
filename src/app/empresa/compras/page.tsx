'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, Copy, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { useAuth } from '@/lib/auth/context';
import { getListasCompras, getItemsLista, toggleItemComprado, getPlantillasCompras } from '@/lib/supabase/employer-queries';

interface ListItem {
  id: string;
  nombre: string;
  cantidad: string;
  unidad?: string;
  comprado: boolean;
}

interface ShoppingList {
  id: string;
  nombre: string;
  titulo?: string;
  estado: string;
  created_at: string;
  items: ListItem[];
}

export default function ComprasPage() {
  const { profile } = useAuth();
  const [lists, setLists] = useState<ShoppingList[]>([]);
  const [closedLists, setClosedLists] = useState<ShoppingList[]>([]);
  const [plantillas, setPlantillas] = useState<any[]>([]);
  const [showClosed, setShowClosed] = useState(false);
  const [loading, setLoading] = useState(true);

  const empleadorId = profile?.empleador_id;

  const loadData = useCallback(async () => {
    if (!empleadorId) return;
    setLoading(true);

    const [abiertas, cerradas, tpls] = await Promise.all([
      getListasCompras(empleadorId, 'abierta'),
      getListasCompras(empleadorId, 'cerrada'),
      getPlantillasCompras(empleadorId),
    ]);

    // Load items for each open list
    const listsWithItems = await Promise.all(
      (abiertas || []).map(async (lista: any) => {
        const items = await getItemsLista(lista.id);
        return { ...lista, items: items || [] };
      })
    );

    const closedWithItems = await Promise.all(
      (cerradas || []).slice(0, 5).map(async (lista: any) => {
        const items = await getItemsLista(lista.id);
        return { ...lista, items: items || [] };
      })
    );

    setLists(listsWithItems);
    setClosedLists(closedWithItems);
    setPlantillas(tpls || []);
    setLoading(false);
  }, [empleadorId]);

  useEffect(() => { loadData(); }, [loadData]);

  async function handleToggleItem(listId: string, itemId: string, currentState: boolean) {
    // Optimistic update
    setLists((prev) =>
      prev.map((list) =>
        list.id === listId
          ? { ...list, items: list.items.map((item) => item.id === itemId ? { ...item, comprado: !currentState } : item) }
          : list
      )
    );
    await toggleItemComprado(itemId, !currentState);
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-zinc-400" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">Listas de Compras</h1>
          <p className="text-zinc-500 text-sm mt-1">Gestiona las compras del hogar</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="inline-flex items-center gap-2 rounded-lg bg-zinc-900 text-white px-4 py-2 text-sm font-medium hover:bg-zinc-800 transition-colors">
            <Plus className="w-4 h-4" />
            Nueva Lista
          </button>
          <button className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 bg-white text-zinc-700 px-4 py-2 text-sm font-medium hover:bg-zinc-50 transition-colors">
            <Copy className="w-4 h-4" />
            Usar Plantilla
          </button>
        </div>
      </div>

      {/* Active Lists */}
      {lists.length === 0 ? (
        <div className="rounded-xl border border-zinc-200 bg-white p-8 text-center">
          <p className="text-sm text-zinc-500">No hay listas de compras activas</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {lists.map((list) => {
            const checkedCount = list.items.filter((i) => i.comprado).length;
            const totalCount = list.items.length;
            const progress = totalCount > 0 ? (checkedCount / totalCount) * 100 : 0;

            return (
              <div key={list.id} className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
                <div className="px-5 pt-5 pb-3">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-semibold text-zinc-900">{list.nombre || list.titulo}</h3>
                    <span className="rounded-full px-2.5 py-0.5 text-xs font-medium bg-emerald-100 text-emerald-700">
                      {list.estado === 'abierta' ? 'Abierta' : 'Cerrada'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-zinc-500 mb-2">
                    <span>{checkedCount} de {totalCount} items</span>
                    <span>{new Date(list.created_at).toLocaleDateString('es-CL')}</span>
                  </div>
                  <div className="w-full h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
                  </div>
                </div>

                <div className="px-5 py-3 space-y-1.5 max-h-72 overflow-y-auto">
                  {list.items.map((item) => (
                    <label key={item.id} className="flex items-center gap-3 py-1 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={item.comprado}
                        onChange={() => handleToggleItem(list.id, item.id, item.comprado)}
                        className="w-4 h-4 rounded border-zinc-300 text-emerald-500 focus:ring-emerald-500 cursor-pointer"
                      />
                      <span className={`text-sm flex-1 ${item.comprado ? 'line-through text-zinc-400' : 'text-zinc-700'}`}>
                        {item.nombre}
                      </span>
                      <span className="text-xs text-zinc-400">{item.cantidad}{item.unidad ? ` ${item.unidad}` : ''}</span>
                    </label>
                  ))}
                </div>

                <div className="px-5 py-3 border-t border-zinc-100 flex items-center gap-2">
                  <button className="rounded-lg border border-zinc-200 text-zinc-600 px-3 py-1.5 text-xs font-medium hover:bg-zinc-50 transition-colors">
                    Cerrar Lista
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Plantillas */}
      {plantillas.length > 0 && (
        <div className="mt-8">
          <h2 className="text-lg font-semibold text-zinc-900 mb-4">Plantillas</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {plantillas.map((tpl: any) => (
              <div key={tpl.id} className="rounded-xl border border-dashed border-zinc-300 p-4 text-center hover:border-blue-400 cursor-pointer transition-colors">
                <p className="text-sm font-medium text-zinc-700">{tpl.nombre}</p>
                <p className="text-xs text-zinc-400 mt-0.5">{tpl.descripcion || 'Plantilla'}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Closed Lists */}
      {closedLists.length > 0 && (
        <div className="mt-8">
          <button
            onClick={() => setShowClosed(!showClosed)}
            className="flex items-center gap-2 text-lg font-semibold text-zinc-900 mb-4 hover:text-zinc-700 transition-colors"
          >
            Listas Anteriores
            {showClosed ? <ChevronUp className="w-5 h-5 text-zinc-400" /> : <ChevronDown className="w-5 h-5 text-zinc-400" />}
          </button>
          {showClosed && (
            <div className="space-y-2">
              {closedLists.map((cl) => (
                <div key={cl.id} className="rounded-xl border border-zinc-100 bg-zinc-50 px-5 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm text-zinc-500 font-medium">{cl.nombre || cl.titulo}</p>
                    <p className="text-xs text-zinc-400">{new Date(cl.created_at).toLocaleDateString('es-CL')}</p>
                  </div>
                  <span className="text-xs text-zinc-400">{cl.items.length} items</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
