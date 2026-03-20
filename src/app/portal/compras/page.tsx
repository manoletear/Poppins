'use client';

import { useState, useEffect, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  Plus,
  ShoppingCart,
  Check,
  X,
  Package,
  User,
} from 'lucide-react';

const WORKER_ID = 'c711d829-4a6d-4496-a93b-221b81eb1258';
const EMPLEADOR_ID = '11111111-1111-1111-1111-111111111111';

type ListaCompra = {
  id: string;
  empleador_id: string;
  nombre: string;
  estado: string;
  created_at: string;
};

type ItemLista = {
  id: string;
  lista_id: string;
  nombre: string;
  cantidad: number;
  unidad: string;
  categoria: string;
  notas: string | null;
  comprado: boolean;
  agregado_por: string;
  created_at: string;
};

const UNIDAD_OPTIONS = ['unidad', 'kg', 'g', 'litro', 'ml', 'paquete', 'caja', 'botella', 'docena'];

const CATEGORIA_OPTIONS = [
  'Frutas y Verduras',
  'Carnes y Pescados',
  'Lácteos',
  'Panadería',
  'Bebidas',
  'Limpieza',
  'Higiene',
  'Despensa',
  'Congelados',
  'Otros',
];

export default function ComprasPage() {
  const [listas, setListas] = useState<ListaCompra[]>([]);
  const [items, setItems] = useState<Record<string, ItemLista[]>>({});
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [activeListId, setActiveListId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [nombre, setNombre] = useState('');
  const [cantidad, setCantidad] = useState(1);
  const [unidad, setUnidad] = useState('unidad');
  const [categoria, setCategoria] = useState('Otros');
  const [notas, setNotas] = useState('');

  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    loadListas();
  }, []);

  async function loadListas() {
    setLoading(true);
    const { data, error } = await supabase
      .from('listas_compras')
      .select('*')
      .eq('empleador_id', EMPLEADOR_ID)
      .eq('estado', 'abierta');

    if (!error && data) {
      setListas(data as ListaCompra[]);
      // Load items for each list
      for (const lista of data as ListaCompra[]) {
        loadItems(lista.id);
      }
    }
    setLoading(false);
  }

  async function loadItems(listaId: string) {
    const { data, error } = await supabase
      .from('items_lista_compras')
      .select('*')
      .eq('lista_id', listaId)
      .order('created_at', { ascending: true });

    if (!error && data) {
      setItems((prev) => ({ ...prev, [listaId]: data as ItemLista[] }));
    }
  }

  async function toggleComprado(item: ItemLista) {
    const newValue = !item.comprado;
    // Optimistic update
    setItems((prev) => ({
      ...prev,
      [item.lista_id]: prev[item.lista_id]?.map((i) =>
        i.id === item.id ? { ...i, comprado: newValue } : i
      ) || [],
    }));

    await supabase
      .from('items_lista_compras')
      .update({ comprado: newValue })
      .eq('id', item.id);
  }

  function openAddItem(listaId: string) {
    setActiveListId(listaId);
    setNombre('');
    setCantidad(1);
    setUnidad('unidad');
    setCategoria('Otros');
    setNotas('');
    setShowModal(true);
  }

  async function handleAddItem(e: React.FormEvent) {
    e.preventDefault();
    if (!activeListId) return;
    setSubmitting(true);

    const { error } = await supabase.from('items_lista_compras').insert({
      lista_id: activeListId,
      nombre,
      cantidad,
      unidad,
      categoria,
      notas: notas || null,
      comprado: false,
      agregado_por: WORKER_ID,
    });

    setSubmitting(false);

    if (!error) {
      setShowModal(false);
      loadItems(activeListId);
    }
  }

  // Group items by category
  function groupByCategory(listItems: ItemLista[]) {
    const grouped: Record<string, ItemLista[]> = {};
    for (const item of listItems) {
      const cat = item.categoria || 'Otros';
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(item);
    }
    return grouped;
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-zinc-900">Lista de Compras</h1>
        <p className="text-sm text-zinc-500 mt-1">Colabora con la lista del hogar</p>
      </div>

      {loading ? (
        <div className="text-sm text-zinc-400 py-8 text-center">Cargando listas...</div>
      ) : listas.length === 0 ? (
        <div className="text-center py-12 text-zinc-400">
          <ShoppingCart className="h-10 w-10 mx-auto mb-3 text-zinc-300" />
          <p className="text-sm font-medium">No hay listas de compras activas</p>
          <p className="text-xs text-zinc-400 mt-1">Tu empleador creará las listas cuando sea necesario</p>
        </div>
      ) : (
        <div className="space-y-6">
          {listas.map((lista) => {
            const listItems = items[lista.id] || [];
            const comprados = listItems.filter((i) => i.comprado).length;
            const total = listItems.length;
            const progress = total > 0 ? (comprados / total) * 100 : 0;
            const grouped = groupByCategory(listItems);

            return (
              <div key={lista.id} className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
                {/* List Header */}
                <div className="px-6 py-4 border-b border-zinc-100">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 shrink-0">
                        <ShoppingCart className="h-5 w-5 text-emerald-600" />
                      </div>
                      <div>
                        <h2 className="text-sm font-semibold text-zinc-900">{lista.nombre}</h2>
                        <p className="text-xs text-zinc-400">
                          Creada el {new Date(lista.created_at).toLocaleDateString('es-CL', {
                            day: 'numeric',
                            month: 'short',
                          })}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => openAddItem(lista.id)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white text-xs font-semibold rounded-lg hover:bg-emerald-700 transition-colors"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Agregar Item
                    </button>
                  </div>

                  {/* Progress */}
                  {total > 0 && (
                    <div className="mt-3">
                      <div className="flex justify-between text-xs text-zinc-400 mb-1">
                        <span>{comprados} de {total} items comprados</span>
                        <span>{Math.round(progress)}%</span>
                      </div>
                      <div className="h-2 bg-zinc-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Items */}
                {total === 0 ? (
                  <div className="p-6 text-sm text-zinc-400 text-center">
                    <Package className="h-8 w-8 mx-auto mb-2 text-zinc-300" />
                    Lista vacía. Agrega items para comenzar.
                  </div>
                ) : (
                  <div className="divide-y divide-zinc-50">
                    {Object.entries(grouped).map(([cat, catItems]) => (
                      <div key={cat}>
                        <div className="px-6 py-2 bg-zinc-50">
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">{cat}</p>
                        </div>
                        {catItems.map((item) => (
                          <div
                            key={item.id}
                            className="flex items-center gap-3 px-6 py-3 hover:bg-zinc-50/50 transition-colors"
                          >
                            <button
                              onClick={() => toggleComprado(item)}
                              className={`flex h-5 w-5 items-center justify-center rounded border-2 shrink-0 transition-colors ${
                                item.comprado
                                  ? 'bg-emerald-500 border-emerald-500 text-white'
                                  : 'border-zinc-300 hover:border-emerald-400'
                              }`}
                            >
                              {item.comprado && <Check className="h-3 w-3" />}
                            </button>
                            <div className="flex-1 min-w-0">
                              <p className={`text-sm ${item.comprado ? 'line-through text-zinc-400' : 'text-zinc-800'}`}>
                                {item.nombre}
                              </p>
                              <div className="flex items-center gap-2 text-xs text-zinc-400">
                                <span>{item.cantidad} {item.unidad}</span>
                                {item.notas && <span>· {item.notas}</span>}
                              </div>
                            </div>
                            <div className="flex items-center gap-1 text-[10px] text-zinc-400 shrink-0">
                              <User className="h-3 w-3" />
                              <span>{item.agregado_por === WORKER_ID ? 'Tú' : 'Empleador'}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Agregar Item Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200">
              <h2 className="text-lg font-bold text-zinc-900">Agregar Item</h2>
              <button
                onClick={() => setShowModal(false)}
                className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleAddItem} className="p-6 space-y-4">
              {/* Nombre */}
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">Nombre</label>
                <input
                  type="text"
                  required
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Ej: Leche, Pan, Detergente..."
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
                />
              </div>

              {/* Cantidad + Unidad */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">Cantidad</label>
                  <input
                    type="number"
                    min={1}
                    value={cantidad}
                    onChange={(e) => setCantidad(Number(e.target.value))}
                    className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">Unidad</label>
                  <select
                    value={unidad}
                    onChange={(e) => setUnidad(e.target.value)}
                    className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
                  >
                    {UNIDAD_OPTIONS.map((u) => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Categoría */}
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">Categoría</label>
                <select
                  value={categoria}
                  onChange={(e) => setCategoria(e.target.value)}
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
                >
                  {CATEGORIA_OPTIONS.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              {/* Notas */}
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">Notas</label>
                <textarea
                  value={notas}
                  onChange={(e) => setNotas(e.target.value)}
                  rows={2}
                  placeholder="Marca preferida, tamaño, etc."
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={submitting || !nombre}
                className="w-full py-2.5 bg-emerald-600 text-white text-sm font-semibold rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {submitting ? 'Agregando...' : 'Agregar a la Lista'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
