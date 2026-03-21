import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Public routes - no auth needed
  if (
    pathname === '/' ||
    pathname.startsWith('/auth/') ||
    pathname.startsWith('/api/')
  ) {
    return NextResponse.next();
  }

  // Check for auth session
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

  // Not authenticated → redirect to login
  if (!user) {
    const loginUrl = new URL('/auth/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Check role-based access
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('rol')
    .eq('auth_user_id', user.id)
    .single();

  if (profile?.rol) {
    const rol = profile.rol;

    // Role → allowed paths
    const roleAccess: Record<string, string[]> = {
      admin: ['/admin', '/dashboard', '/empresa', '/portal'], // admin can access everything
      empleador: ['/empresa', '/dashboard'],
      empleado: ['/portal'],
    };

    const allowed = roleAccess[rol] || [];
    const hasAccess = allowed.some(prefix => pathname.startsWith(prefix));

    if (!hasAccess) {
      // Redirect to their correct portal
      const redirectMap: Record<string, string> = {
        admin: '/admin',
        empleador: '/empresa',
        empleado: '/portal',
      };
      return NextResponse.redirect(new URL(redirectMap[rol] || '/', request.url));
    }
  }

  return response;
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/empresa/:path*',
    '/portal/:path*',
    '/admin/:path*',
  ],
};
