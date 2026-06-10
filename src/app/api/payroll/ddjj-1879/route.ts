// GET /api/payroll/ddjj-1879?year=YYYY
// Formulario 1879 SII: Declaración Jurada Anual de retenciones del Art. 42 N°1 LIR
// (Impuesto Único 2ª Categoría). Solo se genera si hubo retención > 0 en el año.
//
// Formato TXT separado por ';' compatible con el portal www.sii.cl
// Columnas según especificación SII 1879 (versión 2025):
//   1  Rut Declarante (empleador)
//   2  Rut Beneficiario (trabajador)
//   3  Año Tributario
//   4  Total rentas pagadas año (gross_income sum)
//   5  Total retención IUSC del año (deduction_income_tax sum)
//   6  N° meses con retención

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getActiveEmpleadorId } from '@/lib/auth/active-empleador';
import { auditLog } from '@/lib/audit/log';

export const runtime = 'nodejs';

function rutLimpio(rut: string | null | undefined): string {
  return (rut ?? '').replace(/\./g, '').toUpperCase();
}

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: 'no_auth' }, { status: 401 });

  const { empleadorId } = await getActiveEmpleadorId(supabase, user);
  if (!empleadorId) return NextResponse.json({ ok: false, error: 'sin_empleador' }, { status: 400 });

  const year = new URL(request.url).searchParams.get('year');
  if (!year || !/^\d{4}$/.test(year)) {
    return NextResponse.json({ ok: false, error: 'year_requerido (YYYY)' }, { status: 422 });
  }

  // Empleador
  const { data: empData } = await supabase
    .from('empleadores').select('rut').eq('id', empleadorId).single();
  const rutEmpleador = rutLimpio(empData?.rut);
  if (!rutEmpleador) {
    return NextResponse.json({ ok: false, error: 'empleador_sin_rut' }, { status: 400 });
  }

  // Agregado anual por trabajador con retención > 0
  const fromPeriod = `${year}-01`;
  const toPeriod   = `${year}-12`;
  const { data: rows } = await supabase
    .from('payroll_results')
    .select('worker_id, gross_income, deduction_income_tax, payroll_period, trabajadores!worker_id (rut)')
    .eq('empleador_id', empleadorId)
    .eq('voided', false)
    .gte('payroll_period', fromPeriod)
    .lte('payroll_period', toPeriod)
    .gt('deduction_income_tax', 0);

  if (!rows || rows.length === 0) {
    return NextResponse.json({
      ok: false,
      error: 'sin_retenciones_en_anio',
      detail: `No hubo retenciones de impuesto único en ${year}. No corresponde declarar F1879.`,
    }, { status: 404 });
  }

  // Agrupar por trabajador
  type Agg = { rut: string; rentas: number; retencion: number; meses: Set<string> };
  const agg = new Map<string, Agg>();
  for (const r of rows as any[]) {
    const rut = rutLimpio(r.trabajadores?.rut);
    if (!rut) continue;
    const ex = agg.get(r.worker_id) ?? { rut, rentas: 0, retencion: 0, meses: new Set() };
    ex.rentas += Number(r.gross_income ?? 0);
    ex.retencion += Number(r.deduction_income_tax ?? 0);
    ex.meses.add(r.payroll_period);
    agg.set(r.worker_id, ex);
  }

  // Generar líneas TXT (separador ';')
  const lines: string[] = [];
  for (const v of agg.values()) {
    lines.push([
      rutEmpleador, v.rut, year,
      Math.round(v.rentas), Math.round(v.retencion), v.meses.size,
    ].join(';'));
  }
  const content = lines.join('\r\n') + '\r\n';

  await auditLog(supabase, {
    userId: user.id, empleadorId,
    action: 'ddjj.f1879_generated',
    entity: 'empleador', entityId: empleadorId,
    payload: { year, beneficiarios: agg.size },
    request,
  });

  return new Response(content, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Content-Disposition': `attachment; filename="F1879_${rutEmpleador.replace('-', '')}_${year}.txt"`,
    },
  });
}
