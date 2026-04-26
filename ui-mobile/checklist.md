# Waypoint Mobile Product Checklist

## 1. Active-Trip Today / Next Up Experience

- [x] Mobile detects trip phase: planning, upcoming, active, or past.
- [x] Active trips show a clear "Trip in progress" state.
- [x] Active trips prioritize Today / Next Up over generic overview summaries.
- [x] The first visible active-trip surface answers: "What do I do next?"
- [x] Next stop shows name, time, location, and day context.
- [x] Today timeline shows all stops for the current travel day.
- [x] Today timeline is sorted chronologically.
- [x] Today timeline handles missing time values gracefully.
- [x] Active-trip view works with long destination names.
- [x] Active-trip view works when there is no itinerary yet.
- [x] Active-trip view works when today has no planned stops.
- [x] Active-trip view works when all stops for today are completed or skipped.
- [x] Active-trip view has loading, empty, error, and partial-data states.
- [x] Active-trip view uses the Waypoint mobile palette, spacing, typography, and radius.

## 2. One-Tap Itinerary Execution

- [x] Each actionable stop has a visible Navigate action.
- [x] Navigate opens a maps deep link using the stop location.
- [x] Each actionable stop supports Confirmed / Skipped / Planned status.
- [x] Status updates can be made without entering heavy edit mode.
- [x] Status updates are optimistic in the UI.
- [x] Status updates roll back on failure.
- [x] Status updates refresh the snapshot after success.
- [x] Confirmed or skipped stops no longer appear as the current Next Up item.
- [x] The user can undo a mistaken Confirmed or Skipped status by returning it to Planned.
- [x] One-tap actions have large enough mobile tap targets.
- [ ] Icon-only actions have accessibility labels. — Only `NeedsAttentionCard` has an `accessibilityLabel`; the confirm, skip, and navigate buttons in `TimelineRow` and `LogStopFab` have none.
- [x] Solo trips do not show unnecessary group/collaboration metadata.
- [x] Execution actions do not mutate the saved itinerary plan directly unless intentionally designed.

## 3. Add Expense Flow

- [x] Budget page has a clear primary `+ Add expense` action.
- [x] Add expense opens a mobile-friendly sheet or focused form.
- [x] User can enter amount.
- [x] User can select category.
- [x] User can add optional note or title.
- [ ] User can attach the expense to a date. — The add-expense form has no date picker; the date is auto-set from `created_at` at save time.
- [ ] User can choose payer when the trip has multiple travelers. — No `paid_by` field exists in the expense schema or the add-expense form.
- [x] Split fields are hidden for solo trips.
- [x] Expense save has loading and error states.
- [x] Expense list updates after save.
- [x] Budget totals update after save.
- [x] Category totals update after save.
- [x] Remaining budget updates after save.
- [x] Empty budget state explains how to start tracking spending.
- [x] Expense form validates required fields.
- [x] Currency formatting is consistent across the page.

## 4. Better Overview Day Previews

- [x] Overview itinerary rows show more than `Day 1`, `Day 2`, etc.
- [x] Each day preview shows date.
- [x] Each day preview shows day title when available.
- [x] Each day preview shows first 2–3 stop names when available.
- [x] Each day preview shows stop count.
- [x] Each day preview shows status summary when available.
- [x] Empty days show a useful message like `No stops planned yet`.
- [x] Long stop names truncate cleanly.
- [x] Day preview rows stay compact and scannable.
- [x] Overview remains a preview surface, not a full editor.
- [x] Tapping a day row only navigates if an existing destination already supports it.
- [x] No fake itinerary data is introduced.

## 5. Reservation Quick-Access Cards

- [ ] Bookings page distinguishes upcoming reservations from past reservations. — Status labels (`Upcoming`, `Completed`) are computed in the adapter but the rendered list is unsorted and ungrouped.
- [ ] Active or upcoming trip surfaces the next relevant booking. — The OverviewTab quick-action grid links to the full BookingsTab but does not surface the next booking inline.
- [x] Booking card shows reservation type, title, date/time, and location when available.
- [ ] Hotel booking can show check-in/check-out when available. — `end_at` is used only for status calculation; it is not surfaced as a check-out label in `ReservationViewModel`.
- [ ] Flight booking can show flight time and confirmation number when available. — `confirmation_code` exists in the API schema but is excluded from `ReservationViewModel` and never rendered.
- [x] Restaurant/activity booking can show time and address when available.
- [ ] Reservation card supports Navigate when location exists. — `BookingRow` has no Navigate button or maps deep link despite `location` being available in the view model.
- [ ] Reservation card supports call/website link when data exists. — No phone or website fields exist in the reservation API schema.
- [x] Missing optional fields do not leave awkward blank spaces.
- [x] Empty booking state explains what bookings can be added.
- [x] Add booking action is clearly available.
- [ ] Booking details open in a sheet or detail view instead of overcrowding the list. — `BookingRow` is a flat list item with only a delete action; no detail sheet or edit view exists.

## 6. Packing Checklist Polish

