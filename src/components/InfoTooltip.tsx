'use client';

import { useState, useRef, useEffect } from 'react';
import { Info } from 'lucide-react';

interface Props {
  text: string;
  title?: string;
  legal?: string;        // ej. "Art. 42 LIR"
  side?: 'top' | 'bottom';
  inline?: boolean;      // si true, no agrega icono — uses children
  children?: React.ReactNode;
}

export default function InfoTooltip({ text, title, legal, side = 'top', inline = false, children }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [open]);

  return (
    <span ref={ref} className="relative inline-flex items-center">
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setOpen(!open); }}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        className="inline-flex items-center gap-1 cursor-help"
        aria-label={title ?? 'Información'}
      >
        {inline ? children : <Info className="h-3 w-3 text-zinc-400 hover:text-zinc-600" />}
      </button>
      {open && (
        <span
          className={`absolute z-50 ${side === 'top' ? 'bottom-full mb-2' : 'top-full mt-2'} left-1/2 -translate-x-1/2 w-64 rounded-lg bg-zinc-900 text-white text-xs px-3 py-2 shadow-lg pointer-events-none`}
        >
          {title && <div className="font-semibold mb-1">{title}</div>}
          <div className="leading-relaxed">{text}</div>
          {legal && <div className="text-[10px] text-zinc-400 mt-1.5 border-t border-zinc-700 pt-1.5">{legal}</div>}
          <span className={`absolute left-1/2 -translate-x-1/2 ${side === 'top' ? 'top-full' : 'bottom-full rotate-180'} border-4 border-transparent border-t-zinc-900`} />
        </span>
      )}
    </span>
  );
}
