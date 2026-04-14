import { test, expect } from '@playwright/test';
import {
  expectAuthenticatedApp,
  goToLogin,
  goToRegister,
  uniqueEmail,
} from './helpers';

const PASSWORD = 'TestPassword123!';

test.describe('Authentication', () => {
  test('user can register and lands on My Trips', async ({ page }) => {
    const email = uniqueEmail();

    await goToRegister(page);
    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Password').fill(PASSWORD);
    await page.getByLabel('Confirm Password').fill(PASSWORD);
    await page.getByRole('button', { name: /^sign up$/i }).first().click();

    await expectAuthenticatedApp(page);
  });

  test('user can log out and log back in', async ({ page }) => {
    const email = uniqueEmail();

    await goToRegister(page);
    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Password').fill(PASSWORD);
    await page.getByLabel('Confirm Password').fill(PASSWORD);
    await page.getByRole('button', { name: /^sign up$/i }).first().click();
    await expectAuthenticatedApp(page);

    await page.getByRole('button', { name: 'Logout' }).click();
    await expect(
      page.getByRole('button', { name: /^sign in$/i }).first(),
    ).toBeVisible();

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
});
