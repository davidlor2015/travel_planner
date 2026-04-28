// Path: ui/e2e/v1-scope.spec.ts
// Summary: Covers automated tests for v1-scope.spec behavior.

/**
 * Assertions that v1 scope-cleanup UI changes are live.
 * Each test targets a specific surface that was added, removed, or renamed.
 */
import { test, expect } from '@playwright/test';
import { registerAndLogin, createTrip } from './helpers';

test.describe('V1 scope: removed / renamed surfaces', () => {
  test('Generate Plan / Smart Plan button is not visible on the Overview tab', async ({ page }) => {
    await registerAndLogin(page);
    await createTrip(page, 'Plan Tab Trip', 'Vienna, Austria', '2027-05-01', '2027-05-05');

    // Only "Generate Itinerary" should be on the Overview tab — not "Generate Plan"
    // or "Smart Plan" which were removed from v1.
    await expect(page.getByRole('button', { name: 'Generate Itinerary' })).toBeVisible();
    await expect(page.getByRole('button', { name: /generate plan/i })).not.toBeVisible();
    await expect(page.getByRole('button', { name: /smart plan/i })).not.toBeVisible();
  });

  test('Explore is not in the top-level navigation', async ({ page }) => {
    await registerAndLogin(page);

    // The AppShell nav is only rendered outside the trips view.
    await page.goto('/app/dashboard');

    // Explore is now secondary-nav only (avatar menu), not a primary tab.
    await expect(page.getByRole('button', { name: 'Explore' })).not.toBeVisible();
  });

  test('Companions entry point is not visible in the top-level navigation', async ({ page }) => {
    await registerAndLogin(page);

    await page.goto('/app/dashboard');

    await expect(page.getByRole('button', { name: 'Companions' })).not.toBeVisible();
  });

  test('Explore route redirects back to Trips', async ({ page }) => {
    await registerAndLogin(page);

    await page.goto('/app/explore');

    await expect(page).toHaveURL(/\/app\/trips$/);
    await expect(page.getByRole('button', { name: 'New' }).first()).toBeVisible({ timeout: 8_000 });
  });

  test('Workspace Packing tab is labelled "Packing" not "Prep"', async ({ page }) => {
    await registerAndLogin(page);
    await createTrip(page, 'Tab Label Trip', 'Amsterdam, Netherlands', '2027-06-01', '2027-06-04');

    // The tab is renamed from "Prep" to "Packing".
    await expect(page.getByRole('button', { name: 'Packing' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Prep' })).not.toBeVisible();
  });

  test('Readiness sub-view is not visible inside the Packing tab', async ({ page }) => {
    await registerAndLogin(page);
    await createTrip(page, 'Readiness Trip', 'Copenhagen, Denmark', '2027-07-01', '2027-07-05');

    await page.getByRole('button', { name: 'Packing' }).click();

    // The Readiness toggle / section was removed from v1.
    await expect(page.getByRole('button', { name: /readiness/i })).not.toBeVisible();
    await expect(page.getByText(/readiness/i)).not.toBeVisible();
  });

  test('Readiness remains compact support content in Overview, not a top-level tab', async ({ page }) => {
    await registerAndLogin(page);
    await createTrip(page, 'Overview Readiness Trip', 'Naples, Italy', '2027-08-01', '2027-08-05');

    await expect(page.getByRole('button', { name: /readiness/i })).not.toBeVisible();

    await page.getByRole('button', { name: 'Overview' }).click();
    await expect(page.getByText('Member readiness')).toBeVisible();
  });

  test('Browse destinations call to action is not shown in trips surfaces', async ({ page }) => {
    await registerAndLogin(page);

    await expect(page.getByText(/browse destinations/i)).not.toBeVisible();
  });
});
