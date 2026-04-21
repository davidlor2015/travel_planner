import { test, expect } from '@playwright/test';
import {
  expectAuthenticatedApp,
  goToLogin,
  goToRegister,
  registerAndLogin,
  uniqueEmail,
} from './helpers';

const PASSWORD = 'TestPassword123!';

test.describe('Authentication', () => {
  test('user can register, verify email, and reach the app', async ({ page }) => {
    await registerAndLogin(page);
    await expect(page).toHaveURL(/\/app\/dashboard/);
    await expect(page.getByRole('heading', { name: 'My Trips' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'New Trip' })).toBeVisible();
    await expectAuthenticatedApp(page);
  });

  test('user can sign out and sign back in', async ({ page }) => {
    const email = await registerAndLogin(page);

    // Sign out from the trips sidebar (aria-label, icon-only button).
    await page.getByRole('button', { name: 'Sign out' }).click();
    await expect(
      page.getByRole('button', { name: /^sign in$/i }).first(),
    ).toBeVisible({ timeout: 8_000 });

    // Log back in without re-verifying (account is already verified).
    await goToLogin(page);
    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Password').fill(PASSWORD);
    await page.getByRole('button', { name: /^log in$/i }).click();

    await expectAuthenticatedApp(page);
  });

  test('shows error banner on wrong credentials', async ({ page }) => {
    await goToLogin(page);

    await page.getByLabel('Email').fill('nobody@example.com');
    await page.getByLabel('Password').fill('wrongpassword');
    await page.getByRole('button', { name: /^log in$/i }).click();

    await expect(page.locator('[role="alert"]')).toBeVisible({ timeout: 8_000 });
  });

  test('register with mismatched passwords shows error', async ({ page }) => {
    await goToRegister(page);

    await page.getByLabel('Email').fill(uniqueEmail());
    await page.getByLabel('Password').fill(PASSWORD);
    await page.getByLabel('Confirm Password').fill('different_password');
    await page.getByRole('button', { name: /^sign up$/i }).first().click();

    await expect(page.getByText(/passwords do not match/i)).toBeVisible({ timeout: 5_000 });
  });
});
