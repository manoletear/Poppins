// PATCH /api/payroll/recibos/[id]
// Empleador: registra pago efectivo de la liquidación.
//   body: { medio_pago, referencia_pago?, pagado_at? }
//
// POST /api/payroll/recibos/[id]/firmar (subruta más abajo)
// Trabajador: firma el recibo (acepta el monto recibido).

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getActiveEmpleadorId } from '@/lib/auth/active-empleador';
import { auditLog } from '@/lib/audit/log';

export const runtime = 'nodejs';

const MEDIOS = ['transferencia', 'efectivo', 'cheque', 'otro'] as const;

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: 'no_auth' }, { status: 401 });

  const { empleadorId } = await getActiveEmpleadorId(supabase, user);
  if (!empleadorId) return NextResponse.json({ ok: false, error: 'sin_empleador' }, { status: 400 });

  const { data: res } = await supabase
    .from('payroll_results').select('id, empleador_id')
    .eq('id', id).maybeSingle();
  if (!res || res.empleador_id !== empleadorId) {
    return NextResponse.json({ ok: false, error: 'no_encontrado' }, { status: 404 });
  }

  const body = await request.json().catch(() => ({}));
  const medio_pago = body.medio_pago as string;
  if (!MEDIOS.includes(medio_pago as any)) {
    return NextResponse.json({ ok: false, error: 'medio_pago_invalido' }, { status: 422 });
  }

  const pagado_at = body.pagado_at ? new Date(body.pagado_at).toISOString() : new Date().toISOString();

  const { error } = await supabase
    .from('payroll_results')
    .update({
      pagado_at,
      medio_pago,
      referencia_pago: body.referencia_pago ?? null,
      pagado_por: user.id,
    })
    .eq('id', id);
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  await auditLog(supabase, {
    userId: user.id, empleadorId,
    action: 'recibo.marcar_pagado',
    entity: 'payroll_results', entityId: id,
    payload: { medio_pago, referencia_pago: body.referencia_pago ?? null, pagado_at },
    request,
  });

  return NextResponse.json({ ok: true, pagado_at });
}
