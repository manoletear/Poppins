// GET  /api/payroll/novedades?period=YYYY-MM[&trabajadorId=...]
// POST /api/payroll/novedades  { period, trabajador_id, concept_code, amount, description? }
// DELETE /api/payroll/novedades?id=...

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

async function resolveEmpleador(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
  const { data: perfil } = await supabase
    .from('user_profiles').select('empleador_id').eq('auth_user_id', userId).maybeSingle();
  if (perfil?.empleador_id) return perfil.empleador_id as string;
  const { data: emp } = await supabase
    .from('empleadores').select('id').eq('auth_user_id', userId).maybeSingle();
  return emp?.id as string | undefined;
}

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: 'no_auth' }, { status: 401 });

  const empleadorId = await resolveEmpleador(supabase, user.id);
  if (!empleadorId) return NextResponse.json({ ok: false, error: 'sin_empleador' }, { status: 400 });

  const url = new URL(request.url);
  const period      = url.searchParams.get('period');
  const trabajadorId = url.searchParams.get('trabajadorId');

  if (!period) return NextResponse.json({ ok: false, error: 'period requerido' }, { status: 422 });

  let query = supabase
    .from('payroll_novedades')
    .select('id, trabajador_id, concept_code, amount, description')
    .eq('empleador_id', empleadorId)
    .eq('periodo', period);

  if (trabajadorId) query = query.eq('trabajador_id', trabajadorId);

  const { data, error } = await query;
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, data: data ?? [] });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: 'no_auth' }, { status: 401 });

  const empleadorId = await resolveEmpleador(supabase, user.id);
  if (!empleadorId) return NextResponse.json({ ok: false, error: 'sin_empleador' }, { status: 400 });

  const body = await request.json().catch(() => null);
  const { period, trabajador_id, concept_code, amount, description } = body ?? {};

  if (!period || !trabajador_id || !concept_code || amount === undefined) {
    return NextResponse.json({ ok: false, error: 'Faltan campos requeridos' }, { status: 422 });
  }

  const { data, error } = await supabase
    .from('payroll_novedades')
    .upsert({
      empleador_id: empleadorId,
      periodo:      period,
      trabajador_id,
      concept_code,
      amount:       Number(amount),
      description:  description ?? null,
      created_by:   user.id,
    }, { onConflict: 'empleador_id,periodo,trabajador_id,concept_code' })
    .select('id')
    .single();

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, id: data.id });
}

export async function DELETE(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: 'no_auth' }, { status: 401 });

  const empleadorId = await resolveEmpleador(supabase, user.id);
  if (!empleadorId) return NextResponse.json({ ok: false, error: 'sin_empleador' }, { status: 400 });

  const url = new URL(request.url);
  const id = url.searchParams.get('id');
  if (!id) return NextResponse.json({ ok: false, error: 'id requerido' }, { status: 422 });

  const { error } = await supabase
    .from('payroll_novedades')
    .delete()
    .eq('id', id)
    .eq('empleador_id', empleadorId);

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
