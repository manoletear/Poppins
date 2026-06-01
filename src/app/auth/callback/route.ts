import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin;

  if (!code) {
    return NextResponse.redirect(`${siteUrl}/auth/login?error=no_code`);
  }

  const response = NextResponse.redirect(`${siteUrl}/empresa`);

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookies) => cookies.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        }),
      },
    }
  );

  try {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (error || !data.user) {
      const detail = error?.message || 'no_user';
      return NextResponse.redirect(`${siteUrl}/auth/login?error=exchange_failed&detail=${encodeURIComponent(detail)}`);
    }

    // Try to get profile (trigger may have created it already)
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('rol')
      .eq('auth_user_id', data.user.id)
      .single();

    const redirectMap: Record<string, string> = {
      admin: '/admin',
      empleador: '/empresa',
      empleado: '/portal',
    };

    const dest = redirectMap[profile?.rol || ''] || '/empresa';
    const finalResponse = NextResponse.redirect(`${siteUrl}${dest}`);
    response.cookies.getAll().forEach(c => finalResponse.cookies.set(c.name, c.value));
    return finalResponse;
  } catch (e) {
    const detail = e instanceof Error ? e.message : 'unknown';
    return NextResponse.redirect(`${siteUrl}/auth/login?error=callback_error&detail=${encodeURIComponent(detail)}`);
  }
}
