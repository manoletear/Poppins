'use client';

import { useEffect } from 'react';
import { useAuth } from '@/lib/auth/context';
import { getRedirectForRole } from '@/lib/auth/helpers';
import { useRouter } from 'next/navigation';

export default function Home() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();

  // If logged in, redirect to portal
  useEffect(() => {
    if (!loading && user && profile) {
      router.replace(getRedirectForRole(profile.rol));
    }
  }, [loading, user, profile, router]);

  // While checking auth, show the landing immediately (no blank screen)
  return (
    <>
      {/* Auth redirect overlay - only shows briefly for logged-in users */}
      {!loading && user && profile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-white">
          <div className="text-center">
            <p className="text-sm text-zinc-500">Redirigiendo a tu portal...</p>
          </div>
        </div>
      )}

      {/* Landing page - Vite React SPA */}
      <div id="landing-root">
        <LandingPage />
      </div>
    </>
  );
}

function LandingPage() {
  useEffect(() => {
    // Inject the landing CSS
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = '/landing/assets/index-CTwfptOR.css';
    document.head.appendChild(link);

    // Inject the landing JS bundle
    const script = document.createElement('script');
    script.type = 'module';
    script.src = '/landing/assets/index-Z8XIpR4j.js';
    document.body.appendChild(script);

    // Override CTA links after the landing renders
    const observer = new MutationObserver(() => {
      // Find all links/buttons with CTA text and redirect to auth
      const allLinks = document.querySelectorAll('a, button');
      allLinks.forEach((el) => {
        const text = el.textContent?.toLowerCase() || '';
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
          });
          if (el.tagName === 'A') {
            (el as HTMLAnchorElement).href = '/auth/register';
          }
        }
      });
    });

    // Observe the root div for changes (when React renders the landing)
    const root = document.getElementById('root');
    if (root) {
      observer.observe(root, { childList: true, subtree: true });
    }

    return () => {
      observer.disconnect();
      link.remove();
      script.remove();
    };
  }, []);

  // The Vite landing app renders into #root
  return <div id="root" />;
}
