// POST /api/payroll/reabrir-periodo
// Anula (voided=true) todos los payroll_results del empleador para un período.
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getActiveEmpleadorId } from '@/lib/auth/active-empleador';
import { auditLog } from '@/lib/audit/log';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: 'no_auth' }, { status: 401 });

  const { period } = await request.json();
  if (!period) return NextResponse.json({ ok: false, error: 'period_required' }, { status: 400 });

  const { empleadorId } = await getActiveEmpleadorId(supabase, user);
  if (!empleadorId) return NextResponse.json({ ok: false, error: 'no_empleador' }, { status: 403 });

  // Secuencialidad: no se puede reabrir si hay períodos posteriores cerrados.
  // Hay que reabrirlos de adelante hacia atrás.
  const { data: posteriores } = await supabase
    .from('payroll_results')
    .select('payroll_period')
    .eq('empleador_id', empleadorId)
    .gt('payroll_period', period)
    .eq('voided', false)
    .order('payroll_period', { ascending: true })
    .limit(1);

  if (posteriores && posteriores.length > 0) {
    return NextResponse.json({
      ok: false,
      error: 'periodos_posteriores_cerrados',
      detail: `No puedes reabrir ${period}: hay períodos posteriores cerrados. Reabre primero ${posteriores[0].payroll_period}.`,
      nextClosedPeriod: posteriores[0].payroll_period,
    }, { status: 409 });
  }

  const { error, count } = await supabase
    .from('payroll_results')
    .update({ voided: true, voided_reason: 'reabrir_periodo' })
    .eq('empleador_id', empleadorId)
    .eq('payroll_period', period)
    .eq('voided', false);

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  await auditLog(supabase, {
    userId: user.id,
    empleadorId,
    action: 'payroll.reopen',
    entity: 'payroll_period',
    entityId: period,
    payload: { voided: count ?? 0 },
    request,
  });

  return NextResponse.json({ ok: true, voided: count ?? 0 });
}
