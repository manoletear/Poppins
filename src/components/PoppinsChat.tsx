'use client';

import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/lib/auth/context';
import { createClient } from '@/lib/supabase/client';
import { Sparkles, X, Send, Loader2 } from 'lucide-react';

interface Msg { role: 'user' | 'model'; text: string; accion?: any }

export default function PoppinsChat() {
  const { profile } = useAuth();
  const empleadorId = profile?.empleador_id;
  const [open, setOpen] = useState(false);
  const [mensajes, setMensajes] = useState<Msg[]>([
    { role: 'model', text: '¡Hola! Soy Poppins 💜 Puedo ayudarte a pensar, organizar tareas, recordatorios o resolver dudas de tu casa. ¿En qué te doy una mano?' },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [mensajes, open]);

  if (!empleadorId) return null;

  async function send() {
    const text = input.trim();
    if (!text || loading) return;
    const nuevos: Msg[] = [...mensajes, { role: 'user', text }];
    setMensajes(nuevos);
    setInput('');
    setLoading(true);
    try {
      const res = await fetch('/api/chat/poppins', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mensajes: nuevos.map((m) => ({ role: m.role, text: m.text })) }),
      });
      const data = await res.json();
      setMensajes((m) => [...m, { role: 'model', text: data.reply || '...', accion: data.accion }]);
    } catch {
      setMensajes((m) => [...m, { role: 'model', text: 'Uy, error de conexión. Probá de nuevo. 🙈' }]);
    } finally {
      setLoading(false);
    }
  }

  async function ejecutar(accion: any, idx: number) {
    try {
      const supabase = createClient();
      if (accion.tipo === 'tarea') {
        await supabase.from('tareas').insert({ empleador_id: empleadorId, titulo: accion.titulo, categoria: accion.categoria || null, prioridad: 'media', estado: 'pendiente', fecha: new Date().toISOString().split('T')[0] });
      } else if (accion.tipo === 'recordatorio') {
        await supabase.from('recordatorios').insert({ empleador_id: empleadorId, titulo: accion.titulo, hora: accion.hora || '08:00', tipo: 'tarea', activo: true, dias_semana: '{1,2,3,4,5}' });
      }
      setMensajes((m) => m.map((msg, i) => (i === idx ? { ...msg, accion: null } : msg)).concat([{ role: 'model', text: `✅ Listo, creé tu ${accion.tipo}: "${accion.titulo}"` }]));
    } catch {
      setMensajes((m) => [...m, { role: 'model', text: 'No pude crearlo, intentá de nuevo.' }]);
    }
  }

  return (
    <>
      {!open && (
        <button onClick={() => setOpen(true)}
          className="fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-600 px-4 py-3 text-sm font-semibold text-white shadow-lg hover:opacity-90 transition">
          <Sparkles className="w-4 h-4" /> Habla con Poppins
        </button>
      )}
      {open && (
        <div className="fixed bottom-5 right-5 z-50 flex h-[520px] w-[360px] max-w-[calc(100vw-2rem)] flex-col rounded-2xl border border-zinc-200 bg-white shadow-2xl">
          <div className="flex items-center justify-between rounded-t-2xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-4 py-3 text-white">
            <span className="flex items-center gap-2 text-sm font-semibold"><Sparkles className="w-4 h-4" /> Habla con Poppins</span>
            <button onClick={() => setOpen(false)}><X className="w-5 h-5" /></button>
          </div>
          <div className="flex-1 space-y-3 overflow-y-auto p-4">
            {mensajes.map((m, i) => (
              <div key={i} className={m.role === 'user' ? 'text-right' : 'text-left'}>
                <div className={`inline-block max-w-[85%] rounded-2xl px-3 py-2 text-sm ${m.role === 'user' ? 'bg-violet-600 text-white' : 'bg-zinc-100 text-zinc-800'}`}>
                  {m.text}
                </div>
                {m.accion && (
                  <div className="mt-1.5">
                    <button onClick={() => ejecutar(m.accion, i)}
                      className="rounded-full bg-emerald-600 px-3 py-1 text-xs font-medium text-white hover:bg-emerald-700">
                      ➕ Crear {m.accion.tipo}: {m.accion.titulo}
                    </button>
                  </div>
                )}
              </div>
            ))}
            {loading && <div className="text-left"><div className="inline-block rounded-2xl bg-zinc-100 px-3 py-2"><Loader2 className="w-4 h-4 animate-spin text-zinc-400" /></div></div>}
            <div ref={endRef} />
          </div>
          <div className="flex items-center gap-2 border-t border-zinc-100 p-3">
            <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && send()}
              placeholder="Escribí tu mensaje..." className="flex-1 rounded-full border border-zinc-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" />
            <button onClick={send} disabled={loading || !input.trim()} className="rounded-full bg-violet-600 p-2 text-white disabled:opacity-50">
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
