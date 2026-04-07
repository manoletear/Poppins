import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { sendEmail, emailAlertaVencimiento, emailRecordatorioFirma } from '@/lib/email/send';

/**
 * Cron job: alertas diarias
 * Se ejecuta 1 vez al día via Vercel Cron o llamada manual
 *
 * Vercel cron config en vercel.json:
 * { "crons": [{ "path": "/api/cron/alertas-diarias", "schedule": "0 8 * * *" }] }
 *
 * Protección: requiere header Authorization con CRON_SECRET
 */
export async function GET(request: NextRequest) {
  // Verificar autorización
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = await createClient();
  const results: string[] = [];

  try {
    // 1. Alertas de vencimiento de cuentas (día_vencimiento próximo)
    const hoy = new Date();
    const diaHoy = hoy.getDate();

    const { data: cuentas } = await supabase
      .from('cuentas_pago')
      .select('*, empleadores(nombre, apellido, email)')
      .eq('activa', true)
      .not('dia_vencimiento', 'is', null);

    for (const cuenta of (cuentas || [])) {
      const diasRestantes = cuenta.dia_vencimiento - diaHoy;
      if (diasRestantes > 0 && diasRestantes <= 3) {
        const emp = cuenta.empleadores;
        if (emp?.email) {
          const tmpl = emailAlertaVencimiento(emp.nombre, cuenta.alias || cuenta.proveedor, diasRestantes);
          tmpl.to = emp.email;
          await sendEmail(tmpl);
          results.push(`Alerta vencimiento: ${cuenta.alias} → ${emp.email}`);
        }
      }
    }

    // 2. Recordatorio de firma de liquidaciones pendientes
    const mesActual = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}`;
    const { data: liqPendientes } = await supabase
      .from('liquidaciones')
      .select('*, trabajadores(nombre, apellido_paterno, email)')
      .eq('periodo', mesActual)
      .eq('firmada_por_empleado', false);

    for (const liq of (liqPendientes || [])) {
      const trab = liq.trabajadores;
      if (trab?.email) {
        const tmpl = emailRecordatorioFirma(`${trab.nombre} ${trab.apellido_paterno || ''}`, liq.periodo);
        tmpl.to = trab.email;
        await sendEmail(tmpl);
        results.push(`Recordatorio firma: ${liq.periodo} → ${trab.email}`);
      }
    }

    // 3. Registrar ejecución
    results.push(`Ejecutado: ${new Date().toISOString()}`);

    return NextResponse.json({ ok: true, results, count: results.length });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
