import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Este endpoint es público (no requiere auth) — la empleada accede via token
function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// GET: validar token de invitación
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token');
  if (!token) return NextResponse.json({ error: 'Token requerido' }, { status: 400 });

  const supabase = getSupabaseAdmin();

  const { data: invitacion } = await supabase
    .from('invitaciones')
    .select('*, empleadores(nombre)')
    .eq('token', token)
    .eq('estado', 'pendiente')
    .single();

  if (!invitacion) {
    return NextResponse.json({ error: 'Invitación no válida o expirada' }, { status: 404 });
  }

  // Verificar expiración
  if (new Date(invitacion.expira_at) < new Date()) {
    await supabase
      .from('invitaciones')
      .update({ estado: 'expirada' })
      .eq('id', invitacion.id);
    return NextResponse.json({ error: 'Invitación expirada' }, { status: 410 });
  }

  return NextResponse.json({
    valida: true,
    empleador_nombre: invitacion.empleadores?.nombre || 'Tu empleador',
    nombre: invitacion.nombre,
    email: invitacion.email,
  });
}

// POST: empleada completa sus datos via token
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { token, datos } = body;

  if (!token || !datos) {
    return NextResponse.json({ error: 'Token y datos requeridos' }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();

  // Validar invitación
  const { data: invitacion } = await supabase
    .from('invitaciones')
    .select('*')
    .eq('token', token)
    .eq('estado', 'pendiente')
    .single();

  if (!invitacion) {
    return NextResponse.json({ error: 'Invitación no válida' }, { status: 404 });
  }

  if (new Date(invitacion.expira_at) < new Date()) {
    return NextResponse.json({ error: 'Invitación expirada' }, { status: 410 });
  }

  // Crear o actualizar trabajador
  const trabajadorData = {
    cliente_id: invitacion.empleador_id,
    rut: datos.rut,
    nombre: datos.nombre,
    apellido_paterno: datos.apellido_paterno,
    apellido_materno: datos.apellido_materno || null,
    fecha_nacimiento: datos.fecha_nacimiento || null,
    genero: datos.genero || null,
    estado_civil: datos.estado_civil || null,
    nacionalidad: datos.nacionalidad || 'Chilena',
    email: datos.email || null,
    telefono: datos.telefono || null,
    direccion: datos.direccion || null,
    comuna: datos.comuna || null,
    region: datos.region || null,
    cargo: datos.cargo || 'Trabajadora de casa particular',
    sueldo_base: datos.sueldo_base || 0,
    afp_id: datos.afp_id || null,
    salud_id: datos.salud_id || null,
    banco: datos.banco || null,
    tipo_cuenta: datos.tipo_cuenta || null,
    numero_cuenta: datos.numero_cuenta || null,
    estado: 'activo' as const,
    onboarding_completado: true,
  };

  const { data: trabajador, error } = await supabase
    .from('trabajadores')
    .insert(trabajadorData)
    .select('id')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Marcar invitación como aceptada
  await supabase
    .from('invitaciones')
    .update({
      estado: 'aceptada',
      trabajador_id: trabajador.id,
      aceptada_at: new Date().toISOString(),
    })
    .eq('id', invitacion.id);

  // Si el trabajador ya tiene cuenta auth, crear user_empleadores ahora
  if (datos.email) {
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const authUser = existingUsers?.users?.find((u) => u.email === datos.email);
    if (authUser) {
      await supabase
        .from('user_empleadores')
        .upsert(
          { auth_user_id: authUser.id, empleador_id: invitacion.empleador_id, rol: 'empleado', estado: 'activo' },
          { onConflict: 'auth_user_id,empleador_id' }
        );
    }
  }

  return NextResponse.json({
    success: true,
    trabajador_id: trabajador.id,
    message: 'Datos registrados correctamente',
  }, { status: 201 });
}
