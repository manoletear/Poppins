'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Loader2, ArrowLeft } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [ready, setReady] = useState(false);
  const [sessionOk, setSessionOk] = useState(false);

  // Al llegar desde el email de recuperación, establecemos la sesión de recovery.
  useEffect(() => {
    const supabase = createClient();
    async function init() {
      try {
        const url = new URL(window.location.href);
        const code = url.searchParams.get('code');
        if (code) {
          await supabase.auth.exchangeCodeForSession(code);
        }
      } catch { /* el hash (#access_token) lo maneja detectSessionInUrl */ }
      const { data } = await supabase.auth.getSession();
      setSessionOk(!!data.session);
      setReady(true);
    }
    const { data: sub } = supabase.auth.onAuthStateChange((event: string) => {
      if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') setSessionOk(true);
    });
    init();
    return () => sub.subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 6) { setError('La contraseña debe tener al menos 6 caracteres.'); return; }
    if (password !== confirm) { setError('Las contraseñas no coinciden.'); return; }
    setLoading(true);
    const supabase = createClient();
    const { error: upErr } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (upErr) { setError(upErr.message); return; }
    setSuccess(true);
    setTimeout(() => router.push('/auth/login'), 2500);
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="max-w-md w-full rounded-2xl border border-zinc-200 bg-white shadow-lg p-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-zinc-900">Poppins</h2>
          <p className="text-sm text-zinc-500 mt-1">Magia en tu casa</p>
        </div>

        <h1 className="text-xl font-bold text-zinc-900 mt-8">Nueva Contraseña</h1>
        <p className="text-sm text-zinc-500 mt-1">Elegí tu nueva contraseña para entrar a Poppins.</p>

        {error && (
          <div className="mt-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>
        )}

        {!ready ? (
          <div className="mt-8 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-zinc-400" /></div>
        ) : success ? (
          <div className="mt-6 rounded-lg bg-green-50 border border-green-200 px-4 py-4 text-center">
            <p className="text-sm font-medium text-green-800">¡Contraseña actualizada! 🎉</p>
            <p className="text-sm text-green-700 mt-1">Te llevamos a iniciar sesión…</p>
          </div>
        ) : !sessionOk ? (
          <div className="mt-6">
            <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-4 text-sm text-amber-800">
              El enlace es inválido o expiró. Pedí uno nuevo desde &quot;Recuperar contraseña&quot;.
            </div>
            <Link href="/auth/forgot-password" className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-zinc-200 bg-white py-3 text-sm font-medium text-zinc-700 hover:bg-zinc-50 transition-colors">
              Pedir nuevo enlace
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">Nueva contraseña</label>
              <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} disabled={loading}
                className="w-full rounded-lg border border-zinc-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900" placeholder="••••••••" />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">Repetir contraseña</label>
              <input type="password" required value={confirm} onChange={(e) => setConfirm(e.target.value)} disabled={loading}
                className="w-full rounded-lg border border-zinc-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900" placeholder="••••••••" />
            </div>
            <button type="submit" disabled={loading}
              className="w-full bg-zinc-900 text-white rounded-lg py-3 text-sm font-medium hover:bg-zinc-800 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors">
              {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Guardando…</> : 'Guardar contraseña'}
            </button>
          </form>
        )}

        <p className="mt-6 text-center">
          <Link href="/auth/login" className="inline-flex items-center gap-1 text-sm text-zinc-600 hover:text-zinc-900 hover:underline">
            <ArrowLeft className="h-3.5 w-3.5" /> Volver a Iniciar Sesión
          </Link>
        </p>
      </div>
    </div>
  );
}
