'use client';

import { useState, useEffect } from 'react';
import { Bell, X, Check } from 'lucide-react';
import { useAuth } from '@/lib/auth/context';
import { createClient } from '@/lib/supabase/client';

export function NotificacionesDropdown() {
  const { profile } = useAuth();
  const [notifs, setNotifs] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    if (!profile?.auth_user_id) return;
    const supabase = createClient();
    supabase.from('notificaciones_push')
      .select('*')
      .eq('destinatario_id', profile.auth_user_id)
      .order('created_at', { ascending: false })
      .limit(10)
      .then(({ data }: any) => {
        setNotifs(data || []);
        setUnread((data || []).filter((n: any) => !n.leida).length);
      });
  }, [profile?.auth_user_id]);

  const marcarLeida = async (id: string) => {
    const supabase = createClient();
    await supabase.from('notificaciones_push').update({ leida: true }).eq('id', id);
    setNotifs(prev => prev.map(n => n.id === id ? { ...n, leida: true } : n));
    setUnread(prev => Math.max(0, prev - 1));
  };

  const marcarTodas = async () => {
    const supabase = createClient();
    const ids = notifs.filter(n => !n.leida).map(n => n.id);
    if (ids.length > 0) {
      await supabase.from('notificaciones_push').update({ leida: true }).in('id', ids);
      setNotifs(prev => prev.map(n => ({ ...n, leida: true })));
      setUnread(0);
    }
  };

  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)} className="relative p-2 rounded-lg hover:bg-zinc-100 transition">
        <Bell className="w-5 h-5 text-zinc-600" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
            {unread}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl border border-zinc-200 shadow-xl z-50 overflow-hidden">
            <div className="px-4 py-3 border-b border-zinc-100 flex items-center justify-between">
              <p className="text-sm font-semibold text-zinc-900">Notificaciones</p>
              {unread > 0 && (
                <button onClick={marcarTodas} className="text-xs text-violet-600 hover:underline">Marcar todas</button>
              )}
            </div>
            <div className="max-h-64 overflow-y-auto divide-y divide-zinc-50">
              {notifs.length === 0 ? (
                <p className="px-4 py-6 text-sm text-zinc-400 text-center">Sin notificaciones</p>
              ) : notifs.map(n => (
                <div key={n.id} className={`px-4 py-3 flex gap-3 ${n.leida ? '' : 'bg-violet-50/50'}`}>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm ${n.leida ? 'text-zinc-600' : 'text-zinc-900 font-medium'}`}>{n.titulo}</p>
                    {n.mensaje && <p className="text-xs text-zinc-400 mt-0.5 truncate">{n.mensaje}</p>}
                    <p className="text-[10px] text-zinc-300 mt-1">{new Date(n.created_at).toLocaleString('es-CL')}</p>
                  </div>
                  {!n.leida && (
                    <button onClick={() => marcarLeida(n.id)} className="shrink-0 text-zinc-400 hover:text-emerald-600">
                      <Check className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
