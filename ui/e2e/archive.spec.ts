import { test, expect } from '@playwright/test';
import { registerAndLogin, createTrip } from './helpers';

test.describe('Archive', () => {
  test.beforeEach(async ({ page }) => {
    await registerAndLogin(page);
  });

  test('shows completed trips as a searchable travel archive', async ({ page }) => {
    await createTrip(page, 'Kyoto Memories', 'Kyoto, Japan', '2024-04-02', '2024-04-09');

    await page.goto('/app/archive');

    await expect(page.getByRole('heading', { name: 'Your Travel Story' })).toBeVisible();
    await expect(page.getByText('1 trip - 1 country - 8 days - 1 traveller')).toBeVisible();
    await expect(page.getByRole('heading', { name: '2024' })).toBeVisible();
    await expect(page.getByText('Kyoto Memories').first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'View Trip' })).toBeVisible();
    await expect(page.getByText('Rate this trip').first()).toBeVisible();

    await page.getByRole('button', { name: 'Rate 4 out of 5' }).first().click();
    await expect(page.getByText('You rated this trip 4/5.').first()).toBeVisible();

    const copyButton = page.getByRole('button', { name: 'Copy Link' }).first();
    await expect(copyButton).toBeVisible();
    await expect(copyButton).toHaveAttribute('title', /Copy trip link/i);

    await page.getByRole('button', { name: 'List' }).click();
    await expect(page).toHaveURL(/view=list/);

    await page.getByPlaceholder('Search past trips...').fill('kyoto');
    await expect(page.getByText('Kyoto Memories').first()).toBeVisible();

    await page.getByPlaceholder('Search past trips...').fill('rome');
    await expect(page.getByRole('heading', { name: 'No past trips match that search.' })).toBeVisible();

    await page.getByRole('button', { name: 'Clear Search' }).click();
    await expect(page.getByText('Kyoto Memories').first()).toBeVisible();
  });
});
