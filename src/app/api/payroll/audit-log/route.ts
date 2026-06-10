// GET /api/payroll/audit-log?period=YYYY-MM&action=...&limit=50
// Lista las entradas del audit_log para el empleador activo, opcionalmente
// filtradas por período (entity_id) o action.

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getActiveEmpleadorId } from '@/lib/auth/active-empleador';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: 'no_auth' }, { status: 401 });

  const { empleadorId } = await getActiveEmpleadorId(supabase, user);
  if (!empleadorId) return NextResponse.json({ ok: false, error: 'sin_empleador' }, { status: 400 });

  const url = new URL(request.url);
  const period = url.searchParams.get('period');
  const action = url.searchParams.get('action');
  const limit = Math.min(Number(url.searchParams.get('limit') ?? '50'), 200);

  let q = supabase
    .from('audit_log')
    .select('id, user_id, action, entity, entity_id, payload, ip, created_at')
    .eq('empleador_id', empleadorId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (period) q = q.eq('entity_id', period);
  if (action) q = q.eq('action', action);

  const { data, error } = await q;
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, items: data ?? [] });
}
