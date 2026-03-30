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

    // Inject responsive overrides
    const style = document.createElement('style');
    style.id = 'landing-responsive-fixes';
    style.textContent = `
      /* ===== MOBILE RESPONSIVE FIXES ===== */
      #root { overflow-x: hidden; }

      @media (max-width: 768px) {
        /* Hero text containment */
        #root h1 {
          font-size: 1.75rem !important;
          line-height: 1.3 !important;
          padding: 0 1rem !important;
          word-break: break-word;
        }
        #root h2 {
          font-size: 1.5rem !important;
          padding: 0 0.5rem !important;
        }
        #root p {
          padding-left: 1rem !important;
          padding-right: 1rem !important;
        }

        /* Cards grid → single column */
        #root [class*="grid-cols-3"],
        #root [class*="grid-cols-2"] {
          grid-template-columns: 1fr !important;
          gap: 1rem !important;
          padding: 0 1rem !important;
        }

        /* Cards containment */
        #root [class*="rounded"] {
          max-width: 100% !important;
          overflow: hidden;
        }

        /* Tabs wrap */
        #root [role="tablist"],
        #root .flex.gap-2,
        #root .flex.gap-3 {
          flex-wrap: wrap !important;
          justify-content: center !important;
        }

        /* Container padding */
        #root section {
          padding-left: 1rem !important;
          padding-right: 1rem !important;
          overflow: hidden;
        }
        #root > div {
          overflow-x: hidden;
          max-width: 100vw;
        }

        /* Navbar mobile fix */
        #root nav {
          padding: 0.75rem 1rem !important;
        }

        /* CTA buttons full width */
        #root a[class*="rounded-full"],
        #root button[class*="rounded-full"] {
          max-width: calc(100vw - 2rem);
        }

        /* Testimonial cards */
        #root [class*="shadow"] {
          margin-left: 0 !important;
          margin-right: 0 !important;
        }

        /* Steps horizontal → vertical */
        #root [class*="md\\:grid-cols-3"] {
          grid-template-columns: 1fr !important;
        }

        /* Footer links wrap */
        #root footer .flex {
          flex-wrap: wrap !important;
          gap: 0.75rem !important;
          justify-content: center !important;
        }

        /* Orbital/diagram containment */
        #root [class*="relative"][class*="h-"] {
          max-width: 100% !important;
          transform: scale(0.85);
        }
      }

      @media (max-width: 480px) {
        #root h1 {
          font-size: 1.5rem !important;
        }
        #root h2 {
          font-size: 1.25rem !important;
        }
      }
    `;
    document.head.appendChild(style);

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
      document.getElementById('landing-responsive-fixes')?.remove();
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
