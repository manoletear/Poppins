// POST /api/payroll/procesar-mes
// Procesa todos los contratos activos del empleador para un período.
// mode=preview  → solo calcula, no persiste
// mode=final    → persiste en payroll_results + envía email liquidaciones

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { calculatePayroll } from '@/lib/payroll-cl/engine';
import { calcularHorasExtra } from '@/lib/payroll-cl/marcajes-to-hours';
import { buildSnapshotForPeriod } from '@/lib/payroll-cl/snapshot-builder';
import { validarPrevision } from '@/lib/payroll-cl/validacion-prevision';
import { validarCamposTrabajador } from '@/lib/validaciones/trabajador';
import { getActiveEmpleadorId } from '@/lib/auth/active-empleador';
import { auditLog } from '@/lib/audit/log';
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

  // Resolver empleador activo (N:M con workspace switcher)
  const { empleadorId } = await getActiveEmpleadorId(supabase, user);
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

    // Secuencialidad: el período anterior debe estar cerrado (si hubo contratos
    // activos en ese mes). No se puede cerrar marzo si febrero está abierto.
    const [py, pm] = period.split('-').map(Number);
    const prev = new Date(py, pm - 2, 1);
    const prevPeriod = `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}`;
    const prevLastDay = new Date(prev.getFullYear(), prev.getMonth() + 1, 0).toISOString().slice(0, 10);

    // ¿Hubo contratos activos en o antes del último día del período anterior?
    const { data: contratosPrev } = await supabase
      .from('contratos')
      .select('id')
      .eq('empleador_id', empleadorId)
      .lte('fecha_inicio', prevLastDay)
      .limit(1);

    if (contratosPrev && contratosPrev.length > 0) {
      const { data: prevClosed } = await supabase
        .from('payroll_results')
        .select('id')
        .eq('empleador_id', empleadorId)
        .eq('payroll_period', prevPeriod)
        .eq('voided', false)
        .limit(1);
      if (!prevClosed || prevClosed.length === 0) {
        return NextResponse.json({
          ok: false,
          error: 'periodo_anterior_no_cerrado',
          detail: `Debes cerrar primero ${prevPeriod} antes de cerrar ${period}.`,
          prevPeriod,
        }, { status: 409 });
      }
    }
  }

  // Contratos activos con datos del trabajador
  const { data: contratos, error: cErr } = await supabase
    .from('contratos')
    .select(`
      id, trabajador_id, sueldo_base, fecha_inicio, fecha_termino, tipo_contrato,
      horas_semanales, tipo_jornada,
      trabajadores (
        id, rut, nombre, apellido_paterno, apellido_materno,
        afp_id, salud_id, salud_tipo, salud_plan_uf,
        prevision_verificada_at, prevision_estado,
        cargas_simples, fecha_nacimiento, email, es_pensionado,
        direccion, comuna, region,
        banco, tipo_cuenta, numero_cuenta, payment_method
      )
    `)
    .eq('empleador_id', empleadorId)
    .eq('estado', 'activo');

  if (cErr) return NextResponse.json({ ok: false, error: cErr.message }, { status: 500 });
  if (!contratos || contratos.length === 0) {
    return NextResponse.json({ ok: false, error: 'sin_contratos_activos' }, { status: 404 });
  }

  // Catálogos previsionales (para validación de vigencia)
  const [
    { data: catAfps },
    { data: catIsapres },
    { data: empleadorCcaf },
    { data: descuentosCcaf },
  ] = await Promise.all([
    supabase.from('cat_afp').select('id, codigo, activa'),
    supabase.from('cat_isapre').select('id, codigo, tipo, activa'),
    supabase
      .from('empleadores')
      .select('ccaf_id, cat_ccaf:ccaf_id (codigo_previred, aporte_pct, activa)')
      .eq('id', empleadorId)
      .maybeSingle(),
    supabase
      .from('descuentos_ccaf')
      .select('trabajador_id, tipo, monto')
      .eq('empleador_id', empleadorId)
      .eq('periodo', period),
  ]);

  // Construir input CCAF (solo si el empleador está afiliado a una CCAF activa)
  const ccafEmpleador = (empleadorCcaf as any)?.cat_ccaf;
  const ccafInputBase = ccafEmpleador?.activa
    ? { codigoPrevired: ccafEmpleador.codigo_previred as string, aportePct: Number(ccafEmpleador.aporte_pct) }
    : null;
  const ccafDescPorTrabajador: Record<string, Array<{ tipo: 'credito'|'dental'|'leasing'|'seguro_vida'|'otro'; monto: number }>> = {};
  for (const d of descuentosCcaf ?? []) {
    if (!ccafDescPorTrabajador[d.trabajador_id]) ccafDescPorTrabajador[d.trabajador_id] = [];
    ccafDescPorTrabajador[d.trabajador_id].push({ tipo: d.tipo as any, monto: Number(d.monto) });
  }
  const catalogoPrevision = {
    afps:    (catAfps    ?? []) as Array<{ id: number; codigo: string; activa: boolean }>,
    isapres: (catIsapres ?? []) as Array<{ id: number; codigo: string; tipo: 'fonasa' | 'isapre'; activa: boolean }>,
  };
  const periodoFinDate = new Date(`${period}-${String(new Date(Number(period.slice(0,4)), Number(period.slice(5))-1+1, 0).getDate()).padStart(2,'0')}T23:59:59`);

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

  // Novedades variables del período (haberes/descuentos + eventos manuales)
  const { data: novedades } = await supabase
    .from('payroll_novedades')
    .select('trabajador_id, concept_code, amount')
    .eq('empleador_id', empleadorId)
    .eq('periodo', period);

  // Agrupar novedades por trabajador
  const novedadesByTrabajador: Record<string, Array<{ concept_code: string; amount: number }>> = {};
  for (const n of novedades ?? []) {
    if (!novedadesByTrabajador[n.trabajador_id]) novedadesByTrabajador[n.trabajador_id] = [];
    novedadesByTrabajador[n.trabajador_id].push({ concept_code: n.concept_code, amount: Number(n.amount) });
  }

  // Anticipos aprobados/transferidos del período → descuento auto ANTICIPO_SUELDO.
  // Solo los que aún no fueron procesados (procesado_at IS NULL).
  const { data: anticipos } = await supabase
    .from('anticipos')
    .select('id, trabajador_id, monto, estado, periodo')
    .eq('empleador_id', empleadorId)
    .eq('periodo', period)
    .is('procesado_at', null)
    .in('estado', ['aprobado', 'transferido', 'comprobante_ok']);

  const anticiposByTrabajador: Record<string, { id: string; monto: number }[]> = {};
  for (const a of anticipos ?? []) {
    if (!anticiposByTrabajador[a.trabajador_id]) anticiposByTrabajador[a.trabajador_id] = [];
    anticiposByTrabajador[a.trabajador_id].push({ id: a.id, monto: Number(a.monto) });
  }

  // Vacaciones aprobadas que caen dentro del período → suma a _DIAS_VACACIONES auto.
  // (Si ya existe _DIAS_VACACIONES manual, prevalece la suma — agregamos a lo existente.)
  const { data: vacaciones } = await supabase
    .from('solicitudes_empleado')
    .select('trabajador_id, fecha_inicio, fecha_fin, dias')
    .eq('empleador_id', empleadorId)
    .eq('tipo', 'vacaciones')
    .eq('estado', 'aprobada')
    .lte('fecha_inicio', lastDay)
    .gte('fecha_fin', firstDay);

  for (const v of vacaciones ?? []) {
    // Días imputados al período = intersección [fecha_inicio,fecha_fin] ∩ [firstDay,lastDay]
    const desde = v.fecha_inicio > firstDay ? v.fecha_inicio : firstDay;
    const hasta = v.fecha_fin   < lastDay   ? v.fecha_fin   : lastDay;
    const dias = Math.round(
      (new Date(hasta).getTime() - new Date(desde).getTime()) / 86400000
    ) + 1;
    if (dias <= 0) continue;
    if (!novedadesByTrabajador[v.trabajador_id]) novedadesByTrabajador[v.trabajador_id] = [];
    // ¿Ya hay un _DIAS_VACACIONES manual? Si sí, sumamos; si no, creamos.
    const existing = novedadesByTrabajador[v.trabajador_id].find(n => n.concept_code === '_DIAS_VACACIONES');
    if (existing) existing.amount += dias;
    else novedadesByTrabajador[v.trabajador_id].push({ concept_code: '_DIAS_VACACIONES', amount: dias });
  }

  const results = [];
  const errors  = [];

  for (const contrato of contratos) {
    const trab = (contrato as any).trabajadores;
    if (!trab) { errors.push({ contractId: contrato.id, error: 'sin_trabajador' }); continue; }

    // Validación previsional: bloquea en mode=final si inválida
    const validacion = validarPrevision(
      {
        id: trab.id,
        rut: trab.rut,
        nombre: `${trab.nombre} ${trab.apellido_paterno}`.trim(),
        afp_id: trab.afp_id,
        salud_id: trab.salud_id,
        salud_tipo: trab.salud_tipo,
        salud_plan_uf: trab.salud_plan_uf,
        prevision_verificada_at: trab.prevision_verificada_at,
        prevision_estado: trab.prevision_estado,
      },
      catalogoPrevision,
      { periodoFin: periodoFinDate, contratoFechaTermino: (contrato as any).fecha_termino },
    );
    if (!validacion.ok && mode === 'final') {
      errors.push({
        contractId: contrato.id,
        workerRut: trab.rut,
        workerName: `${trab.nombre} ${trab.apellido_paterno}`.trim(),
        error: 'prevision_invalida',
        detail: validacion.errores.join('; '),
      });
      continue;
    }

    // Validación de campos legales (dirección, email, banco/cuenta si transferencia, etc).
    const camposFaltantes = validarCamposTrabajador({
      rut: trab.rut, nombre: trab.nombre, apellido_paterno: trab.apellido_paterno,
      fecha_nacimiento: trab.fecha_nacimiento, email: trab.email,
      direccion: trab.direccion, comuna: trab.comuna, region: trab.region,
      afp_id: trab.afp_id, salud_id: trab.salud_id, salud_tipo: trab.salud_tipo,
      salud_plan_uf: trab.salud_plan_uf, es_pensionado: trab.es_pensionado,
      banco: trab.banco, tipo_cuenta: trab.tipo_cuenta, numero_cuenta: trab.numero_cuenta,
      payment_method: trab.payment_method,
    });
    if (!camposFaltantes.ok && mode === 'final') {
      errors.push({
        contractId: contrato.id,
        workerRut: trab.rut,
        workerName: `${trab.nombre} ${trab.apellido_paterno}`.trim(),
        error: 'campos_faltantes',
        detail: `Faltan: ${camposFaltantes.faltantes.join(', ')}`,
      });
      continue;
    }

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
        isPensioner:       trab.es_pensionado ?? false,
        workerTypePrevired: '31',
        familyAllowanceCount: trab.cargas_simples ?? 0,
        ...(healthType === HealthType.ISAPRE && trab.salud_plan_uf
          ? { isaprePlanUf: Number(trab.salud_plan_uf) }
          : {}),
      },
      periodEvents: {
        workedDays: novedadesByTrabajador[contrato.trabajador_id]
          ?.find(n => n.concept_code === '_DIAS_TRABAJADOS')?.amount ?? daysInMonth,
        ...(extraHours != null && { extraHours }),
        ...(licenciasDiasByTrabajador[contrato.trabajador_id] != null && {
          medicalLeaveDays: licenciasDiasByTrabajador[contrato.trabajador_id],
        }),
        ...((() => {
          const n = novedadesByTrabajador[contrato.trabajador_id] ?? [];
          const ausencia = n.find(x => x.concept_code === '_DIAS_AUSENCIA')?.amount;
          const vacaciones = n.find(x => x.concept_code === '_DIAS_VACACIONES')?.amount;
          const heManual = n.find(x => x.concept_code === '_HORAS_EXTRA')?.amount;
          return {
            ...(ausencia   != null && { unjustifiedAbsenceDays: ausencia }),
            ...(vacaciones != null && { vacationDays: vacaciones }),
            ...(heManual   != null && extraHours == null && { extraHours: heManual }),
          };
        })()),
      },
      variableItems: [
        ...(novedadesByTrabajador[contrato.trabajador_id] ?? [])
          .filter(n => !n.concept_code.startsWith('_'))
          .map(n => ({ conceptCode: n.concept_code, amount: n.amount })),
        // Anticipos pendientes del período → descuento ANTICIPO_SUELDO
        ...(anticiposByTrabajador[contrato.trabajador_id] ?? [])
          .map(a => ({ conceptCode: 'ANTICIPO_SUELDO', amount: a.monto })),
      ],
      ...(ccafInputBase && {
        ccaf: {
          ...ccafInputBase,
          descuentos: ccafDescPorTrabajador[contrato.trabajador_id] ?? [],
        },
      }),
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
            contribution_ccaf:     result.employerContributions.ccaf ?? 0,
            deduction_ccaf:        result.ccafDeductions ?? 0,
            ccaf_codigo_previred:  ccafInputBase?.codigoPrevired ?? null,
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

          // Marcar anticipos descontados como procesados
          const anticipoIds = (anticiposByTrabajador[contrato.trabajador_id] ?? []).map(a => a.id);
          if (anticipoIds.length > 0) {
            await supabase
              .from('anticipos')
              .update({
                estado: 'procesado',
                procesado_at: new Date().toISOString(),
                liquidacion_id: inserted.id,
              })
              .in('id', anticipoIds);
          }
        }
      }

      results.push({
        contractId:  contrato.id,
        workerId:    contrato.trabajador_id,
        workerName:  `${trab.nombre} ${trab.apellido_paterno}`.trim(),
        workerRut:   trab.rut,
        netPay:      result.netPay,
        grossIncome: result.grossIncome,
        totalEmployerCost: result.totalEmployerCost,
        employerContributions: result.employerContributions, // sis, afcEmployer, cai111, mutual, ccaf?
        warnings:    [...result.warnings, ...validacion.warnings, ...(validacion.ok ? [] : validacion.errores.map(e => `[PREV] ${e}`))],
        prevision:   { estado: validacion.estado, ok: validacion.ok },
        concepts:    result.concepts
          .filter(c => c.visibleInPayslip)
          .map(c => ({ code: c.conceptCode, name: c.conceptName, type: c.conceptType, amount: c.amount })),
      });
    } catch (e: any) {
      errors.push({ contractId: contrato.id, error: e?.message ?? 'error_calculo' });
    }
  }

  const totalNetPay   = results.reduce((s, r) => s + r.netPay, 0);
  const totalGross    = results.reduce((s, r) => s + r.grossIncome, 0);

  if (mode === 'final') {
    await auditLog(supabase, {
      userId: user.id,
      empleadorId,
      action: 'payroll.close',
      entity: 'payroll_period',
      entityId: period,
      payload: { processed: results.length, errors: errors.length, totalNetPay, totalGross },
      request,
    });

    // Disparo email post-cierre best-effort si el empleador lo activó
    // (lee la preferencia y reenvía cookies para autenticar el llamado interno).
    const { data: empPrefs } = await supabase
      .from('empleadores').select('preferencias').eq('id', empleadorId).maybeSingle();
    if ((empPrefs?.preferencias as any)?.email_liquidacion_enabled === true) {
      const baseUrl = new URL(request.url).origin;
      const cookie = request.headers.get('cookie') ?? '';
      fetch(`${baseUrl}/api/payroll/enviar-liquidaciones`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', cookie },
        body: JSON.stringify({ period }),
      }).catch(() => { /* best-effort */ });
    }
  }

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
