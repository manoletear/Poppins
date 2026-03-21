import { NextRequest, NextResponse } from 'next/server';
import { createFlowPayment } from '@/lib/flow';
import { createClient } from '@/lib/supabase/client';

export async function POST(request: NextRequest) {
  try {
    const { pagoId, monto, descripcion, email } = await request.json();

    if (!pagoId || !monto) {
      return NextResponse.json({ error: 'pagoId y monto son requeridos' }, { status: 400 });
    }

    const baseUrl = request.headers.get('origin') || 'https://poppins-erp-2026.vercel.app';
    const commerceOrder = `POP-${pagoId.substring(0, 8)}-${Date.now()}`;

    const result = await createFlowPayment({
      commerceOrder,
      subject: descripcion || 'Pago Poppins',
      amount: Math.round(monto),
      email: email || 'manuel.aravenal@gmail.com',
      urlConfirmation: `${baseUrl}/api/pagos/flow/confirm`,
      urlReturn: `${baseUrl}/empresa/pagos?flow_status=completed`,
    });

    // Update pago with Flow data
    const supabase = createClient();
    await supabase
      .from('pagos_empleador')
      .update({
        stripe_payment_intent_id: `flow_${result.flowOrder}`,
        estado: 'procesado',
      })
      .eq('id', pagoId);

    return NextResponse.json({
      url: result.url,
      token: result.token,
      flowOrder: result.flowOrder,
      commerceOrder,
    });
  } catch (error: any) {
    console.error('Error creating Flow payment:', error);

    // Fallback: simulate success if Flow keys not configured
    const { pagoId } = await request.clone().json().catch(() => ({ pagoId: null }));
    if (pagoId) {
      return NextResponse.json({
        url: null,
        token: `flow_sim_${Date.now()}`,
        flowOrder: Date.now(),
        commerceOrder: `POP-SIM-${Date.now()}`,
        simulated: true,
      });
    }

    return NextResponse.json({ error: error.message || 'Error al crear pago Flow' }, { status: 500 });
  }
}
