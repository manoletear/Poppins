import { NextRequest, NextResponse } from 'next/server';
import { getFlowPaymentStatus, FLOW_STATUS } from '@/lib/flow';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const token = formData.get('token') as string;

    if (!token) {
      return NextResponse.json(
        { error: 'Token de Flow requerido' },
        { status: 400 }
      );
    }

    const status = await getFlowPaymentStatus(token);
    const supabase = await createClient();

    // Find all pagos matching this token or flowOrder (supports bulk payments)
    const { data: pagos } = await supabase
      .from('pagos_empleador')
      .select('*')
      .or(`flow_token.eq.${token},flow_order_id.eq.${status.flowOrder}`);

    if (!pagos || pagos.length === 0) {
      console.error(
        'No se encontraron pagos para Flow order:',
        status.flowOrder,
        'token:',
        token
      );
      return NextResponse.json(
        { error: 'Pago no encontrado' },
        { status: 404 }
      );
    }

    const now = new Date().toISOString();

    if (status.status === FLOW_STATUS.PAID) {
      for (const pago of pagos) {
        const puntos = Math.floor(pago.monto / 1000);

        const { error: updateError } = await supabase
          .from('pagos_empleador')
          .update({
            estado: 'pagado',
            fecha_pago: now,
            puntos_acumulados: puntos,
            flow_order_id: String(status.flowOrder),
            descripcion: pago.descripcion || status.subject,
          })
          .eq('id', pago.id);

        if (updateError) {
          console.error('Error actualizando pago:', pago.id, updateError);
        }

        // Crear comprobante de pago
        await supabase.from('comprobantes_pago').insert({
          pago_id: pago.id,
          tipo: 'recibo',
          numero: `FLOW-${status.flowOrder}-${pago.id.slice(0, 4)}`,
          monto: pago.monto,
        });
      }
    } else if (status.status === FLOW_STATUS.REJECTED) {
      await supabase
        .from('pagos_empleador')
        .update({ estado: 'rechazado' })
        .in('id', pagos.map(p => p.id));
    } else if (status.status === FLOW_STATUS.CANCELLED) {
      await supabase
        .from('pagos_empleador')
        .update({ estado: 'pendiente' })
        .in('id', pagos.map(p => p.id));
    }

    return NextResponse.json({ received: true, status: status.status, count: pagos.length });
  } catch (error: unknown) {
    console.error('Error en confirmacion de Flow:', error);
    const message =
      error instanceof Error ? error.message : 'Error procesando confirmacion';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
