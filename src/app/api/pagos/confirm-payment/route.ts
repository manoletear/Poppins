import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/client';

export async function POST(request: NextRequest) {
  try {
    const { pagoId, paymentIntentId, status } = await request.json();

    const supabase = createClient();

    if (status === 'succeeded') {
      // Get the pago to calculate points
      const { data: pago } = await supabase
        .from('pagos_empleador')
        .select('*')
        .eq('id', pagoId)
        .single();

      if (!pago) {
        return NextResponse.json({ error: 'Pago no encontrado' }, { status: 404 });
      }

      // Calculate points (1 point per $1000 CLP)
      const puntos = Math.floor(pago.monto / 1000);

      // Update pago as paid
      await supabase
        .from('pagos_empleador')
        .update({
          estado: 'pagado',
          fecha_pago: new Date().toISOString(),
          puntos_acumulados: puntos,
          stripe_payment_intent_id: paymentIntentId,
        })
        .eq('id', pagoId);

      // Create comprobante
      await supabase
        .from('comprobantes_pago')
        .insert({
          pago_id: pagoId,
          tipo: 'recibo',
          numero: `REC-${Date.now()}`,
          monto: pago.monto,
        });

      return NextResponse.json({
        success: true,
        puntos_ganados: puntos,
        message: 'Pago procesado exitosamente'
      });
    } else {
      // Payment failed
      await supabase
        .from('pagos_empleador')
        .update({ estado: 'rechazado' })
        .eq('id', pagoId);

      return NextResponse.json({ success: false, message: 'Pago rechazado' });
    }
  } catch (error: any) {
    console.error('Error confirming payment:', error);
    return NextResponse.json(
      { error: error.message || 'Error al confirmar pago' },
      { status: 500 }
    );
  }
}
