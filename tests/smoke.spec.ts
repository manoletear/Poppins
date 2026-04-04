import { test, expect } from '@playwright/test';

test('landing page loads', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/Poppins/);
});

test('login page loads', async ({ page }) => {
  await page.goto('/auth/login');
  await expect(page.locator('text=Iniciar Sesión')).toBeVisible();
});

test('protected routes redirect to login', async ({ page }) => {
  await page.goto('/empresa');
  await expect(page).toHaveURL(/auth\/login/);
});
