# Mobile Parity Plan

Bring `ui-mobile/` to feature and visual parity with the web frontend (`ui/src/`).
The web app is always the **source of truth**. Read it before touching any mobile counterpart.

---

## Constraints

- Do not change backend APIs or data contracts.
- Do not change the workspace model or shared backend schemas.
- Do not add static or mock trip data anywhere.
- Keep render components thin — request logic belongs in API files and feature hooks.
- Match the web visual hierarchy, adapted for React Native / mobile ergonomics.
- File and folder naming follows the existing mobile architecture (camelCase folders, PascalCase components).
- Prefer feature-owned hooks and API modules; no request logic in screens or render components.
- Prefer lightweight typed adapters when mobile view models differ from backend shapes.
- Do not invent API routes or mock the backend.
- Do not silently change product behavior when porting.
- Do not add mobile-specific abstraction layers unless they clearly help the current slice.
- Do not port multiple slices in one PR.
- Do not spend time on secondary features until the primary trip-planning loop is complete.
- Optimize for real backend-connected flows; no placeholder domain objects.
- Replace emoji icons with `@expo/vector-icons` Ionicons (ongoing; track per slice).
- Preserve good software design; do not over-engineer.

---

## Completed

### Slice 1 — Visual Foundation
- Inter + Playfair Display font loading (`app/_layout.tsx`, `shared/theme/typography.ts`)
- `WorkspaceTabBar`: underline-style tab bar matching web
- `HappeningNowCard`: dark cocoa `LinearGradient` surface with `on-dark` token text

### Slice 2 — Trips / Workspace Hierarchy
- `tripVisuals.ts`: `getTripImageUrl`, `getTripTagline`
- `WorkspaceTripHeader`: full-width image hero, countdown pill, stats strip
- Trips index picker row: thumbnail + Playfair title + chevron → `TripSwitcherSheet`
- `TripSwitcherSheet`: status dots, current-trip indicator pill

### Slice 3 — Trips Core Loop
- `OverviewTab`: live SSE streaming banner with cancel, token text display, auto-apply on complete, "Regenerate" button on saved itinerary
- `TripFormSheet` create mode: Budget / Pace / Interests preference chips → serialized into `notes` via `serializePreferences` (mirrors web `CreateTripForm`)
- `TripCard`: destination hero image with `LinearGradient` bottom fade, status pill anchored to image
- Auto-start AI stream after trip creation (`?from=create` → `WorkspaceScreen` effect)
- `features/trips/tripSchema.ts`: `BUDGET_OPTIONS`, `PACE_OPTIONS`, `INTEREST_OPTIONS`, `serializePreferences`

### Slice 4 — Auth Parity
- Added auth screens: `forgot-password`, `reset-password`, `verify-email-request`, `verify-email`
- Screens use existing auth hooks in `features/auth/hooks.ts`; no backend or contract changes
- Added "Forgot password?" navigation from login
- Added verify-email-request navigation after successful registration
- Deep-link token handling remains out of scope; current support is in-app token routes only

### Auth Screen Visual Redesign (post-Slice 4)
All six auth screens (`login`, `register`, `forgot-password`, `reset-password`, `verify-email-request`, `verify-email`) rebuilt to match the Waypoint Signup design reference. Auth logic, routing, hooks, and API calls are unchanged.

**Layout pattern applied across all screens:**
- `SafeAreaView` with `bg-bg` ivory full-screen background (replaces `KeyboardAvoidingView justify-center`)
- Three-zone vertical structure: logo/back row → editorial headline block → bottom-anchored CTA
- Kicker (small uppercase `text-amber` label) → Playfair Display headline → muted subtitle copy
- Underline-style input fields: small all-caps label, `text-[18px]` editable text, `borderBottomWidth 1.5` in `border-color`, no box or background — implemented as a local `UnderlineField` component inside each screen file
- Dark espresso CTA button (`bg-espresso h-14 rounded-2xl`) with `text-on-dark` label and Ionicons arrow — replaces the amber `PrimaryButton` on auth screens only
- Secondary actions rendered as inline text links below the CTA

**Login screen specifically:**
- `WaypointLogo` mark + wordmark at the top (real SVG asset, not a placeholder)
- Spacer pushes headline + form to the lower portion of the screen

