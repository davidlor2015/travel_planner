import { test, expect } from '@playwright/test';
import type { Route } from '@playwright/test';
import { registerAndLogin, createTrip } from './helpers';

const MOCK_ITINERARY = {
  title: 'Workspace Itinerary',
  summary: 'A compact two-day test route.',
  days: [
    {
      day_number: 1,
      date: '2027-06-01',
      items: [
        {
          time: '09:00',
          title: 'Start in Positano',
          location: 'Positano',
          lat: 40.6281,
          lon: 14.4849,
          notes: 'Morning walk',
          cost_estimate: '$20',
        },
      ],
    },
  ],
  budget_breakdown: null,
  packing_list: null,
  tips: null,
  source: 'llm',
  source_label: 'AI',
  fallback_used: false,
};

function buildSseBody(): string {
  const tokenEvent = `event: token\ndata: ${JSON.stringify({ token: 'Workspace Itinerary' })}\n\n`;
  const completeEvent = `event: complete\ndata: ${JSON.stringify(MOCK_ITINERARY)}\n\n`;
  return tokenEvent + completeEvent;
}

async function mockSseStream(route: Route): Promise<void> {
  await route.fulfill({
    status: 200,
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
    },
    body: buildSseBody(),
  });
}

test.describe('Trip management', () => {
  test.beforeEach(async ({ page }) => {
    await registerAndLogin(page);
  });

  test('user can create a trip and see it in the sidebar', async ({ page }) => {
    await createTrip(page, 'Tokyo Adventure', 'Tokyo, Japan', '2027-08-01', '2027-08-10');

    // Trip title is a <p> in the sidebar card — not a heading role.
    await expect(page.getByText('Tokyo Adventure').first()).toBeVisible();
  });

  test('created trip shows destination in sidebar card', async ({ page }) => {
    await createTrip(page, 'Paris Trip', 'Paris, France', '2027-09-01', '2027-09-07');

    await expect(page.getByText('Paris, France').first()).toBeVisible();
  });

  test('multiple trips all appear in the sidebar', async ({ page }) => {
    await createTrip(page, 'First Trip', 'Berlin, Germany', '2027-06-01', '2027-06-07');
    await createTrip(page, 'Second Trip', 'Lisbon, Portugal', '2027-07-01', '2027-07-05');

    await expect(page.getByText('First Trip').first()).toBeVisible();
    await expect(page.getByText('Second Trip').first()).toBeVisible();
  });

  test('cancel returns to trip list without creating a trip', async ({ page }) => {
    await page.getByRole('button', { name: 'New' }).first().click();
    await expect(page.locator('#ctf-title')).toBeVisible();

    await page.fill('#ctf-title', 'Draft Trip');
    await page.getByRole('button', { name: 'Cancel' }).click();

    // After cancel we're back on the trips view — form is gone.
    await expect(page.locator('#ctf-title')).not.toBeVisible();
    await expect(page.getByText('Draft Trip')).not.toBeVisible();
  });

  test('selecting a trip opens the workspace panel', async ({ page }) => {
    await createTrip(page, 'Workspace Trip', 'Madrid, Spain', '2027-10-01', '2027-10-08');

    // WorkspaceTabBar should be visible once a trip is selected.
    await expect(page.getByRole('button', { name: 'Overview' })).toBeVisible({ timeout: 8_000 });
  });

  test('overview supports add-day draft flow and accordion keyboard navigation', async ({ page }) => {
    await createTrip(page, 'Overview Trip', 'Amalfi Coast, Italy', '2027-06-01', '2027-06-04');

    await page.route('**/v1/ai/stream/**', mockSseStream);
    await page.getByRole('button', { name: 'Generate Itinerary' }).click();
    await expect(page.getByRole('button', { name: 'Apply Itinerary to Trip' })).toBeVisible({ timeout: 15_000 });
    await page.getByRole('button', { name: 'Apply Itinerary to Trip' }).click();

    await expect(page.getByText('Day-by-day itinerary')).toBeVisible({ timeout: 10_000 });

    await page.getByRole('button', { name: 'Edit day content' }).click();
    const addDayButton = page.getByRole('button', { name: 'Add Day' });
    await expect(addDayButton).toBeVisible({ timeout: 10_000 });
    await addDayButton.click();

    await expect(page.getByText('Day 2').first()).toBeVisible();
    await page.getByRole('button', { name: 'Apply Itinerary to Trip' }).click();

    const dayOneToggle = page.getByRole('button', { name: /Day 1/i }).first();
    const dayTwoToggle = page.getByRole('button', { name: /Day 2/i }).first();
    await expect(dayTwoToggle).toBeVisible({ timeout: 10_000 });

    await dayOneToggle.focus();
    await page.keyboard.press('ArrowDown');
    await expect(dayTwoToggle).toBeFocused();

    await page.keyboard.press('Home');
    await expect(dayOneToggle).toBeFocused();

    await dayOneToggle.click();
    await expect(dayOneToggle).toHaveAttribute('aria-expanded', 'false');
    await dayOneToggle.click();
    await expect(dayOneToggle).toHaveAttribute('aria-expanded', 'true');
  });

  test('members tab keeps invite flow simple and shows companion status cues', async ({ page }) => {
    await createTrip(page, 'Companion Trip', 'Florence, Italy', '2027-09-01', '2027-09-06');

    await page.getByRole('button', { name: 'Members' }).click();

    await expect(page.getByText('Organize your travel companions')).toBeVisible({ timeout: 8_000 });
    await expect(page.getByText('Invite by email')).toBeVisible();
    await expect(page.getByPlaceholder('traveler@example.com')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Send invite' })).toBeVisible();

    await expect(page.getByText('Who is in this trip')).toBeVisible();
    await expect(page.getByText('Trip owner')).toBeVisible();
    await expect(page.getByText('Leading itinerary and invites for this journey.')).toBeVisible();
  });

  test('overview readiness shows countdown and categorized prep checklist', async ({ page }) => {
    await createTrip(page, 'Readiness Focus Trip', 'Porto, Portugal', '2027-09-12', '2027-09-17');

    await expect(page.getByText('Departure readiness')).toBeVisible({ timeout: 8_000 });
    await expect(page.getByText('Ready for takeoff')).toBeVisible();
    await expect(page.getByText(/days to departure|departure tomorrow|departure today|trip already started/i)).toBeVisible();
    await expect(page.getByText('Readiness:')).toBeVisible();

    await expect(page.getByText('Finance')).toBeVisible();
    await expect(page.getByText('Documents')).toBeVisible();
    await expect(page.getByText('Tech')).toBeVisible();
    await expect(page.getByText('Activities')).toBeVisible();
    await expect(page.getByText('Travel')).toBeVisible();
    await expect(page.getByText('Home')).toBeVisible();
    await expect(page.getByText('Work')).toBeVisible();

    const firstReadyCheckbox = page.getByLabel(/mark .* as done/i).first();
    await firstReadyCheckbox.check();
    await expect(firstReadyCheckbox).toBeChecked();
  });

  test('map tab renders interactive map with route context chips', async ({ page }) => {
    await createTrip(page, 'Map Confidence Trip', 'Amalfi Coast, Italy', '2027-06-01', '2027-06-04');

    await page.route('**/v1/ai/stream/**', mockSseStream);
    await page.getByRole('button', { name: 'Generate Itinerary' }).click();
    await expect(page.getByRole('button', { name: 'Apply Itinerary to Trip' })).toBeVisible({ timeout: 15_000 });
    await page.getByRole('button', { name: 'Apply Itinerary to Trip' }).click();

    await page.getByRole('button', { name: 'Map' }).click();

    await expect(page.getByText('See the route before you step out')).toBeVisible();
    await expect(page.locator('.leaflet-container').first()).toBeVisible();
    await expect(page.getByText('Positano')).toBeVisible();
  });

  test('activity drawer supports unread filtering and mark all read', async ({ page }) => {
    await createTrip(page, 'Activity Drawer Trip', 'Valencia, Spain', '2027-05-10', '2027-05-14');

    await page.getByRole('button', { name: /Updates/i }).click();
    await expect(page.getByRole('dialog', { name: 'Trip activity updates' })).toBeVisible({ timeout: 8_000 });
    await expect(page.getByText('Trip created')).toBeVisible();

    await page.getByRole('button', { name: 'Unread' }).click();
    await expect(page.getByRole('button', { name: 'Mark all read' })).toBeEnabled();
    await page.getByRole('button', { name: 'Mark all read' }).click();
    await expect(page.getByRole('button', { name: 'Mark all read' })).toBeDisabled();

    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog', { name: 'Trip activity updates' })).not.toBeVisible();
  });

  test('trip switcher quick actions can mute and unmute updates', async ({ page }) => {
    await createTrip(page, 'Quiet Trip', 'Lisbon, Portugal', '2027-08-01', '2027-08-05');

    const tripCard = page.getByRole('button', { name: /Quiet Trip/i }).first();

    await tripCard.click({ button: 'right' });
    await expect(page.getByRole('button', { name: 'Mute trip updates' })).toBeVisible();
    await page.getByRole('button', { name: 'Mute trip updates' }).click();
    await expect(page.getByText('Updates muted').first()).toBeVisible();

    await tripCard.click({ button: 'right' });
    await expect(page.getByRole('button', { name: 'Unmute trip updates' })).toBeVisible();
    await page.getByRole('button', { name: 'Unmute trip updates' }).click();
    await expect(page.getByText('Updates muted')).toHaveCount(0);
  });
});
