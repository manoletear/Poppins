// GET /api/auth/empleadores
// Lista de empleadores a los que el usuario tiene acceso (N:M) + el activo.

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: 'no_auth' }, { status: 401 });

  const [{ data: rows }, { data: profile }] = await Promise.all([
    supabase
      .from('user_empleadores')
      .select('empleador_id, rol, empleadores:empleador_id (id, rut, nombre)')
      .eq('auth_user_id', user.id)
      .eq('estado', 'activo'),
    supabase
      .from('user_profiles')
      .select('active_empleador_id')
      .eq('auth_user_id', user.id)
      .maybeSingle(),
  ]);

  const activeId = profile?.active_empleador_id as string | undefined;
  const empleadores = (rows ?? []).map((r: any) => ({
    id: r.empleador_id,
    rut: r.empleadores?.rut,
    nombre: r.empleadores?.nombre,
    rol: r.rol,
    isActive: r.empleador_id === activeId,
  }));

  return NextResponse.json({ ok: true, activeEmpleadorId: activeId, empleadores });
}
