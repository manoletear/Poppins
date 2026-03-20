import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { createClient } from '@/lib/supabase/client';

export async function POST(request: NextRequest) {
  try {
    const { pagoId, monto, descripcion, empleadorId } = await request.json();

    // Validate
    if (!pagoId || !monto) {
      return NextResponse.json({ error: 'pagoId y monto son requeridos' }, { status: 400 });
    }

    // Create PaymentIntent (monto in CLP centavos)
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(monto), // CLP has no decimals, but Stripe expects integer
      currency: 'clp',
      metadata: {
        pago_id: pagoId,
        empleador_id: empleadorId,
        descripcion: descripcion || '',
      },
      automatic_payment_methods: { enabled: true },
    });

    // Update pago with stripe_payment_intent_id
    const supabase = createClient();
    await supabase
      .from('pagos_empleador')
      .update({
        stripe_payment_intent_id: paymentIntent.id,
        estado: 'procesado'
      })
      .eq('id', pagoId);

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    });
  } catch (error: any) {
    console.error('Error creating payment intent:', error);
    return NextResponse.json(
      { error: error.message || 'Error al crear intento de pago' },
      { status: 500 }
    );
  }
}
