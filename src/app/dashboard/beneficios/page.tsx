'use client';

import { useState, useEffect } from 'react';
import { useBenefits } from '@/hooks/useBuk';
import type { BukBenefit } from '@/types/buk';

interface LocalBenefit extends BukBenefit {
  tipo: string;
  activo: boolean;
}

const defaultForm: Omit<LocalBenefit, 'id'> = {
  name: '',
  description: '',
  tipo: 'mensual',
  amount: 0,
  activo: true,
};

export default function BeneficiosPage() {
  const { data: benefits, loading, error } = useBenefits();

  const [localBenefits, setLocalBenefits] = useState<LocalBenefit[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(defaultForm);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  // Sync from API
  useEffect(() => {
    if (benefits.length > 0 && localBenefits.length === 0) {
      setLocalBenefits(
        benefits.map(b => ({ ...b, tipo: 'mensual', activo: true }))
      );
    }
  }, [benefits, localBenefits.length]);

  const fmt = (n: number) => '$' + n.toLocaleString('es-CL');
  const icons = ['🎁', '🏥', '🎓', '🚌', '🍽️', '💊'];

  const tipoLabel: Record<string, string> = {
    mensual: '/mes',
    anual: '/año',
    'único': 'único',
  };

  // ── Modal helpers ──

  const openCreate = () => {
    setForm(defaultForm);
    setEditingId(null);
    setModalOpen(true);
  };

  const openEdit = (b: LocalBenefit) => {
    setForm({
      name: b.name,
      description: b.description,
      tipo: b.tipo,
      amount: b.amount,
      activo: b.activo,
    });
    setEditingId(b.id);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingId(null);
  };

  const handleSave = () => {
    if (!form.name.trim()) return;

    if (editingId !== null) {
      // Update existing
      setLocalBenefits(prev =>
        prev.map(b =>
          b.id === editingId ? { ...b, ...form } : b
        )
      );
    } else {
      // Create new
      const newId = Date.now();
      setLocalBenefits(prev => [...prev, { id: newId, ...form }]);
    }
    closeModal();
  };

  const handleDelete = (id: number) => {
    setLocalBenefits(prev => prev.filter(b => b.id !== id));
    setConfirmDeleteId(null);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Beneficios</h1>
        <button
          onClick={openCreate}
          className="px-4 py-2 bg-[#F0197A] text-white text-sm font-semibold rounded-lg hover:bg-[#d4166c] transition"
        >
          + Nuevo Beneficio
        </button>
      </div>

      {error && <div className="text-red-500 text-sm">Error: {error}</div>}

      {loading ? (
        <div className="text-sm text-gray-400">Cargando beneficios...</div>
      ) : localBenefits.length === 0 ? (
        <div className="text-sm text-gray-400">Sin beneficios configurados</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {localBenefits.map((b, i) => (
            <div key={b.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition group relative">
              {/* Action buttons */}
              <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => openEdit(b)}
                  className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition"
                  title="Editar"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </button>
                <button
                  onClick={() => setConfirmDeleteId(b.id)}
                  className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition"
                  title="Eliminar"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>

              <div className="flex items-start gap-3">
                <div className="text-2xl">{icons[i % icons.length]}</div>
                <div className="flex-1">
                  <div className="font-semibold text-gray-800">{b.name}</div>
                  <div className="text-xs text-gray-400 mt-0.5">{b.description}</div>
                  <div className="mt-3 flex items-baseline gap-1">
                    <span className="text-lg font-bold text-[#F0197A]">{fmt(b.amount)}</span>
                    <span className="text-xs font-normal text-gray-400">{tipoLabel[b.tipo] || '/mes'}</span>
                  </div>
                  {!b.activo && (
                    <span className="mt-2 inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
                      Inactivo
                    </span>
                  )}
                </div>
              </div>

              {/* Delete confirmation overlay */}
              {confirmDeleteId === b.id && (
                <div className="absolute inset-0 bg-white/95 rounded-xl flex flex-col items-center justify-center gap-3 p-5 z-10">
                  <p className="text-sm font-medium text-gray-700 text-center">Eliminar &quot;{b.name}&quot;?</p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleDelete(b.id)}
                      className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-red-500 text-white hover:bg-red-600 transition"
                    >
                      Confirmar
                    </button>
                    <button
                      onClick={() => setConfirmDeleteId(null)}
                      className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── Modal ── */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/40" onClick={closeModal} />

          {/* Panel */}
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6 space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <h2 className="text-lg font-bold text-gray-900">
              {editingId ? 'Editar Beneficio' : 'Nuevo Beneficio'}
            </h2>

            {/* Name */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Nombre</label>
              <input
                type="text"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#F0197A]/30 focus:border-[#F0197A] outline-none transition"
                placeholder="Ej: Seguro dental"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Descripción</label>
              <textarea
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                rows={2}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#F0197A]/30 focus:border-[#F0197A] outline-none transition resize-none"
                placeholder="Breve descripción del beneficio"
              />
            </div>

            {/* Tipo & Monto row */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Tipo</label>
                <select
                  value={form.tipo}
                  onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#F0197A]/30 focus:border-[#F0197A] outline-none transition bg-white"
                >
                  <option value="mensual">Mensual</option>
                  <option value="anual">Anual</option>
                  <option value="único">Único</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Monto ($)</label>
                <input
                  type="number"
                  min={0}
                  value={form.amount || ''}
                  onChange={e => setForm(f => ({ ...f, amount: Number(e.target.value) }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#F0197A]/30 focus:border-[#F0197A] outline-none transition"
                  placeholder="0"
                />
              </div>
            </div>

            {/* Activo */}
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={form.activo}
                onChange={e => setForm(f => ({ ...f, activo: e.target.checked }))}
                className="h-4 w-4 rounded border-gray-300 text-[#F0197A] focus:ring-[#F0197A]"
              />
              <span className="text-sm text-gray-700">Activo</span>
            </label>

            {/* Buttons */}
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={closeModal}
                className="px-4 py-2 text-sm font-semibold rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={!form.name.trim()}
                className="px-4 py-2 text-sm font-semibold rounded-lg bg-[#F0197A] text-white hover:bg-[#d4166c] transition disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
