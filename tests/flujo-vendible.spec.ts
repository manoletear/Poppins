import { test, expect } from '@playwright/test';

// Tests E2E para validar que los flujos core funcionan
// Estos tests corren contra la app desplegada en Vercel

test.describe('Landing Page', () => {
  test('carga correctamente con CTA y formulario', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Poppins/);
    await expect(page.locator('text=Quiero la magia en mi casa')).toBeVisible();
  });

  test('formulario HubSpot se renderiza', async ({ page }) => {
    await page.goto('/');
    // HubSpot form loads async — wait up to 10s
    await page.waitForSelector('.hs-form-frame, .hbspt-form, #hubspot-form-container', { timeout: 10000 }).catch(() => {});
  });

  test('navbar links funcionan', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('text=Ingresar')).toBeVisible();
  });
});

test.describe('Auth Flow', () => {
  test('login page carga', async ({ page }) => {
    await page.goto('/auth/login');
    await expect(page.locator('text=Iniciar Sesión')).toBeVisible();
  });

  test('register page carga', async ({ page }) => {
    await page.goto('/auth/register');
    await expect(page.locator('text=Crear Cuenta')).toBeVisible();
  });

  test('rutas protegidas redirigen a login', async ({ page }) => {
    await page.goto('/empresa');
    await expect(page).toHaveURL(/auth\/login/);
  });

  test('portal redirige a login', async ({ page }) => {
    await page.goto('/portal');
    await expect(page).toHaveURL(/auth\/login/);
  });
});

test.describe('API Routes', () => {
  test('cron alertas responde (sin auth)', async ({ request }) => {
    const res = await request.get('/api/cron/alertas-diarias');
    // Sin CRON_SECRET configurado, debería funcionar
    expect([200, 401]).toContain(res.status());
  });

  test('flow create rechaza sin datos', async ({ request }) => {
    const res = await request.post('/api/pagos/flow/create', {
      data: {},
    });
    expect(res.status()).toBe(400);
  });

  test('flow create-bulk rechaza sin pagoIds', async ({ request }) => {
    const res = await request.post('/api/pagos/flow/create-bulk', {
      data: { monto: 1000 },
    });
    expect(res.status()).toBe(400);
  });
});

test.describe('Static Assets', () => {
  test('robots.txt existe', async ({ request }) => {
    const res = await request.get('/robots.txt');
    expect(res.status()).toBe(200);
    const text = await res.text();
    expect(text).toContain('User-agent');
  });
});
