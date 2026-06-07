// GET /api/payroll/sueldos?period=YYYY-MM
// Descarga CSV simple: RUT, Nombre, Sueldo Bruto, Descuentos, Sueldo Neto, Costo Empleador
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: 'no_auth' }, { status: 401 });

  const period = new URL(request.url).searchParams.get('period');
  if (!period) return NextResponse.json({ ok: false, error: 'period_required' }, { status: 400 });

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

  const { data, error } = await supabase
    .from('payroll_results')
    .select(`
      gross_income, taxable_income,
      deduction_afp10, deduction_afp_commission,
      deduction_health7, deduction_income_tax, deduction_advances, deduction_other,
      net_pay, total_employer_cost,
      trabajadores ( rut, nombre, apellido_paterno, apellido_materno )
    `)
    .eq('empleador_id', empleadorId)
    .eq('payroll_period', period)
    .eq('voided', false)
    .order('created_at');

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  const rows = (data ?? []) as any[];

  const header = [
    'RUT', 'Nombre', 'Apellido Paterno', 'Apellido Materno',
    'Sueldo Bruto', 'Base Imponible',
    'AFP 10%', 'Comisión AFP', 'Salud 7%', 'Imp. Único',
    'Anticipos', 'Otros Desc.',
    'Sueldo Neto', 'Costo Total Empleador',
  ].join(';');

  const lines = rows.map(r => {
    const t = r.trabajadores ?? {};
    const descuentos_total =
      (r.deduction_afp10 ?? 0) + (r.deduction_afp_commission ?? 0) +
      (r.deduction_health7 ?? 0) + (r.deduction_income_tax ?? 0) +
      (r.deduction_advances ?? 0) + (r.deduction_other ?? 0);
    void descuentos_total;
    return [
      t.rut ?? '',
      t.nombre ?? '',
      t.apellido_paterno ?? '',
      t.apellido_materno ?? '',
      r.gross_income ?? 0,
      r.taxable_income ?? 0,
      r.deduction_afp10 ?? 0,
      r.deduction_afp_commission ?? 0,
      r.deduction_health7 ?? 0,
      r.deduction_income_tax ?? 0,
      r.deduction_advances ?? 0,
      r.deduction_other ?? 0,
      r.net_pay ?? 0,
      r.total_employer_cost ?? 0,
    ].join(';');
  });

  const csv = [header, ...lines].join('\r\n');

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="sueldos_${period.replace('-', '')}.csv"`,
    },
  });
}
