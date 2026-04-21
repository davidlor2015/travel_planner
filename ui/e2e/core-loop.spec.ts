import { test, expect } from '@playwright/test';
import type { Route } from '@playwright/test';
import { registerAndLogin, createTrip } from './helpers';

// ── SSE mock ─────────────────────────────────────────────────────────────────

const MOCK_ITINERARY = {
  title: 'Rome Adventure',
  summary: 'A wonderful three-day trip exploring Rome.',
  days: [
    {
      day_number: 1,
      date: '2027-06-01',
      items: [
        {
          time: '09:00',
          title: 'Morning Coffee at Trastevere',
          location: 'Trastevere, Rome',
          lat: 41.889,
          lon: 12.469,
          notes: 'Great local café vibes',
          cost_estimate: '$5-10',
        },
        {
          time: '11:00',
          title: 'Colosseum Tour',
          location: 'Piazza del Colosseo, Rome',
          lat: 41.8902,
          lon: 12.4922,
          notes: 'Book tickets in advance',
          cost_estimate: '$18-25',
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

function buildSseBody(itinerary: typeof MOCK_ITINERARY): string {
  const tokenEvent = `event: token\ndata: ${JSON.stringify({ token: 'Rome Adventure' })}\n\n`;
  const completeEvent = `event: complete\ndata: ${JSON.stringify(itinerary)}\n\n`;
  return tokenEvent + completeEvent;
}

async function mockSseStream(route: Route): Promise<void> {
  await route.fulfill({
    status: 200,
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
    },
    body: buildSseBody(MOCK_ITINERARY),
  });
}

// ── Tests ─────────────────────────────────────────────────────────────────────

test.describe('V1 core loop', () => {
  test('register → create trip → generate itinerary → apply → persist', async ({ page }) => {
    await registerAndLogin(page);

    await createTrip(page, 'Rome Trip', 'Rome, Italy', '2027-06-01', '2027-06-03');

    // ── Generate itinerary (SSE mocked) ───────────────────────────────────────
    await page.route('**/v1/ai/stream/**', mockSseStream);

    await page.getByRole('button', { name: 'Generate Itinerary' }).click();

    // Wait for streaming to finish — the Apply button appears when complete.
    await expect(
      page.getByRole('button', { name: 'Apply Itinerary to Trip' }),
    ).toBeVisible({ timeout: 15_000 });

    // ── Apply the itinerary ───────────────────────────────────────────────────
    await page.getByRole('button', { name: 'Apply Itinerary to Trip' }).click();

    // After applying, the pending draft clears and the saved day-by-day itinerary is visible.
    await expect(
      page.getByText('Day-by-day itinerary'),
    ).toBeVisible({ timeout: 10_000 });

    const dayOneToggle = page.getByRole('button', { name: /Day 1/i }).first();
    await expect(dayOneToggle).toHaveAttribute('aria-expanded', 'true');
    await expect(page.getByText('Colosseum Tour')).toBeVisible();

    await dayOneToggle.click();
    await expect(dayOneToggle).toHaveAttribute('aria-expanded', 'false');

    await dayOneToggle.click();
    await expect(dayOneToggle).toHaveAttribute('aria-expanded', 'true');

    // ── Verify persistence after reload ───────────────────────────────────────
    await page.reload();

    // The trip is re-selected from localStorage. Saved itinerary should still be visible.
    await expect(
      page.getByText('Day-by-day itinerary'),
    ).toBeVisible({ timeout: 12_000 });
    await expect(page.getByRole('button', { name: /Day 1/i }).first()).toHaveAttribute('aria-expanded', 'true');
  });

  test('budget: add an expense and see it listed', async ({ page }) => {
    await registerAndLogin(page);
    await createTrip(page, 'Budget Trip', 'Barcelona, Spain', '2027-07-01', '2027-07-05');

    // Switch to Budget tab.
    await page.getByRole('button', { name: 'Budget' }).click();

    // Set a budget first.
    await page.getByRole('button', { name: 'Set budget' }).click();
    await page.getByPlaceholder('Set budget').fill('1000');
    await page.getByRole('button', { name: 'Set' }).click();
    await expect(page.getByText('Budget updated.')).toBeVisible({ timeout: 6_000 });

    // Open the expense form.
    await page.getByRole('button', { name: /add expense/i }).click();
    await page.getByRole('button', { name: 'Stay' }).click();

    // Fill in the expense.
    await page.getByPlaceholder('What did you spend on?').fill('Hotel deposit');
    await page.getByPlaceholder('$0').fill('200');
    await page.getByRole('button', { name: 'Add expense' }).click();

    await expect(page.getByText('Expense added.')).toBeVisible({ timeout: 6_000 });
    await expect(page.getByText('Total spent')).toBeVisible();
    await expect(page.getByText('Total budget')).toBeVisible();
    await expect(page.getByText('Amount remaining')).toBeVisible();
    await expect(page.getByText('Category breakdown')).toBeVisible();
    await expect(page.getByText('Recent expenses')).toBeVisible();
    await expect(page.getByText('Hotel deposit')).toBeVisible();
    await expect(page.getByText('Stay')).toBeVisible();
  });

  test('packing: add a custom item and see it listed', async ({ page }) => {
    await registerAndLogin(page);
    await createTrip(page, 'Packing Trip', 'Lisbon, Portugal', '2027-08-01', '2027-08-07');

    // Switch to Packing tab.
    await page.getByRole('button', { name: 'Packing' }).click();

    await expect(page.getByRole('button', { name: /add item/i })).toBeVisible();
    await page.getByRole('combobox').first().selectOption('toiletries');
    await page.getByPlaceholder('Add item (passport, sandals, charger)').fill('Sunscreen SPF 50');
    await page.getByRole('button', { name: /add item/i }).click();

    await expect(page.getByText('Packing item added.')).toBeVisible({ timeout: 6_000 });
    await expect(page.getByText('Toiletries')).toBeVisible();
    await expect(page.getByText('Sunscreen SPF 50')).toBeVisible();
    await expect(page.getByText('Essential')).toBeVisible();
  });

  test('bookings: create, edit, and remove a reservation', async ({ page }) => {
    await registerAndLogin(page);
    await createTrip(page, 'Booking Trip', 'Prague, Czech Republic', '2027-09-01', '2027-09-05');

    // Switch to Bookings tab.
    await page.getByRole('button', { name: 'Bookings' }).click();

    // Open the booking form.
    await page.getByRole('button', { name: /add booking/i }).click();

    await page.getByPlaceholder('Reservation title').fill('Hotel Aria Prague');
    await page.getByPlaceholder('Confirmation code').fill('ARIA-123');
    await page.getByPlaceholder('Booked cost').fill('320');
    await page.getByPlaceholder('USD').fill('EUR');
    await page.locator('input[type="datetime-local"]').first().fill('2027-09-02T15:00');
    await page.getByRole('button', { name: 'Save booking' }).click();

    await expect(page.getByText(/booking saved/i).first()).toBeVisible({ timeout: 6_000 });

    const bookingRow = page.locator('article', { hasText: 'Hotel Aria Prague' }).first();
    await expect(bookingRow).toBeVisible({ timeout: 6_000 });
    await expect(bookingRow.getByText('Stay')).toBeVisible();
    await expect(bookingRow.getByText('Upcoming')).toBeVisible();
    await expect(bookingRow.getByText('Ref: ARIA-123')).toBeVisible();
    await expect(bookingRow.getByText(/320/)).toBeVisible();

    await bookingRow.getByRole('button', { name: 'Edit' }).click();
    await page.getByPlaceholder('Reservation title').fill('Hotel Aria Prague - Old Town');
    await page.getByRole('button', { name: 'Save changes' }).click();
    await expect(page.getByText('Booking updated.')).toBeVisible({ timeout: 6_000 });
    await expect(page.getByText('Hotel Aria Prague - Old Town')).toBeVisible();

    const updatedRow = page.locator('article', { hasText: 'Hotel Aria Prague - Old Town' }).first();
    await updatedRow.getByRole('button', { name: /delete hotel aria prague - old town/i }).click();
    await expect(page.getByText('Booking removed.')).toBeVisible({ timeout: 6_000 });
    await expect(page.getByText('Hotel Aria Prague - Old Town')).not.toBeVisible();
  });

  test('chat: send a message with itinerary reference and jump to context', async ({ page }) => {
    await registerAndLogin(page);
    await createTrip(page, 'Chat Trip', 'Naples, Italy', '2027-10-10', '2027-10-14');

    await page.route('**/v1/ai/stream/**', mockSseStream);
    await page.getByRole('button', { name: 'Generate Itinerary' }).click();
    await expect(page.getByRole('button', { name: 'Apply Itinerary to Trip' })).toBeVisible({ timeout: 15_000 });

    await page.getByRole('button', { name: 'Chat' }).click();
    await expect(page.getByText('Trip thread')).toBeVisible({ timeout: 8_000 });

    await page.getByLabel('Reference itinerary item').selectOption({ label: 'Day 1 -> Colosseum Tour' });
    await page.getByLabel('Message to your trip group').fill('Can we keep this stop before lunch?');
    await page.getByRole('button', { name: 'Send' }).click();

    const sentBubble = page.locator('[data-testid="trip-chat-message"]', { hasText: 'Can we keep this stop before lunch?' }).first();
    await expect(sentBubble).toBeVisible({ timeout: 6_000 });
    await expect(sentBubble.locator('[data-testid="trip-chat-reference"]')).toHaveText('Day 1 -> Colosseum Tour');

    await sentBubble.locator('[data-testid="trip-chat-reference"]').click();
    await expect(page.getByRole('tab', { name: 'Overview' })).toHaveAttribute('aria-selected', 'true');
  });

  test('mobile workspace hides app nav, shows back button, and keeps apply reachable', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await registerAndLogin(page);
    await createTrip(page, 'Mobile Rome Trip', 'Rome, Italy', '2027-10-01', '2027-10-04');

    await page.goto('/app/trips');
    await expect(page.getByRole('button', { name: 'New' }).first()).toBeVisible({ timeout: 8_000 });

    await page.getByText('Mobile Rome Trip').first().click();

    await expect(page.getByRole('button', { name: 'Trips' })).toBeVisible({ timeout: 8_000 });
    await expect(page.getByRole('button', { name: 'Overview' })).toBeVisible();

    const isScrollable = await page.getByRole('button', { name: 'Overview' }).evaluate((node) => {
      const parent = node.parentElement;
      return Boolean(parent && parent.scrollWidth > parent.clientWidth);
    });
    expect(isScrollable).toBeTruthy();

    await page.route('**/v1/ai/stream/**', mockSseStream);
    await page.getByRole('button', { name: 'Generate Itinerary' }).click();

    const applyButton = page.getByRole('button', { name: 'Apply Itinerary to Trip' });
    await expect(applyButton).toBeVisible({ timeout: 15_000 });

    const box = await applyButton.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.y + box!.height).toBeLessThanOrEqual(844);

    await applyButton.click();
    await expect(page.getByText('Day-by-day itinerary')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText('Trip support')).toBeVisible();

    const itineraryY = await page.getByText('Day-by-day itinerary').first().evaluate((node) => node.getBoundingClientRect().top);
    const supportY = await page.getByText('Trip support').first().evaluate((node) => node.getBoundingClientRect().top);
    expect(itineraryY).toBeLessThan(supportY);
  });
});
