// POST /api/payroll/reabrir-periodo
// Anula (voided=true) todos los payroll_results del empleador para un período.
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: 'no_auth' }, { status: 401 });

  const { period } = await request.json();
  if (!period) return NextResponse.json({ ok: false, error: 'period_required' }, { status: 400 });

  // Resolver empleador
  let empleadorId: string | undefined;
  const { data: profile } = await supabase
    .from('user_profiles').select('empleador_id').eq('auth_user_id', user.id).maybeSingle();
  empleadorId = profile?.empleador_id;
  if (!empleadorId) {
    const { data: emp } = await supabase
      .from('empleadores').select('id').eq('auth_user_id', user.id).maybeSingle();
    empleadorId = emp?.id;
  }
  if (!empleadorId) return NextResponse.json({ ok: false, error: 'no_empleador' }, { status: 403 });

  const { error, count } = await supabase
    .from('payroll_results')
    .update({ voided: true, voided_reason: 'reabrir_periodo' })
    .eq('empleador_id', empleadorId)
    .eq('payroll_period', period)
    .eq('voided', false);

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, voided: count ?? 0 });
}
