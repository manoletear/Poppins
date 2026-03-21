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

  // Create response first (needed for cookie setting)
  const redirectResponse = NextResponse.redirect(`${siteUrl}/empresa`);

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            redirectResponse.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  try {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (error || !data.user) {
      console.error('OAuth exchange error:', error?.message);
      return NextResponse.redirect(`${siteUrl}/auth/login?error=exchange_failed`);
    }

    // Wait a moment for the trigger to create the profile
    await new Promise(resolve => setTimeout(resolve, 500));

    // Check profile for role-based redirect
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

    // Create a new redirect with the correct URL and cookies
    const finalResponse = NextResponse.redirect(`${siteUrl}${dest}`);

    // Copy cookies from the exchange response
    redirectResponse.cookies.getAll().forEach(cookie => {
      finalResponse.cookies.set(cookie.name, cookie.value);
    });

    return finalResponse;
  } catch (e) {
    console.error('Callback error:', e);
    return NextResponse.redirect(`${siteUrl}/auth/login?error=callback_error`);
  }
}
