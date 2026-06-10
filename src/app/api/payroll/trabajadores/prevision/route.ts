// PATCH /api/payroll/trabajadores/prevision
// Body: { trabajador_id, afp_id, salud_id, salud_tipo, salud_plan_uf? }
// Actualiza datos previsionales del trabajador y marca `prevision_verificada_at = now()`.
// Recalcula `prevision_estado` (vigente | pendiente) según completitud.

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getActiveEmpleadorId } from '@/lib/auth/active-empleador';
import { auditLog } from '@/lib/audit/log';

export const runtime = 'nodejs';

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: 'no_auth' }, { status: 401 });

  const { empleadorId } = await getActiveEmpleadorId(supabase, user);
  if (!empleadorId) return NextResponse.json({ ok: false, error: 'sin_empleador' }, { status: 400 });

  const body = await request.json().catch(() => null);
  const trabajadorId = body?.trabajador_id as string | undefined;
  if (!trabajadorId) return NextResponse.json({ ok: false, error: 'trabajador_id_requerido' }, { status: 422 });

  // Validar que el trabajador pertenece al empleador activo
  const { data: contratoOk } = await supabase
    .from('contratos').select('id')
    .eq('trabajador_id', trabajadorId)
    .eq('empleador_id', empleadorId)
    .eq('estado', 'activo')
    .limit(1);
  if (!contratoOk || contratoOk.length === 0) {
    return NextResponse.json({ ok: false, error: 'trabajador_no_pertenece' }, { status: 403 });
  }

  const afp_id     = body.afp_id != null ? Number(body.afp_id) : null;
  const salud_id   = body.salud_id != null ? Number(body.salud_id) : null;
  const salud_tipo = body.salud_tipo as 'fonasa' | 'isapre' | undefined;
  const planUf     = Number(body.salud_plan_uf) || 0;

  if (!afp_id || !salud_id || !salud_tipo) {
    return NextResponse.json({ ok: false, error: 'campos_requeridos' }, { status: 422 });
  }
  if (salud_tipo === 'isapre' && planUf <= 0) {
    return NextResponse.json({ ok: false, error: 'isapre_requiere_plan_uf' }, { status: 422 });
  }

  const previsionOk = afp_id != null && salud_id != null && (salud_tipo === 'fonasa' || planUf > 0);

  const { error } = await supabase
    .from('trabajadores')
    .update({
      afp_id, salud_id, salud_tipo,
      salud_plan_uf: salud_tipo === 'isapre' ? planUf : null,
      prevision_verificada_at: new Date().toISOString(),
      prevision_estado: previsionOk ? 'vigente' : 'pendiente',
    })
    .eq('id', trabajadorId);

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  await auditLog(supabase, {
    userId: user.id, empleadorId,
    action: 'trabajador.prevision_update',
    entity: 'trabajador', entityId: trabajadorId,
    payload: { afp_id, salud_id, salud_tipo, salud_plan_uf: planUf || null },
    request,
  });

  return NextResponse.json({ ok: true });
}
