import { test, expect } from '@playwright/test';
import { registerAndLogin } from './helpers';

test.describe('Explore', () => {
  test.skip(process.env.VITE_ENABLE_EXPLORE !== 'true', 'Explore is gated outside the V1 launch scope.');

  test('filters inspiration and starts a trip from a destination', async ({ page }) => {
    await registerAndLogin(page);

    await page.goto('/app/explore');

    await expect(page.getByRole('heading', { name: 'Where will your next trip begin?' })).toBeVisible();
    await page.getByRole('button', { name: 'Culinary' }).click();
    await expect(page).toHaveURL(/mood=Culinary/);

    await page.getByPlaceholder('Search Bali, Tokyo, coast, food...').fill('lisbon');
    await expect(page.getByText('Lisbon').first()).toBeVisible();

    await page.getByRole('button', { name: 'Plan This Trip' }).first().click();
    await expect(page).toHaveURL(/\/app\/trips\/new\?destination=/);
    await expect(page.locator('#ctf-destination')).toHaveValue(/Lisbon, Portugal/);
  });
});
