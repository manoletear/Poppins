import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // API routes and auth routes - no middleware needed
  if (pathname.startsWith('/api/') || pathname.startsWith('/auth/')) {
    return NextResponse.next();
  }

  // Create Supabase client
  let response = NextResponse.next({
    request: { headers: request.headers },
  });

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
            request.cookies.set(name, value);
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  // ── Landing page (/) ──
  if (pathname === '/') {
    if (!user) {
      // Not logged in → go to login
      return NextResponse.redirect(new URL('/auth/login', request.url));
    }

    // Logged in → redirect to their portal
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('rol')
      .eq('auth_user_id', user.id)
      .single();

    const redirectMap: Record<string, string> = {
      admin: '/admin',
      empleador: '/empresa',
      empleado: '/portal',
    };
    const dest = redirectMap[profile?.rol || ''] || '/empresa';
    return NextResponse.redirect(new URL(dest, request.url));
  }

  // ── Protected routes ──
  if (!user) {
    return NextResponse.redirect(new URL('/auth/login', request.url));
  }

  // ── Role-based access control ──
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('rol')
    .eq('auth_user_id', user.id)
    .single();

  if (profile?.rol) {
    const rol = profile.rol;

    const roleAccess: Record<string, string[]> = {
      admin: ['/admin', '/dashboard', '/empresa', '/portal'],
      empleador: ['/empresa', '/dashboard'],
      empleado: ['/portal'],
    };

    const allowed = roleAccess[rol] || [];
    const hasAccess = allowed.some(prefix => pathname.startsWith(prefix));

    if (!hasAccess) {
      const redirectMap: Record<string, string> = {
        admin: '/admin',
        empleador: '/empresa',
        empleado: '/portal',
      };
      return NextResponse.redirect(new URL(redirectMap[rol] || '/auth/login', request.url));
    }
  }

  return response;
}

export const config = {
  matcher: [
    '/',
    '/dashboard/:path*',
    '/empresa/:path*',
    '/portal/:path*',
    '/admin/:path*',
  ],
};