- [x] Packing page shows packed vs unpacked progress.
- [x] User can check/uncheck an item in one tap.
- [x] User can add a packing item.
- [ ] User can edit or delete a packing item. — Delete is implemented; inline editing of an existing packing item is not.
- [ ] Packing items are grouped by category if category data exists. — The packing schema has no category field and `PackingTab` renders a flat list with no grouping.
- [x] Empty packing state explains how to start.
- [ ] Optional suggested essentials are clearly marked as suggestions, not fake saved data. — No AI or template-based suggestions feature exists in the packing flow.
- [x] Packed items visually differ from unpacked items.
- [x] Packing interaction feels fast and one-handed.
- [x] Solo trips hide shared assignment metadata.
- [ ] Group trips may show assignment metadata only when real data exists. — No `assigned_to` or per-member assignment field exists in the packing schema or UI.

## 7. Adaptive Empty States

- [x] Overview has a helpful empty state when no itinerary exists.
- [x] Itinerary has a helpful empty state when no stops exist.
- [x] Bookings has a helpful empty state when no reservations exist.
- [x] Budget has a helpful empty state when no expenses exist.
- [x] Packing has a helpful empty state when no items exist.
- [ ] People/companions has a solo-trip state that does not pressure the user into collaboration. — `MembersTab` shows the same "Track readiness, manage invites, and add travelers" copy regardless of member count with no distinct solo-trip acknowledgment.
- [x] Empty states include a next action when appropriate.
- [x] Empty states do not use generic text like `No data`.
- [ ] Empty states match Waypoint tone: calm, useful, and travel-focused. — The packing empty state reads as developer-internal ("so the mobile client is useful during prep") rather than traveler-facing product copy.
- [x] Empty states do not add fake content to make the screen look full.

## 8. Group-Aware Budget Splitting

- [x] Solo trips hide split/payment balancing UI.
- [ ] Group trips show payer when expense data exists. — No `paid_by` field exists in the expense API schema or the rendered `ExpenseRow`.
- [ ] Group trips support selecting who paid. — The add-expense form has no payer selector.
- [ ] Group trips support splitting expense among travelers. — No split-expense schema, API endpoint, or UI component exists anywhere in the budget feature.
- [ ] Group trips show balance summary only when enough data exists. — No balance or settlement surface exists in `BudgetTab`.
- [ ] Balance summary answers who owes whom. — Not implemented; only per-category totals are shown.
- [ ] Recent expense rows show payer/split context when available. — `ExpenseRow` shows category and date only; no payer metadata is available or rendered.
- [x] Category totals still work for both solo and group trips.
- [x] Add expense form remains simple for solo trips.
- [ ] Splitting logic is handled in typed helpers or backend logic, not buried in render components. — The feature is entirely absent from the codebase.

## 9. Post-Trip Archive Summary

- [x] Past trips are detected based on trip dates.
- [x] Past trips no longer prioritize active Today / Next Up UI.
- [x] Archive card shows destination and dates.
- [ ] Archive card shows confirmed/completed stop count when available. — `ArchiveTripViewModel` only carries title, destination, dateRange, and duration; no execution stats are fetched or displayed.
- [ ] Archive card shows skipped count when available. — No stop execution data is fetched for archive cards.
- [ ] Archive card shows actual spending when available. — No budget data is fetched for archive cards.
- [ ] Archive card shows budget comparison when available. — Not implemented.
- [ ] Archive detail shows what was actually done, not only what was planned. — Tapping an archive card navigates to the regular workspace rather than a dedicated post-trip summary view.
- [ ] Unplanned logged stops appear in the post-trip record when available. — No post-trip aggregation of unplanned stops exists in the archive flow.
- [ ] `Plan similar trip` action exists only if there is enough trip data to prefill. — Not implemented anywhere in the archive flow.
- [x] Past trip empty/missing data states feel intentional, not broken.

## 10. Explore / Companions Polish

- [x] Explore does not distract from core trip execution flow.
- [x] Explore uses real data or clearly handled empty states.
- [ ] Explore search supports location/theme intent if implemented. — The search bar in `ExploreScreen` exists but is not wired to a backend search; results come from a static catalog.
- [x] Companion matching is hidden if the feature is incomplete.
- [ ] Companion UI does not appear inside solo trip workspace unless relevant. — `MembersTab` shows the invite CTA for trip owners regardless of current member count with no solo-trip guard.
- [x] Profile and companion surfaces do not block the core trip loop.
- [x] Any incomplete social feature is feature-flagged or removed from visible navigation.
- [x] Bottom tab navigation remains understandable after adding/polishing these sections.

## Final Product QA

- [x] Mobile app has a clear reason to exist separately from web.
- [x] Web remains the deep planning workspace.
- [x] Mobile feels like the fast trip execution companion.
- [x] Active trip users can answer `What is next?` within 5 seconds.
- [x] Active trip users can perform the next key action within 1–2 taps.
- [x] No production screen relies on hardcoded fake data.
- [ ] Remote-data screens handle loading, empty, error, and partial-data states. — `ArchiveScreen` has no screen-level error state and `MembersTab` has no loading state for the readiness query.
- [x] UI remains calm, editorial, and mobile-friendly.
- [ ] TypeScript passes. — Not verified by code audit; requires running `tsc` or `npm run build`.
- [ ] Existing tests/build pass. — Not verified by code audit; requires running the test suite.
