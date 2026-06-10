import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  generatePreviredLines,
  encodeIso88591,
  afpCodeToPrevired,
  saludIdToPrevired,
  type PreviredRowInput,
} from '@/lib/payroll-cl/previred-generator';
import { getActiveEmpleadorId } from '@/lib/auth/active-empleador';
import { auditLog } from '@/lib/audit/log';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: 'no_auth' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const period = searchParams.get('period');
  if (!period || !/^\d{4}-\d{2}$/.test(period)) {
    return NextResponse.json({ ok: false, error: 'period_requerido (YYYY-MM)' }, { status: 422 });
  }

  const { empleadorId } = await getActiveEmpleadorId(supabase, user);
  if (!empleadorId) return NextResponse.json({ ok: false, error: 'sin_empleador' }, { status: 400 });

  // RUT del empleador
  const { data: empRow } = await supabase
    .from('empleadores').select('rut').eq('id', empleadorId).maybeSingle();
  if (!empRow?.rut) return NextResponse.json({ ok: false, error: 'empleador_sin_rut' }, { status: 400 });

  // Resultados finales del período (no anulados)
  const { data: results, error: rErr } = await supabase
    .from('payroll_results')
    .select('*')
    .eq('empleador_id', empleadorId)
    .eq('payroll_period', period)
    .eq('voided', false);

  if (rErr) return NextResponse.json({ ok: false, error: rErr.message }, { status: 500 });
  if (!results || results.length === 0) {
    return NextResponse.json({ ok: false, error: 'sin_resultados_para_el_periodo' }, { status: 404 });
  }

  // Conceptos de cada resultado (para AFC_TRABAJADOR e ISAPRE_DIFERENCIA_PLAN)
  const resultIds = results.map((r: any) => r.id);
  const { data: concepts } = await supabase
    .from('payroll_concept_results')
    .select('payroll_result_id, concept_code, amount')
    .in('payroll_result_id', resultIds);

  const conceptsByResult = new Map<string, { code: string; amount: number }[]>();
  for (const c of concepts ?? []) {
    const list = conceptsByResult.get(c.payroll_result_id) ?? [];
    list.push({ code: c.concept_code, amount: c.amount });
    conceptsByResult.set(c.payroll_result_id, list);
  }

  // Datos de trabajadores
  const workerIds = [...new Set(results.map((r: any) => r.worker_id))];
  const { data: trabajadores } = await supabase
    .from('trabajadores')
    .select('id, rut, nombre, apellido_paterno, apellido_materno, sexo, fecha_nacimiento, nacionalidad, afp_id, salud_id, salud_tipo, cargas_simples, estado')
    .in('id', workerIds);

  const trabMap = new Map((trabajadores ?? []).map((t: any) => [t.id, t]));

  // Datos de contratos
  const contractIds = [...new Set(results.map((r: any) => r.contract_id))];
  const { data: contratos } = await supabase
    .from('contratos')
    .select('id, trabajador_id, tipo_contrato, fecha_inicio')
    .in('id', contractIds);

  const contratosMap = new Map((contratos ?? []).map((c: any) => [c.id, c]));

  // Armar filas Previred
  const rows: PreviredRowInput[] = [];

  for (const res of results) {
    const trab = trabMap.get(res.worker_id);
    const contrato = contratosMap.get(res.contract_id);
    if (!trab || !contrato) continue;

    const resConcepts = conceptsByResult.get(res.id) ?? [];
    const afcTrab = resConcepts.find((c) => c.code === 'AFC_TRABAJADOR')?.amount ?? 0;
    const isApreDif = resConcepts.find((c) => c.code === 'ISAPRE_DIFERENCIA_PLAN')?.amount ?? 0;
    const asigFam = resConcepts.find((c) => c.code === 'ASIGNACION_FAMILIAR')?.amount ?? 0;

    // Tramo asignación familiar desde concepts (si fue calculado)
    // El tramo no está guardado directamente; lo inferimos del monto y conteo de cargas
    const famCount = trab.cargas_simples ?? 0;
    const famTranche = famCount > 0 && asigFam > 0
      ? inferFamilyTranche(asigFam, famCount)
      : '';

    // Tipo de contrato Previred
    const contractType: 'I' | 'P' =
      (contrato.tipo_contrato || '').toLowerCase().startsWith('plazo') ? 'P' : 'I';

    // AFP code
    const afpCode = afpCodeToPrevired(
      AFP_CODE_NAME_BY_ID[trab.afp_id] ?? 'capital'
    );
    const healthCode = saludIdToPrevired(trab.salud_id, trab.salud_tipo ?? 'fonasa');

    // Días trabajados: derivados del gross_income vs sueldo base proporcional
    // Se extrae del calculation_trace si existe, o se usa deduction de ausencia
    const workedDays = extractWorkedDays(res.calculation_trace);

    rows.push({
      period,
      empleadorRut: empRow.rut,
      workerRut: trab.rut,
      workerNombre: trab.nombre ?? '',
      workerApellidoPaterno: trab.apellido_paterno ?? '',
      workerApellidoMaterno: trab.apellido_materno,
      workerSexo: trab.sexo,
      workerFechaNacimiento: trab.fecha_nacimiento,
      workerNacionalidad: trab.nacionalidad ? Number(trab.nacionalidad) : 56,
      contractType,
      isPensioner: false, // TCP activo; si se quiere pensionados, leer de contratos/trabajadores
      afpPreviredCode: afpCode,
      healthPreviredCode: healthCode,
      mutualPreviredCode: 1, // ACHS por defecto
      pensionBase: res.pension_base,
      afcBase: res.afc_base,
      healthBase: res.health_base,
      mutualBase: res.mutual_base,
      afp10: res.deduction_afp10,
      afpCommission: res.deduction_afp_commission,
      sis: res.contribution_sis,
      health7: res.deduction_health7,
      healthAdicional: isApreDif,
      afcTrabajador: afcTrab,
      afcEmpleador: res.contribution_afc_employer,
      atep: res.contribution_mutual,
      workedDays,
      familyAllowanceTranche: famTranche,
      familyAllowanceCount: famCount,
      familyAllowanceAmount: asigFam,
    });
  }

  if (rows.length === 0) {
    return NextResponse.json({ ok: false, error: 'sin_filas_procesables' }, { status: 404 });
  }

  const txt = generatePreviredLines(rows);
  const buf = encodeIso88591(txt);
  const filename = `previred_${period.replace('-', '')}.txt`;

  await auditLog(supabase, {
    userId: user.id, empleadorId,
    action: 'download.previred',
    entity: 'payroll_period', entityId: period,
    payload: { rows: results.length, filename },
    request,
  });

  return new Response(buf.buffer as ArrayBuffer, {
    headers: {
      'Content-Type': 'text/plain; charset=iso-8859-1',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': String(buf.length),
    },
  });
}

// ── Helpers ────────────────────────────────────────────────────────────────

const AFP_CODE_NAME_BY_ID: Record<number, string> = {
  1: 'capital', 2: 'cuprum', 3: 'habitat', 4: 'modelo',
  5: 'planvital', 6: 'provida', 7: 'uno',
};

function inferFamilyTranche(totalAmount: number, count: number): string {
  if (count === 0) return '';
  const perCarga = totalAmount / count;
  if (perCarga >= 6500) return 'A';
  if (perCarga >= 4000) return 'B';
  if (perCarga >= 2000) return 'C';
  return 'D';
}

function extractWorkedDays(trace: any[]): number {
  if (!Array.isArray(trace)) return 30;
  const step = trace.find((t: any) => t.code === 'SUELDO_BASE');
  return step?.inputs?.paidDays ?? step?.inputs?.workedDays ?? 30;
}
