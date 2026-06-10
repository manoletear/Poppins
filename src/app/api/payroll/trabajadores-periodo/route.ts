// GET /api/payroll/trabajadores-periodo?period=YYYY-MM
// Lista trabajadores con resultados persistidos para un período cerrado
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getActiveEmpleadorId } from '@/lib/auth/active-empleador';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: 'no_auth' }, { status: 401 });

  const period = new URL(request.url).searchParams.get('period');
  if (!period) return NextResponse.json({ ok: false, error: 'period_required' }, { status: 400 });

  const { empleadorId } = await getActiveEmpleadorId(supabase, user);
  if (!empleadorId) return NextResponse.json({ ok: false, error: 'no_empleador' }, { status: 403 });

  const { data: results, error } = await supabase
    .from('payroll_results')
    .select('worker_id, net_pay')
    .eq('empleador_id', empleadorId)
    .eq('payroll_period', period)
    .eq('voided', false);

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  if (!results || results.length === 0) return NextResponse.json({ ok: true, data: [] });

  // worker_id es text (no FK) — hacemos el lookup en una segunda query.
  const workerIds = Array.from(new Set(results.map((r: any) => r.worker_id)));
  const { data: trabs } = await supabase
    .from('trabajadores')
    .select('id, rut, nombre, apellido_paterno')
    .in('id', workerIds);
  const trabMap = new Map<string, any>();
  for (const t of trabs ?? []) trabMap.set(t.id, t);

  const workers = results.map((r: any) => {
    const t = trabMap.get(r.worker_id);
    return {
      workerId:   r.worker_id,
      netPay:     r.net_pay,
      workerName: `${t?.nombre ?? ''} ${t?.apellido_paterno ?? ''}`.trim() || 'Trabajador',
      workerRut:  t?.rut ?? '',
    };
  });

  return NextResponse.json({ ok: true, data: workers });
}
