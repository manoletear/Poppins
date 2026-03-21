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

    // Buscar pago por flow_token o flow_order_id
    const { data: pago } = await supabase
      .from('pagos_empleador')
      .select('*')
      .or(`flow_token.eq.${token},flow_order_id.eq.${status.flowOrder}`)
      .single();

    if (!pago) {
      console.error(
        'No se encontro pago para Flow order:',
        status.flowOrder,
        'token:',
        token
      );
      return NextResponse.json(
        { error: 'Pago no encontrado' },
        { status: 404 }
      );
    }

    if (status.status === FLOW_STATUS.PAID) {
      const puntos = Math.floor(pago.monto / 1000);

      const { error: updateError } = await supabase
        .from('pagos_empleador')
        .update({
          estado: 'pagado',
          fecha_pago: new Date().toISOString(),
          puntos_acumulados: puntos,
          flow_order_id: String(status.flowOrder),
          descripcion: pago.descripcion || status.subject,
        })
        .eq('id', pago.id);

      if (updateError) {
        console.error('Error actualizando pago:', updateError);
      }

      // Crear comprobante de pago
      await supabase.from('comprobantes_pago').insert({
        pago_id: pago.id,
        tipo: 'recibo',
        numero: `FLOW-${status.flowOrder}`,
        monto: pago.monto,
      });
    } else if (status.status === FLOW_STATUS.REJECTED) {
      await supabase
        .from('pagos_empleador')
        .update({ estado: 'rechazado' })
        .eq('id', pago.id);
    } else if (status.status === FLOW_STATUS.CANCELLED) {
      await supabase
        .from('pagos_empleador')
        .update({ estado: 'pendiente' })
        .eq('id', pago.id);
    }

    return NextResponse.json({ received: true, status: status.status });
  } catch (error: unknown) {
    console.error('Error en confirmacion de Flow:', error);
    const message =
      error instanceof Error ? error.message : 'Error procesando confirmacion';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
