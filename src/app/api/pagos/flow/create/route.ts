import { NextRequest, NextResponse } from 'next/server';
import { createFlowPayment } from '@/lib/flow';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

const FLOW_API_KEY = process.env.FLOW_API_KEY;

const CreatePaymentSchema = z.object({
  pagoId: z.string().min(1),
  descripcion: z.string().optional(),
  email: z.string().email().optional(),
});

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  let body;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'JSON inválido' }, { status: 400 }); }

  const parsed = CreatePaymentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Datos inválidos', details: parsed.error.flatten() }, { status: 400 });
  }
  const { pagoId, descripcion, email } = parsed.data;

  const { data: pagoRecord, error: pagoError } = await supabase
    .from('pagos_empleador')
    .select('monto')
    .eq('id', pagoId)
    .single();
  if (pagoError || !pagoRecord) return NextResponse.json({ error: 'Pago no encontrado' }, { status: 404 });
  const monto = pagoRecord.monto;

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
      urlReturn: `${siteUrl}/hogar/pagos?flow_status=completed`,
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
