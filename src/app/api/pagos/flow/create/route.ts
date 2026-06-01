import { NextRequest, NextResponse } from 'next/server';
import { createFlowPayment } from '@/lib/flow';
import { z } from 'zod';

const FLOW_API_KEY = process.env.FLOW_API_KEY;

const CreatePaymentSchema = z.object({
  pagoId: z.string().min(1),
  monto: z.number().positive(),
  descripcion: z.string().optional(),
  email: z.string().email().optional(),
});

export async function POST(request: NextRequest) {
  let body;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'JSON inválido' }, { status: 400 }); }

  const parsed = CreatePaymentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Datos inválidos', details: parsed.error.flatten() }, { status: 400 });
  }
  const { pagoId, monto, descripcion, email } = parsed.data;

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://poppins.tooxs-fperez.workers.dev';

  // Flow disabled only if no keys configured
  if (!FLOW_API_KEY || FLOW_API_KEY === 'flow_sandbox_key') {
    return NextResponse.json({
      url: null,
      token: `flow_sim_${Date.now()}`,
      flowOrder: Date.now(),
      commerceOrder: `POP-SIM-${Date.now()}`,
      simulated: true,
    });
  }

  // Real Flow payment
  try {
    const commerceOrder = `POP-${pagoId.substring(0, 8)}-${Date.now()}`;

    const result = await createFlowPayment({
      commerceOrder,
      subject: descripcion || 'Pago Poppins',
      amount: Math.round(monto),
      email: email || 'pagos@poppins.cl',
      urlConfirmation: `${siteUrl}/api/pagos/flow/confirm`,
      urlReturn: `${siteUrl}/empresa/pagos?flow_status=completed`,
    });

    return NextResponse.json({
      url: result.url,
      token: result.token,
      flowOrder: result.flowOrder,
      commerceOrder,
    });
  } catch (error: unknown) {
    console.error('Error creando pago Flow:', error);
    const message = error instanceof Error ? error.message : 'Error al crear pago en Flow';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
