import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { createClient as createServiceClient } from '@supabase/supabase-js';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin;

  if (!code) {
    return NextResponse.redirect(`${siteUrl}/auth/login?error=no_code`);
  }

  // Acumulamos las cookies de sesión (con sus opciones completas) que setea
  // exchangeCodeForSession, y las aplicamos al response final preservando
  // Max-Age/Path/HttpOnly/Secure/SameSite (si se copian sin opciones, la sesión
  // no persiste y el login entra en loop).
  const cookiesToSet: { name: string; value: string; options: Record<string, unknown> }[] = [];

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookies) => cookies.forEach((c) => cookiesToSet.push(c as typeof cookiesToSet[number])),
      },
    }
  );

  try {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (error || !data.user) {
      const detail = error?.message || 'no_user';
      return NextResponse.redirect(`${siteUrl}/auth/login?error=exchange_failed&detail=${encodeURIComponent(detail)}`);
    }

    // Si el usuario fue invitado a un hogar, activar la membresía
    const meta = data.user.user_metadata as Record<string, unknown> | undefined;
    const invEmpleadorId = meta?.empleador_id as string | undefined;
    if (invEmpleadorId) {
      const svc = createServiceClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );
      await svc
        .from('user_empleadores')
        .upsert(
          { auth_user_id: data.user.id, empleador_id: invEmpleadorId, rol: 'empleado', estado: 'activo' },
          { onConflict: 'auth_user_id,empleador_id' }
        );

      // Asegurarse de que active_empleador_id está set para que el hogar cargue
      await svc
        .from('user_profiles')
        .update({ active_empleador_id: invEmpleadorId, onboarding_completado: true })
        .eq('auth_user_id', data.user.id)
        .is('active_empleador_id', null);
    }

    // Try to get profile (trigger may have created it already)
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('rol')
      .eq('auth_user_id', data.user.id)
      .single();

    const redirectMap: Record<string, string> = {
      admin: '/admin',
      empleador: '/hogar',
      empleado: '/portal',
    };

    const dest = redirectMap[profile?.rol || ''] || '/hogar';
    const finalResponse = NextResponse.redirect(`${siteUrl}${dest}`);
    cookiesToSet.forEach(({ name, value, options }) => finalResponse.cookies.set(name, value, options));
    return finalResponse;
  } catch (e) {
    const detail = e instanceof Error ? e.message : 'unknown';
    return NextResponse.redirect(`${siteUrl}/auth/login?error=callback_error&detail=${encodeURIComponent(detail)}`);
  }
}
