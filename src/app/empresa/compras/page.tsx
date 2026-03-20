'use client';

import { useState } from 'react';
import { Plus, Copy, ChevronDown, ChevronUp, Flame, Cake, ShoppingCart, Sparkles } from 'lucide-react';

interface ListItem {
  id: number;
  name: string;
  quantity: string;
  checked: boolean;
}

interface ShoppingList {
  id: number;
  title: string;
  badge: string;
  badgeColor: string;
  templateBadge?: string;
  createdBy: string;
  items: ListItem[];
}

const initialLists: ShoppingList[] = [
  {
    id: 1,
    title: 'Compras Semana 20-26 Mar',
    badge: 'Abierta',
    badgeColor: 'bg-emerald-100 text-emerald-700',
    createdBy: 'Rene',
    items: [
      { id: 1, name: 'Leche descremada', quantity: '2 lt', checked: true },
      { id: 2, name: 'Pan de molde', quantity: '2 un', checked: true },
      { id: 3, name: 'Frutas variadas', quantity: '2 kg', checked: true },
      { id: 4, name: 'Huevos', quantity: '2 docenas', checked: true },
      { id: 5, name: 'Queso', quantity: '500 gr', checked: true },
      { id: 6, name: 'Detergente Omo', quantity: '1 un', checked: false },
      { id: 7, name: 'Carne molida', quantity: '1.5 kg', checked: false },
      { id: 8, name: 'Arroz', quantity: '2 kg', checked: false },
      { id: 9, name: 'Verduras (ensalada)', quantity: '1 kg', checked: false },
      { id: 10, name: 'Cloro piscina', quantity: '5 lt', checked: false },
      { id: 11, name: 'Alimento Rocky (Royal Canin)', quantity: '1 saco', checked: false },
      { id: 12, name: 'Arena gato Luna', quantity: '1 saco', checked: false },
    ],
  },
  {
    id: 2,
    title: 'Lista Asado Domingo',
    badge: 'Abierta',
    badgeColor: 'bg-emerald-100 text-emerald-700',
    templateBadge: 'Plantilla: Asado',
    createdBy: 'Rene',
    items: [
      { id: 13, name: 'Carne de vacuno', quantity: '3 kg', checked: false },
      { id: 14, name: 'Choripán', quantity: '12 un', checked: false },
      { id: 15, name: 'Ensalada chilena (tomate, cebolla)', quantity: '2 kg', checked: false },
      { id: 16, name: 'Pan', quantity: '12 un', checked: false },
      { id: 17, name: 'Carbón', quantity: '2 sacos', checked: false },
      { id: 18, name: 'Bebidas', quantity: '6 lt', checked: false },
      { id: 19, name: 'Vino tinto', quantity: '2 botellas', checked: false },
      { id: 20, name: 'Pebre (cilantro, tomate, ají)', quantity: '1 preparación', checked: false },
    ],
  },
];

const templates = [
  { name: 'Asado', icon: Flame, items: 8 },
  { name: 'Cumpleaños', icon: Cake, items: 12 },
  { name: 'Semanal Básica', icon: ShoppingCart, items: 15 },
  { name: 'Limpieza Mensual', icon: Sparkles, items: 10 },
];

const closedLists = [
  { title: 'Compras Semana 13-19 Mar', date: '19 Mar 2026', itemCount: 14 },
  { title: 'Compras Semana 6-12 Mar', date: '12 Mar 2026', itemCount: 11 },
];

