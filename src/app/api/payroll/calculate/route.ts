import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { calculatePayroll } from '@/lib/payroll-cl/engine';
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

  // Validaciones mínimas de entrada
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

  // Verificar que el empleador tenga acceso al contrato
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
  if (!empleadorId) {
    return NextResponse.json({ ok: false, error: 'sin_empleador' }, { status: 400 });
  }

  const { data: contrato } = await supabase
    .from('contratos')
    .select('id')
    .eq('id', body.contract.contractId)
    .eq('empleador_id', empleadorId)
    .maybeSingle();
  if (!contrato) {
    return NextResponse.json({ ok: false, error: 'contrato_no_encontrado' }, { status: 404 });
  }

  // Calcular
  const result = calculatePayroll(body);

  // TODO(payroll-cl §16): cuando mode==='final', persistir en payroll_results y
  // payroll_concept_results (requiere migración Supabase).

  return NextResponse.json({ ok: true, result });
}
