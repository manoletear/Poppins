// GET /api/payroll/liquidaciones-zip?period=YYYY-MM
// Descarga ZIP con todas las liquidaciones PDF del período (no anuladas).

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import JSZip from 'jszip';
import { getActiveEmpleadorId } from '@/lib/auth/active-empleador';
import { auditLog } from '@/lib/audit/log';
import { generarLiquidacionPdf } from '@/lib/payroll-cl/generate-liquidacion-pdf';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: 'no_auth' }, { status: 401 });

  const period = new URL(request.url).searchParams.get('period');
  if (!period || !/^\d{4}-\d{2}$/.test(period)) {
    return NextResponse.json({ ok: false, error: 'period_requerido (YYYY-MM)' }, { status: 422 });
  }

  const { empleadorId } = await getActiveEmpleadorId(supabase, user);
  if (!empleadorId) return NextResponse.json({ ok: false, error: 'sin_empleador' }, { status: 400 });

  // Resultados activos del período
  const { data: results } = await supabase
    .from('payroll_results')
    .select('worker_id')
    .eq('empleador_id', empleadorId)
    .eq('payroll_period', period)
    .eq('voided', false);

  if (!results || results.length === 0) {
    return NextResponse.json({ ok: false, error: 'sin_resultados_en_periodo' }, { status: 404 });
  }

  const zip = new JSZip();
  const errors: Array<{ workerId: string; error: string }> = [];

  // Generar PDFs en paralelo (limit razonable por ahora: secuencial para no saturar)
  for (const r of results) {
    const out = await generarLiquidacionPdf(supabase, empleadorId, period, r.worker_id);
    if ('error' in out) {
      errors.push({ workerId: r.worker_id, error: out.error });
      continue;
    }
    zip.file(out.filename, out.buffer);
  }

  if (zip.files && Object.keys(zip.files).length === 0) {
    return NextResponse.json({ ok: false, error: 'no_se_pudieron_generar_pdfs', detail: errors }, { status: 500 });
  }

  const buf = await zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE' });

  await auditLog(supabase, {
    userId: user.id, empleadorId,
    action: 'download.liquidaciones_zip',
    entity: 'payroll_period', entityId: period,
    payload: { count: Object.keys(zip.files).length, errors: errors.length },
    request,
  });

  return new Response(buf as unknown as ArrayBuffer, {
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="liquidaciones_${period.replace('-', '')}.zip"`,
    },
  });
}
