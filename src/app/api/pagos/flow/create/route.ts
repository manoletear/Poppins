import { NextRequest, NextResponse } from 'next/server';
import { createFlowPayment } from '@/lib/flow';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const { pagoId, monto, descripcion, email } = await request.json();

    if (!pagoId || !monto) {
      return NextResponse.json(
        { error: 'pagoId y monto son requeridos' },
        { status: 400 }
      );
    }

    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL ||
      request.headers.get('origin') ||
      'http://localhost:3000';
    const commerceOrder = `POP-${pagoId.substring(0, 8)}-${Date.now()}`;

    const result = await createFlowPayment({
      commerceOrder,
      subject: descripcion || 'Pago Poppins',
      amount: Math.round(monto),
      email: email || 'pagos@poppins.cl',
      urlConfirmation: `${siteUrl}/api/pagos/flow/confirm`,
      urlReturn: `${siteUrl}/empresa/pagos?flow_status=completed`,
    });

    // Actualizar pago con datos de Flow
    const supabase = await createClient();
    const { error: updateError } = await supabase
      .from('pagos_empleador')
      .update({
        flow_order_id: String(result.flowOrder),
        flow_token: result.token,
        estado: 'procesado',
      })
      .eq('id', pagoId);

    if (updateError) {
      console.error('Error actualizando pago con datos Flow:', updateError);
    }

    return NextResponse.json({
      url: result.url,
      token: result.token,
      flowOrder: result.flowOrder,
      commerceOrder,
    });
  } catch (error: unknown) {
    console.error('Error creando pago Flow:', error);

    // Si las claves de Flow no estan configuradas, retornar modo simulado
    const body = await request.clone().json().catch(() => ({}));
    if (body.pagoId) {
      return NextResponse.json({
        url: null,
        token: `flow_sim_${Date.now()}`,
        flowOrder: Date.now(),
        commerceOrder: `POP-SIM-${Date.now()}`,
        simulated: true,
      });
    }

    const message =
      error instanceof Error ? error.message : 'Error al crear pago en Flow';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
