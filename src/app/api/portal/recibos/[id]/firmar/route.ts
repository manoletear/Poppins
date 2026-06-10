// POST /api/portal/recibos/[id]/firmar
// Trabajador firma el recibo de remuneraciones. Solo el dueño puede firmar (RLS).

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
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

  const { data: profile } = await supabase
    .from('user_profiles').select('trabajador_id').eq('auth_user_id', user.id).maybeSingle();
  if (!profile?.trabajador_id) return NextResponse.json({ ok: false, error: 'sin_trabajador' }, { status: 403 });

  const { data: res } = await supabase
    .from('payroll_results').select('id, worker_id, empleador_id, recibo_firmado_at')
    .eq('id', id).maybeSingle();
  if (!res || res.worker_id !== profile.trabajador_id) {
    return NextResponse.json({ ok: false, error: 'no_encontrado' }, { status: 404 });
  }
  if (res.recibo_firmado_at) {
    return NextResponse.json({ ok: false, error: 'ya_firmado' }, { status: 409 });
  }

  const ip = getClientIp(request);
  const now = new Date().toISOString();
  const { error } = await supabase
    .from('payroll_results')
    .update({ recibo_firmado_at: now, recibo_ip_trabajador: ip })
    .eq('id', id);
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  await auditLog(supabase, {
    userId: user.id, empleadorId: res.empleador_id,
    action: 'recibo.firma_trabajador',
    entity: 'payroll_results', entityId: id,
    payload: { ip },
    request,
  });

  return NextResponse.json({ ok: true, firmado_at: now });
}
