// GET /api/payroll/libro-remuneraciones?period=YYYY-MM
// Libro de Remuneraciones — formato CSV DT (Dirección del Trabajo)
// Columnas: RUT, Nombre completo, Días trabajados, Sueldo Base, Horas Extra,
//           Gratificación, Otros haberes, Bruto, AFP, SIS, CCAF/Salud, Desc. legales,
//           Desc. voluntarios, Neto, Costo empleador.
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

  const { data: results, error } = await supabase
    .from('payroll_results')
    .select(`
      gross_income, taxable_income, pension_base, health_base,
      deduction_afp10, deduction_afp_commission, deduction_health7,
      deduction_income_tax, deduction_advances, deduction_other,
      contribution_sis, contribution_afc_employer, contribution_mutual,
      net_pay, total_employer_cost, calculation_trace,
      trabajadores ( rut, nombre, apellido_paterno, apellido_materno ),
      contratos ( sueldo_base )
    `)
    .eq('empleador_id', empleadorId)
    .eq('payroll_period', period)
    .eq('voided', false)
    .order('created_at');

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  // Obtener conceptos variables por resultado
  const resultIds = (results ?? []).map((_: any, i: number) => i); void resultIds;

  const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
                 'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  const [y, m] = period.split('-').map(Number);
  const periodoLabel = `${MESES[m - 1]} ${y}`;

  const header = [
    'RUT', 'Nombre Completo',
    'Días Trabajados', 'Sueldo Base',
    'Horas Extra Valor', 'Gratificación', 'Otros Haberes',
    'Total Haberes (Bruto)',
    'AFP 10%', 'Comisión AFP', 'Salud 7%', 'Imp. Único 2ª Cat.',
    'Anticipos', 'Otras Deducciones',
    'Total Descuentos',
    'Líquido a Pagar',
    'SIS Empleador', 'AFC Empleador', 'Mutual', 'Costo Total Empleador',
  ].join(';');

  const rows = (results ?? []) as any[];
  const lines = rows.map(r => {
    const t = r.trabajadores ?? {};
    const trace = r.calculation_trace ?? {};

    const paidDays = trace['SUELDO_BASE']?.inputs?.paidDays ?? '';
    const sueldoBase = (r.contratos as any)?.sueldo_base ?? 0;
    const horasExtraVal = trace['HORAS_EXTRA']?.result ?? 0;
    const gratificacion = trace['GRATIFICACION']?.result ?? 0;
    const otrosHaberes = (r.gross_income ?? 0) - sueldoBase - horasExtraVal - gratificacion;

    const totalDesc =
      (r.deduction_afp10 ?? 0) + (r.deduction_afp_commission ?? 0) +
      (r.deduction_health7 ?? 0) + (r.deduction_income_tax ?? 0) +
      (r.deduction_advances ?? 0) + (r.deduction_other ?? 0);

    const nombre = [t.nombre, t.apellido_paterno, t.apellido_materno].filter(Boolean).join(' ');

    return [
      t.rut ?? '',
      nombre,
      paidDays,
      sueldoBase,
      horasExtraVal,
      gratificacion,
      Math.max(0, otrosHaberes),
      r.gross_income ?? 0,
      r.deduction_afp10 ?? 0,
      r.deduction_afp_commission ?? 0,
      r.deduction_health7 ?? 0,
      r.deduction_income_tax ?? 0,
      r.deduction_advances ?? 0,
      r.deduction_other ?? 0,
      totalDesc,
      r.net_pay ?? 0,
      r.contribution_sis ?? 0,
      r.contribution_afc_employer ?? 0,
      r.contribution_mutual ?? 0,
      r.total_employer_cost ?? 0,
    ].join(';');
  });

  // Totales
  const sum = (field: string) => rows.reduce((acc, r) => acc + (r[field] ?? 0), 0);
  const totals = [
    'TOTALES', `${rows.length} trabajador(es)`,
    '', '',
    '', '', '',
    sum('gross_income'),
    sum('deduction_afp10'),
    sum('deduction_afp_commission'),
    sum('deduction_health7'),
    sum('deduction_income_tax'),
    sum('deduction_advances'),
    sum('deduction_other'),
    rows.reduce((acc, r) => acc +
      (r.deduction_afp10 ?? 0) + (r.deduction_afp_commission ?? 0) +
      (r.deduction_health7 ?? 0) + (r.deduction_income_tax ?? 0) +
      (r.deduction_advances ?? 0) + (r.deduction_other ?? 0), 0),
    sum('net_pay'),
    sum('contribution_sis'),
    sum('contribution_afc_employer'),
    sum('contribution_mutual'),
    sum('total_employer_cost'),
  ].join(';');

  const title = `Libro de Remuneraciones;${periodoLabel}`;
  const csv = [title, '', header, ...lines, '', totals].join('\r\n');

  // BOM UTF-8 para Excel
  const bom = '\uFEFF';

  return new Response(bom + csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="libro_remuneraciones_${period.replace('-', '')}.csv"`,
    },
  });
}
