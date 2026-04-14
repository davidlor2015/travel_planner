import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';

const PASSWORD = 'TestPassword123!';

export function uniqueEmail(): string {
  return `e2e_${Date.now()}_${Math.random().toString(36).slice(2)}@example.com`;
}

export async function goToLanding(page: Page): Promise<void> {
  await page.goto('/');
  await expect(
    page.getByRole('button', { name: /^sign in$/i }).first(),
  ).toBeVisible();
}

export async function goToLogin(page: Page): Promise<void> {
  await goToLanding(page);
  await page.getByRole('button', { name: /^sign in$/i }).first().click();
  await expect(page.getByLabel('Email')).toBeVisible();
  await expect(
    page.getByRole('button', { name: /^log in$/i }),
  ).toBeVisible();
}

export async function goToRegister(page: Page): Promise<void> {
  await goToLanding(page);
  await page.getByRole('button', { name: /^get started free$/i }).click();
  await expect(page.getByLabel('Email')).toBeVisible();
  await expect(page.getByLabel('Confirm Password')).toBeVisible();
  await expect(
    page.getByRole('button', { name: /^sign up$/i }).first(),
  ).toBeVisible();
}

export async function expectAuthenticatedApp(page: Page): Promise<void> {
  await expect(page.getByRole('button', { name: 'Logout' })).toBeVisible({
    timeout: 10_000,
  });
  await expect(page.getByRole('heading', { name: 'My Trips' })).toBeVisible({
    timeout: 10_000,
  });
}

/**
 * Registers a fresh account and logs in.
 * Uses a unique email per call so tests never collide.
 * Waits for the "My Trips" heading before returning.
 */
export async function registerAndLogin(page: Page): Promise<void> {
  const email = uniqueEmail();

  await goToRegister(page);

  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(PASSWORD);
  await page.getByLabel('Confirm Password').fill(PASSWORD);
  await page.getByRole('button', { name: /^sign up$/i }).first().click();

  await expectAuthenticatedApp(page);
}
