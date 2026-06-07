// POST /api/payroll/procesar-mes
// Procesa todos los contratos activos del empleador para un período.
// mode=preview  → solo calcula, no persiste
// mode=final    → persiste en payroll_results + envía email liquidaciones

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { calculatePayroll } from '@/lib/payroll-cl/engine';
import { calcularHorasExtra } from '@/lib/payroll-cl/marcajes-to-hours';
import { buildSnapshotForPeriod } from '@/lib/payroll-cl/snapshot-builder';
import type { PayrollEngineInput } from '@/lib/payroll-cl/types/payroll';
import { HealthType, LegalProfileType, WorkScheduleType } from '@/lib/payroll-cl/types/enums';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: 'no_auth' }, { status: 401 });

  const body = await request.json().catch(() => null);
  const { period, mode = 'preview' } = body ?? {};
  if (!period || !/^\d{4}-\d{2}$/.test(period)) {
    return NextResponse.json({ ok: false, error: 'period_requerido (YYYY-MM)' }, { status: 422 });
  }
  if (mode !== 'preview' && mode !== 'final') {
    return NextResponse.json({ ok: false, error: 'mode debe ser preview o final' }, { status: 422 });
  }

  // Resolver empleador
  const { data: perfil } = await supabase
    .from('user_profiles').select('empleador_id').eq('auth_user_id', user.id).maybeSingle();
  let empleadorId = perfil?.empleador_id as string | undefined;
  if (!empleadorId) {
    const { data: emp } = await supabase
      .from('empleadores').select('id').eq('auth_user_id', user.id).maybeSingle();
    empleadorId = emp?.id;
  }
  if (!empleadorId) return NextResponse.json({ ok: false, error: 'sin_empleador' }, { status: 400 });

  // Si mode=final y ya existen resultados no anulados para el período → error
  if (mode === 'final') {
    const { data: existing } = await supabase
      .from('payroll_results')
      .select('id')
      .eq('empleador_id', empleadorId)
      .eq('payroll_period', period)
      .eq('voided', false)
      .limit(1);
    if (existing && existing.length > 0) {
      return NextResponse.json({ ok: false, error: 'periodo_ya_cerrado' }, { status: 409 });
    }
  }

  // Contratos activos con datos del trabajador
  const { data: contratos, error: cErr } = await supabase
    .from('contratos')
    .select(`
      id, trabajador_id, sueldo_base, fecha_inicio, tipo_contrato,
      horas_semanales, tipo_jornada,
      trabajadores (
        id, rut, nombre, apellido_paterno, apellido_materno,
        afp_id, salud_id, salud_tipo, cargas_simples,
        fecha_nacimiento, email, is_pensioner
      )
    `)
    .eq('empleador_id', empleadorId)
    .eq('estado', 'activo');

  if (cErr) return NextResponse.json({ ok: false, error: cErr.message }, { status: 500 });
  if (!contratos || contratos.length === 0) {
    return NextResponse.json({ ok: false, error: 'sin_contratos_activos' }, { status: 404 });
  }

  // Snapshot del período
  const snapshot = await buildSnapshotForPeriod(period);

  // Mapas auxiliares
  const AFP_CODE_NAME: Record<number, string> = {
    1: 'capital', 2: 'cuprum', 3: 'habitat', 4: 'modelo',
    5: 'planvital', 6: 'provida', 7: 'uno',
  };

  const [y, m] = period.split('-').map(Number);
  const firstDay = `${period}-01`;
  const lastDay  = new Date(y, m, 0).toISOString().slice(0, 10);
  const daysInMonth = new Date(y, m, 0).getDate();

  // Licencias médicas del período indexadas por trabajador_id
  const { data: licencias } = await supabase
    .from('licencias_medicas')
    .select('trabajador_id, fecha_inicio, fecha_fin')
    .eq('empleador_id', empleadorId)
    .eq('periodo', period);

  const licenciasDiasByTrabajador: Record<string, number> = {};
  for (const lic of licencias ?? []) {
    if (!lic.fecha_inicio || !lic.fecha_fin) continue;
    const dias = Math.round(
      (new Date(lic.fecha_fin).getTime() - new Date(lic.fecha_inicio).getTime()) / 86400000
    ) + 1;
    licenciasDiasByTrabajador[lic.trabajador_id] =
      (licenciasDiasByTrabajador[lic.trabajador_id] ?? 0) + dias;
  }

  const results = [];
  const errors  = [];

  for (const contrato of contratos) {
    const trab = (contrato as any).trabajadores;
    if (!trab) { errors.push({ contractId: contrato.id, error: 'sin_trabajador' }); continue; }

    // Horas extra desde marcajes
    let extraHours: number | undefined;
    const { data: marcajes } = await supabase
      .from('marcajes_horario')
      .select('fecha, horas_trabajadas')
      .eq('trabajador_id', contrato.trabajador_id)
      .gte('fecha', firstDay)
      .lte('fecha', lastDay);

    if (marcajes && marcajes.length > 0) {
      const he = calcularHorasExtra(marcajes, contrato.horas_semanales ?? 45, period);
      extraHours = he.horasExtra;
    }

    const healthType = (trab.salud_tipo === 'isapre') ? HealthType.ISAPRE : HealthType.FONASA;
    const afpCode    = AFP_CODE_NAME[trab.afp_id] ?? 'capital';

    const input: PayrollEngineInput = {
      payrollPeriod: period,
      country: 'CL',
      contract: {
        contractId:       contrato.id,
        workerId:         contrato.trabajador_id,
        legalProfileType: LegalProfileType.TCP_PUERTAS_AFUERA,
        startDate:        contrato.fecha_inicio,
        baseSalary:       contrato.sueldo_base,
        weeklyHours:      contrato.horas_semanales ?? 45,
        workScheduleType: WorkScheduleType.PUERTAS_AFUERA,
      },
      worker: {
        rut:               trab.rut,
        afpCode,
        healthType,
        isPensioner:       trab.is_pensioner ?? false,
        workerTypePrevired: '31',
        familyAllowanceCount: trab.cargas_simples ?? 0,
      },
      periodEvents: {
        workedDays: daysInMonth,
        ...(extraHours != null && { extraHours }),
        ...(licenciasDiasByTrabajador[contrato.trabajador_id] != null && {
          medicalLeaveDays: licenciasDiasByTrabajador[contrato.trabajador_id],
        }),
      },
      snapshot,
      mode,
    };

    try {
      const result = calculatePayroll(input);

      if (mode === 'final') {
        // Persistir resultado
        const { data: inserted, error: insErr } = await supabase
          .from('payroll_results')
          .insert({
            payroll_period:        period,
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
            net_pay:               result.netPay,
            total_employer_cost:   result.totalEmployerCost,
            warnings:              result.warnings,
            calculation_trace:     result.calculationTrace,
            created_by:            user.id,
          })
          .select('id')
          .single();

        if (!insErr && inserted) {
          if (result.concepts.length > 0) {
            await supabase.from('payroll_concept_results').insert(
              result.concepts.map(c => ({
                payroll_result_id: inserted.id,
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
              }))
            );
          }
        }
      }

      results.push({
        contractId:  contrato.id,
        workerId:    contrato.trabajador_id,
        workerName:  `${trab.nombre} ${trab.apellido_paterno}`.trim(),
        netPay:      result.netPay,
        grossIncome: result.grossIncome,
        warnings:    result.warnings,
      });
    } catch (e: any) {
      errors.push({ contractId: contrato.id, error: e?.message ?? 'error_calculo' });
    }
  }

  const totalNetPay   = results.reduce((s, r) => s + r.netPay, 0);
  const totalGross    = results.reduce((s, r) => s + r.grossIncome, 0);

  return NextResponse.json({
    ok: true,
    mode,
    period,
    processed: results.length,
    errors:    errors.length,
    totalNetPay,
    totalGross,
    results,
    ...(errors.length > 0 && { errorDetail: errors }),
  });
}
