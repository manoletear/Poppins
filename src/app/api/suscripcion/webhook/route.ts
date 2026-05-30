import { NextRequest, NextResponse } from 'next/server';
import { procesarCobroWebhook } from '@/lib/pagos/suscripcion-service';

/**
 * Webhook de cobro recurrente de Flow (urlCallback del plan).
 *
 * NOTA: el payload exacto de Flow para eventos de suscripción debe validarse
 * contra el sandbox. Mapeo provisional abajo.
 * TODO(seguridad): verificar la firma `s` de Flow antes de confiar en el evento.
 */
export async function POST(request: NextRequest) {
  try {
    const form = await request.formData();
    const subscriptionId = (form.get('subscriptionId') || form.get('subscription_id')) as string | null;
    const status = ((form.get('status') as string | null) ?? '').toLowerCase();

    if (!subscriptionId) return NextResponse.json({ received: true });

    // status Flow: 2 = pagado/activo. (Validar valores reales en sandbox.)
    const resultado: 'charged' | 'failed' =
      status === '2' || status === 'charged' || status === 'active' ? 'charged' : 'failed';

    const r = await procesarCobroWebhook({ flowSubscriptionId: subscriptionId, resultado });
    return NextResponse.json({ received: true, ...r });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error interno' }, { status: 500 });
  }
}
