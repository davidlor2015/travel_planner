# Design System

Waypoint visual and interaction system, based on the current implementation and repository guardrails.

## Source of Truth

- Mobile guardrails: `AGENTS.md`
- Web design tokens: `ui/src/index.css`
- Mobile token mirror: `ui-mobile/tailwind.config.js`
- Mobile typography helpers: `ui-mobile/shared/theme/typography.ts`
- Shared primitives:
  - Web: `ui/src/shared/ui/travelPrimitives.tsx`
  - Mobile: `ui-mobile/shared/ui/*.tsx`

## Visual Direction

- Style: Desert Editorial
- Typography families:
  - UI/body text: `Inter`
  - Editorial headings: `Playfair Display`
- Styling approach:
  - Web: Tailwind with tokenized CSS variables in `@theme`
  - Mobile: NativeWind utility classes with matching color tokens

## Color System

Two-level model is implemented in `ui/src/index.css` and mirrored in `ui-mobile/tailwind.config.js`.

## 1) Palette primitives (examples)

- Text: `espresso`, `ink`, `flint`, `muted`
- Surfaces: `ivory`, `parchment`, `parchment-soft`, `cream`, `smoke`, `divider`
- Accent: `amber`, `amber-dark`, `brass`, `clay-accent`
- State: `olive` (success), `danger`, `depth`

## 2) Semantic aliases (examples)

- Base/planning surfaces: `bg`, `bg-app`, `surface`, `surface-muted`, `surface-strong`
- Base text: `text`, `text-muted`, `text-soft`
- Base borders: `border`, `border-strong`
- Execution/on-trip surfaces: `surface-ontrip`, `surface-ontrip-raised`, `surface-exec`
- Execution text: `ontrip`, `ontrip-strong`, `ontrip-muted`, `on-dark`

## On-trip vs planning theme

- Planning/workspace screens use calmer light surfaces.
- On-trip surfaces use stronger contrast and dedicated execution tokens.
- Both are from one shared palette family.

## Typography

## Web

Defined in `ui/src/index.css` tokens:

- `--font-sans`: `Inter`
- `--font-display`: `Playfair Display`
- `--font-mono`: `DM Mono`

Base body defaults:

- body size: `0.84375rem`
- body line-height: `1.6`

## Mobile

Defined in `ui-mobile/shared/theme/typography.ts`:

- UI families: `Inter_400Regular` / `500` / `600` / `700`
- Display families: `PlayfairDisplay_500Medium` / `600` / `700`

Semantic mobile text scales include:

- `displayXL` (editorial hero)
- `displayL` (section heading)
- `titleM`, `body`, `caption`

## Layout, Radius, and Elevation

## Radius

- Standard rounded card patterns use large radii (`20px`, `24px`) and pill radii.
- Token examples in mobile config: `xl2`, `xl3`, `pill`.

## Shadows

- System includes soft card shadows and deeper execution shadows.
- Token examples in mobile config: `card`, `float`, `exec`.

## Layout behavior

- Primary screens emphasize one clear action and scannable sections.
- Dense controls are expected to live in sheets or secondary views.
- Compact list-row patterns are preferred over oversized cards for routine trip operations.

## Mobile UI Rules (Repo Guardrails)

From `AGENTS.md`:

- Mobile focuses on fast execution and lightweight management; deep planning remains web-first by default.
- No fake production data; use real API state and meaningful empty states.
- Keep renderers thin; place orchestration in hooks/adapters/view models.
- Preserve existing architecture; do not bypass established API clients/hooks without explicit need.
- Solo-first adaptation: hide collaboration-only UI when trip has one member.
- Use NativeWind class-based styling for standard layout/styling.
- Every remote-data UI path should handle loading, empty, error, and partial data.
- Accessibility: practical tap targets and labels for icon-only actions.

## Component Patterns

## Web primitives (`ui/src/shared/ui/travelPrimitives.tsx`)

- Navigation: `AppTopNav`
- Layout wrappers: `PageSection`, `SectionHeading`
- States: `EmptyState`, `ErrorState`, `LoadingSkeleton`
- Status/utility: `StatusPill`, `AvatarStack`, `ActionButton`

## Mobile primitives (`ui-mobile/shared/ui`)

- Buttons: `Button`, `PrimaryButton`, `SecondaryButton`
- Framing: `ScreenHeader`, `SectionCard`
- State UI: `ScreenLoading`, `ScreenError`, `EmptyState`, `StatusPill`
- Form helpers: `Field`, `TextInputField`, `MultilineInputField`

## State and Interaction Patterns

- Use explicit loading/empty/error states for data-dependent screens.
- Prefer consistent row-tap behavior per feature (details/edit/navigation should be predictable).
- On-trip and execution flows prioritize one-handed, quick actions.

## Known Notes to Confirm

- Web heading comments in `ui/src/index.css` reference editorial behavior that should be confirmed against actual rendered components.
- If a component uses inline styles or non-token colors, current behavior should be confirmed before applying system-wide updates.
