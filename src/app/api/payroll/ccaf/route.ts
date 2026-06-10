// GET /api/payroll/ccaf?period=YYYY-MM
// Devuelve el archivo CSV de pago CCAF para el período (a partir de
// payroll_results con contribution_ccaf > 0).

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateCcafFile, type CcafPayrollRow } from '@/lib/payroll-cl/ccaf-generator';
import { getActiveEmpleadorId } from '@/lib/auth/active-empleador';
import { auditLog } from '@/lib/audit/log';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: 'no_auth' }, { status: 401 });

  const url = new URL(request.url);
  const period = url.searchParams.get('period');
  if (!period || !/^\d{4}-\d{2}$/.test(period)) {
    return NextResponse.json({ ok: false, error: 'period_requerido (YYYY-MM)' }, { status: 422 });
  }

  const { empleadorId } = await getActiveEmpleadorId(supabase, user);
  if (!empleadorId) return NextResponse.json({ ok: false, error: 'sin_empleador' }, { status: 400 });

  // Empleador + CCAF afiliada
  const { data: empData } = await supabase
    .from('empleadores')
    .select('rut, nombre, ccaf_id, cat_ccaf:ccaf_id (codigo, nombre, codigo_previred, activa)')
    .eq('id', empleadorId)
    .maybeSingle();
  const ccaf = (empData as any)?.cat_ccaf;
  if (!empData || !ccaf || !ccaf.activa) {
    return NextResponse.json({ ok: false, error: 'empleador_sin_ccaf_activa' }, { status: 404 });
  }

  // Resultados del período + descuentos por trabajador
  const [{ data: results }, { data: descuentos }] = await Promise.all([
    supabase
      .from('payroll_results')
      .select(`
        worker_id, pension_base, contribution_ccaf, deduction_ccaf,
        trabajadores:worker_id (rut, nombre, apellido_paterno, apellido_materno)
      `)
      .eq('empleador_id', empleadorId)
      .eq('payroll_period', period)
      .eq('voided', false),
    supabase
      .from('descuentos_ccaf')
      .select('trabajador_id, tipo, monto')
      .eq('empleador_id', empleadorId)
      .eq('periodo', period),
  ]);

  if (!results || results.length === 0) {
    return NextResponse.json({ ok: false, error: 'sin_resultados_en_periodo' }, { status: 404 });
  }

  // Agrupar descuentos por trabajador y tipo
  type DescBreakdown = { credito: number; dental: number; leasing: number; seguro_vida: number; otro: number };
  const descPorTrab: Record<string, DescBreakdown> = {};
  for (const d of descuentos ?? []) {
    const b = descPorTrab[d.trabajador_id] ?? { credito: 0, dental: 0, leasing: 0, seguro_vida: 0, otro: 0 };
    b[d.tipo as keyof DescBreakdown] = (b[d.tipo as keyof DescBreakdown] || 0) + Number(d.monto);
    descPorTrab[d.trabajador_id] = b;
  }

  const rows: CcafPayrollRow[] = results.map((r: any) => {
    const t = r.trabajadores;
    const d = descPorTrab[r.worker_id] ?? { credito: 0, dental: 0, leasing: 0, seguro_vida: 0, otro: 0 };
    return {
      workerRut: t?.rut ?? '',
      workerNombre: t?.nombre ?? '',
      workerApellidoPaterno: t?.apellido_paterno ?? '',
      workerApellidoMaterno: t?.apellido_materno ?? null,
      pensionBase: Number(r.pension_base) || 0,
      aporteEmpleador: Number(r.contribution_ccaf) || 0,
      credito: d.credito,
      dental: d.dental,
      leasing: d.leasing,
      seguroVida: d.seguro_vida,
      otros: d.otro,
    };
  });

  const file = generateCcafFile({
    period,
    ccafCodigo: ccaf.codigo,
    ccafNombre: ccaf.nombre,
    empleadorRut: empData.rut,
    empleadorNombre: empData.nombre,
    rows,
  });

  await auditLog(supabase, {
    userId: user.id, empleadorId,
    action: 'download.ccaf',
    entity: 'payroll_period', entityId: period,
    payload: { ccaf: ccaf.codigo, rows: rows.length, totales: file.totales },
    request,
  });

  return new NextResponse(file.content, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${file.filename}"`,
      'X-Ccaf-Totales': JSON.stringify(file.totales),
    },
  });
}
