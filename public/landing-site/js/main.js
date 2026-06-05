/* ============================================================
   POPPINS LANDING — main.js
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {

  /* ── NAV SCROLL EFFECT ── */
  const nav = document.querySelector('.nav');
  const updateNav = () => {
    nav.classList.toggle('scrolled', window.scrollY > 40);
    const navBrand = nav.querySelector('.nav-brand');
    const navLinks = nav.querySelectorAll('.nav-link');
    const navLogin = nav.querySelector('.nav-login');
    if (window.scrollY > 40) {
      navBrand?.classList.remove('nav-brand-light');
      navLinks.forEach(l => l.classList.remove('nav-link-light'));
      navLogin?.classList.remove('nav-login-light');
    } else {
      navBrand?.classList.add('nav-brand-light');
      navLinks.forEach(l => l.classList.add('nav-link-light'));
      navLogin?.classList.add('nav-login-light');
    }
  };
  window.addEventListener('scroll', updateNav, { passive: true });
  updateNav();

  /* ── SCROLL REVEAL ── */
  const revealEls = document.querySelectorAll('.reveal, .reveal-left, .reveal-right');
  const revealObs = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('visible');
        revealObs.unobserve(e.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
  revealEls.forEach(el => revealObs.observe(el));

  /* ── ANIMATED COUNTERS ── */
  const counters = document.querySelectorAll('[data-count]');
  const countObs = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      const el = e.target;
      const target = parseInt(el.dataset.count, 10);
      const suffix = el.dataset.suffix || '';
      const prefix = el.dataset.prefix || '';
      const duration = 2200;
      const start = performance.now();
      const animate = (now) => {
        const elapsed = now - start;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        const current = Math.round(eased * target);
        el.textContent = prefix + current.toLocaleString('es-CL') + suffix;
        if (progress < 1) requestAnimationFrame(animate);
      };
      requestAnimationFrame(animate);
      countObs.unobserve(el);
    });
  }, { threshold: 0.5 });
  counters.forEach(c => countObs.observe(c));

  /* ── FAQ ACCORDION ── */
  document.querySelectorAll('.faq-q').forEach(btn => {
    btn.addEventListener('click', () => {
      const item = btn.closest('.faq-item');
      const isOpen = item.classList.contains('open');
      document.querySelectorAll('.faq-item.open').forEach(i => i.classList.remove('open'));
      if (!isOpen) item.classList.add('open');
    });
  });

  /* ── PRICING TOGGLE ── */
  const toggle = document.getElementById('billingToggle');
  const toggleTrack = document.getElementById('toggleTrack');
  let isAnnual = true; // Anual seleccionado por defecto

  const ANNUAL_DISCOUNT = 0.10; // 10% de descuento al pagar anual
  // monthly = valor normal; annual = valor con 10% de descuento
  const baseMonthly = { pro: 19990, proplus: 24990 };
  const prices = {};
  Object.keys(baseMonthly).forEach(plan => {
    const m = baseMonthly[plan];
    prices[plan] = { monthly: m, annual: Math.round(m * (1 - ANNUAL_DISCOUNT)) };
  });
  const coffees = {
    pro:     { monthly: '☕ Menos que 7 cafés al mes', annual: '☕ Ahorra 10% pagando al año' },
    proplus: { monthly: '🏠 Nana, jardín, cuidadora y más', annual: '🏠 Ahorra 10% pagando al año' },
  };

  function fmt(n) { return n.toLocaleString('es-CL'); }

  function updatePrices() {
    Object.keys(prices).forEach(plan => {
      const p = prices[plan];
      const mode = isAnnual ? 'annual' : 'monthly';
      const priceEl = document.getElementById(`price-${plan}`);
      const coffeeEl = document.getElementById(`coffee-${plan}`);
      const noteEl = document.getElementById(`note-${plan}`);
      if (priceEl) priceEl.textContent = fmt(p[mode]);
      if (coffeeEl) coffeeEl.textContent = coffees[plan][mode];
      if (noteEl) noteEl.textContent = isAnnual ? 'Facturación anual · −10% de descuento' : 'Facturación mensual';
    });
  }

  const labelMensual = document.getElementById('labelMensual');
  const labelAnual = document.getElementById('labelAnual');
  function updateLabels() {
    labelAnual?.classList.toggle('active', isAnnual);
    labelMensual?.classList.toggle('active', !isAnnual);
  }

  if (toggle) {
    toggleTrack?.classList.toggle('on', isAnnual); // estado inicial (anual)
    updateLabels();
    updatePrices(); // muestra precios anuales por defecto
    toggle.addEventListener('click', () => {
      isAnnual = !isAnnual;
      toggleTrack?.classList.toggle('on', isAnnual);
      updateLabels();
      updatePrices();
    });
  }

  /* ── FEATURE TABS ── */
  document.querySelectorAll('.feature-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      const group = tab.closest('.feature-tabs-wrap') || document;
      group.querySelectorAll('.feature-tab').forEach(t => t.classList.remove('active'));
      group.querySelectorAll('.feature-panel').forEach(p => p.classList.remove('active'));
      tab.classList.add('active');
      const panel = document.getElementById(tab.dataset.panel);
      if (panel) panel.classList.add('active');
    });
  });

  /* ── HOW IT WORKS · STICKY CARDS ENTRY FROM RIGHT ── */
  const howCards = document.querySelectorAll('.how-step-card');
  const howObs = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      e.target.classList.add('in');
      // Update left indicators
      const step = e.target.closest('.how-sticky-wrap')?.dataset.step;
      if (step) {
        document.querySelectorAll('.how-ind').forEach(ind => ind.classList.remove('active'));
        const activeInd = document.getElementById(`how-ind-${step}`);
        if (activeInd) activeInd.classList.add('active');
      }
    });
  }, { threshold: 0.4 });
  howCards.forEach(c => howObs.observe(c));

  /* ── PAIN CARDS · "¡Me pasa!" TOGGLE ── */
  window.togglePainBtn = function(btn) {
    const isActive = btn.classList.contains('active');
    const base = parseInt(btn.dataset.base, 10);
    const countEl = btn.querySelector('.pain-btn-count');
    btn.classList.toggle('active', !isActive);
    const newVal = isActive ? base : base + 1;
    btn.dataset.base = newVal;
    countEl.style.opacity = '0';
    setTimeout(() => {
      countEl.textContent = newVal >= 1000
        ? (newVal / 1000).toFixed(1).replace('.0','') + 'K'
        : newVal.toLocaleString('es-CL');
      countEl.style.opacity = '1';
    }, 120);
  };

  /* ── SMOOTH SCROLL FOR ANCHOR LINKS ── */
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', e => {
      const id = a.getAttribute('href');
      if (id === '#') return;
      const target = document.querySelector(id);
      if (target) {
        e.preventDefault();
        const offset = 80;
        const top = target.getBoundingClientRect().top + window.scrollY - offset;
        window.scrollTo({ top, behavior: 'smooth' });
      }
    });
  });

  /* ── TICKER DUPLICATE for seamless loop ── */
  document.querySelectorAll('.ticker-track').forEach(track => {
    track.innerHTML += track.innerHTML;
  });

  /* ── MOBILE NAV TOGGLE ── */
  const menuBtn = document.getElementById('menuBtn');
  const mobileMenu = document.getElementById('mobileMenu');
  menuBtn?.addEventListener('click', () => {
    mobileMenu?.classList.toggle('open');
    menuBtn.classList.toggle('active');
  });

  /* ── HERO PARALLAX (subtle) ── */
  window.addEventListener('scroll', () => {
    const hero = document.querySelector('.hero-mesh');
    if (hero) {
      hero.style.transform = `translateY(${window.scrollY * 0.15}px)`;
    }
  }, { passive: true });

  /* ── EXPAND GALLERY (acordeón) ── */
  const expandItems = document.querySelectorAll('.expand-item');
  expandItems.forEach(item => {
    const activate = () => {
      expandItems.forEach(i => i.classList.remove('active'));
      item.classList.add('active');
    };
    item.addEventListener('click', activate);
    item.addEventListener('mouseenter', activate);
  });

});
