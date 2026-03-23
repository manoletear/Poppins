import { NextRequest, NextResponse } from 'next/server';
import { createFlowPayment } from '@/lib/flow';
import { createClient } from '@/lib/supabase/server';

const FLOW_API_KEY = process.env.FLOW_API_KEY;

/**
 * Creates a single consolidated Flow payment for multiple pending pagos.
 * Stores the pago IDs in the commerce order metadata so the confirm webhook
 * can mark all of them as paid.
 */
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { pagoIds, monto, descripcion, email } = body;

  if (!pagoIds || !Array.isArray(pagoIds) || pagoIds.length === 0) {
    return NextResponse.json({ error: 'pagoIds (array) es requerido' }, { status: 400 });
  }
  if (!monto || monto <= 0) {
    return NextResponse.json({ error: 'monto debe ser mayor a 0' }, { status: 400 });
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://poppins-erp-2026.vercel.app';
  const bulkId = `BULK-${Date.now()}`;

  // Store the bulk mapping in Supabase so confirm webhook can find all pagos
  const supabase = await createClient();
  await supabase.from('pagos_empleador')
    .update({ flow_token: bulkId })
    .in('id', pagoIds);

  // Flow disabled - simulation mode
  if (!FLOW_API_KEY || FLOW_API_KEY === 'flow_sandbox_key') {
    return NextResponse.json({
      url: null,
      token: `flow_sim_${Date.now()}`,
      flowOrder: Date.now(),
      commerceOrder: bulkId,
      simulated: true,
      pagoIds,
    });
  }

  // Real Flow payment
  try {
    const flowAmount = Math.round(monto);
    const flowSubject = descripcion || `Pago consolidado Poppins (${pagoIds.length} cuentas)`;
    console.log('[create-bulk] Creating Flow payment:', {
      bulkId,
      pagoIds,
      amount: flowAmount,
      subject: flowSubject,
      pagoCount: pagoIds.length,
    });

    const result = await createFlowPayment({
      commerceOrder: bulkId,
      subject: flowSubject,
      amount: flowAmount,
      email: email || 'pagos@poppins.cl',
      urlConfirmation: `${siteUrl}/api/pagos/flow/confirm`,
      urlReturn: `${siteUrl}/empresa/pagos?flow_status=completed`,
    });

    console.log('[create-bulk] Flow response:', {
      url: result.url,
      token: result.token,
      flowOrder: result.flowOrder,
    });

    // Store flow token and order on all pagos
    await supabase.from('pagos_empleador')
      .update({
        flow_token: result.token,
        flow_order_id: String(result.flowOrder),
      })
      .in('id', pagoIds);

    return NextResponse.json({
      url: result.url,
      token: result.token,
      flowOrder: result.flowOrder,
      commerceOrder: bulkId,
      pagoIds,
    });
  } catch (error: unknown) {
    console.error('Error creando pago consolidado Flow:', error);
    const message = error instanceof Error ? error.message : 'Error al crear pago consolidado';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
