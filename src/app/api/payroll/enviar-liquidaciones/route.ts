// POST /api/payroll/enviar-liquidaciones
// Body: { period: 'YYYY-MM', force?: boolean }
//
// Envía a cada trabajador del período su liquidación PDF por email.
// Respeta el flag empleadores.preferencias.email_liquidacion_enabled
// (a menos que `force: true` venga del operador para forzar un re-envío).
//
// Best-effort: si un email falla no detiene el resto.

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getActiveEmpleadorId } from '@/lib/auth/active-empleador';
import { auditLog } from '@/lib/audit/log';
import { sendEmail, emailLiquidacionLista } from '@/lib/email/send';
import { generarLiquidacionPdf } from '@/lib/payroll-cl/generate-liquidacion-pdf';

export const runtime = 'nodejs';

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
               'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: 'no_auth' }, { status: 401 });

  const { empleadorId } = await getActiveEmpleadorId(supabase, user);
  if (!empleadorId) return NextResponse.json({ ok: false, error: 'sin_empleador' }, { status: 400 });

  const body = await request.json().catch(() => ({}));
  const period = body?.period as string;
  if (!period || !/^\d{4}-\d{2}$/.test(period)) {
    return NextResponse.json({ ok: false, error: 'period_requerido' }, { status: 422 });
  }
  const force = !!body?.force;

  // Verifica si la preferencia está activa
  const { data: empData } = await supabase
    .from('empleadores').select('preferencias').eq('id', empleadorId).maybeSingle();
  const enabled = (empData?.preferencias as any)?.email_liquidacion_enabled === true;
  if (!enabled && !force) {
    return NextResponse.json({
      ok: false, error: 'envio_deshabilitado',
      detail: 'El empleador no tiene activado el envío de liquidaciones por email. Configúralo en /hogar/perfil.',
    }, { status: 409 });
  }

  // Trabajadores con resultado del período
  const { data: results } = await supabase
    .from('payroll_results')
    .select('worker_id, net_pay, trabajadores ( email, nombre, apellido_paterno )')
    .eq('empleador_id', empleadorId)
    .eq('payroll_period', period)
    .eq('voided', false);

  if (!results || results.length === 0) {
    return NextResponse.json({ ok: false, error: 'sin_resultados_en_periodo' }, { status: 404 });
  }

  const [y, m] = period.split('-').map(Number);
  const periodoLabel = `${MESES[m - 1]} ${y}`;

  let enviados = 0;
  let sinEmail = 0;
  const errores: string[] = [];

  for (const r of results as any[]) {
    const trab = r.trabajadores;
    if (!trab?.email) { sinEmail++; continue; }

    try {
      const pdf = await generarLiquidacionPdf(supabase, empleadorId, period, r.worker_id);
      if ('error' in pdf) { errores.push(`${trab.email}: pdf_${pdf.error}`); continue; }

      const monto = '$ ' + Number(r.net_pay ?? 0).toLocaleString('es-CL');
      const nombre = `${trab.nombre ?? ''} ${trab.apellido_paterno ?? ''}`.trim();
      const tpl = emailLiquidacionLista(nombre, periodoLabel, monto);
      const ok = await sendEmail({
        to: trab.email,
        subject: tpl.subject,
        html: tpl.html,
        attachments: [{
          filename: pdf.filename,
          content: Buffer.from(pdf.buffer).toString('base64'),
          contentType: 'application/pdf',
        }],
      });
      if (ok) enviados++;
      else errores.push(`${trab.email}: send_failed`);
    } catch (e: any) {
      errores.push(`${trab.email}: ${e?.message ?? 'err'}`);
    }
  }

  await auditLog(supabase, {
    userId: user.id, empleadorId,
    action: 'payroll.email_liquidaciones',
    entity: 'payroll_period', entityId: period,
    payload: { enviados, sinEmail, errores: errores.length, force },
    request,
  });

  return NextResponse.json({
    ok: true,
    period,
    enviados,
    sinEmail,
    errores: errores.length,
    ...(errores.length > 0 && { detalleErrores: errores }),
  });
}
