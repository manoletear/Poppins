import { NextRequest, NextResponse } from 'next/server';
import { procesarCobroWebhook } from '@/lib/pagos/suscripcion-service';
import { verifyFlowSignature } from '@/lib/flow';

/**
 * Webhook de cobro recurrente de Flow (urlCallback del plan).
 *
 * Verifica la firma `s` de Flow antes de confiar en el evento (en modo simulado
 * sin llaves reales, acepta). NOTA: el payload exacto de los eventos de
 * suscripción de Flow debe validarse contra el sandbox; el mapeo de estado abajo
 * es provisional.
 */
export async function POST(request: NextRequest) {
  try {
    const form = await request.formData();
    const params: Record<string, string> = {};
    for (const [k, v] of form.entries()) {
      if (typeof v === 'string') params[k] = v;
    }

    // Seguridad: validar firma HMAC de Flow.
    if (!verifyFlowSignature(params)) {
      return NextResponse.json({ error: 'invalid_signature' }, { status: 401 });
    }

    const subscriptionId = params['subscriptionId'] || params['subscription_id'] || null;
    const status = (params['status'] ?? '').toLowerCase();

    if (!subscriptionId) return NextResponse.json({ received: true });

    // status Flow: 2 = pagado/activo. (Validar valores reales en sandbox.)
    const resultado: 'charged' | 'failed' =
      status === '2' || status === 'charged' || status === 'active' ? 'charged' : 'failed';

    const flowEventId = params['token'] || params['event_id'] || params['commerceOrder'] || undefined;
    const r = await procesarCobroWebhook({ flowSubscriptionId: subscriptionId, resultado, flowEventId });
    return NextResponse.json({ received: true, ...r });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error interno' }, { status: 500 });
  }
}
