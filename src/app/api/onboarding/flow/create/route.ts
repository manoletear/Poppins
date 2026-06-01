import { NextRequest, NextResponse } from 'next/server';
import { createFlowPayment } from '@/lib/flow';
import { z } from 'zod';

const FLOW_API_KEY = process.env.FLOW_API_KEY;

const Schema = z.object({
  contratoId: z.string().uuid(),
  empleadorId: z.string().uuid(),
  monto: z.number().positive(),
  email: z.string().email(),
  nombre: z.string().min(1),
});

export async function POST(request: NextRequest) {
  let body;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
  }

  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Datos inválidos', details: parsed.error.flatten() }, { status: 400 });
  }

  const { contratoId, empleadorId, monto, email, nombre } = parsed.data;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://poppins.tooxs-fperez.workers.dev';

  // Simulated mode if no real Flow keys
  if (!FLOW_API_KEY || FLOW_API_KEY === 'flow_sandbox_key') {
    return NextResponse.json({
      url: null,
      token: `flow_sim_${Date.now()}`,
      flowOrder: Date.now(),
      commerceOrder: `POP-ONB-SIM-${Date.now()}`,
      simulated: true,
    });
  }

  try {
    const commerceOrder = `POP-ONB-${contratoId.substring(0, 8)}-${Date.now()}`;

    const result = await createFlowPayment({
      commerceOrder,
      subject: `Poppins — Activación cuenta de ${nombre}`,
      amount: Math.round(monto),
      email,
      urlConfirmation: `${siteUrl}/api/onboarding/flow/confirm`,
      urlReturn: `${siteUrl}/empresa/onboarding?flow_status=completed&contrato_id=${contratoId}`,
      optional: {
        // Store IDs in optional for webhook reference
        'optional_contrato_id': contratoId,
        'optional_empleador_id': empleadorId,
      },
    });

    return NextResponse.json({
      url: result.url,
      token: result.token,
      flowOrder: result.flowOrder,
      commerceOrder,
    });
  } catch (error: unknown) {
    console.error('Error creando pago onboarding Flow:', error);
    const message = error instanceof Error ? error.message : 'Error al crear pago';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
