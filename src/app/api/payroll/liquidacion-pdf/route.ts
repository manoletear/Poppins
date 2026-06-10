// GET /api/payroll/liquidacion-pdf?period=YYYY-MM&workerId=uuid
// Genera y descarga PDF de liquidación para un trabajador específico.
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getActiveEmpleadorId } from '@/lib/auth/active-empleador';
import { auditLog } from '@/lib/audit/log';
import { generarLiquidacionPdf } from '@/lib/payroll-cl/generate-liquidacion-pdf';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: 'no_auth' }, { status: 401 });

  const url = new URL(request.url);
  const period   = url.searchParams.get('period');
  const workerId = url.searchParams.get('workerId');
  if (!period || !workerId) {
    return NextResponse.json({ ok: false, error: 'period_and_workerId_required' }, { status: 400 });
  }

  const { empleadorId } = await getActiveEmpleadorId(supabase, user);
  if (!empleadorId) return NextResponse.json({ ok: false, error: 'no_empleador' }, { status: 403 });

  let result: Awaited<ReturnType<typeof generarLiquidacionPdf>>;
  try {
    result = await generarLiquidacionPdf(supabase, empleadorId, period, workerId);
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message ?? e), stack: String(e?.stack ?? '') }, { status: 500 });
  }

  if ('error' in result) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 404 });
  }

  await auditLog(supabase, {
    userId: user.id, empleadorId,
    action: 'download.liquidacion_pdf',
    entity: 'trabajador', entityId: workerId,
    payload: { period },
    request,
  });

  return new Response(result.buffer as unknown as ArrayBuffer, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${result.filename}"`,
    },
  });
}
