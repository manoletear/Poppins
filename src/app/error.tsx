'use client';

import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log to error reporting service in production
  }, [error]);

  return (
    <div className="min-h-[50vh] flex items-center justify-center p-8">
      <div className="max-w-md text-center">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-2xl">⚠️</span>
        </div>
        <h2 className="text-xl font-bold text-zinc-900 mb-2">Algo salió mal</h2>
        <p className="text-sm text-zinc-500 mb-6">
          Ocurrió un error inesperado. Por favor intenta nuevamente.
        </p>
        <button
          onClick={reset}
          className="rounded-lg bg-zinc-900 px-6 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 transition"
        >
          Reintentar
        </button>
      </div>
    </div>
  );
}
