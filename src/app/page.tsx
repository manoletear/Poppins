'use client';

import { useEffect } from 'react';
import { useAuth } from '@/lib/auth/context';
import { getRedirectForRole } from '@/lib/auth/helpers';
import { useRouter } from 'next/navigation';

export default function Home() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();

  // Redirect logged-in users to their portal
  useEffect(() => {
    if (!loading && user && profile) {
      router.replace(getRedirectForRole(profile.rol));
    }
  }, [loading, user, profile, router]);

  // Load the original landing page bundle
  useEffect(() => {
    // Inject CSS
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = '/landing/assets/index-CTwfptOR.css';
    link.id = 'landing-css';
    document.head.appendChild(link);

    // Inject JS bundle (React + Framer Motion + full landing)
    const script = document.createElement('script');
    script.type = 'module';
    script.src = '/landing/assets/index-Z8XIpR4j.js';
    script.id = 'landing-js';
    document.body.appendChild(script);

    // Intercept CTA clicks to redirect to auth
    const interceptCTAs = () => {
      const allElements = document.querySelectorAll('a, button');
      allElements.forEach((el) => {
        const text = (el.textContent || '').toLowerCase().trim();
        if (
          text.includes('comenzar') ||
          text.includes('crear mi contrato') ||
          text.includes('empieza ahora') ||
          text.includes('formaliza ahora')
        ) {
          el.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            window.location.href = '/auth/register';
          }, { capture: true });
          if (el.tagName === 'A') {
            (el as HTMLAnchorElement).href = '/auth/register';
          }
        }
        // "Iniciar Sesión" links
        if (text.includes('iniciar') || text.includes('ingresar')) {
          el.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            window.location.href = '/auth/login';
          }, { capture: true });
          if (el.tagName === 'A') {
            (el as HTMLAnchorElement).href = '/auth/login';
          }
        }
      });
    };

    // Observe DOM changes (React renders asynchronously)
    const observer = new MutationObserver(() => {
      interceptCTAs();
    });

    const root = document.getElementById('root');
    if (root) {
      observer.observe(root, { childList: true, subtree: true });
    }

    // Also run after a delay as fallback
    const timer = setTimeout(interceptCTAs, 2000);

    return () => {
      observer.disconnect();
      clearTimeout(timer);
      document.getElementById('landing-css')?.remove();
      document.getElementById('landing-js')?.remove();
    };
  }, []);

  // Show redirect overlay for logged-in users
  if (!loading && user && profile) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-white">
        <p className="text-sm text-zinc-500">Redirigiendo a tu portal...</p>
      </div>
    );
  }

  // The Vite/React landing app renders into #root
  return <div id="root" />;
}
