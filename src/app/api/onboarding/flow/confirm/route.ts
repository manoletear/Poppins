import { NextRequest, NextResponse } from 'next/server';
import { getFlowPaymentStatus, FLOW_STATUS } from '@/lib/flow';
import { createClient } from '@supabase/supabase-js';

// Service role client for webhook (no user session)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const token = formData.get('token') as string;

    if (!token) {
      return NextResponse.json({ error: 'Token requerido' }, { status: 400 });
    }

    const payment = await getFlowPaymentStatus(token);

    if (payment.status === FLOW_STATUS.PAID) {
      // Extract contrato ID from commerceOrder: POP-ONB-{contratoId8}-{ts}
      const parts = payment.commerceOrder.split('-');
      // Find the contrato by flow_token or commerceOrder
      const { data: contrato } = await supabase
        .from('contratos_servicio')
        .select('id, empleador_id')
        .or(`flow_token.eq.${token},flow_order_id.eq.${payment.commerceOrder}`)
        .single();

      if (!contrato) {
        // Try matching by partial ID from commerceOrder
        const { data: contratos } = await supabase
          .from('contratos_servicio')
          .select('id, empleador_id')
          .eq('estado', 'pendiente_pago')
          .order('created_at', { ascending: false })
          .limit(1);

        if (!contratos?.length) {
          console.error('No contrato found for Flow payment:', payment.commerceOrder);
          return NextResponse.json({ received: true });
        }

        const c = contratos[0];
        await activateContract(c.id, c.empleador_id, token, String(payment.flowOrder));
      } else {
        await activateContract(contrato.id, contrato.empleador_id, token, String(payment.flowOrder));
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Error en confirm webhook onboarding:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

async function activateContract(contratoId: string, empleadorId: string, flowToken: string, flowOrderId: string) {
  // 1. Activate contrato
  await supabase
    .from('contratos_servicio')
    .update({
      estado: 'activo',
      pago_estado: 'pagado',
      flow_token: flowToken,
      flow_order_id: flowOrderId,
    })
    .eq('id', contratoId);

  // 2. Get empleador auth_user_id
  const { data: emp } = await supabase
    .from('empleadores')
    .select('auth_user_id')
    .eq('id', empleadorId)
    .single();

  if (emp?.auth_user_id) {
    // 3. Mark onboarding as completed
    await supabase
      .from('user_profiles')
      .update({ empleador_id: empleadorId, onboarding_completado: true })
      .eq('auth_user_id', emp.auth_user_id);

    // 4. Create subscription
    await supabase
      .from('suscripciones')
      .upsert({
        empleador_id: empleadorId,
        plan: 'poppins',
        estado: 'activa',
        monto_mensual: 24770,
      }, { onConflict: 'empleador_id' });
  }

  // 5. Send welcome email
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://poppins.tooxs-fperez.workers.dev';
  try {
    await fetch(`${siteUrl}/api/onboarding/welcome-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ empleadorId }),
    });
  } catch (e) {
    console.error('Error sending welcome email:', e);
  }
}
