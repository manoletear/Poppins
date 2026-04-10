import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

const ROLE_REDIRECT: Record<string, string> = {
  admin: '/admin',
  empleador: '/empresa',
  empleado: '/portal',
};

const ROLE_ACCESS: Record<string, string[]> = {
  admin: ['/admin', '/empresa', '/portal'],
  empleador: ['/empresa'],
  empleado: ['/portal'],
};

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Public routes - skip entirely
  if (pathname === '/' || pathname.startsWith('/auth/') || pathname.startsWith('/api/') || pathname.startsWith('/landing/')) {
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
    return NextResponse.redirect(new URL('/auth/login', request.url));
  }

  // Single profile query - used for both landing redirect and role check
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('rol, onboarding_completado')
    .eq('auth_user_id', user.id)
    .single();

  const rol = profile?.rol || 'empleador';
  const dest = ROLE_REDIRECT[rol] || '/empresa';

  // Role-based access check
  const allowed = ROLE_ACCESS[rol] || [];
  if (!allowed.some(prefix => pathname.startsWith(prefix))) {
    return NextResponse.redirect(new URL(dest, request.url));
  }

  // Onboarding redirect - if not completed, send to onboarding page
  const onboardingCompleted = profile?.onboarding_completado ?? false;
  if (!onboardingCompleted) {
    const onboardingPaths: Record<string, string> = {
      empleador: '/empresa/onboarding',
      empleado: '/portal/onboarding',
    };
    const onboardingPath = onboardingPaths[rol];
    // Don't redirect if already on onboarding or completar-hogar page
    const allowedDuringOnboarding = [onboardingPath, '/empresa/completar-hogar'];
    if (onboardingPath && !allowedDuringOnboarding.some(p => p && pathname.startsWith(p))) {
      return NextResponse.redirect(new URL(onboardingPath, request.url));
    }
  }

  return response;
}

export const config = {
  matcher: ['/', '/empresa/:path*', '/portal/:path*', '/admin/:path*'],
};