**Token mapping (prototype → Waypoint):**
- Prototype `WP.ink` → `espresso` (`#1C1108`) for dark surfaces and primary text
- Prototype `WP.accent` orange-red → `amber` (`#B86845`), Waypoint's brand accent
- Prototype `WP.cream` → `bg-bg` (`#FBF7EF`)
- Prototype Instrument Serif → `fontStyles.displaySemibold` (Playfair Display, already loaded)
- Hero card text → `text-on-dark` / `text-on-dark-muted` / `text-brass`

**Not copied from prototype:** multi-step progress bar, OTP/magic-link verify flow, travel style preference chips, path-fork screen, invite-accept screen, prototype copy verbatim. Shared `Button`, `TextInputField`, `SectionCard`, `ScreenHeader` primitives are untouched.

**WaypointLogo component (`shared/ui/WaypointLogo.tsx`):**
- `WaypointMark` — renders the geometric star mark from `ui/public/Logo.svg` via react-native-svg `Path` with `fill-rule="evenodd"`; accepts `size` and `color` props
- `WaypointLogo` — horizontal lockup: mark + "WAYPOINT" uppercase text in Inter
- SVG source copied to `assets/images/Logo.svg`
- Used on login and verify-email screens; logo row replaces the previous hand-drawn circle-dot mark
- The decorative trip preview card ("Kyoto · Day 2, 5 stops") removed from login — it belonged to the on-trip context, not auth
- `react-native-svg ^15.8.0` added to `package.json` (run `npm install` once)

### On-Trip Screen Visual Redesign (post-Routing Hardening)
All six on-trip execution components redesigned to match the Waypoint On-Trip design reference (`ontrip-screens.jsx`, `Waypoint On-Trip.html`). Behavior, data flow, mutations, and API contracts unchanged.

**Components rewritten:**

- **`OnTripHeader.tsx`** — Compact single-row topbar: Ionicons chevron-back, live red dot + "ON TRIP · Day N" uppercase kicker, 15px Inter trip title, right-side read-only/progress labels. Replaced the previous tall block with large Playfair title.
- **`HappeningNowCard.tsx`** — Added `Animated` pulsing glow ring (opacity 0.1→0.35, 900ms loop) around the live dot in the status strip. Status strip separated from content area with a subtle border. CTA label changed from "Confirm" → "I'm here". Navigate button uses `rounded-[14px]`; action buttons use `rounded-[12px]`.
- **`TimelineRow.tsx`** — Done items at 50% opacity with strikethrough + `uiRegular`. `DotForVariant` extracted as sub-component (filled dot = now, hollow accent border = next, small hollow = done/upcoming). Right-aligned "Done" / "Next" mono labels. `fontStyles` import added.
- **`NeedsAttentionCard.tsx`** — `rounded-[20px]` outer card, `rounded-[14px]` inner blocker items, "Needs attention" kicker with 2px tracking.
- **`LogStopFab.tsx`** — Dark `bg-espresso` pill (was `bg-accent-ontrip`), Ionicons `add` icon, `text-on-dark` label, stronger shadow values.
- **`OnTripScreen.tsx`** — `SectionLabel` local component replaced with `TodaySectionHeader` (Playfair Display stop count + "N remaining" in italic). `NextPeek` card added (shown when `vm.now && vm.next`). Timeline items wrapped in rounded card container (`rounded-[20px]`) with dashed internal `borderBottomWidth` dividers. `NoStopsTodayCard` restyled. All mutation/toggleStatus/routing logic unchanged.

**Visual rules preserved:**
- Outer shell: `bg-surface-ontrip` cream (`#F2EBDD`) — light, NOT dark
- `HappeningNowCard`: dark cocoa gradient `surface-exec-top → surface-exec` — NOT light
- Timeline cards and content: `surface-ontrip-raised` cream surfaces — NOT dark

