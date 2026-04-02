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

  useEffect(() => {
    // Dynamic URL handling for Login button
    const ERP_URL = 'https://poppins-erp-2026.vercel.app';
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const base = isLocal ? '' : ERP_URL;
    const btn = document.getElementById('btn-login');
    if (btn) (btn as HTMLAnchorElement).href = base + '/auth/login';

    // Scroll to contact form logic (if shared buttons exist)
    const ctaLinks = document.querySelectorAll('a[href^="#"]');
    ctaLinks.forEach(link => {
      link.addEventListener('click', (e) => {
        const href = link.getAttribute('href');
        if (href && href.startsWith('#')) {
          e.preventDefault();
          const target = document.querySelector(href);
          if (target) {
            target.scrollIntoView({ behavior: 'smooth' });
          }
        }
      });
    });
  }, []);

  if (loading) return null; // or a minimal loading state

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        :root {
          --navy: #1a1a6e;
          --navy-dark: #13135a;
          --pink: #e91e8c;
          --pink-light: #f06cb8;
          --bg: #f5f5ff;
          --white: #ffffff;
          --text: #1a1a6e;
          --gray: #6b7280;
          --border: #e5e7eb;
        }
        body {
          font-family: 'Nunito', sans-serif;
          color: var(--text);
          background: var(--white);
        }
        nav { background: var(--navy); padding: 0 40px; height: 60px; display: flex; align-items: center; justify-content: space-between; position: sticky; top: 0; z-index: 100; }
        .logo { display: flex; align-items: center; gap: 10px; color: var(--white); text-decoration: none; }
        .logo-icon { width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; }
        .logo-text { display: flex; flex-direction: column; line-height: 1.1; }
        .logo-text strong { font-size: 18px; font-weight: 800; color: var(--pink); }
        .logo-text span { font-size: 9px; letter-spacing: 1.5px; opacity: 0.8; text-transform: uppercase; }
        .nav-links { display: flex; gap: 32px; list-style: none; }
        .nav-links a { color: rgba(255,255,255,0.9); text-decoration: none; font-size: 14px; font-weight: 600; transition: color .2s; }
        .nav-links a:hover { color: var(--pink-light); }
        .nav-actions { display: flex; gap: 12px; align-items: center; }
        .btn-outline-white { border: 1.5px solid rgba(255,255,255,0.6); background: transparent; color: var(--white); padding: 8px 20px; border-radius: 30px; font-size: 13px; font-weight: 700; cursor: pointer; transition: all .2s; }
        .btn-outline-white:hover { background: rgba(255,255,255,0.1); }
        .btn-pink { background: var(--pink); color: var(--white); border: none; padding: 10px 20px; border-radius: 30px; font-size: 13px; font-weight: 700; cursor: pointer; transition: background .2s; }
        .btn-pink:hover { background: #c9177a; }
        .hero { background: var(--bg); padding: 30px 80px 60px; display: grid; grid-template-columns: 1fr 1fr; gap: 40px; align-items: center; min-height: 560px; }
        .hero-content h1 { font-size: 38px; font-weight: 900; color: var(--navy); line-height: 1.2; margin-bottom: 14px; }
        .hero-content .subtitle-pink { color: var(--pink); font-size: 17px; font-weight: 700; margin-bottom: 6px; }
        .hero-content .subtitle-gray { color: var(--gray); font-size: 14px; margin-bottom: 28px; }
        .hero-bullets { list-style: none; margin-bottom: 32px; display: flex; flex-direction: column; gap: 10px; }
        .hero-bullets li { display: flex; align-items: center; gap: 12px; font-size: 14px; font-weight: 600; color: var(--navy); }
        .bullet-icon { width: 28px; height: 28px; background: var(--pink); border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .bullet-icon svg { width: 14px; height: 14px; fill: white; }
        .hero-form { display: flex; gap: 12px; align-items: center; }
        .btn-pink-arrow { background: var(--pink); color: var(--white); border: none; padding: 12px 22px; border-radius: 30px; font-size: 13px; font-weight: 700; cursor: pointer; transition: background .2s; white-space: nowrap; }
        .btn-pink-arrow:hover { background: #c9177a; }
        .hero-phone { display: flex; justify-content: center; align-items: center; }
        @keyframes held { 0% { transform: rotate(-14deg) translateY(0px) translateX(0px); } 20% { transform: rotate(-11.5deg) translateY(-9px) translateX(4px); } 50% { transform: rotate(-16deg) translateY(-15px) translateX(-2px); } 75% { transform: rotate(-12deg) translateY(-6px) translateX(2px); } 100% { transform: rotate(-14deg) translateY(0px) translateX(0px); } }
        @keyframes shadow-anim { 0% { transform: translateX(-50%) scaleX(1) scaleY(1); opacity:.22; } 50% { transform: translateX(-55%) scaleX(.78) scaleY(.65); opacity:.12; } 100% { transform: translateX(-50%) scaleX(1) scaleY(1); opacity:.22; } }
        .pwrap { animation: held 5.5s cubic-bezier(.45,.05,.55,.95) infinite; transform-origin: 50% 84%; position: relative; display: inline-block; }
        .pshad { position: absolute; bottom: -22px; left: 50%; width: 200px; height: 22px; background: #000; border-radius: 50%; animation: shadow-anim 5.5s cubic-bezier(.45,.05,.55,.95) infinite; }
        .screen-scroll { width: 100%; height: 100%; overflow-y: auto; overflow-x: hidden; background: #f2f2f7; scrollbar-width: none; }
        .screen-scroll::-webkit-scrollbar { display: none; }
        .scard { background: #fff; border-radius: 11px; padding: 9px 10px; }
        section { padding: 70px 80px; }
        .section-title { font-size: 26px; font-weight: 900; color: var(--navy); text-align: center; margin-bottom: 12px; }
        .section-subtitle { text-align: center; color: var(--gray); font-size: 14px; margin-bottom: 40px; }
        .como-funciona { background: var(--bg); }
        .como-funciona .section-subtitle { max-width: 800px; margin: 0 auto 16px; }
        .como-funciona .highlight { text-align: center; color: var(--pink); font-weight: 800; font-size: 16px; margin-bottom: 44px; }
        .features-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; }
        .feature-card { background: var(--white); border-radius: 16px; padding: 32px 24px; text-align: center; border: 1px solid var(--border); }
        .feature-icon { width: 56px; height: 56px; background: #fff0f8; border-radius: 14px; display: flex; align-items: center; justify-content: center; margin: 0 auto 18px; }
        .feature-icon svg { width: 28px; height: 28px; }
        .feature-card h3 { font-size: 15px; font-weight: 800; color: var(--navy); margin-bottom: 10px; }
        .feature-card p { font-size: 13px; color: var(--gray); line-height: 1.6; }
        .capacitaciones { background: var(--white); }
        .cap-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; }
        .cap-card { border: 1px solid var(--border); border-radius: 16px; padding: 36px 24px; text-align: center; transition: box-shadow .2s; }
        .cap-card:hover { box-shadow: 0 4px 20px rgba(26,26,110,0.08); }
        .cap-icon { width: 50px; height: 50px; display: flex; align-items: center; justify-content: center; margin: 0 auto 18px; }
        .cap-icon svg { width: 30px; height: 30px; stroke: var(--navy); fill: none; stroke-width: 1.5; }
        .cap-card h3 { font-size: 14px; font-weight: 800; color: var(--navy); line-height: 1.4; }
        .cap-banner { background: var(--bg); padding: 50px 80px; display: grid; grid-template-columns: 1fr 3fr; gap: 40px; align-items: center; border-top: 1px solid var(--border); border-bottom: 1px solid var(--border); }
        .cap-banner-left h2 { font-size: 24px; font-weight: 900; color: var(--navy); margin-bottom: 10px; }
        .cap-banner-left p { font-size: 13px; color: var(--gray); margin-bottom: 16px; }
        .cap-banner-right { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
        .cap-mini { text-align: center; }
        .cap-mini svg { width: 28px; height: 28px; stroke: var(--navy); fill: none; stroke-width: 1.5; margin-bottom: 10px; }
        .cap-mini p { font-size: 12px; font-weight: 700; color: var(--navy); line-height: 1.4; }
        .cap-footer-text { text-align: center; font-size: 12px; color: var(--gray); margin-top: 12px; }
        .testimonios { background: var(--navy); padding: 70px 80px; }
        .testimonios .section-title { color: var(--white); }
        .testimonios .section-subtitle { color: rgba(255,255,255,0.7); }
        .reviews-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-top: 36px; }
        .review-card { background: rgba(255,255,255,0.07); border: 1px solid rgba(255,255,255,0.12); border-radius: 16px; padding: 24px; }
        .review-header { display: flex; align-items: center; gap: 12px; margin-bottom: 14px; }
        .avatar { width: 42px; height: 42px; border-radius: 50%; background: rgba(255,255,255,0.15); display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 13px; color: white; flex-shrink: 0; }
        .reviewer-name { color: var(--white); font-weight: 800; font-size: 15px; }
        .stars { color: var(--pink); font-size: 16px; letter-spacing: 1px; }
        .review-text { color: rgba(255,255,255,0.85); font-size: 13px; line-height: 1.6; }
        .contacto { background: var(--bg); padding: 80px 80px; }
        .hs-form-frame { max-width: 800px; margin: 0 auto; min-height: 480px; background: white; border-radius: 16px; padding: 20px; box-shadow: 0 4px 20px rgba(0,0,0,0.05); }
        .planes { background: var(--white); }
        .planes-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; margin-bottom: 36px; }
        .plan-card { border: 1.5px solid var(--border); border-radius: 16px; padding: 28px 24px; text-align: center; position: relative; }
        .plan-card.featured { border-color: var(--pink); box-shadow: 0 4px 20px rgba(233,30,140,0.1); }
        .plan-brand { font-size: 15px; font-weight: 800; margin-bottom: 14px; }
        .plan-brand.tenpo { color: #0070f3; }
        .plan-brand.santander { color: #003087; }
        .plan-brand.cencosud { color: #e31837; }
        .plan-card h3 { font-size: 16px; font-weight: 900; color: var(--navy); margin-bottom: 12px; line-height: 1.3; }
        .plan-card p { font-size: 12px; color: var(--gray); line-height: 1.6; margin-bottom: 16px; }
        .btn-outline-navy { border: 1.5px solid var(--navy); background: transparent; color: var(--navy); padding: 9px 20px; border-radius: 30px; font-size: 12px; font-weight: 700; cursor: pointer; transition: all .2s; }
        .btn-outline-navy:hover { background: var(--navy); color: white; }
        .btn-outline-gray { border: 1.5px solid var(--border); background: #f9f9f9; color: var(--gray); padding: 9px 20px; border-radius: 30px; font-size: 12px; font-weight: 700; cursor: pointer; }
        .planes-cta { text-align: center; }
        .btn-outline-dark { border: 2px solid var(--navy); background: transparent; color: var(--navy); padding: 12px 30px; border-radius: 30px; font-size: 14px; font-weight: 700; cursor: pointer; transition: all .2s; }
        .btn-outline-dark:hover { background: var(--navy); color: white; }
        .faq { background: var(--white); padding-top: 0; }
        .faq-list { max-width: 900px; margin: 0 auto; }
        .faq-item { border-bottom: 1px solid var(--border); padding: 18px 0; display: flex; align-items: center; justify-content: space-between; gap: 16px; cursor: pointer; }
        .faq-left { display: flex; align-items: center; gap: 14px; }
        .faq-icon { color: var(--pink); font-size: 18px; width: 24px; text-align: center; }
        .faq-q { font-size: 14px; font-weight: 700; color: var(--navy); }
        .faq-chevron { color: var(--pink); font-size: 18px; }
        .cta-banner { background: var(--navy); padding: 50px 80px; text-align: center; }
        .cta-banner h2 { font-size: 26px; font-weight: 900; color: white; margin-bottom: 10px; }
        .cta-banner p { color: rgba(255,255,255,0.75); font-size: 14px; margin-bottom: 20px; }
        .btn-outline-white-lg { border: 1.5px solid rgba(255,255,255,0.5); background: transparent; color: white; padding: 12px 28px; border-radius: 30px; font-size: 14px; font-weight: 700; cursor: pointer; display: inline-flex; align-items: center; gap: 8px; }
        .email-bottom { padding: 50px 80px; text-align: center; background: white; position: relative; }
        .email-bottom p { font-size: 13px; color: var(--gray); margin-bottom: 16px; }
        footer { background: var(--white); border-top: 1px solid var(--border); padding: 24px 80px; text-align: center; }
        .payment-badges { display: flex; justify-content: center; gap: 10px; margin-bottom: 12px; }
        .badge { padding: 6px 14px; border-radius: 6px; font-size: 12px; font-weight: 800; color: white; }
        .badge.visa { background: #1a1f71; }
        .badge.mc { background: #eb001b; }
        .badge.amex { background: #016fd0; }
        footer p { font-size: 12px; color: var(--gray); }

        @media (max-width: 768px) {
          .hero { grid-template-columns: 1fr; padding: 20px 20px 40px; text-align: center; }
          .hero-bullets li { justify-content: center; }
          .hero-form { justify-content: center; }
          .features-grid, .cap-grid, .planes-grid, .reviews-grid { grid-template-columns: 1fr; }
          section, footer, .cta-banner { padding: 40px 20px; }
          .nav-links { display: none; }
          .cap-banner { grid-template-columns: 1fr; padding: 40px 20px; }
          .cap-banner-right { grid-template-columns: 1fr; }
        }
      ` }} />

      <nav>
        <a href="#" className="logo">
          <div className="logo-icon">
            <img src="/logo-umbrella.svg" alt="Poppins Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          </div>
          <div className="logo-text">
            <strong>Poppins</strong>
            <span>Magia en tu casa</span>
          </div>
        </a>
        <ul className="nav-links">
          <li><a href="#beneficios">Beneficios</a></li>
          <li><a href="#como">Cómo funciona</a></li>
          <li><a href="#planes">Nuestros Planes</a></li>
        </ul>
        <div className="nav-actions">
          <a href="/auth/login" id="btn-login" className="btn-outline-white" style={{ textDecoration: 'none' }}>Iniciar sesión</a>
          <a href="#contactanos" className="btn-pink" style={{ textDecoration: 'none' }}>Quiero la magia en mi casa</a>
        </div>
      </nav>

      <section className="hero" id="beneficios">
        <div className="hero-content">
          <h1>Poppins es la primera plataforma de administración del hogar en Latinoamérica.</h1>
          <p className="subtitle-pink">Centraliza todos los pagos y gastos de tu casa en un solo lugar.</p>
          <p className="subtitle-gray">El sueldo de tu nana, jardinero, piscinero y próximamente mucho más.</p>
          <ul className="hero-bullets">
            <li><div className="bullet-icon"><svg viewBox="0 0 24 24"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5z"/></svg></div>Gestión eficiente de relaciones laborales. (incluye sueldos y cotizaciones)</li>
            <li><div className="bullet-icon"><svg viewBox="0 0 24 24"><path d="M7 18c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2-.9-2-2-2zM1 2v2h2l3.6 7.59-1.35 2.45c-.16.28-.25.61-.25.96C5 16.1 6.1 17 7.5 17H19v-2H7.42c-.14 0-.25-.11-.25-.25l.03-.12.9-1.63H15.5c.75 0 1.41-.41 1.75-1.03l3.58-6.49A1 1 0 0 0 19.96 4H5.21l-.94-2H1zm16 16c-1.1 0-1.99.9-1.99 2s.89 2 1.99 2 2-.9 2-2-.9-2-2-2z"/></svg></div>Control total de tus gastos domésticos.</li>
            <li><div className="bullet-icon"><svg viewBox="0 0 24 24"><path d="M20 3h-1V1h-2v2H7V1H5v2H4c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 18H4V8h16v13z"/></svg></div>Olvida los pagos atrasados y el estrés organizativo.</li>
          </ul>
          <div className="hero-form">
            <a href="#contactanos" className="btn-pink-arrow" style={{ textDecoration: 'none' }}>Quiero la magia en mi casa →</a>
          </div>
        </div>

        <div className="hero-phone">
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '70px 20px 100px', minHeight: '780px' }}>
            <div className="pwrap">
              <div style={{ position: 'relative', width: '268px', height: '578px', borderRadius: '48px', background: 'linear-gradient(162deg, rgba(120,120,128,.9) 0%, #242426 6%, #1a1a1c 18%, #0d0d0f 40%, #131315 58%, #1e1e20 78%, #2a2a2c 90%, rgba(100,100,108,.7) 100%)', boxShadow: 'inset 0 0 0 .5px rgba(255,255,255,.18), inset 0 1px 0 rgba(255,255,255,.08), 0 0 0 .5px rgba(0,0,0,.95), 0 30px 70px rgba(0,0,0,.55), 0 8px 20px rgba(0,0,0,.4)' }}>
                {/* Buttons */}
                <div style={{ position: 'absolute', left: '-3.5px', top: '86px', width: '3.5px', height: '28px', background: 'linear-gradient(to right,#5a5a5e,#2c2c2e)', borderRadius: '2px 0 0 2px', boxShadow: '-1px 0 2px rgba(0,0,0,.6)' }}></div>
                <div style={{ position: 'absolute', left: '-3.5px', top: '128px', width: '3.5px', height: '54px', background: 'linear-gradient(to right,#5a5a5e,#2c2c2e)', borderRadius: '2px 0 0 2px', boxShadow: '-1px 0 2px rgba(0,0,0,.6)' }}></div>
                <div style={{ position: 'absolute', left: '-3.5px', top: '194px', width: '3.5px', height: '54px', background: 'linear-gradient(to right,#5a5a5e,#2c2c2e)', borderRadius: '2px 0 0 2px', boxShadow: '-1px 0 2px rgba(0,0,0,.6)' }}></div>
                <div style={{ position: 'absolute', right: '-3.5px', top: '150px', width: '3.5px', height: '76px', background: 'linear-gradient(to left,#5a5a5e,#2c2c2e)', borderRadius: '0 2px 2px 0', boxShadow: '1px 0 2px rgba(0,0,0,.6)' }}></div>

                <div style={{ position: 'absolute', inset: '13px', borderRadius: '36px', overflow: 'hidden', background: '#000', boxShadow: 'inset 0 0 0 1px rgba(0,0,0,.8), inset 0 0 0 .5px rgba(255,255,255,.03)' }}>
                  <div className="screen-scroll">
                    <div style={{ height: '16px', background: '#fff', flexShrink: 0 }}></div>
                    <div style={{ background: '#fff', padding: '0 14px 12px', flexShrink: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <div style={{ fontSize: '11px', fontWeight: 700, color: '#111', fontFamily: 'sans-serif' }}>Buenas tardes, María</div>
                          <div style={{ fontSize: '7px', color: '#8e8e93', marginTop: '1px', fontFamily: 'sans-serif' }}>Miércoles 1 de abril, 2026</div>
                        </div>
                        <div style={{ fontSize: '11px', fontWeight: 700, color: '#111', fontFamily: 'sans-serif' }}>05:47 p.m.</div>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', padding: '0 10px 6px' }}>
                      <div className="scard">
                        <div style={{ fontSize: '7px', color: '#8e8e93', fontFamily: 'sans-serif' }}>Tareas Hoy</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', margin: '3px 0 2px' }}>
                          <div style={{ fontSize: '12px', fontWeight: 700, color: '#111', fontFamily: 'sans-serif' }}>0 de 10</div>
                          <div style={{ width: '20px', height: '20px', borderRadius: '50%', border: '2.5px solid #e5e5ea', flexShrink: 0 }}></div>
                        </div>
                        <div style={{ fontSize: '7px', color: '#FF2D55', fontFamily: 'sans-serif' }}>10 pendientes</div>
                      </div>
                      <div className="scard">
                        <div style={{ fontSize: '7px', color: '#8e8e93', fontFamily: 'sans-serif' }}>Horas Trabajadas</div>
                        <div style={{ fontSize: '12px', fontWeight: 700, color: '#111', margin: '3px 0 2px', fontFamily: 'sans-serif' }}>0h 00m</div>
                        <div style={{ fontSize: '7px', color: '#34C759', fontFamily: 'sans-serif' }}>Sin marcar</div>
                      </div>
                      <div className="scard">
                        <div style={{ fontSize: '7px', color: '#8e8e93', fontFamily: 'sans-serif' }}>Vacaciones</div>
                        <div style={{ fontSize: '12px', fontWeight: 700, color: '#111', margin: '3px 0 2px', fontFamily: 'sans-serif' }}>8.5</div>
                        <div style={{ fontSize: '7px', color: '#FF9500', fontFamily: 'sans-serif' }}>días disponibles</div>
                      </div>
                      <div className="scard">
                        <div style={{ fontSize: '7px', color: '#8e8e93', fontFamily: 'sans-serif' }}>Sueldo Líquido</div>
                        <div style={{ fontSize: '10.5px', fontWeight: 700, color: '#111', margin: '3px 0 2px', fontFamily: 'sans-serif' }}>$526.550</div>
                        <div style={{ fontSize: '7px', color: '#AF52DE', fontFamily: 'sans-serif' }}>Marzo 2026</div>
                      </div>
                    </div>

                    <div style={{ margin: '0 10px 7px', background: 'linear-gradient(135deg,#e8faf2,#d4f5e7)', borderRadius: '13px', padding: '12px 13px', border: '1px solid #a8e6c8' }}>
                      <div style={{ fontSize: '8px', fontWeight: 700, color: '#1a7a50', marginBottom: '10px', fontFamily: 'sans-serif' }}>Marcaje Rápido</div>
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '9px' }}>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ width: '18px', height: '18px', borderRadius: '50%', background: '#e5e5ea', fontSize: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto', color: '#8e8e93', fontWeight: 600, fontFamily: 'sans-serif' }}>1</div>
                          <div style={{ fontSize: '6px', color: '#8e8e93', marginTop: '3px', fontFamily: 'sans-serif' }}>Entrada</div>
                        </div>
                        <div style={{ flex: 1, height: '1px', background: 'linear-gradient(to right,#b2d8be,#c5e6d0)', margin: '9px 3px 0' }}></div>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ width: '18px', height: '18px', borderRadius: '50%', background: '#e5e5ea', fontSize: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto', color: '#8e8e93', fontWeight: 600, fontFamily: 'sans-serif' }}>2</div>
                          <div style={{ fontSize: '6px', color: '#8e8e93', marginTop: '3px', fontFamily: 'sans-serif' }}>Sal.Col.</div>
                        </div>
                        <div style={{ flex: 1, height: '1px', background: 'linear-gradient(to right,#b2d8be,#c5e6d0)', margin: '9px 3px 0' }}></div>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ width: '18px', height: '18px', borderRadius: '50%', background: '#e5e5ea', fontSize: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto', color: '#8e8e93', fontWeight: 600, fontFamily: 'sans-serif' }}>3</div>
                          <div style={{ fontSize: '6px', color: '#8e8e93', marginTop: '3px', fontFamily: 'sans-serif' }}>Reg.Col.</div>
                        </div>
                        <div style={{ flex: 1, height: '1px', background: 'linear-gradient(to right,#b2d8be,#c5e6d0)', margin: '9px 3px 0' }}></div>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ width: '18px', height: '18px', borderRadius: '50%', background: '#e5e5ea', fontSize: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto', color: '#8e8e93', fontWeight: 600, fontFamily: 'sans-serif' }}>4</div>
                          <div style={{ fontSize: '6px', color: '#8e8e93', marginTop: '3px', fontFamily: 'sans-serif' }}>Salida</div>
                        </div>
                      </div>
                      <div style={{ textAlign: 'center', fontSize: '7px', color: '#1a7a50', marginBottom: '8px', fontFamily: 'sans-serif' }}>Hora actual: 05:47 p.m.</div>
                      <div style={{ background: 'linear-gradient(135deg,#1D9E75,#15825f)', color: '#fff', borderRadius: '10px', padding: '8px', fontSize: '9px', fontWeight: 700, textAlign: 'center', fontFamily: 'sans-serif', letterSpacing: '.2px' }}>Marcar Entrada</div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', padding: '0 10px 7px' }}>
                      <div className="scard">
                        <div style={{ fontSize: '7.5px', fontWeight: 700, color: '#111', fontFamily: 'sans-serif' }}>Mis Tareas de Hoy</div>
                        <div style={{ fontSize: '6.5px', color: '#8e8e93', margin: '3px 0', fontFamily: 'sans-serif' }}>0/10 completadas</div>
                        <div style={{ fontSize: '6.5px', color: '#c7c7cc', textAlign: 'center', padding: '6px 0', fontFamily: 'sans-serif' }}>No hay tareas hoy</div>
                        <div style={{ fontSize: '7px', color: '#34C759', fontFamily: 'sans-serif' }}>Ver todas →</div>
                      </div>
                      <div className="scard">
                        <div style={{ fontSize: '7.5px', fontWeight: 700, color: '#111', fontFamily: 'sans-serif' }}>Próximas Solicitudes</div>
                        <div style={{ fontSize: '6.5px', color: '#444', margin: '4px 0 1px', fontFamily: 'sans-serif' }}>vacaciones</div>
                        <div style={{ fontSize: '6px', color: '#8e8e93', marginBottom: '4px', fontFamily: 'sans-serif' }}>Vacaciones familiares</div>
                        <div style={{ display: 'inline-block', background: '#d1fae5', color: '#065f46', fontSize: '5.5px', padding: '2px 6px', borderRadius: '5px', fontWeight: 700, fontFamily: 'sans-serif' }}>Aprobada</div>
                        <div style={{ fontSize: '7px', color: '#34C759', marginTop: '5px', fontFamily: 'sans-serif' }}>Ver todas →</div>
                      </div>
                    </div>

                    <div style={{ padding: '0 10px 24px' }}>
                      <div style={{ fontSize: '8px', fontWeight: 700, color: '#111', marginBottom: '8px', fontFamily: 'sans-serif' }}>Accesos Directos</div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '6px' }}>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ width: '30px', height: '30px', background: '#e8faf2', borderRadius: '10px', margin: '0 auto 4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#1D9E75" strokeWidth="2.2"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/><line x1="9" y1="12" x2="15" y2="12"/><line x1="9" y1="16" x2="13" y2="16"/></svg>
                          </div>
                          <div style={{ fontSize: '5.5px', color: '#8e8e93', fontFamily: 'sans-serif', lineHeight: 1.3 }}>Nueva Solicitud</div>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ width: '30px', height: '30px', background: '#eef3ff', borderRadius: '10px', margin: '0 auto 4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4f7df3" strokeWidth="2.2"><rect x="3" y="5" width="18" height="14" rx="2"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                          </div>
                          <div style={{ fontSize: '5.5px', color: '#8e8e93', fontFamily: 'sans-serif', lineHeight: 1.3 }}>Ver Liquidación</div>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ width: '30px', height: '30px', background: '#fff8ec', borderRadius: '10px', margin: '0 auto 4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2.2"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg>
                          </div>
                          <div style={{ fontSize: '5.5px', color: '#8e8e93', fontFamily: 'sans-serif', lineHeight: 1.3 }}>Lista de Compras</div>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ width: '30px', height: '30px', background: '#fff0f5', borderRadius: '10px', margin: '0 auto 4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#e5407a" strokeWidth="2.2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
                          </div>
                          <div style={{ fontSize: '5.5px', color: '#8e8e93', fontFamily: 'sans-serif', lineHeight: 1.3 }}>Ayuda Médica</div>
                        </div>
                      </div>
                    </div>

                    <div style={{ height: '6px', background: '#f2f2f7', display: 'flex', justifyContent: 'center', alignItems: 'center', paddingBottom: '8px', paddingTop: '4px' }}>
                      <div style={{ width: '100px', height: '4px', background: '#c7c7cc', borderRadius: '3px' }}></div>
                    </div>
                  </div>

                  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '62px', pointerEvents: 'none', zIndex: 20 }}>
                    <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '14px' }}>
                      <div style={{ width: '112px', height: '32px', background: '#000', borderRadius: '18px', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: '11px' }}>
                        <div style={{ width: '9px', height: '9px', borderRadius: '50%', background: '#1a1a22', border: '1.5px solid #2a2a35', boxShadow: '0 0 0 1px #0a0a12, inset 0 0 3px #000' }}></div>
                      </div>
                    </div>
                  </div>
                  <div style={{ position: 'absolute', inset: 0, borderRadius: '36px', pointerEvents: 'none', zIndex: 25, background: 'linear-gradient(138deg,rgba(255,255,255,.07) 0%,rgba(255,255,255,.025) 28%,transparent 50%)' }}></div>
                </div>
                <div style={{ position: 'absolute', bottom: 0, left: '13px', right: '13px', height: '2px', background: 'linear-gradient(to right,transparent,rgba(255,255,255,.04),transparent)', borderRadius: '0 0 36px 36px', pointerEvents: 'none' }}></div>
              </div>
              <div className="pshad"></div>
            </div>
          </div>
        </div>
      </section>

      <section className="como-funciona" id="como">
        <h2 className="section-title">Cómo funciona Poppins: Automatización y control total de tus pagos del hogar</h2>
        <p className="section-subtitle">Por una tarifa fija, centralizas todo lo que tu casa necesita para administrar gastos y servicios desde un solo lugar...</p>
        <p className="highlight">Una sola app, un sólo pago, cero preocupaciones. Sin olvidos, sin enredos, sin estrés.</p>
        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon"><svg viewBox="0 0 24 24" fill="none" stroke="#e91e8c" strokeWidth="2"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg></div>
            <h3>Programación automática de pagos</h3>
            <p>Evita olvidos o atrasos: establece pagos recurrentes y Poppins los ejecuta por ti al día.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon"><svg viewBox="0 0 24 24" fill="none" stroke="#e91e8c" strokeWidth="2"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg></div>
            <h3>Historial consolidado de gastos domésticos</h3>
            <p>Presupuestos claros, con reportes por categoría que te permiten visualizar en un solo lugar el flujo financiero de tu hogar.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon"><svg viewBox="0 0 24 24" fill="none" stroke="#e91e8c" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg></div>
            <h3>Asistente Virtual Inteligente (AVI)</h3>
            <p>Recibe recomendaciones personalizadas, optimización de gastos y alertas sobre ofertas o condiciones favorables con tus tarjetas.</p>
          </div>
        </div>
      </section>

      <section className="capacitaciones" id="capacitaciones">
        <h2 className="section-title">Capacitaciones Poppins: Domina la gestión del hogar con expertos</h2>
        <div className="cap-grid">
          <div className="cap-card"><h3>Técnicas de cocina eficiente y ahorro doméstico</h3></div>
          <div className="cap-card"><h3>Formalización laboral para las y los colaboradores del hogar</h3></div>
          <div className="cap-card"><h3>Gestión eficiente del presupuesto familiar y control de gastos</h3></div>
        </div>
      </section>

      <section className="testimonios">
        <h2 className="section-title">Únete a la magia de Poppins</h2>
        <div className="reviews-grid">
          <div className="review-card"><p>"¡Poppins me cambió la vida! Ahora tengo todas mis cuentas en un solo lugar..."</p></div>
          <div className="review-card"><p>"La mejor parte es acumular millas con todos mis pagos..."</p></div>
        </div>
      </section>

      <section id="contactanos" className="contacto">
        <h2 className="section-title">Contáctanos</h2>
        <div className="hs-form-frame" id="hubspot-form-container">
          {/* script handled via external injection or next/script if needed, but for now we rely on the user original script in html if they want it exactly as is */}
          <div className="hs-form-frame" data-region="na1" data-form-id="5e8bb93c-bc8c-4eef-babf-904efc6c2280" data-portal-id="51289712"></div>
        </div>
      </section>

      <section className="planes" id="planes">
        <h2 className="section-title">Nuestros Planes</h2>
        <div className="planes-grid">
          <div className="plan-card"><h3>100% de dcto en la comisión pagando con tarjeta de crédito Tenpo</h3></div>
          <div className="plan-card featured"><h3>100% de dcto en la comisión pagando con tu tarjeta Santander American Express®</h3></div>
          <div className="plan-card"><h3>100% de dcto en la comisión pagando con Tarjeta Cencosud Scotiabank</h3></div>
        </div>
      </section>

      <footer style={{ marginTop: '40px' }}>
        <p>© 2026 Poppins. Magia en tu casa.</p>
      </footer>
      
      <script dangerouslySetInnerHTML={{ __html: `
        (function() {
          const script = document.createElement('script');
          script.src = 'https://js.hsforms.net/forms/embed/51289712.js';
          script.defer = true;
          document.body.appendChild(script);
        })();
      ` }} />
    </>
  );
}
