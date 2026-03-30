'use client';

import { Loader2 } from 'lucide-react';
import { useAuth } from '@/lib/auth/context';
import { usePathname } from 'next/navigation';

export function LoadingScreen() {
  const { loading, signOut } = useAuth();
  const pathname = usePathname();

  // Don't block public pages (landing, auth) with loading screen
  if (!loading || pathname === '/' || pathname.startsWith('/auth/') || pathname.startsWith('/landing/')) return null;

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-white">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-zinc-900 mb-2">Poppins</h1>
        <p className="text-sm text-zinc-500 mb-6">ERP RRHH Chile</p>
        <Loader2 className="h-8 w-8 animate-spin text-zinc-400 mx-auto" />
        <p className="text-sm text-zinc-400 mt-4">Cargando...</p>
        <button
          onClick={signOut}
          className="mt-3 text-xs text-zinc-400 hover:text-zinc-600 underline transition-colors"
        >
          Cerrar sesión
        </button>
      </div>
    </div>
  );
}
