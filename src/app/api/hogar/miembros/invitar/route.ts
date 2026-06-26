import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { getActiveEmpleadorId } from '@/lib/auth/active-empleador';
import { PERMISOS_DEFAULT_FAMILIAR } from '@/lib/payroll/types/miembros';
import type { Permisos } from '@/lib/payroll/types/miembros';

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (!body?.email || !body?.etiqueta) {
    return NextResponse.json({ error: 'email y etiqueta son requeridos' }, { status: 400 });
  }

  const { email, etiqueta, permisos = PERMISOS_DEFAULT_FAMILIAR } = body as {
    email: string;
    etiqueta: string;
    permisos?: Permisos;
  };

  const cookiesToSet: { name: string; value: string; options: Record<string, unknown> }[] = [];
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cs) => cs.forEach((c) => cookiesToSet.push(c as typeof cookiesToSet[number])),
      },
    }
  );

  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

  const { empleadorId } = await getActiveEmpleadorId(supabase, user);
  if (!empleadorId) return NextResponse.json({ error: 'Sin hogar activo' }, { status: 403 });

  // Verificar que el caller es owner
  const { data: membership } = await supabase
    .from('user_empleadores')
    .select('rol')
    .eq('auth_user_id', user.id)
    .eq('empleador_id', empleadorId)
    .maybeSingle();

  if (membership?.rol !== 'owner') {
    return NextResponse.json({ error: 'Solo el owner puede invitar miembros' }, { status: 403 });
  }

  const svc = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Verificar si el email ya existe en auth
  const { data: existingUsers } = await svc.auth.admin.listUsers();
  const existingUser = existingUsers?.users?.find((u) => u.email === email);

  if (existingUser) {
    // Usuario ya existe: agregar directamente al hogar
    const { error: upsertErr } = await svc
      .from('user_empleadores')
      .upsert({
        auth_user_id: existingUser.id,
        empleador_id: empleadorId,
        rol: 'viewer',
        etiqueta,
        permisos,
        estado: 'activo',
        invitacion_email: email,
        created_by: user.id,
      }, { onConflict: 'auth_user_id,empleador_id' });

    if (upsertErr) return NextResponse.json({ error: upsertErr.message }, { status: 500 });
    return NextResponse.json({ ok: true, modo: 'usuario_existente' });
  }

  // Usuario nuevo: enviar invitación por email
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://poppins.cl';
  const { data: inviteData, error: inviteErr } = await svc.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${siteUrl}/auth/callback`,
    data: {
      empleador_id: empleadorId,
      etiqueta,
      permisos,
      invited_by: user.id,
    },
  });

  if (inviteErr) return NextResponse.json({ error: inviteErr.message }, { status: 500 });

  // Crear fila pendiente para tracking
  await svc.from('user_empleadores').upsert({
    auth_user_id: inviteData.user.id,
    empleador_id: empleadorId,
    rol: 'viewer',
    etiqueta,
    permisos,
    estado: 'pendiente',
    invitacion_email: email,
    created_by: user.id,
  }, { onConflict: 'auth_user_id,empleador_id' });

  const res = NextResponse.json({ ok: true, modo: 'invitacion_enviada' });
  cookiesToSet.forEach(({ name, value, options }) => res.cookies.set(name, value, options));
  return res;
}
