import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { getActiveEmpleadorId } from '@/lib/auth/active-empleador';
import { PERMISOS_DEFAULT_FAMILIAR } from '@/lib/payroll/types/miembros';
import type { Permisos } from '@/lib/payroll/types/miembros';
import { sendEmail, emailInvitacionHogar } from '@/lib/email/send';

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

  const svc = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: membership } = await svc
    .from('user_empleadores')
    .select('rol')
    .eq('auth_user_id', user.id)
    .eq('empleador_id', empleadorId)
    .maybeSingle();

  if (membership?.rol !== 'owner') {
    return NextResponse.json({ error: 'Solo el owner puede invitar miembros' }, { status: 403 });
  }

  // Nombre del invitante para el email
  const { data: invitanteProfile } = await supabase
    .from('user_profiles')
    .select('nombre, apellido')
    .eq('auth_user_id', user.id)
    .maybeSingle();
  const nombreInvitante = [invitanteProfile?.nombre, invitanteProfile?.apellido].filter(Boolean).join(' ') || 'Tu familia';

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://poppins.cl';

  // Verificar si el email ya tiene cuenta — buscar por user_profiles primero (evita paginación de listUsers)
  const { data: existingProfile } = await svc
    .from('user_profiles')
    .select('auth_user_id')
    .eq('email', email)
    .maybeSingle();

  const existingAuthUserId = existingProfile?.auth_user_id ?? null;

  if (existingAuthUserId) {
    // Ya tiene cuenta: agregar directo y notificar
    const { error: upsertErr } = await svc
      .from('user_empleadores')
      .upsert({
        auth_user_id: existingAuthUserId,
        empleador_id: empleadorId,
        rol: 'viewer',
        etiqueta,
        permisos,
        estado: 'activo',
        invitacion_email: email,
        created_by: user.id,
      }, { onConflict: 'auth_user_id,empleador_id' });

    if (upsertErr) return NextResponse.json({ error: upsertErr.message }, { status: 500 });

    // Setear hogar activo y marcar onboarding completo para que pueda entrar directamente
    await svc.from('user_profiles').update({
      active_empleador_id: empleadorId,
      onboarding_completado: true,
    }).eq('auth_user_id', existingAuthUserId);

    const tpl = emailInvitacionHogar({ nombreInvitante, etiqueta, activationUrl: `${siteUrl}/hogar` });
    const emailResult = await sendEmail({ ...tpl, to: email });

    const res = NextResponse.json({ ok: true, modo: 'usuario_existente', emailOk: emailResult.ok, emailError: emailResult.error });
    cookiesToSet.forEach(({ name, value, options }) => res.cookies.set(name, value, options));
    return res;
  }

  // Usuario nuevo: generar link de activación con metadata del hogar
  const { data: linkData, error: linkErr } = await svc.auth.admin.generateLink({
    type: 'invite',
    email,
    options: {
      redirectTo: `${siteUrl}/auth/callback`,
      data: {
        empleador_id: empleadorId,
        etiqueta,
        permisos,
        invited_by: user.id,
      },
    },
  });

  if (linkErr || !linkData) return NextResponse.json({ error: linkErr?.message ?? 'Error generando link' }, { status: 500 });

  // Crear fila pendiente
  await svc.from('user_empleadores').upsert({
    auth_user_id: linkData.user.id,
    empleador_id: empleadorId,
    rol: 'viewer',
    etiqueta,
    permisos,
    estado: 'pendiente',
    invitacion_email: email,
    created_by: user.id,
  }, { onConflict: 'auth_user_id,empleador_id' });

  const activationUrl = linkData.properties.action_link;
  const tpl = emailInvitacionHogar({ nombreInvitante, etiqueta, activationUrl });
  const emailResult = await sendEmail({ ...tpl, to: email });

  const res = NextResponse.json({ ok: true, modo: 'invitacion_enviada', emailOk: emailResult.ok, emailError: emailResult.error });
  cookiesToSet.forEach(({ name, value, options }) => res.cookies.set(name, value, options));
  return res;
}