### Slice 5 — Mobile Saved-Plan Itinerary Editing
- `EditableItineraryDayCard`: collapsible saved-itinerary day card with editable stop rows and "Add stop"
- `StopEditSheet`: slide-up stop add/edit sheet with `Alert.alert` delete confirmation
- `OverviewTab`: local editable copy of saved `Itinerary`, add/edit/delete stops, dirty detection, and publish via `useApplyItineraryMutation` with `source: "manual_edit"`
- Preserves untouched stop fields on edit; add/delete operate on the real backend itinerary shape without web draft IDs
- Audit fixes: key-sorted dirty comparison, reset on `tripId` changes, reset when `itineraryQuery.data` changes, failed publish keeps local edits
- Streaming auto-apply updates local editable state and clears dirty state

**Still deferred from Slice 5:**
- Drag-and-drop stop reordering
- Day add / duplicate / clear / delete
- Lock / favorite per stop
- AI refinement controls (Slice 6)

### Routing / On-Trip Entry Hardening
- Added nested Trips stack (`app/(tabs)/trips/_layout.tsx`) so workspace/live screens remain under Trips
- Bottom tabs are limited to Trips, Companions, Archive, Profile; Explore is hidden for now
- Tab bar is hidden defensively on Trips child routes while staying visible on the Trips list
- On-Trip CTA is gated by active trip status plus usable active snapshot data
- Live route uses strict `tripId` parsing and never queries trip `0`
- OnTrip shows a helpful "No stops are planned for today." empty state when an active snapshot has no usable today stops
- If Expo Router warnings persist, fallback remains: move trip workspace/live routes outside `(tabs)` to `app/trips/[tripId]/...`

### Trips → Workspace → Edit Visual Polish
- `TripCard`: warmer editorial card surface, taller image, display-title typography, pill metadata, restyled live CTA
- `WorkspaceTripHeader`: stronger web-inspired hero overlay, metadata pills, glass action buttons, improved stat wrapping
- `TripFormSheet`: warmer bottom-sheet treatment, grouped core/preference/notes sections, anchored actions
- Visual-only pass: routing, payloads, validation, OnTrip, and saved-itinerary editing behavior unchanged

### Tab Bar Routing Fix
- Removed the `shouldHideTabBar(useSegments())` pattern from `(tabs)/_layout.tsx`; `tabBarStyle: undefined` does not reliably restore a previously-hidden tab bar in React Navigation
- Tab bar hiding is now opt-in per screen: `[tripId]/index.tsx` and `[tripId]/live.tsx` each render `<Tabs.Screen options={{ tabBarStyle: { display: "none" } }} />` so the trips list always shows the tab bar by default

### Slice 6 — AI Refinement Controls
Wires the existing `useRefineItineraryMutation` into the workspace itinerary view so users can regenerate a single day without replacing the full plan.

**Files changed:**
- **`features/trips/workspace/RegenerateSheet.tsx`** (new) — slide-up `Modal` sheet; "Improve this day" kicker, day title + stop count, optional variant pills (Cheaper / More local / Less walking / Faster pace), spinner + cancel during generation, refined-day preview (new stop list with diff count), "Accept changes" / "Keep original" actions. Manages own `RefineState` machine and `AbortController`. Calls `useRefineItineraryMutation` directly.
- **`features/trips/workspace/EditableItineraryDayCard.tsx`** — added optional `onRegenerate` prop; renders an "Improve day" pill button alongside "Add stop" when provided.
- **`features/trips/workspace/OverviewTab.tsx`** — added `regeneratingDayIndex` state; passes `onRegenerate` to each day card (only when not dirty); renders `<RegenerateSheet>`; `handleAcceptRefinement` replaces `editableItinerary` with the refined result and clears the sheet — user still publishes via the existing "Publish changes" flow.

**UX invariants:**
- The existing itinerary is never replaced until the user explicitly taps "Accept changes"
- "Improve day" button is hidden when the itinerary has unpublished edits (prevents conflating manual and AI edits)
- Accepting marks the itinerary as dirty and requires a separate "Publish changes" step
- Cancelling / "Keep original" leaves the itinerary and state unchanged

**Tests (`__tests__/workspace/RegenerateSheet.test.tsx` — 9 passing):**
- Mutation called with correct `tripId`, `regenerate_day_number`, and no variant by default
- Selected variant forwarded to mutation payload
- Loading message shown; CTA hidden while refining
- Error message shown on mutation reject
- `onAccept` called with the refined itinerary (not the original)
- `onAccept` NOT called when user dismisses with "Keep original"
- Refined stop titles visible in preview before acceptance
- Day title display (day_title vs "Day N" fallback)

