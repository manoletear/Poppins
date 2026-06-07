// GET /api/payroll/periodos-estado
// Retorna el estado (cerrado/abierto) de los últimos 12 períodos del empleador.

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: 'no_auth' }, { status: 401 });

  const { data: perfil } = await supabase
    .from('user_profiles').select('empleador_id').eq('auth_user_id', user.id).maybeSingle();
  let empleadorId = perfil?.empleador_id as string | undefined;
  if (!empleadorId) {
    const { data: emp } = await supabase
      .from('empleadores').select('id').eq('auth_user_id', user.id).maybeSingle();
    empleadorId = emp?.id;
  }
  if (!empleadorId) return NextResponse.json({ ok: false, error: 'sin_empleador' }, { status: 400 });

  // Últimos 12 períodos
  const now = new Date();
  const periods: string[] = [];
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    periods.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }
  const fromPeriod = periods[periods.length - 1];

  const { data: rows } = await supabase
    .from('payroll_results')
    .select('payroll_period, net_pay, worker_id')
    .eq('empleador_id', empleadorId)
    .eq('voided', false)
    .gte('payroll_period', fromPeriod);

  // Agrupar por período
  const byPeriod = new Map<string, { workerIds: Set<string>; total: number }>();
  for (const r of rows ?? []) {
    if (!byPeriod.has(r.payroll_period)) {
      byPeriod.set(r.payroll_period, { workerIds: new Set(), total: 0 });
    }
    const p = byPeriod.get(r.payroll_period)!;
    p.workerIds.add(r.worker_id);
    p.total += r.net_pay;
  }

  const result = periods.map(period => ({
    period,
    closed:      byPeriod.has(period),
    workerCount: byPeriod.get(period)?.workerIds.size ?? 0,
    totalNetPay: byPeriod.get(period)?.total ?? 0,
  }));

  return NextResponse.json({ ok: true, periods: result });
}
