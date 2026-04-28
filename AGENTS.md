# Waypoint Mobile - Agent Instructions

## Required global checklist

Before implementation, read and follow:

1. `V1_SCOPE.md` (source of truth for in/out-of-scope decisions)
2. `COPILOT_CHECKLIST.md` (cross-surface implementation checklist)

If a request conflicts with `V1_SCOPE.md`, stop and report the conflict before coding.

Additional hard constraint from the global checklist: do not change colors, fonts, or typography in `ui/` or `ui-mobile/` unless explicitly requested.

## Hard Constraints

1. **Mobile Product Goal:** The mobile app is for fast execution and lightweight trip management, not deep planning. Heavy itinerary restructuring, AI planning, and complex editing should remain in the web workspace unless the user explicitly asks for mobile support.

2. **No Mock Production Data:** Do not add static trips, stops, places, expenses, reservations, people, or placeholder production data. Use real API data, typed fallback shells, or meaningful empty states.

3. **Thin Renderers:** Screen components must remain presentation-focused. Business logic, trip readiness derivation, data normalization, and state orchestration belong in hooks, typed adapters, view-model helpers, or pure utility functions.

4. **Preserve Existing Architecture:** Do not rewrite routing, replace workspace orchestration, introduce parallel state systems, or bypass existing API clients/hooks unless the task explicitly requires it.

5. **Solo-First Adaptive UI:** Hide collaboration-only features such as handled-by metadata, group chat, balances, shared ownership, and collaborator activity when the trip has only one member.

6. **Design System:** Use the Desert Editorial aesthetic. Typography is **Cormorant Garamond** for editorial headings and display text, **Manrope** for UI text, and **JetBrains Mono** for kickers, metadata labels, and timestamps (as defined in `STYLE.MD.md`). Do not introduce unrelated palettes, heavy shadows, bright gradients, or generic SaaS styling.

7. **NativeWind Styling:** Use NativeWind/Tailwind-style class names for normal layout and styling. Do not introduce new StyleSheet-heavy patterns unless required for platform-specific behavior or an existing file already uses that pattern.

8. **State Coverage:** Every screen or component that depends on remote data must handle loading, empty, error, and partial-data states. Missing optional fields must not crash the UI or create blank-looking sections.

9. **Accessibility:** Interactive elements must have practical tap targets. Icon-only buttons must include accessibility labels.

## Design Guardrails

1. **Reference Existing UI First:** Before building or changing mobile UI, inspect existing components, shared primitives, tokens, and the closest web UI equivalent. Reuse established spacing, radius, borders, typography, and color patterns.

2. **Progressive Disclosure:** Keep primary screens focused. Put dense editing, long notes, metadata, filters, and advanced controls in sheets, drawers, details views, or secondary tabs.

3. **Hierarchy First:** Each screen should have one clear primary purpose, one obvious primary action, and secondary actions styled as links, chips, or sheet actions.

4. **Compact Mobile Patterns:** Prefer compact tappable rows for days, stops, expenses, reservations, and packing items. Use large cards only for hero content, active trip state, next-up actions, or empty states.

5. **No Overcrowded Surfaces:** Do not show every available field just because it exists. Show only what helps the user understand status, decide, or act.

6. **Meaningful Empty States:** Empty states should explain what is missing and what the user can do next, using product-specific copy.

7. **Consistent Interactions:** Tapping a row should consistently open details, edit, or navigate to the relevant tab. Do not mix behavior randomly.

8. **One-Handed Ergonomics:** Important actions should be easy to reach when practical, especially in OnTrip or execution-focused flows.

## Pre-Finish Design Checklist

Before completing a UI task, verify:
- The screen has one clear purpose.
- The primary action is obvious.
- The layout is calm, scannable, and mobile-friendly.
- Loading, empty, error, and partial-data states are handled.
- No fake production data was introduced.
- The design matches existing Waypoint typography, spacing, color, and radius.
- Long destination names, missing optional fields, and small screens do not break the layout.
