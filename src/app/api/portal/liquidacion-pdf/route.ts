// GET /api/portal/liquidacion-pdf?period=YYYY-MM
// Descarga la liquidación PDF del trabajador autenticado. Usa get_my_trabajador_id()
// vía RLS — el trabajador solo puede descargar las suyas.

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generarLiquidacionPdf } from '@/lib/payroll-cl/generate-liquidacion-pdf';
import { auditLog } from '@/lib/audit/log';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: 'no_auth' }, { status: 401 });

  const period = new URL(request.url).searchParams.get('period');
  if (!period || !/^\d{4}-\d{2}$/.test(period)) {
    return NextResponse.json({ ok: false, error: 'period_requerido (YYYY-MM)' }, { status: 422 });
  }

  // Resolver el trabajador_id desde user_profiles
  const { data: profile } = await supabase
    .from('user_profiles').select('trabajador_id').eq('auth_user_id', user.id).maybeSingle();
  const trabajadorId = profile?.trabajador_id;
  if (!trabajadorId) return NextResponse.json({ ok: false, error: 'sin_trabajador' }, { status: 403 });

  // Buscar el empleador del trabajador (vía contrato activo o el del payroll_result)
  const { data: res } = await supabase
    .from('payroll_results')
    .select('empleador_id')
    .eq('worker_id', trabajadorId)
    .eq('payroll_period', period)
    .eq('voided', false)
    .maybeSingle();
  if (!res) return NextResponse.json({ ok: false, error: 'liquidacion_no_encontrada' }, { status: 404 });

  const result = await generarLiquidacionPdf(supabase, res.empleador_id, period, trabajadorId);
  if ('error' in result) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 404 });
  }

  await auditLog(supabase, {
    userId: user.id,
    empleadorId: res.empleador_id,
    action: 'portal.download_liquidacion',
    entity: 'trabajador', entityId: trabajadorId,
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
