import { test, expect } from '@playwright/test';

/**
 * Happy Cats routing & navigation E2E tests
 * Implements: Issue #11 — Routing & Navigation hinzufügen
 *
 * Covers:
 * - "Happy Customers" link appears in navigation between "Products" and "About us"
 * - Clicking the nav link navigates to /happy-cats
 * - Direct URL /happy-cats loads the page
 */

test.describe('Happy Cats routing & navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('Happy Customers link is visible in navigation between Products and About us', async ({ page }) => {
    const nav = page.locator('nav');
    const productsLink = nav.locator('a:has-text("Products")');
    const happyCustomersLink = nav.locator('a:has-text("Happy Customers")');
    const aboutLink = nav.locator('a:has-text("About us")');

    await expect(productsLink).toBeVisible();
    await expect(happyCustomersLink).toBeVisible();
    await expect(aboutLink).toBeVisible();

    // Verify order: Products < Happy Customers < About us
    const productsBox = await productsLink.boundingBox();
    const happyBox = await happyCustomersLink.boundingBox();
    const aboutBox = await aboutLink.boundingBox();

    expect(productsBox!.x).toBeLessThan(happyBox!.x);
    expect(happyBox!.x).toBeLessThan(aboutBox!.x);
  });

  test('Clicking Happy Customers navigates to /happy-cats', async ({ page }) => {
    await page.click('nav a:has-text("Happy Customers")');

    await expect(page).toHaveURL(/\/happy-cats/);
    await expect(page.locator('h1:has-text("Happy Customers")')).toBeVisible();
  });

  test('Direct navigation to /happy-cats loads the page', async ({ page }) => {
    await page.goto('/happy-cats');

    await expect(page).toHaveURL(/\/happy-cats/);
    await expect(page.locator('h1:has-text("Happy Customers")')).toBeVisible();
  });
});
