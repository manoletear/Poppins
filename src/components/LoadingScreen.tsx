'use client';

import { Loader2 } from 'lucide-react';
import { useAuth } from '@/lib/auth/context';

export function LoadingScreen() {
  const { loading, error, signOut } = useAuth();

  if (!loading && !error) return null;

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-white">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-zinc-900 mb-2">Poppins</h1>
        <p className="text-sm text-zinc-500 mb-6">ERP RRHH Chile</p>

        {error ? (
          <div className="space-y-4">
            <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => window.location.reload()}
                className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 transition-colors"
              >
                Reintentar
              </button>
              <button
                onClick={signOut}
                className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 transition-colors"
              >
                Cerrar Sesión
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <Loader2 className="h-8 w-8 animate-spin text-zinc-400 mx-auto" />
            <p className="text-sm text-zinc-400">Cargando...</p>
            <button
              onClick={signOut}
              className="text-xs text-zinc-400 hover:text-zinc-600 underline transition-colors"
            >
              Cerrar sesión
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
