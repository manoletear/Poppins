// GET /api/payroll/liquidaciones-merged?period=YYYY-MM
// Descarga 1 PDF concatenado con todas las liquidaciones del período.

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { PDFDocument } from 'pdf-lib';
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

  // Resultados activos del período, ordenados por apellido del trabajador
  const { data: results } = await supabase
    .from('payroll_results')
    .select('worker_id, trabajadores:worker_id (apellido_paterno)')
    .eq('empleador_id', empleadorId)
    .eq('payroll_period', period)
    .eq('voided', false);

  if (!results || results.length === 0) {
    return NextResponse.json({ ok: false, error: 'sin_resultados_en_periodo' }, { status: 404 });
  }
  const ordered = [...results].sort((a: any, b: any) =>
    (a.trabajadores?.apellido_paterno ?? '').localeCompare(b.trabajadores?.apellido_paterno ?? ''));

  const merged = await PDFDocument.create();
  let added = 0;

  for (const r of ordered) {
    const out = await generarLiquidacionPdf(supabase, empleadorId, period, r.worker_id);
    if ('error' in out) continue;
    const src = await PDFDocument.load(out.buffer);
    const pages = await merged.copyPages(src, src.getPageIndices());
    for (const p of pages) merged.addPage(p);
    added++;
  }

  if (added === 0) {
    return NextResponse.json({ ok: false, error: 'no_se_pudieron_generar_pdfs' }, { status: 500 });
  }

  const buf = await merged.save();

  await auditLog(supabase, {
    userId: user.id, empleadorId,
    action: 'download.liquidaciones_merged',
    entity: 'payroll_period', entityId: period,
    payload: { count: added },
    request,
  });

  return new Response(buf as unknown as ArrayBuffer, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="liquidaciones_${period.replace('-', '')}.pdf"`,
    },
  });
}
