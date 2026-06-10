'use client';

import { useEffect, useState, useRef } from 'react';
import { ChevronDown, Check, Loader2 } from 'lucide-react';

interface Empleador {
  id: string;
  rut?: string;
  nombre?: string;
  rol: 'owner' | 'admin' | 'contador' | 'viewer';
  isActive: boolean;
}

export default function EmpleadorSwitcher() {
  const [empleadores, setEmpleadores] = useState<Empleador[]>([]);
  const [open, setOpen] = useState(false);
  const [switching, setSwitching] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch('/api/auth/empleadores').then(r => r.json()).then(d => {
      if (d.ok) setEmpleadores(d.empleadores ?? []);
    });
  }, []);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const active = empleadores.find(e => e.isActive);

  // No mostrar switcher si solo hay 1 empleador
  if (empleadores.length <= 1) return null;

  async function switchTo(id: string) {
    setSwitching(id);
    const r = await fetch('/api/auth/switch-empleador', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ empleador_id: id }),
    });
    const d = await r.json();
    if (d.ok) {
      // Refresh página para reflejar cambio de contexto
      window.location.reload();
    } else {
      alert(d.error ?? 'No se pudo cambiar de empleador');
      setSwitching(null);
    }
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-[20px] border border-gray-200 hover:bg-gray-50 text-[13px] font-medium text-gray-700"
      >
        <span className="max-w-[160px] truncate">{active?.nombre ?? 'Empleador'}</span>
        <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
      </button>

      {open && (
        <div className="absolute top-full mt-1 right-0 min-w-[260px] bg-white border border-gray-200 rounded-xl shadow-lg py-1 z-50">
          <div className="px-3 py-1.5 text-[10px] uppercase font-semibold text-gray-400 tracking-wider">
            Cambiar empleador ({empleadores.length})
          </div>
          {empleadores.map(e => (
            <button
              key={e.id}
              onClick={() => switchTo(e.id)}
              disabled={e.isActive || switching === e.id}
              className="w-full flex items-center justify-between gap-2 px-3 py-2 text-left text-[13px] hover:bg-gray-50 disabled:cursor-default"
            >
              <div className="min-w-0 flex-1">
                <div className="font-medium text-gray-800 truncate">{e.nombre ?? '(sin nombre)'}</div>
                <div className="text-[11px] text-gray-500">{e.rut} · {e.rol}</div>
              </div>
              {e.isActive ? (
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : switching === e.id ? (
                <Loader2 className="w-4 h-4 animate-spin text-gray-400 shrink-0" />
              ) : null}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