**Test infrastructure added:**
- `jest`, `jest-expo@~54`, `@testing-library/react-native`, `@types/jest`, `react-test-renderer@19.1.0` added to devDependencies
- Jest config added to `package.json` (preset: `jest-expo`, moduleNameMapper for `@/` path alias)
- Run with: `npm test`

---

## Pending Slices

---

### Slice 7 — Archive Enhancements + Profile Stats

Two lightweight screens brought to web quality. No new API calls needed — data already fetched.

**Web reference files:**
- `ui/src/features/archive/ArchivePage.tsx`
- `ui/src/features/profile/ProfilePage.tsx`

**Archive (`app/(tabs)/archive.tsx`):**
1. Search input at top — client-side filter by title or destination
2. Year grouping — group trips by year from `end_date`; use `SectionList` with year headers between groups
3. Pull-to-refresh (already available in trips list; mirror pattern)

**Profile (`app/(tabs)/profile.tsx`):**
1. Travel stats row derived from `useTripsQuery` data (no new endpoints):
   - Total trips
   - Unique destinations (deduplicate on destination string)
   - Total days planned (sum of trip durations)
2. "Change password" row → navigates to `/(auth)/forgot-password`
3. Display name with Playfair Display font (visual alignment with web hero text)

---

### Slice 8 — Companions / Matching

Port the web matching feature. The web has `MatchingPage`, `TravelProfileForm`, hooks, adapters, and components that are all functional against the existing backend.

**Web reference files (read all before writing any mobile code):**
- `ui/src/features/matching/MatchingPage.tsx`
- `ui/src/features/matching/TravelProfileForm.tsx`
- `ui/src/features/matching/hooks.ts`
- `ui/src/features/matching/api.ts`
- `ui/src/features/matching/adapters/` (if present)
- `ui/src/features/matching/components/` (if present)

**Mobile existing:**
- `app/(tabs)/companions.tsx` — stub (empty state only)
- `features/matching/api.ts` and `features/matching/hooks.ts` already exist; re-audit before porting more files
- No mobile matching UI/components are complete yet

**Deliverables:**
1. Re-audit existing `features/matching/api.ts` and `features/matching/hooks.ts` against web before editing
2. `features/matching/adapters.ts` — typed view models for match card display
3. `features/matching/TravelProfileForm.tsx` — travel style, budget, interests, availability form
4. `features/matching/MatchList.tsx` — FlatList of match cards with compatibility score chips
5. Update `app/(tabs)/companions.tsx` — replace stub with full matching screen

**Notes:**
- Do not replicate framer-motion animations; use `Pressable` + NativeWind active states
- Prefer `SectionCard` and existing shared UI primitives over new ones

---

### Slice 9 — Explore Feature

Port destination discovery. Currently a stub behind `EXPO_PUBLIC_ENABLE_EXPLORE=true`.

**Web reference files (read all before writing):**
- `ui/src/features/explore/` (all files)

**Mobile existing:**
- `app/(tabs)/explore.tsx` — stub

**Deliverables:**
1. `features/explore/api.ts` — port web explore API calls
2. `features/explore/hooks.ts` — queries for destinations, categories
3. `features/explore/ExploreScreen.tsx` — search bar, category chip row, destination cards in `FlatList`
4. Update `app/(tabs)/explore.tsx` — replace stub with `ExploreScreen`

**Notes:**
- Web uses horizontal carousels; mobile adapts to vertical `FlatList` with `SectionList` headers
- Destination data comes from the existing backend (OpenTripMap); no new endpoints

---

### Slice 10 — Chat Collaboration

In-trip group chat. Shown in `WorkspaceScreen` when `isCollaborationActive` is true (>1 owner/accepted member). Currently commented as "not yet ported."

**Web reference files:**
- `ui/src/features/trips/workspace/tabs/ChatTab.tsx`
- Wherever the chat API and hooks live in web

**Mobile existing:**
- `WorkspaceScreen.tsx`: chat tab guarded and commented out

