'use client';

import Link from 'next/link';
import { useAuth } from '@/lib/auth/context';
import { getRedirectForRole, getRolLabel } from '@/lib/auth/helpers';

export function AuthBar() {
  const { user, profile, loading, signOut } = useAuth();

  if (loading || !user) return null;

  const displayName = profile
    ? `${profile.nombre}${profile.apellido ? ` ${profile.apellido}` : ''}`
    : user.email ?? 'Usuario';

  const portalHref = profile ? getRedirectForRole(profile.rol) : '/dashboard';
  const rolLabel = profile ? getRolLabel(profile.rol) : '';

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-zinc-200 shadow-sm">
      <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-sm text-zinc-600">
            Bienvenido, <span className="font-semibold text-zinc-900">{displayName}</span>
          </span>
          {rolLabel && (
            <span className="inline-flex rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-zinc-500">
              {rolLabel}
            </span>
          )}
        </div>
        <div className="flex items-center gap-4">
          <Link
            href={portalHref}
            className="inline-flex items-center rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 transition-colors"
          >
            Ir a mi portal
          </Link>
          <button
            onClick={signOut}
            className="text-sm text-zinc-500 hover:text-zinc-700 transition-colors"
          >
            Cerrar sesion
          </button>
        </div>
      </div>
    </div>
  );
}
