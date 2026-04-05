'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, ShoppingCart, Check, Trash2, X, Share2, ChevronDown, Search, Archive, Loader2, AlertCircle, ClipboardList } from 'lucide-react';
import { useAuth } from '@/lib/auth/context';
import {
  getListasCompras, getItemsLista, toggleItemComprado,
  createListaCompras, createItemLista, deleteItemLista, deleteLista, cerrarLista,
  getPlantillasCompras, createListaFromPlantilla,
} from '@/lib/supabase/employer-queries';

interface ListItem { id: string; nombre: string; cantidad: string; unidad?: string; comprado: boolean; }
interface ShoppingList { id: string; nombre: string; estado: string; created_at: string; fecha_cierre?: string; items: ListItem[]; }

export default function ComprasPage() {
  const { profile } = useAuth();
  const empleadorId = profile?.empleador_id;
  const [listas, setListas] = useState<ShoppingList[]>([]);
  const [closedListas, setClosedListas] = useState<ShoppingList[]>([]);
  const [plantillas, setPlantillas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showClosed, setShowClosed] = useState(false);
  const [showNewList, setShowNewList] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [showNewItem, setShowNewItem] = useState<string | null>(null);
  const [newItemName, setNewItemName] = useState('');
  const [newItemQty, setNewItemQty] = useState('');
  const [confirmClose, setConfirmClose] = useState<string | null>(null);
  const [confirmDeleteList, setConfirmDeleteList] = useState<string | null>(null);
  const [filterText, setFilterText] = useState('');
  const [sortBy, setSortBy] = useState<'nombre' | 'fecha'>('fecha');
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    if (!empleadorId) return;
    const [abiertas, cerradas, pl] = await Promise.all([
      getListasCompras(empleadorId, 'abierta'),
      getListasCompras(empleadorId, 'cerrada'),
      getPlantillasCompras(empleadorId),
    ]);
    // Load items for open lists
    const listasConItems = await Promise.all(
      (abiertas || []).map(async (l: any) => ({ ...l, items: await getItemsLista(l.id) }))
    );
    setListas(listasConItems);
    setClosedListas((cerradas || []).map((l: any) => ({ ...l, items: [] })));
    setPlantillas(pl || []);
    setLoading(false);
  }, [empleadorId]);

  useEffect(() => { loadData(); }, [loadData]);

  // ── Create new list ──
  const handleCreateList = async () => {
    if (!empleadorId || !newListName.trim()) return;
    setSaving(true);
    await createListaCompras(empleadorId, newListName.trim());
    setNewListName('');
    setShowNewList(false);
    await loadData();
    setSaving(false);
  };

  // ── Create from template ──
  const handleUsePlantilla = async (p: any) => {
    if (!empleadorId) return;
    setSaving(true);
    const items = Array.isArray(p.items) ? p.items : [];
    await createListaFromPlantilla(empleadorId, { nombre: p.nombre, items });
    await loadData();
    setSaving(false);
  };

  // ── Add item to list ──
  const handleAddItem = async (listaId: string) => {
    if (!newItemName.trim()) return;
    setSaving(true);
    await createItemLista(listaId, newItemName.trim(), newItemQty || undefined);
    setNewItemName('');
    setNewItemQty('');
    setShowNewItem(null);
    await loadData();
    setSaving(false);
  };

  // ── Toggle item ──
  const handleToggleItem = async (listaId: string, itemId: string, current: boolean) => {
    setListas(prev => prev.map(l => l.id === listaId
      ? { ...l, items: l.items.map(i => i.id === itemId ? { ...i, comprado: !current } : i) }
      : l
    ));
    await toggleItemComprado(itemId, !current);
  };

  // ── Delete item ──
  const handleDeleteItem = async (listaId: string, itemId: string) => {
    setListas(prev => prev.map(l => l.id === listaId
      ? { ...l, items: l.items.filter(i => i.id !== itemId) }
      : l
    ));
    await deleteItemLista(itemId);
  };

  // ── Close list (with confirmation) ──
  const handleCloseList = async (listaId: string) => {
    setSaving(true);
    await cerrarLista(listaId);
    setConfirmClose(null);
    await loadData();
    setSaving(false);
  };

  const handleDeleteList = async (listaId: string) => {
    setSaving(true);
    await deleteLista(listaId);
    setConfirmDeleteList(null);
    await loadData();
    setSaving(false);
  };

  // ── Share list ──
  const handleShare = (list: ShoppingList, method: 'whatsapp' | 'email') => {
    const itemsText = list.items.map(i => `${i.comprado ? '✅' : '⬜'} ${i.nombre}${i.cantidad ? ` (${i.cantidad}${i.unidad ? ' ' + i.unidad : ''})` : ''}`).join('\n');
    const text = `📋 *${list.nombre}*\n\n${itemsText}\n\n_Compartido desde Poppins_`;

    if (method === 'whatsapp') {
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
    } else {
      window.open(`mailto:?subject=${encodeURIComponent(list.nombre)}&body=${encodeURIComponent(text)}`, '_blank');
    }
  };

  // ── Filter & sort items within lists ──
  const filteredListas = listas
    .filter(l => !filterText || l.nombre.toLowerCase().includes(filterText.toLowerCase()) || l.items.some(i => i.nombre.toLowerCase().includes(filterText.toLowerCase())))
    .sort((a, b) => sortBy === 'nombre' ? a.nombre.localeCompare(b.nombre) : new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  // ── Closed lists with month filter ──
  const [closedFilter, setClosedFilter] = useState<'all' | 'week' | 'month'>('all');
  const filteredClosed = closedListas.filter(l => {
    if (closedFilter === 'all') return true;
    const d = new Date(l.fecha_cierre || l.created_at);
    const now = new Date();
    if (closedFilter === 'week') return now.getTime() - d.getTime() < 7 * 86400000;
    if (closedFilter === 'month') return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    return true;
  });

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-zinc-400" /></div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Listas de Compras</h1>
          <p className="text-sm text-zinc-500">{listas.length} lista{listas.length !== 1 ? 's' : ''} activa{listas.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowNewList(true)} className="flex items-center gap-2 bg-violet-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-violet-700 transition">
            <Plus className="w-4 h-4" /> Nueva Lista
          </button>
        </div>
      </div>

      {/* New list form */}
      {showNewList && (
        <div className="rounded-xl border border-violet-200 bg-violet-50 p-4 flex gap-3 items-end">
          <div className="flex-1">
            <label className="text-xs font-medium text-zinc-600 mb-1 block">Nombre de la lista</label>
            <input value={newListName} onChange={e => setNewListName(e.target.value)} placeholder="Ej: Compras Semana" onKeyDown={e => e.key === 'Enter' && handleCreateList()}
              className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" />
          </div>
          <button onClick={handleCreateList} disabled={saving || !newListName.trim()} className="bg-violet-600 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50">Crear</button>
          <button onClick={() => setShowNewList(false)} className="text-zinc-400 hover:text-zinc-600"><X className="w-5 h-5" /></button>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input value={filterText} onChange={e => setFilterText(e.target.value)} placeholder="Buscar productos o listas..."
            className="w-full pl-9 pr-3 py-2 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" />
        </div>
        <select value={sortBy} onChange={e => setSortBy(e.target.value as any)} className="border border-zinc-200 rounded-lg px-3 py-2 text-sm bg-white">
          <option value="fecha">Más reciente</option>
          <option value="nombre">Por nombre</option>
        </select>
      </div>

      {/* Open lists */}
      {filteredListas.length === 0 && !showNewList && (
        <div className="rounded-xl border border-zinc-200 bg-white p-8 text-center">
          <ShoppingCart className="w-10 h-10 text-zinc-300 mx-auto mb-3" />
          <p className="text-sm text-zinc-500 mb-3">No hay listas activas</p>
          <button onClick={() => setShowNewList(true)} className="text-sm text-violet-600 font-medium hover:underline">Crear una lista</button>
        </div>
      )}

      {filteredListas.map(list => {
        const done = list.items.filter(i => i.comprado).length;
        const total = list.items.length;
        return (
          <div key={list.id} className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
            {/* List header */}
            <div className="px-5 py-4 flex items-center justify-between border-b border-zinc-100">
              <div>
                <h3 className="text-sm font-semibold text-zinc-900">{list.nombre}</h3>
                <p className="text-xs text-zinc-400">{done}/{total} comprados</p>
              </div>
              <div className="flex gap-1">
                <button onClick={() => setShowNewItem(showNewItem === list.id ? null : list.id)} className="p-2 rounded-lg hover:bg-zinc-100 text-zinc-500 transition" title="Agregar item">
                  <Plus className="w-4 h-4" />
                </button>
                <div className="relative group">
                  <button className="p-2 rounded-lg hover:bg-zinc-100 text-zinc-500 transition" title="Compartir">
                    <Share2 className="w-4 h-4" />
                  </button>
                  <div className="absolute right-0 top-full mt-1 bg-white border border-zinc-200 rounded-lg shadow-lg py-1 hidden group-hover:block z-20 min-w-[160px]">
                    <button onClick={() => handleShare(list, 'whatsapp')} className="w-full text-left px-3 py-2 text-sm hover:bg-zinc-50">WhatsApp</button>
                    <button onClick={() => handleShare(list, 'email')} className="w-full text-left px-3 py-2 text-sm hover:bg-zinc-50">Email</button>
                  </div>
                </div>
                <button onClick={() => setConfirmClose(list.id)} className="p-2 rounded-lg hover:bg-zinc-100 text-zinc-500 transition" title="Archivar lista">
                  <Archive className="w-4 h-4" />
                </button>
                <button onClick={() => setConfirmDeleteList(list.id)} className="p-2 rounded-lg hover:bg-red-50 text-zinc-500 hover:text-red-600 transition" title="Eliminar lista">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Confirm close */}
            {confirmClose === list.id && (
              <div className="px-5 py-3 bg-red-50 border-b border-red-100 flex items-center justify-between">
                <p className="text-sm text-red-700">¿Cerrar esta lista? Se moverá al historial.</p>
                <div className="flex gap-2">
                  <button onClick={() => handleCloseList(list.id)} disabled={saving} className="bg-red-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium">Sí, cerrar</button>
                  <button onClick={() => setConfirmClose(null)} className="text-zinc-500 px-3 py-1.5 rounded-lg text-xs border border-zinc-200">Cancelar</button>
                </div>
              </div>
            )}

            {/* Confirm delete list */}
            {confirmDeleteList === list.id && (
              <div className="px-5 py-3 bg-red-50 border-b border-red-100 flex items-center justify-between">
                <p className="text-sm text-red-700">¿Eliminar esta lista y todos sus items? No se puede deshacer.</p>
                <div className="flex gap-2">
                  <button onClick={() => handleDeleteList(list.id)} disabled={saving} className="bg-red-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium">Sí, eliminar</button>
                  <button onClick={() => setConfirmDeleteList(null)} className="text-zinc-500 px-3 py-1.5 rounded-lg text-xs border border-zinc-200">Cancelar</button>
                </div>
              </div>
            )}

            {/* Add item form */}
            {showNewItem === list.id && (
              <div className="px-5 py-3 bg-zinc-50 border-b border-zinc-100 flex gap-2">
                <input value={newItemName} onChange={e => setNewItemName(e.target.value)} placeholder="Nombre del producto" onKeyDown={e => e.key === 'Enter' && handleAddItem(list.id)}
                  className="flex-1 border border-zinc-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" autoFocus />
                <input value={newItemQty} onChange={e => setNewItemQty(e.target.value)} placeholder="Cant." style={{ width: 80 }}
                  className="border border-zinc-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" />
                <button onClick={() => handleAddItem(list.id)} disabled={saving || !newItemName.trim()} className="bg-violet-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium disabled:opacity-50">
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Items */}
            <div className="divide-y divide-zinc-50">
              {list.items.map(item => (
                <div key={item.id} className="px-5 py-2.5 flex items-center gap-3 hover:bg-zinc-50 transition group">
                  <input type="checkbox" checked={item.comprado} onChange={() => handleToggleItem(list.id, item.id, item.comprado)}
                    className="w-4 h-4 rounded border-zinc-300 text-violet-600 focus:ring-violet-500" />
                  <span className={`text-sm flex-1 ${item.comprado ? 'line-through text-zinc-400' : 'text-zinc-700'}`}>{item.nombre}</span>
                  <span className="text-xs text-zinc-400">{item.cantidad}{item.unidad ? ` ${item.unidad}` : ''}</span>
                  <button onClick={() => handleDeleteItem(list.id, item.id)} className="opacity-0 group-hover:opacity-100 text-zinc-400 hover:text-red-500 transition">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
              {list.items.length === 0 && (
                <div className="px-5 py-6 text-center text-sm text-zinc-400">
                  Lista vacía — <button onClick={() => setShowNewItem(list.id)} className="text-violet-600 hover:underline">agregar productos</button>
                </div>
              )}
            </div>
          </div>
        );
      })}

      {/* Templates */}
      {plantillas.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-zinc-700 mb-3">Plantillas Rápidas</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {plantillas.map((p: any) => (
              <button key={p.id} onClick={() => handleUsePlantilla(p)} disabled={saving}
                className="rounded-xl border border-zinc-200 bg-white p-4 text-left hover:shadow-md transition disabled:opacity-50">
                <ClipboardList className="w-5 h-5 text-violet-500 mb-2" />
                <p className="text-sm font-medium text-zinc-900">{p.nombre}</p>
                <p className="text-xs text-zinc-400">{Array.isArray(p.items) ? p.items.length : 0} items</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Closed lists (history) */}
      <div>
        <button onClick={() => setShowClosed(!showClosed)} className="flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-700 transition">
          <ChevronDown className={`w-4 h-4 transition-transform ${showClosed ? 'rotate-180' : ''}`} />
          Historial de listas ({closedListas.length})
        </button>

        {showClosed && (
          <div className="mt-3 space-y-3">
            <div className="flex gap-2">
              {(['all', 'month', 'week'] as const).map(f => (
                <button key={f} onClick={() => setClosedFilter(f)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition ${closedFilter === f ? 'bg-zinc-900 text-white' : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'}`}>
                  {f === 'all' ? 'Todas' : f === 'month' ? 'Este mes' : 'Esta semana'}
                </button>
              ))}
            </div>
            {filteredClosed.length === 0 && <p className="text-sm text-zinc-400">No hay listas cerradas en este período.</p>}
            {filteredClosed.map(cl => (
              <div key={cl.id} className="rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm text-zinc-600 font-medium">{cl.nombre}</p>
                  <p className="text-xs text-zinc-400">Cerrada {cl.fecha_cierre ? new Date(cl.fecha_cierre).toLocaleDateString('es-CL') : ''}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