**Deliverables:**
1. `features/trips/chat/api.ts` — message fetch + send
2. `features/trips/chat/hooks.ts` — `useChatQuery`, `useSendMessageMutation`
3. `features/trips/workspace/ChatTab.tsx` — inverted `FlatList` for messages + compose input at bottom
4. Wire `ChatTab` into `WorkspaceScreen` tab list when `isCollaborationActive` is true

---

### Slice 11 — Map Tab

Interactive trip map with itinerary stop pins. Gated behind `EXPO_PUBLIC_ENABLE_MAP=true`; no SDK is integrated yet.

**Prerequisite:** Choose a map SDK compatible with Expo SDK 54 (e.g. `react-native-maps`). Confirm compatibility before starting this slice.

**Deliverables:**
1. Install and configure map SDK
2. `features/trips/workspace/MapTab.tsx` — reads `useSavedItineraryQuery`; renders stop coordinates as pins (`lat`/`lon` already on `ItineraryItem`)
3. Tap a pin → bottom sheet with stop title, time, notes
4. Wire into `WorkspaceScreen` behind `EXPO_PUBLIC_ENABLE_MAP=true`

---

## Icon Audit (ongoing)

`BookingsTab` still uses emoji in `TYPE_ICONS` (`✈`, `🏨`, `🚆`, etc.). Replace with Ionicons as part of whichever slice next touches that file. Find remaining emoji usage with:

```bash
grep -rn "['\"]\(✈\|🏨\|🚆\|🚌\|🚗\|🎯\|🍽\|📌\|🗺\|📦\|💰\|👥\)" features/ app/
```

---

## Key File Reference

| Concern | Web source of truth | Mobile counterpart |
|---|---|---|
| Auth flows | `ui/src/features/auth/` | `app/(auth)/`, `features/auth/` (screens present) |
| Trip list | `ui/src/features/trips/list/TripList.tsx` | `app/(tabs)/trips/index.tsx` |
| Workspace screen | web workspace is inline in `TripList`; see `useTripWorkspaceModel` | `features/trips/workspace/WorkspaceScreen.tsx` |
| Overview / itinerary | `ui/src/features/trips/workspace/tabs/OverviewTab.tsx` | `features/trips/workspace/OverviewTab.tsx` |
| Editable itinerary | `ui/src/features/trips/itinerary/components/EditableItineraryPanel.tsx` | `features/trips/workspace/OverviewTab.tsx`, `EditableItineraryDayCard.tsx`, `StopEditSheet.tsx` |
| Bookings | `ui/src/features/trips/workspace/tabs/BookingsTab.tsx` | `features/trips/workspace/BookingsTab.tsx` |
| Budget | `ui/src/features/trips/workspace/tabs/BudgetTab.tsx` | `features/trips/workspace/BudgetTab.tsx` |
| Packing | `ui/src/features/trips/workspace/tabs/PackingTab.tsx` | `features/trips/workspace/PackingTab.tsx` |
| Members / group | `ui/src/features/trips/workspace/tabs/GroupTab.tsx` | `features/trips/workspace/MembersTab.tsx` |
| OnTrip execution | `ui/src/features/trips/workspace/onTrip/` | `features/trips/onTrip/` |
| Matching | `ui/src/features/matching/` | `app/(tabs)/companions.tsx` (stub) |
| Explore | `ui/src/features/explore/` | `app/(tabs)/explore.tsx` (stub) |
| Archive | `ui/src/features/archive/ArchivePage.tsx` | `app/(tabs)/archive.tsx` |
| Profile | `ui/src/features/profile/ProfilePage.tsx` | `app/(tabs)/profile.tsx` |
| Design tokens | `ui/src/index.css` (`@theme` block) | `ui-mobile/tailwind.config.js` |
| Typography scale | `ui/src/index.css` (font-display, font-body) | `shared/theme/typography.ts` |
| API client | `ui/src/shared/api/client.ts` | `shared/api/client.ts` |
| Trip types | `ui/src/shared/api/trips.ts` | `features/trips/types.ts` |
| AI / itinerary types | `ui/src/shared/api/ai.ts` | `features/ai/api.ts` |
| Auth hooks | `ui/src/features/auth/hooks.ts` | `features/auth/hooks.ts` (all hooks exist) |
