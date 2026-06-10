// GET  /api/empresa/preferencias        → lee preferencias del empleador activo
// PATCH /api/empresa/preferencias        → merge parcial al JSONB empleadores.preferencias
//
// Flags soportadas:
//   - email_liquidacion_enabled (boolean, default false)
//   - email_liquidacion_remitente (string, optional)

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getActiveEmpleadorId } from '@/lib/auth/active-empleador';
import { auditLog } from '@/lib/audit/log';

export const runtime = 'nodejs';

const DEFAULTS = {
  email_liquidacion_enabled: false,
};

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: 'no_auth' }, { status: 401 });

  const { empleadorId } = await getActiveEmpleadorId(supabase, user);
  if (!empleadorId) return NextResponse.json({ ok: false, error: 'sin_empleador' }, { status: 400 });

  const { data } = await supabase
    .from('empleadores').select('preferencias').eq('id', empleadorId).maybeSingle();
  const preferencias = { ...DEFAULTS, ...(data?.preferencias ?? {}) };
  return NextResponse.json({ ok: true, preferencias });
}

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: 'no_auth' }, { status: 401 });

  const { empleadorId } = await getActiveEmpleadorId(supabase, user);
  if (!empleadorId) return NextResponse.json({ ok: false, error: 'sin_empleador' }, { status: 400 });

  const patch = await request.json().catch(() => ({}));
  if (!patch || typeof patch !== 'object') {
    return NextResponse.json({ ok: false, error: 'body_invalido' }, { status: 422 });
  }

  const { data: existing } = await supabase
    .from('empleadores').select('preferencias').eq('id', empleadorId).maybeSingle();
  const merged = { ...DEFAULTS, ...(existing?.preferencias ?? {}), ...patch };

  const { error } = await supabase
    .from('empleadores').update({ preferencias: merged }).eq('id', empleadorId);
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  await auditLog(supabase, {
    userId: user.id, empleadorId,
    action: 'empresa.preferencias_update',
    entity: 'empleador', entityId: empleadorId,
    payload: patch, request,
  });

  return NextResponse.json({ ok: true, preferencias: merged });
}