export default function ComprasPage() {
  const [lists, setLists] = useState<ShoppingList[]>(initialLists);
  const [showClosed, setShowClosed] = useState(false);

  function toggleItem(listId: number, itemId: number) {
    setLists((prev) =>
      prev.map((list) =>
        list.id === listId
          ? {
              ...list,
              items: list.items.map((item) =>
                item.id === itemId ? { ...item, checked: !item.checked } : item
              ),
            }
          : list
      )
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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {lists.map((list) => {
          const checkedCount = list.items.filter((i) => i.checked).length;
          const totalCount = list.items.length;
          const progress = totalCount > 0 ? (checkedCount / totalCount) * 100 : 0;

          return (
            <div key={list.id} className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
              {/* Card header */}
              <div className="px-5 pt-5 pb-3">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-zinc-900">{list.title}</h3>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${list.badgeColor}`}>
                    {list.badge}
                  </span>
                </div>
                {list.templateBadge && (
                  <span className="inline-block rounded-full bg-zinc-100 text-zinc-600 px-2.5 py-0.5 text-xs font-medium mb-2">
                    {list.templateBadge}
                  </span>
                )}
                <div className="flex items-center justify-between text-xs text-zinc-500 mb-2">
                  <span>
                    {checkedCount} de {totalCount} items
                  </span>
                  <span>Creado por: {list.createdBy}</span>
                </div>
                {/* Progress bar */}
                <div className="w-full h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>

              {/* Items */}
              <div className="px-5 py-3 space-y-1.5 max-h-72 overflow-y-auto">
                {list.items.map((item) => (
                  <label
                    key={item.id}
                    className="flex items-center gap-3 py-1 cursor-pointer group"
                  >
                    <input
                      type="checkbox"
                      checked={item.checked}
                      onChange={() => toggleItem(list.id, item.id)}
                      className="w-4 h-4 rounded border-zinc-300 text-emerald-500 focus:ring-emerald-500 cursor-pointer"
                    />
                    <span
                      className={`text-sm flex-1 ${
                        item.checked ? 'line-through text-zinc-400' : 'text-zinc-700'
                      }`}
                    >
                      {item.name}
                    </span>
                    <span className="text-xs text-zinc-400">{item.quantity}</span>
                  </label>
                ))}
              </div>

              {/* Footer */}
              <div className="px-5 py-3 border-t border-zinc-100 flex items-center gap-2">
                <button className="rounded-lg border border-zinc-200 text-zinc-600 px-3 py-1.5 text-xs font-medium hover:bg-zinc-50 transition-colors">
                  Cerrar Lista
                </button>
                <button className="rounded-lg border border-zinc-200 text-zinc-600 px-3 py-1.5 text-xs font-medium hover:bg-zinc-50 transition-colors">
                  Compartir
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Plantillas */}
      <div className="mt-8">
        <h2 className="text-lg font-semibold text-zinc-900 mb-4">Plantillas</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {templates.map((tpl) => {
            const Icon = tpl.icon;
            return (
              <div
                key={tpl.name}
                className="rounded-xl border border-dashed border-zinc-300 p-4 text-center hover:border-blue-400 cursor-pointer transition-colors"
              >
                <Icon className="w-6 h-6 mx-auto mb-2 text-zinc-500" />
                <p className="text-sm font-medium text-zinc-700">{tpl.name}</p>
                <p className="text-xs text-zinc-400 mt-0.5">{tpl.items} items</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Closed Lists */}
      <div className="mt-8">
        <button
          onClick={() => setShowClosed(!showClosed)}
          className="flex items-center gap-2 text-lg font-semibold text-zinc-900 mb-4 hover:text-zinc-700 transition-colors"
        >
          Listas Anteriores
          {showClosed ? (
            <ChevronUp className="w-5 h-5 text-zinc-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-zinc-400" />
          )}
        </button>
        {showClosed && (
          <div className="space-y-2">
            {closedLists.map((cl, idx) => (
              <div
                key={idx}
                className="rounded-xl border border-zinc-100 bg-zinc-50 px-5 py-3 flex items-center justify-between"
              >
                <div>
                  <p className="text-sm text-zinc-500 font-medium">{cl.title}</p>
                  <p className="text-xs text-zinc-400">{cl.date}</p>
                </div>
                <span className="text-xs text-zinc-400">{cl.itemCount} items</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
