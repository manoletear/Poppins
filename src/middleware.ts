import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

const ROLE_REDIRECT: Record<string, string> = {
  admin: '/admin',
  empleador: '/empresa',
  empleado: '/portal',
};

const ROLE_ACCESS: Record<string, string[]> = {
  admin: ['/admin', '/dashboard', '/empresa', '/portal'],
  empleador: ['/empresa', '/dashboard'],
  empleado: ['/portal'],
};

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Public routes - skip entirely
  if (pathname.startsWith('/auth/') || pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  let response = NextResponse.next({ request: { headers: request.headers } });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookies) => cookies.forEach(({ name, value, options }) => {
          request.cookies.set(name, value);
          response.cookies.set(name, value, options);
        }),
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    if (pathname === '/') return NextResponse.redirect(new URL('/auth/login', request.url));
    return NextResponse.redirect(new URL('/auth/login', request.url));
  }

  // Single profile query - used for both landing redirect and role check
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('rol')
    .eq('auth_user_id', user.id)
    .single();

  const rol = profile?.rol || 'empleador';
  const dest = ROLE_REDIRECT[rol] || '/empresa';

  // Landing → redirect to portal
  if (pathname === '/') {
    return NextResponse.redirect(new URL(dest, request.url));
  }

  // Role-based access check
  const allowed = ROLE_ACCESS[rol] || [];
  if (!allowed.some(prefix => pathname.startsWith(prefix))) {
    return NextResponse.redirect(new URL(dest, request.url));
  }

  return response;
}

export const config = {
  matcher: ['/', '/dashboard/:path*', '/empresa/:path*', '/portal/:path*', '/admin/:path*'],
};
