// PATCH /api/empresa/trabajadores/[id]/datos-personales
// Actualiza datos personales del trabajador. Solo permite los campos permitidos.
// No deja guardar si quedaría con campos legales obligatorios vacíos.
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getActiveEmpleadorId } from '@/lib/auth/active-empleador';
import { auditLog } from '@/lib/audit/log';
import { validarCamposTrabajador } from '@/lib/validaciones/trabajador';
import { isValidEmail } from '@/lib/validators';

export const runtime = 'nodejs';

const ALLOWED = new Set([
  'email','telefono','direccion','comuna','region',
  'fecha_nacimiento','sexo','estado_civil','nacionalidad',
  'banco','tipo_cuenta','numero_cuenta','payment_method',
]);

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: 'no_auth' }, { status: 401 });

  const { id } = await params;
  const { empleadorId } = await getActiveEmpleadorId(supabase, user);
  if (!empleadorId) return NextResponse.json({ ok: false, error: 'no_empleador' }, { status: 403 });

  // Verifica que el trabajador pertenezca al empleador activo (vía contrato)
  const { data: contrato } = await supabase
    .from('contratos').select('id').eq('trabajador_id', id).eq('empleador_id', empleadorId).maybeSingle();
  if (!contrato) return NextResponse.json({ ok: false, error: 'no_pertenece' }, { status: 403 });

  const body = await request.json();
  const patch: Record<string, any> = {};
  for (const k of Object.keys(body)) {
    if (ALLOWED.has(k)) patch[k] = body[k] === '' ? null : body[k];
  }
  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ ok: false, error: 'sin_cambios' }, { status: 400 });
  }

  if (patch.email && !isValidEmail(patch.email)) {
    return NextResponse.json({ ok: false, error: 'email_invalido' }, { status: 422 });
  }

  // Validación legal: simular el estado final y bloquear si faltan campos.
  const { data: actual } = await supabase
    .from('trabajadores')
    .select('rut,nombre,apellido_paterno,fecha_nacimiento,email,direccion,comuna,region,afp_id,salud_id,salud_tipo,salud_plan_uf,es_pensionado,banco,tipo_cuenta,numero_cuenta,payment_method')
    .eq('id', id).maybeSingle();
  if (!actual) return NextResponse.json({ ok: false, error: 'no_existe' }, { status: 404 });

  const futuro = { ...actual, ...patch };
  const validacion = validarCamposTrabajador(futuro);
  if (!validacion.ok) {
    return NextResponse.json({
      ok: false, error: 'campos_faltantes',
      faltantes: validacion.faltantes,
      detail: `Para guardar este trabajador faltan: ${validacion.faltantes.join(', ')}`,
    }, { status: 422 });
  }

  const { error } = await supabase.from('trabajadores').update(patch).eq('id', id);
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  await auditLog(supabase, {
    userId: user.id, empleadorId,
    action: 'trabajador.update_datos_personales',
    entity: 'trabajador', entityId: id,
    payload: { patch },
    request,
  });

  return NextResponse.json({ ok: true });
}
