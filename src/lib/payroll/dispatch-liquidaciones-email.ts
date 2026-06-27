import type { SupabaseClient } from '@supabase/supabase-js';
import { sendEmail, emailLiquidacionLista } from '@/lib/email/send';
import { generarLiquidacionPdf } from '@/lib/payroll-cl/generate-liquidacion-pdf';

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
               'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

export async function dispatchLiquidacionesEmail(
  supabase: SupabaseClient,
  empleadorId: string,
  period: string,
): Promise<void> {
  const { data: results } = await supabase
    .from('payroll_results')
    .select('worker_id, net_pay, trabajadores ( email, nombre, apellido_paterno )')
    .eq('empleador_id', empleadorId)
    .eq('payroll_period', period)
    .eq('voided', false);

  if (!results?.length) return;

  const [y, m] = period.split('-').map(Number);
  const periodoLabel = `${MESES[m - 1]} ${y}`;

  for (const r of results as any[]) {
    const trab = r.trabajadores;
    if (!trab?.email) continue;
    try {
      const pdf = await generarLiquidacionPdf(supabase, empleadorId, period, r.worker_id);
      if ('error' in pdf) continue;
      const monto = '$ ' + Number(r.net_pay ?? 0).toLocaleString('es-CL');
      const nombre = `${trab.nombre ?? ''} ${trab.apellido_paterno ?? ''}`.trim();
      const tpl = emailLiquidacionLista(nombre, periodoLabel, monto);
      await sendEmail({
        to: trab.email,
        subject: tpl.subject,
        html: tpl.html,
        attachments: [{
          filename: pdf.filename,
          content: Buffer.from(pdf.buffer).toString('base64'),
          contentType: 'application/pdf',
        }],
      });
    } catch { /* best-effort per worker */ }
  }
}
