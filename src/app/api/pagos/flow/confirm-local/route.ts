import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * Endpoint de confirmacion local para modo desarrollo (sin claves de Flow).
 * Simula un pago exitoso: marca como pagado, calcula puntos y crea comprobante.
 * Supports both single (pagoId) and bulk (pagoIds) payments.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { pagoId, pagoIds } = body;

    // Support both single and bulk
    const ids: string[] = pagoIds || (pagoId ? [pagoId] : []);

    if (ids.length === 0) {
      return NextResponse.json(
        { error: 'pagoId o pagoIds es requerido' },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const now = new Date().toISOString();
    let totalPuntos = 0;
    const comprobantes: string[] = [];

    for (const id of ids) {
      // Obtener datos del pago
      const { data: pago, error: fetchError } = await supabase
        .from('pagos_empleador')
        .select('*')
        .eq('id', id)
        .single();

      if (fetchError || !pago) continue;
      if (pago.estado === 'pagado') continue;

      // Calcular puntos: 1 punto por cada $1.000 CLP
      const puntos = Math.floor(pago.monto / 1000);
      totalPuntos += puntos;

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
        .eq('id', id);

      if (updateError) {
        console.error('Error actualizando pago:', id, updateError);
        continue;
      }

      // Crear comprobante de pago
      const comprobanteNumero = `LOCAL-${id.substring(0, 8).toUpperCase()}-${Date.now()}`;
      await supabase.from('comprobantes_pago').insert({
        pago_id: id,
        tipo: 'recibo',
        numero: comprobanteNumero,
        monto: pago.monto,
      });
      comprobantes.push(comprobanteNumero);
    }

    return NextResponse.json({
      success: true,
      puntos_ganados: totalPuntos,
      comprobantes,
      count: ids.length,
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
