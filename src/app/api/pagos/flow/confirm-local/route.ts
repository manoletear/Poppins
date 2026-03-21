import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * Endpoint de confirmacion local para modo desarrollo (sin claves de Flow).
 * Simula un pago exitoso: marca como pagado, calcula puntos y crea comprobante.
 */
export async function POST(request: NextRequest) {
  try {
    const { pagoId } = await request.json();

    if (!pagoId) {
      return NextResponse.json(
        { error: 'pagoId es requerido' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Obtener datos del pago
    const { data: pago, error: fetchError } = await supabase
      .from('pagos_empleador')
      .select('*')
      .eq('id', pagoId)
      .single();

    if (fetchError || !pago) {
      return NextResponse.json(
        { error: 'Pago no encontrado' },
        { status: 404 }
      );
    }

    if (pago.estado === 'pagado') {
      return NextResponse.json(
        { error: 'Este pago ya fue procesado' },
        { status: 400 }
      );
    }

    // Calcular puntos: 1 punto por cada $1.000 CLP
    const puntos = Math.floor(pago.monto / 1000);
    const now = new Date().toISOString();

    // Actualizar pago como pagado
    const { error: updateError } = await supabase
      .from('pagos_empleador')
      .update({
        estado: 'pagado',
        fecha_pago: now,
        puntos_acumulados: puntos,
        flow_order_id: pago.flow_order_id || `LOCAL-${Date.now()}`,
        flow_token: pago.flow_token || `local_${Date.now()}`,
      })
      .eq('id', pagoId);

    if (updateError) {
      console.error('Error actualizando pago:', updateError);
      return NextResponse.json(
        { error: 'Error al actualizar el pago' },
        { status: 500 }
      );
    }

    // Crear comprobante de pago
    const comprobanteNumero = `LOCAL-${pagoId.substring(0, 8).toUpperCase()}-${Date.now()}`;
    await supabase.from('comprobantes_pago').insert({
      pago_id: pagoId,
      tipo: 'recibo',
      numero: comprobanteNumero,
      monto: pago.monto,
    });

    return NextResponse.json({
      success: true,
      puntos_ganados: puntos,
      comprobante: comprobanteNumero,
    });
  } catch (error: unknown) {
    console.error('Error en confirmacion local:', error);
    const message =
      error instanceof Error
        ? error.message
        : 'Error al procesar confirmacion local';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
