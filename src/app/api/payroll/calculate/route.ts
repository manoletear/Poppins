import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { calculatePayroll } from '@/lib/payroll-cl/engine';
import { calcularHorasExtra } from '@/lib/payroll-cl/marcajes-to-hours';
import { validarPrevision } from '@/lib/payroll-cl/validacion-prevision';
import { getActiveEmpleadorId } from '@/lib/auth/active-empleador';
import type { PayrollEngineInput } from '@/lib/payroll-cl/types/payroll';
import { SNAPSHOT_USABLE_FOR_CLOSE } from '@/lib/payroll-cl/types/enums';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: 'no_auth' }, { status: 401 });

  let body: PayrollEngineInput;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'body_invalido' }, { status: 400 });
  }

  if (!body.payrollPeriod || !body.contract || !body.worker || !body.periodEvents || !body.snapshot) {
    return NextResponse.json({ ok: false, error: 'campos_requeridos_faltantes' }, { status: 422 });
  }
  if (body.country !== 'CL') {
    return NextResponse.json({ ok: false, error: 'solo_CL_soportado' }, { status: 422 });
  }
  if (!SNAPSHOT_USABLE_FOR_CLOSE.includes(body.snapshot.status as never)) {
    return NextResponse.json({
      ok: false,
      error: 'snapshot_no_usable',
      detail: `El snapshot debe estar APPROVED o LOCKED. Estado actual: ${body.snapshot.status}`,
    }, { status: 422 });
  }

  // Verificar acceso del empleador al contrato (N:M con workspace switcher)
  const { empleadorId } = await getActiveEmpleadorId(supabase, user);
  if (!empleadorId) return NextResponse.json({ ok: false, error: 'sin_empleador' }, { status: 400 });

  const { data: contrato } = await supabase
    .from('contratos')
    .select('id, fecha_termino, trabajador_id')
    .eq('id', body.contract.contractId)
    .eq('empleador_id', empleadorId)
    .maybeSingle();
  if (!contrato) return NextResponse.json({ ok: false, error: 'contrato_no_encontrado' }, { status: 404 });

  // Validación previsional: bloquea en mode=final si inválida; preview devuelve warnings
  let previsionInfo: { ok: boolean; estado: string; errores: string[]; warnings: string[] } | null = null;
  const { data: trabPrev } = await supabase
    .from('trabajadores')
    .select('id, rut, nombre, afp_id, salud_id, salud_tipo, salud_plan_uf, prevision_verificada_at, prevision_estado')
    .eq('id', contrato.trabajador_id)
    .maybeSingle();
  if (trabPrev) {
    const [{ data: catAfps }, { data: catIsapres }] = await Promise.all([
      supabase.from('cat_afp').select('id, codigo, activa'),
      supabase.from('cat_isapre').select('id, codigo, tipo, activa'),
    ]);
    const [y, m] = body.payrollPeriod.split('-').map(Number);
    const periodoFin = new Date(y, m, 0, 23, 59, 59);
    const validacion = validarPrevision(
      {
        id: trabPrev.id, rut: trabPrev.rut, nombre: trabPrev.nombre,
        afp_id: trabPrev.afp_id, salud_id: trabPrev.salud_id, salud_tipo: trabPrev.salud_tipo,
        salud_plan_uf: trabPrev.salud_plan_uf,
        prevision_verificada_at: trabPrev.prevision_verificada_at,
        prevision_estado: trabPrev.prevision_estado,
      },
      {
        afps:    (catAfps    ?? []) as Array<{ id: number; codigo: string; activa: boolean }>,
        isapres: (catIsapres ?? []) as Array<{ id: number; codigo: string; tipo: 'fonasa' | 'isapre'; activa: boolean }>,
      },
      { periodoFin, contratoFechaTermino: (contrato as any).fecha_termino },
    );
    previsionInfo = validacion;
    if (!validacion.ok && body.mode === 'final') {
      return NextResponse.json({
        ok: false,
        error: 'prevision_invalida',
        detail: validacion.errores,
        warnings: validacion.warnings,
      }, { status: 422 });
    }
    // Si el motor no recibió isaprePlanUf desde el body, lo inyectamos desde la BD
    if (trabPrev.salud_tipo === 'isapre' && trabPrev.salud_plan_uf && !body.worker.isaprePlanUf) {
      body = { ...body, worker: { ...body.worker, isaprePlanUf: Number(trabPrev.salud_plan_uf) } };
    }
  }

  // Horas extra: si no vienen en el input, calcular desde marcajes del período.
  let horasExtraInfo: ReturnType<typeof calcularHorasExtra> | null = null;
  if (body.periodEvents.extraHours == null) {
    const [y, m] = body.payrollPeriod.split('-').map(Number);
    const firstDay = `${body.payrollPeriod}-01`;
    const lastDay = new Date(y, m, 0).toISOString().slice(0, 10);

    const { data: marcajes } = await supabase
      .from('marcajes_horario')
      .select('fecha, horas_trabajadas')
      .eq('trabajador_id', body.contract.workerId)
      .gte('fecha', firstDay)
      .lte('fecha', lastDay);

    if (marcajes && marcajes.length > 0) {
      horasExtraInfo = calcularHorasExtra(
        marcajes,
        body.contract.weeklyHours,
        body.payrollPeriod
      );
      body = {
        ...body,
        periodEvents: { ...body.periodEvents, extraHours: horasExtraInfo.horasExtra },
      };
    }
  }

  // Calcular
  const result = calculatePayroll(body);

  // mode=final: persistir en payroll_results + payroll_concept_results
  let savedResultId: string | undefined;
  if (body.mode === 'final') {
    const { data: inserted, error: insErr } = await supabase
      .from('payroll_results')
      .insert({
        payroll_period:        body.payrollPeriod,
        contract_id:           result.contractId,
        worker_id:             result.workerId,
        empleador_id:          empleadorId,
        indicator_snapshot_id: result.indicatorSnapshotId,
        gross_income:          result.grossIncome,
        taxable_income:        result.taxableIncome,
        pension_base:          result.pensionBase,
        health_base:           result.healthBase,
        afc_base:              result.afcBase,
        mutual_base:           result.mutualBase,
        income_tax_base:       result.incomeTaxBase,
        deduction_afp10:       result.employeeDeductions.afp10,
        deduction_afp_commission: result.employeeDeductions.afpCommission,
        deduction_health7:     result.employeeDeductions.health7,
        deduction_income_tax:  result.employeeDeductions.incomeTax,
        deduction_advances:    result.employeeDeductions.advances,
        deduction_other:       result.employeeDeductions.other,
        contribution_sis:      result.employerContributions.sis,
        contribution_afc_employer: result.employerContributions.afcEmployer,
        contribution_cai111:   result.employerContributions.cai111,
        contribution_mutual:   result.employerContributions.mutual,
        contribution_ccaf:     result.employerContributions.ccaf ?? 0,
        deduction_ccaf:        result.ccafDeductions ?? 0,
        ccaf_codigo_previred:  body.ccaf?.codigoPrevired ?? null,
        net_pay:               result.netPay,
        total_employer_cost:   result.totalEmployerCost,
        warnings:              result.warnings,
        calculation_trace:     result.calculationTrace,
        created_by:            user.id,
      })
      .select('id')
      .single();

    if (insErr) {
      return NextResponse.json({ ok: false, error: 'persist_failed', detail: insErr.message }, { status: 500 });
    }

    savedResultId = inserted.id as string;

    if (result.concepts.length > 0) {
      const conceptRows = result.concepts.map(c => ({
        payroll_result_id: savedResultId,
        concept_code:      c.conceptCode,
        concept_name:      c.conceptName,
        concept_type:      c.conceptType,
        amount:            c.amount,
        base_amount:       c.baseAmount ?? null,
        rate:              c.rate ?? null,
        taxable:           c.taxable,
        imponible:         c.imponible,
        legal:             c.legal,
        visible_in_payslip: c.visibleInPayslip,
        calculation_order: c.calculationOrder,
      }));

      const { error: concErr } = await supabase
        .from('payroll_concept_results')
        .insert(conceptRows);

      if (concErr) {
        return NextResponse.json({ ok: false, error: 'persist_concepts_failed', detail: concErr.message }, { status: 500 });
      }
    }
  }

  return NextResponse.json({
    ok: true,
    result,
    ...(savedResultId && { savedResultId }),
    ...(horasExtraInfo && { horasExtraInfo }),
    ...(previsionInfo && { prevision: previsionInfo }),
  });
}

