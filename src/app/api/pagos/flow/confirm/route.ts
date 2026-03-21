import { NextRequest, NextResponse } from 'next/server';
import { getFlowPaymentStatus, FLOW_STATUS } from '@/lib/flow';
import { createClient } from '@/lib/supabase/client';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const token = formData.get('token') as string;

    if (!token) {
      return NextResponse.json({ error: 'Token requerido' }, { status: 400 });
    }

    const status = await getFlowPaymentStatus(token);
    const supabase = createClient();

    if (status.status === FLOW_STATUS.PAID) {
      // Find pago by flow order
      const { data: pago } = await supabase
        .from('pagos_empleador')
        .select('*')
        .eq('stripe_payment_intent_id', `flow_${status.flowOrder}`)
        .single();

      if (pago) {
        const puntos = Math.floor(pago.monto / 1000);

        await supabase
          .from('pagos_empleador')
          .update({
            estado: 'pagado',
            fecha_pago: new Date().toISOString(),
            puntos_acumulados: puntos,
            comprobante_url: `flow_receipt_${status.flowOrder}`,
          })
          .eq('id', pago.id);

        // Create comprobante
        await supabase
          .from('comprobantes_pago')
          .insert({
            pago_id: pago.id,
            tipo: 'recibo',
            numero: `FLOW-${status.flowOrder}`,
            monto: pago.monto,
          });
      }
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error('Error in Flow confirmation:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
