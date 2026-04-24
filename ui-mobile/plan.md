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

---

## Pending Slices

---

### Slice 4 — Auth Parity

All API hooks already exist in `features/auth/hooks.ts`. Only screens are missing.

**Web reference files:**
- `ui/src/features/auth/ForgotPasswordPage.tsx`
- `ui/src/features/auth/ResetPasswordPage.tsx`
- `ui/src/features/auth/VerifyEmailRequestPage.tsx`
- `ui/src/features/auth/VerifyEmailPage.tsx`
- `ui/src/features/auth/LoginPage/LoginPage.tsx` (forgot-password link placement)

**Deliverables:**

1. **`app/(auth)/forgot-password.tsx`**
   - Email input + submit
   - Calls `useRequestPasswordResetMutation()` (hook already exists)
   - Success: confirmation message; back link to login

2. **`app/(auth)/reset-password.tsx`**
   - Reads `token` from `useLocalSearchParams`
   - New password + confirm inputs
   - Calls `useConfirmPasswordResetMutation({ token, password })`
   - Success: navigate to login

3. **`app/(auth)/verify-email.tsx`**
   - Reads `token` from `useLocalSearchParams`
   - Calls `useConfirmEmailVerificationMutation(token)` on mount
   - Shows success or error state with back-to-login action

4. **`app/(auth)/verify-email-request.tsx`**
   - Email input
   - Calls `useRequestEmailVerificationMutation(email)`
   - Confirmation message on success

5. **Update `app/(auth)/login.tsx`**
   - Add "Forgot password?" link → `/(auth)/forgot-password`
   - After successful register, surface message linking to `/(auth)/verify-email-request`

**Notes:**
- Deep-link token handling (email links opening the app to a token URL) is out of scope; in-app navigation only
- All screens use existing primitives: `SafeAreaView`, `KeyboardAvoidingView`, `TextInputField`, `PrimaryButton`, `SecondaryButton`
- No new shared UI primitives needed

---

### Slice 5 — Itinerary Editing

The largest product gap. `OverviewTab` renders the saved itinerary read-only. Web has a full `EditableItineraryPanel` with per-stop CRUD, day management, and a publish flow. Mobile scope: stop add/edit/delete + publish. Drag-drop reordering deferred.

**Web reference files:**
- `ui/src/features/trips/itinerary/EditableItineraryPanel.tsx`
- `ui/src/features/trips/itinerary/EditableItineraryDayCard.tsx`
- `ui/src/features/trips/itinerary/EditableTimelineStopRow.tsx`
- `ui/src/features/trips/workspace/tabs/SavedItineraryView.tsx`

**Mobile existing (do not break):**
- `features/trips/workspace/ItineraryDayCard.tsx` — read-only card used by OnTrip live view; do not modify
- `features/trips/workspace/ItineraryStopRow.tsx` — read-only row used by OnTrip live view; do not modify
- `features/ai/hooks.ts` — `useApplyItineraryMutation`, `useRefineItineraryMutation`
- `features/ai/api.ts` — `Itinerary`, `DayPlan`, `ItineraryItem` types

**Deliverables:**

1. **`features/trips/workspace/EditableItineraryDayCard.tsx`** (new)
   - Collapsible day card; tap header to expand/collapse
   - Header: day number pill, title, date, stop count
   - "Add stop" button at bottom of expanded list
   - Props: `day: DayPlan`, `onAddStop()`, `onUpdateStop(stopIndex, patch)`, `onDeleteStop(stopIndex)`

2. **`features/trips/workspace/StopEditSheet.tsx`** (new)
   - `Modal` slide-up with `TextInputField` for time, title, location, notes
   - Confirm delete with `Alert.alert`
   - Props: `visible`, `item: ItineraryItem | null`, `onSave(patch)`, `onDelete()`, `onClose()`

3. **Update `OverviewTab.tsx`**
   - When saved itinerary exists and `!isStreaming`: maintain a local `editableItinerary` state (copy of `itineraryQuery.data`)
   - Use `EditableItineraryDayCard` instead of read-only `ItineraryDayCard`
   - "Publish changes" button shown only when local copy differs from saved (`isDirty` boolean)
   - Publish calls `useApplyItineraryMutation`; on success reset dirty state
   - On streaming complete + auto-apply: also reset dirty state

**Deferred:**
- Drag-and-drop stop reordering
- Day duplication / clear day
- Lock / favorite per stop (used by refinement; add in Slice 6)

---

### Slice 6 — AI Refinement Controls

Adds regenerate controls for refining an existing itinerary by day, time block, and variant. Builds on existing `useRefineItineraryMutation` (already in `features/ai/hooks.ts` but unused).

**Web reference files:**
- `ui/src/features/trips/workspace/tabs/OverviewTab.tsx` (regeneration control state management)
- `ui/src/features/trips/itinerary/EditableItineraryPanel.tsx` (regenerate button, control layout)

**Mobile existing:**
- `features/ai/hooks.ts` — `useRefineItineraryMutation`
- `features/ai/api.ts` — `RefinementVariant`, `RefinementTimeBlock`

**Deliverables:**

1. **`features/trips/workspace/RegenerateSheet.tsx`** (new)
   - `Modal` slide-up
   - Day number picker (scrollable list built from current itinerary days)
   - Variant selector pills: `more_local` / `cheaper` / `faster_pace` / `less_walking`
   - Time block selector pills: `full_day` / `morning` / `afternoon` / `evening`
   - "Regenerate" button → calls `useRefineItineraryMutation`
   - On success: closes sheet, updates `editableItinerary` state in `OverviewTab`

2. **Update `OverviewTab.tsx`**
   - "Refine with AI" button alongside "Regenerate with AI" on saved view
   - Opens `RegenerateSheet`; on complete, update editable copy and set dirty

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
- No `features/matching/` directory exists yet

**Deliverables:**
1. `features/matching/api.ts` — port web API calls verbatim (same endpoints, no invention)
2. `features/matching/hooks.ts` — port TanStack Query hooks
3. `features/matching/adapters.ts` — typed view models for match card display
4. `features/matching/TravelProfileForm.tsx` — travel style, budget, interests, availability form
5. `features/matching/MatchList.tsx` — FlatList of match cards with compatibility score chips
6. Update `app/(tabs)/companions.tsx` — replace stub with full matching screen

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
| Auth flows | `ui/src/features/auth/` | `app/(auth)/`, `features/auth/` |
| Trip list | `ui/src/features/trips/list/TripList.tsx` | `app/(tabs)/trips/index.tsx` |
| Workspace screen | web workspace is inline in `TripList`; see `useTripWorkspaceModel` | `features/trips/workspace/WorkspaceScreen.tsx` |
| Overview / itinerary | `ui/src/features/trips/workspace/tabs/OverviewTab.tsx` | `features/trips/workspace/OverviewTab.tsx` |
| Editable itinerary | `ui/src/features/trips/itinerary/EditableItineraryPanel.tsx` | not yet ported (Slice 5) |
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
