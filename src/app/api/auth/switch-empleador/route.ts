// POST /api/auth/switch-empleador
// Body: { empleador_id }
// Cambia el empleador activo de la sesión. Valida que el user tenga acceso
// vía user_empleadores. Actualiza user_profiles.active_empleador_id.

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { auditLog } from '@/lib/audit/log';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: 'no_auth' }, { status: 401 });

  const body = await request.json().catch(() => null);
  const empleadorId = body?.empleador_id as string | undefined;
  if (!empleadorId) {
    return NextResponse.json({ ok: false, error: 'empleador_id_requerido' }, { status: 422 });
  }

  // Validar acceso
  const { data: link } = await supabase
    .from('user_empleadores')
    .select('rol')
    .eq('auth_user_id', user.id)
    .eq('empleador_id', empleadorId)
    .maybeSingle();
  if (!link) {
    return NextResponse.json({ ok: false, error: 'sin_acceso_a_empleador' }, { status: 403 });
  }

  // Update active
  const { error } = await supabase
    .from('user_profiles')
    .update({ active_empleador_id: empleadorId })
    .eq('auth_user_id', user.id);
  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  await auditLog(supabase, {
    userId: user.id, empleadorId,
    action: 'auth.switch_empleador',
    entity: 'user_profiles', entityId: user.id,
    payload: { rol: link.rol },
    request,
  });

  return NextResponse.json({ ok: true, activeEmpleadorId: empleadorId, rol: link.rol });
}
