// POST /api/contratos/[id]/firma
// Body: { rol: 'empleador' | 'trabajador' }
// Registra firma electrónica del rol especificado. Usa get_my_trabajador_id()
// para trabajador (via RLS) o getActiveEmpleadorId para empleador.
// Registra fecha + IP + user agent. Persiste como prueba.

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getActiveEmpleadorId } from '@/lib/auth/active-empleador';
import { auditLog } from '@/lib/audit/log';

export const runtime = 'nodejs';

function getClientIp(request: Request): string | null {
  const h = request.headers;
  return h.get('x-forwarded-for')?.split(',')[0]?.trim()
    || h.get('cf-connecting-ip')
    || h.get('x-real-ip')
    || null;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: 'no_auth' }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const rol = body?.rol as 'empleador' | 'trabajador';
  if (!['empleador', 'trabajador'].includes(rol)) {
    return NextResponse.json({ ok: false, error: 'rol_invalido' }, { status: 422 });
  }

  // Resolver acceso según rol
  let empleadorId: string | null = null;
  let trabajadorId: string | null = null;
  if (rol === 'empleador') {
    const r = await getActiveEmpleadorId(supabase, user);
    empleadorId = r.empleadorId;
    if (!empleadorId) return NextResponse.json({ ok: false, error: 'sin_empleador' }, { status: 400 });
  } else {
    const { data: profile } = await supabase
      .from('user_profiles').select('trabajador_id').eq('auth_user_id', user.id).maybeSingle();
    trabajadorId = profile?.trabajador_id ?? null;
    if (!trabajadorId) return NextResponse.json({ ok: false, error: 'sin_trabajador' }, { status: 400 });
  }

  // Verificar acceso al contrato
  const { data: c } = await supabase
    .from('contratos')
    .select('id, empleador_id, trabajador_id, fecha_firma_empleador, fecha_firma_trabajador')
    .eq('id', id)
    .maybeSingle();
  if (!c) return NextResponse.json({ ok: false, error: 'no_encontrado' }, { status: 404 });
  if (rol === 'empleador' && c.empleador_id !== empleadorId) {
    return NextResponse.json({ ok: false, error: 'sin_acceso' }, { status: 403 });
  }
  if (rol === 'trabajador' && c.trabajador_id !== trabajadorId) {
    return NextResponse.json({ ok: false, error: 'sin_acceso' }, { status: 403 });
  }

  const ip = getClientIp(request);
  const now = new Date().toISOString();
  const update: Record<string, any> = {
    metodo_firma: 'electronica_simple',
  };
  if (rol === 'empleador') {
    update.fecha_firma_empleador = now;
    update.ip_firma_empleador = ip;
  } else {
    update.fecha_firma_trabajador = now;
    update.ip_firma_trabajador = ip;
  }

  const { error } = await supabase.from('contratos').update(update).eq('id', id);
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  await auditLog(supabase, {
    userId: user.id,
    empleadorId: c.empleador_id,
    action: `contrato.firma_${rol}`,
    entity: 'contrato', entityId: id,
    payload: { ip, user_agent: request.headers.get('user-agent') },
    request,
  });

  return NextResponse.json({ ok: true, firmado_at: now });
}
