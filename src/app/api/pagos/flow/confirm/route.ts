import { NextRequest, NextResponse } from 'next/server';
import { getFlowPaymentStatus, FLOW_STATUS } from '@/lib/flow';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const token = formData.get('token') as string;

    if (!token) {
      return NextResponse.json(
        { error: 'Token de Flow requerido' },
        { status: 400 }
      );
    }

    const status = await getFlowPaymentStatus(token);
    const supabase = await createClient();

    // Find all pagos matching this token or flowOrder (supports bulk payments)
    const { data: pagos } = await supabase
      .from('pagos_empleador')
      .select('*')
      .or(`flow_token.eq.${token},flow_order_id.eq.${status.flowOrder}`);

    if (!pagos || pagos.length === 0) {
      console.error(
        'No se encontraron pagos para Flow order:',
        status.flowOrder,
        'token:',
        token
      );
      return NextResponse.json(
        { error: 'Pago no encontrado' },
        { status: 404 }
      );
    }

    const now = new Date().toISOString();

    if (status.status === FLOW_STATUS.PAID) {
      const pagoIds = pagos.map((p: any) => p.id);

      // Batch update all pagos at once
      await supabase
        .from('pagos_empleador')
        .update({
          estado: 'pagado',
          fecha_pago: now,
          flow_order_id: String(status.flowOrder),
          pre_fondeo_estado: 'fondeado',
          pre_fondeo_at: now,
        })
        .in('id', pagoIds);

      // Update puntos individually (different per pago) + create comprobantes
      const comprobantes = pagos.map((pago: any) => ({
        pago_id: pago.id,
        tipo: 'recibo',
        numero: `FLOW-${status.flowOrder}-${pago.id.slice(0, 4)}`,
        monto: pago.monto,
      }));
      await supabase.from('comprobantes_pago').insert(comprobantes);

      // Update puntos per pago
      for (const pago of pagos) {
        await supabase.from('pagos_empleador')
          .update({ puntos_acumulados: Math.floor(pago.monto / 1000) })
          .eq('id', pago.id);
      }
    } else if (status.status === FLOW_STATUS.REJECTED) {
      await supabase
        .from('pagos_empleador')
        .update({ estado: 'rechazado' })
        .in('id', pagos.map(p => p.id));
    } else if (status.status === FLOW_STATUS.CANCELLED) {
      await supabase
        .from('pagos_empleador')
        .update({ estado: 'pendiente' })
        .in('id', pagos.map(p => p.id));
    }

    return NextResponse.json({ received: true, status: status.status, count: pagos.length });
  } catch (error: unknown) {
    console.error('Error en confirmacion de Flow:', error);
    const message =
      error instanceof Error ? error.message : 'Error procesando confirmacion';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
