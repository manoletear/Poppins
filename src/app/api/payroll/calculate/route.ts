import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { calculatePayroll } from '@/lib/payroll-cl/engine';
import { calcularHorasExtra } from '@/lib/payroll-cl/marcajes-to-hours';
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

  // Verificar acceso del empleador al contrato
  const { data: perfil } = await supabase
    .from('user_profiles')
    .select('empleador_id')
    .eq('auth_user_id', user.id)
    .maybeSingle();
  let empleadorId = perfil?.empleador_id as string | undefined;
  if (!empleadorId) {
    const { data: emp } = await supabase
      .from('empleadores')
      .select('id')
      .eq('auth_user_id', user.id)
      .maybeSingle();
    empleadorId = emp?.id;
  }
  if (!empleadorId) return NextResponse.json({ ok: false, error: 'sin_empleador' }, { status: 400 });

  const { data: contrato } = await supabase
    .from('contratos')
    .select('id')
    .eq('id', body.contract.contractId)
    .eq('empleador_id', empleadorId)
    .maybeSingle();
  if (!contrato) return NextResponse.json({ ok: false, error: 'contrato_no_encontrado' }, { status: 404 });

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

  // TODO(payroll-cl §16): cuando mode==='final', persistir en payroll_results y
  // payroll_concept_results (requiere migración Supabase).

  return NextResponse.json({
    ok: true,
    result,
    ...(horasExtraInfo && { horasExtraInfo }),
  });
}

