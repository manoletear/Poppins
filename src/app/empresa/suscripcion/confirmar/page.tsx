'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Check, AlertTriangle } from 'lucide-react';

function Confirmar() {
  const router = useRouter();
  const [estado, setEstado] = useState<'cargando' | 'ok' | 'error'>('cargando');
  const [msg, setMsg] = useState('');

  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        const res = await fetch('/api/suscripcion/confirmar-tarjeta', { method: 'POST' });
        const data = await res.json();
        if (cancel) return;
        if (res.ok && data.ok) {
          setEstado('ok');
          setTimeout(() => router.push('/empresa'), 1800);
        } else {
          setEstado('error');
          setMsg(data.reason || data.error || 'No se pudo confirmar la tarjeta.');
        }
      } catch {
        if (!cancel) {
          setEstado('error');
          setMsg('Error de conexión.');
        }
      }
    })();
    return () => {
      cancel = true;
    };
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-md w-full rounded-2xl border border-zinc-200 bg-white shadow-lg p-8 text-center">
        {estado === 'cargando' && (
          <>
            <Loader2 className="h-8 w-8 animate-spin text-[#E91E8C] mx-auto mb-4" />
            <p className="text-zinc-700 font-medium">Confirmando tu suscripción…</p>
          </>
        )}
        {estado === 'ok' && (
          <>
            <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
              <Check className="h-6 w-6 text-green-600" />
            </div>
            <p className="text-zinc-900 font-semibold">¡Listo! Suscripción activada con 2 meses gratis.</p>
            <p className="text-sm text-zinc-500 mt-1">Te llevamos a tu panel…</p>
          </>
        )}
        {estado === 'error' && (
          <>
            <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
            <p className="text-zinc-900 font-semibold">No pudimos confirmar la tarjeta</p>
            <p className="text-sm text-zinc-500 mt-1">{msg}</p>
            <button
              onClick={() => router.push('/empresa')}
              className="mt-5 rounded-lg bg-zinc-900 text-white px-5 py-2.5 text-sm font-medium hover:bg-zinc-800"
            >
              Volver al panel
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default function ConfirmarSuscripcionPage() {
  return (
    <Suspense fallback={null}>
      <Confirmar />
    </Suspense>
  );
}
