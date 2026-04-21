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
  await page.goto('/login');
  await expect(page.getByLabel('Email')).toBeVisible();
  await expect(page.getByRole('button', { name: /^log in$/i })).toBeVisible();
}

export async function goToRegister(page: Page): Promise<void> {
  await page.goto('/register');
  await expect(page.getByLabel('Email')).toBeVisible();
  await expect(page.getByLabel('Confirm Password')).toBeVisible();
  await expect(
    page.getByRole('button', { name: /^sign up$/i }).first(),
  ).toBeVisible();
}

// Authenticated users land on home, then can jump into Trips.
export async function expectAuthenticatedApp(page: Page): Promise<void> {
  await expect(page).toHaveURL(/\/app\/(dashboard|trips|trips\/new|trips\/\d+)/, { timeout: 12_000 });
  if ((await page.url()).includes('/app/dashboard')) {
    await expect(page.getByRole('heading', { name: 'My Trips' }).first()).toBeVisible({ timeout: 8_000 });
  }
}

/**
 * Registers a fresh account, completes email verification, and logs in.
 * Returns the email that was used so callers can log back in later.
 */
export async function registerAndLogin(page: Page, email = uniqueEmail()): Promise<string> {
  await goToRegister(page);

  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(PASSWORD);
  await page.getByLabel('Confirm Password').fill(PASSWORD);
  await page.getByRole('button', { name: /^sign up$/i }).first().click();

  // After registration the app shows the verification URL as visible text.
  const verificationUrlEl = page.locator('.break-all').first();
  await expect(verificationUrlEl).toBeVisible({ timeout: 10_000 });
  const verificationUrl = (await verificationUrlEl.textContent() ?? '').trim();
  if (!verificationUrl) throw new Error('Verification URL not found on page');

  await page.goto(verificationUrl);
  await page.getByRole('button', { name: 'Confirm email' }).click();
  await expect(page.getByText('Email verified.')).toBeVisible({ timeout: 8_000 });

  // Log in with the newly verified account.
  await goToLogin(page);
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(PASSWORD);
  await page.getByRole('button', { name: /^log in$/i }).click();

  await expectAuthenticatedApp(page);
  return email;
}

/**
 * Creates a trip via the create-trip form.
 * Opens the trip creation form from any authenticated entry surface.
 * Waits until the trip title appears in the switcher before returning.
 */
export async function createTrip(
  page: Page,
  title: string,
  destination: string,
  startDate: string,
  endDate: string,
): Promise<void> {
  const newTripButton = page.getByRole('button', { name: 'New' }).first();
  if (!(await newTripButton.isVisible().catch(() => false))) {
    await page.goto('/app/trips');
  }

  await page.getByRole('button', { name: 'New' }).first().click();

  await expect(page.locator('#ctf-title')).toBeVisible({ timeout: 6_000 });
  await page.fill('#ctf-title', title);
  await page.fill('#ctf-destination', destination);
  await page.fill('#ctf-start-date', startDate);
  await page.fill('#ctf-end-date', endDate);
  await page.locator('button[type="submit"]').click();

  // Trip title appears as a <p> in the sidebar card once created and selected.
  await expect(page.getByText(title).first()).toBeVisible({ timeout: 8_000 });
}
