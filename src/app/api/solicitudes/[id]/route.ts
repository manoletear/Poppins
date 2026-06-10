// PATCH /api/solicitudes/[id]
// Body: { estado: 'aprobada' | 'rechazada' | 'cancelada', motivo?: string }
// Cambia el estado de una solicitud del trabajador (vacaciones, permisos, licencias).
// Solo el empleador dueño puede aprobar/rechazar. Audit log incluido.
// Si vacaciones aprobadas → al cerrar el mes se suman automáticamente a _DIAS_VACACIONES.

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getActiveEmpleadorId } from '@/lib/auth/active-empleador';
import { auditLog } from '@/lib/audit/log';

export const runtime = 'nodejs';

const ESTADOS_VALIDOS = new Set(['aprobada', 'rechazada', 'cancelada']);

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

  const body = await request.json().catch(() => ({}));
  const estado = body?.estado as string;
  if (!ESTADOS_VALIDOS.has(estado)) {
    return NextResponse.json({ ok: false, error: 'estado_invalido' }, { status: 422 });
  }

  // Verificar que pertenece al empleador activo
  const { data: sol } = await supabase
    .from('solicitudes_empleado')
    .select('id, tipo, estado, trabajador_id')
    .eq('id', id).eq('empleador_id', empleadorId).maybeSingle();
  if (!sol) return NextResponse.json({ ok: false, error: 'no_encontrada' }, { status: 404 });

  if (sol.estado === estado) {
    return NextResponse.json({ ok: true, sin_cambios: true });
  }

  const { error } = await supabase
    .from('solicitudes_empleado')
    .update({
      estado,
      fecha_respuesta: new Date().toISOString(),
      motivo_respuesta: body?.motivo ?? null,
    })
    .eq('id', id);
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  await auditLog(supabase, {
    userId: user.id, empleadorId,
    action: `solicitud.${estado}`,
    entity: 'solicitud', entityId: id,
    payload: { tipo: sol.tipo, trabajador_id: sol.trabajador_id, motivo: body?.motivo ?? null },
    request,
  });

  return NextResponse.json({ ok: true, estado });
}
