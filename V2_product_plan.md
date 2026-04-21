# Waypoint V2 Product Plan

# 1. Executive Summary

Waypoint V1 established a strong editable **Trip Workspace** with a real itinerary editor, a clean architectural spine, and enough coordination primitives (ownership metadata, stop status, action layer foundation) to hint at a bigger product.

Waypoint V2 should not broaden the app. It should deepen the single strongest direction:

> Waypoint is the operational layer a person (or group) uses to actually run a trip — from early planning to the day-of.

V2 turns the workspace from "a better place to edit an itinerary" into "the place that tells you what to do next, what is blocking the trip, who is handling what, and what changed." Solo travelers get a calm, capable planning command center. Groups get the same product with coordination signals turned up.

V2 is an opinionated deepening play. It is not a feature expansion play.

# 2. V2 Product Goal

**Primary user outcome:** a traveler (solo or group) can open Waypoint and, within seconds, understand:

1. What the trip looks like right now.
2. What is blocking it.
3. What they should do next.
4. What changed since last time they looked.

Success is measured by whether users continue using Waypoint after the planning phase — specifically during the "countdown" and "on-trip" windows, not just during initial itinerary creation.

# 3. Product Positioning

### Positioning statement

**Waypoint is a trip workspace that helps travelers plan, edit, and actually run their trip — built to feel focused solo and to naturally adapt when others join.**

### One-sentence value proposition

**Waypoint keeps a trip moving forward — from the first stop you add, to the last bag you pack — without turning into a dashboard or a group chat.**

### Why this framing beats "group-only"

- Most trips start solo. The first user is usually one person drafting alone.
- A group-only product has a cold start problem every single time a user opens it.
- A solo-capable product with coordination upside has a smooth graduation path: one traveler today, a couple tomorrow, a friend group next year — all in the same workspace.
- Competitors that pitch themselves as "for groups" either feel empty for solo travelers or force unnecessary friction (invites, roles, permissions) before value is delivered.
- Framing Waypoint as "trip workspace that scales to coordination" keeps the product category tight while leaving room for its strongest differentiation.

Internal compass line, to be used in design reviews:

> Wanderlog organizes trip information. Waypoint helps people move a trip forward.

# 4. In Scope for V2

These are the feature areas V2 should commit to. Each one is chosen because it deepens the operational layer — not because it sounds cool.

### 4.1 Readiness and Blockers

**What it is:** A first-class concept in the workspace: the set of things that must be true for the trip to go well (confirmed lodging, booked transport, visa/passport status, packing minimums, budget covered, first-day stop has a time, etc.). Shown as a compact readiness panel and as inline blocker indicators on stops/days.

**Why it matters:** Itinerary editors are common. Readiness is not. This is where Waypoint earns its "operational layer" identity.

**Solo value:** A solo traveler gets a calm "am I ready?" view — often more useful than a dozen views of the same itinerary.

**Group uplift:** Readiness becomes multi-traveler: whose passport is missing, who has not confirmed their flight, whose prep is blocking the group.

**Risks / cautions:**
- Must not feel like a nagging checklist.
- Rules must be conservative. Never show a blocker that is actually fine.
- Readiness items must derive from real workspace state, not a parallel to-do database.

### 4.2 Actionability Layer ("What's next")

**What it is:** A small, always-present surface that answers "what should I do right now in this trip?" Derived from readiness, stop status, ownership, dates, and open items. Not a feed. A short, ranked list of concrete next actions.

**Why it matters:** Today trip apps show information. V2 Waypoint should recommend motion.

**Solo value:** The solo traveler gets one honest next step instead of a map of everything they could do.

**Group uplift:** The action list becomes aware of who each action belongs to, so group members see the subset relevant to them without filtering noise.

**Risks / cautions:**
- Never fabricate an action. If nothing needs doing, say so.
- Rules-based first. AI-ranked optional later. Not the reverse.
- Should not become a notification inbox.

### 4.3 Stop and Day Depth (Finishing V1's itinerary)

**What it is:** Extend the manual itinerary editor with small high-leverage improvements:
- Cross-day move (promoted from out-of-scope now that the slice is stable).
- Time conflict and overlap hints (still advisory, still manual).
- Day-level notes and anchors (flight, hotel check-in) as first-class node types, not freeform stops.
- Lightweight cost rollups per day and per trip.

**Why it matters:** The editor is the center of the product. It must feel better every release, not just broader.

**Solo value:** Direct, obvious usability.

**Group uplift:** Anchors and day-level hints matter most when multiple people depend on shared truth.

**Risks / cautions:**
- Do not add features that force structure onto freeform plans.
- Keep the interaction surface small and mobile-safe.
- Never auto-rewrite user edits.

### 4.4 Ownership and Handled-by, as Real Metadata

**What it is:** Promote V1's lightweight ownership (`handledBy`, `bookedBy`) from a notes-suffix encoding to first-class, optional, backend-supported fields on stops (and selected anchors like lodging, transport). UI stays compact.

**Why it matters:** The current notes-token encoding was correct for V1's scope but will become fragile under collaboration load.

**Solo value:** Almost none. Deliberately light for solo use.

**Group uplift:** Massive. It turns ownership from "a badge" into something the product can reason about (readiness, next actions, activity signals, filters).

**Risks / cautions:**
- Migration must preserve existing notes-encoded ownership values.
- UI must not force an assignee field on solo travelers.
- No permissions system bolted on. Ownership is a signal, not access control.

### 4.5 Activity and Change Awareness

**What it is:** A trip-scoped, low-noise record of meaningful changes: stops added/removed, ownership changed, blockers resolved, readiness state flipped. Surfaced as a compact "what changed" strip inside the workspace. Not a social feed.

**Why it matters:** Returning users (especially group members) need to answer "what happened since I last looked?" without scrolling.

**Solo value:** Helpful memory surface for "what did past-me decide?"

**Group uplift:** Becomes the heartbeat of multi-traveler trips.

**Risks / cautions:**
- Must not become chatter.
- Must collapse noise. Many small edits in the same session should roll up.
- Must not require any user to "mark as read" to feel clean.

### 4.6 On-Trip Mode (Countdown and Day-of)

**What it is:** A deliberately minimal execution UI that takes over once the trip is imminent. Emphasizes the current day, the next stop, what's still unresolved, and any blocker. Drops anything that is planning-only.

**Why it matters:** Waypoint's strongest differentiation is not "plan the trip," it is "stay useful during the trip." This is where most competitors silently lose.

**Solo value:** Clear, calm day-of view without mental overhead.

**Group uplift:** Everyone sees the same shared truth for the day, which is exactly where group trips go wrong most.

**Risks / cautions:**
- Should feel like a mode, not a new product.
- Must not require extra setup to activate.
- Must work well offline-ish (graceful degradation, no fake connectivity).

### 4.7 Coordination as Adaptive Enhancement

**What it is:** A deliberate layer that only turns on when there is more than one traveler:
- Per-member readiness.
- "Waiting on someone else" signals.
- Light, bounded invite + join flow.
- No chat. No threads. No feeds.

**Why it matters:** This is where the product differentiates without expanding category.

**Solo value:** Should be invisible until relevant.

**Group uplift:** Full.

**Risks / cautions:**
- Do not rebuild group chat.
- Do not introduce permissions.
- Do not create a collaboration UI that solo users have to mentally route around.

# 5. Out of Scope for V2

V2 must stay disciplined. The following are explicitly out of scope and should be rejected on sight during V2 work:

- Travel matching / companion discovery.
- Badges, streaks, gamification.
- General social feed, comments on stops, reactions.
- Broad destination explore expansion or curated city browsing as a feature category.
- Booking marketplace, affiliate flows, price comparison as primary UI.
- Dashboard-style "home" with wide summary widgets.
- In-app chat, threads, DMs.
- Live presence, "currently viewing," cursors.
- Public trip sharing as a social product.
- Multi-workspace / org-style features.
- Any AI feature that generates a full itinerary from scratch as the primary surface. AI stays assistive.

If an idea in these areas appears during V2 execution, it should be written down and deferred, not negotiated into scope.

# 6. Recommended Priority Order

Ranked by strategic value, risk reduction, and buildup effect.

1. **Promote Ownership to real metadata (4.4).** Unblocks almost everything else cleanly.
2. **Readiness and Blockers (4.1).** Defines Waypoint's new center of gravity.
3. **Actionability Layer (4.2).** Directly leverages readiness + ownership; this is where the product identity lands.
4. **Stop and Day Depth (4.3).** Continuous editor investment. Should ship in smaller slices alongside the above.
5. **Activity and Change Awareness (4.5).** Becomes valuable only after the above exist.
6. **Coordination as Adaptive Enhancement (4.7).** Should be gated behind the groundwork above, never the other way around.
7. **On-Trip Mode (4.6).** Highest-differentiation feature, but only believable once the underlying signals are trustworthy.

Reasoning: Waypoint wins by deepening operational signal quality before building surfaces that consume that signal. Collaboration and on-trip mode must stand on real metadata and real readiness — not on clever UI over weak data.

# 7. Proposed Milestones / Phases

### Phase 1 — "Real metadata, real readiness"

**Goal:** Turn current metadata hacks into first-class fields and introduce readiness as a product concept.

**Key deliverables:**
- Backend-supported ownership fields on stops/anchors.
- Migration for existing notes-token ownership.
- Readiness model + compact readiness panel in workspace.
- Blocker indicators on stops/days.

**Why here:** Everything later depends on this data being trustworthy.

**Dependencies:** None external. Depends only on current V1 foundation.

### Phase 2 — "Actionability"

**Goal:** Make Waypoint recommend motion.

**Key deliverables:**
- Rules-driven next-action layer.
- Contextual placement inside workspace (not a new tab).
- Solo-appropriate single-actor mode.

**Why here:** Requires readiness and ownership to be meaningful.

**Dependencies:** Phase 1.

### Phase 3 — "Editor depth, finally"

**Goal:** Close the remaining gaps in the editor that V1 deliberately deferred.

**Key deliverables:**
- Cross-day move with safe guards.
- Day-level anchors (lodging, transport) as real node types.
- Day-level cost rollup.

**Why here:** These are editor upgrades best done once readiness and ownership are real, so they can participate in the new model instead of retrofitting later.

**Dependencies:** Phases 1–2.

### Phase 4 — "Change awareness"

**Goal:** Returning users should always know what changed.

**Key deliverables:**
- Activity strip in workspace.
- Rollup rules to prevent noise.
- Per-user "last seen" signal (minimal, not read-tracking).

**Why here:** Only useful when there are meaningful changes to track, which Phases 1–3 produce.

**Dependencies:** Phases 1–3.

### Phase 5 — "Adaptive coordination"

**Goal:** Turn on group uplift without breaking solo flow.

**Key deliverables:**
- Minimal invite and join flow.
- Per-member readiness.
- "Waiting on X" signals.
- Solo mode must remain visually identical except for hidden coordination affordances.

**Why here:** Must come after actionability so coordination consumes the same signal, not a separate one.

**Dependencies:** Phases 1–4.

### Phase 6 — "On-Trip Mode"

**Goal:** Deliver the strongest differentiation once the signal foundation is trustworthy.

**Key deliverables:**
- Compact mode UI focused on today and next stop.
- Blocker surfacing during travel.
- Works for both solo and group with minimal divergence.

**Why here:** The feature that matters most, built last so it stands on real infrastructure.

**Dependencies:** Phases 1–5.

# 8. Product Risks

- **Losing solo users by over-collaborating.** If invite flows, assignees, or coordination UI leak into solo experience, the product feels heavy for its largest user segment. Mitigation: coordination is gated by "more than one traveler."
- **Turning the workspace into a dashboard.** Any time a new surface is introduced, it risks becoming a widget grid. Mitigation: every new surface must justify its presence by helping the trip move forward.
- **Over-centralizing AI.** AI should remain assistive. If V2 makes AI the primary creator of itineraries or readiness, it reintroduces V1's drift. Mitigation: rules-first, AI-assist second.
- **Editor complexity creep.** Adding anchors, cross-day moves, and cost rollups can compound interaction complexity. Mitigation: the editor must stay mobile-first and thin in render components.
- **Readiness feeling like nagging.** If readiness fires false positives or keeps showing blockers that users can't act on, it becomes hostile. Mitigation: ship readiness with conservative rules and no streaks/shame patterns.
- **Activity feed becoming chatter.** If every edit becomes an activity event, the feed becomes noise. Mitigation: aggressive rollup and a whitelist of meaningful change types.
- **Coordination turning into chat.** Any path that leads toward messaging should be rejected. Waypoint is not a messenger.

# 9. Technical / Architecture Considerations

### Preserve V1 boundaries
- Keep orchestration in model hooks.
- Keep pure transforms in helper/draft utilities.
- Keep render components thin.
- Keep API adapters typed and isolated.

Any V2 feature that requires dissolving these boundaries should be re-scoped or rejected.

### When lightweight metadata should become real

V1 correctly used a notes-suffix encoding for ownership because it avoided premature schema change. V2 must graduate this:

- Ownership becomes real optional fields on stop/anchor entities.
- Readiness is derived server-side where possible (authoritative) and mirrored client-side for responsiveness.
- Status stays small and bounded (`planned | confirmed | skipped`). No new statuses without a proven need.

### Action layer evolution

The existing action layer should grow to include:

- Rule-based readiness evaluators.
- Rule-based "next action" resolvers.
- Deterministic output suitable for both solo and group rendering.

The action layer should not become a generic rules engine. Keep it bounded to trip operations.

### Activity pipeline

Activity should be a thin derived layer, not a parallel write path from every mutation:

- Event recording flows from the same mutation boundary the editor already uses.
- Rollup and filtering happen at read time.
- No separate collaborative model, no CRDTs.

### Sequencing collaboration safely

Collaboration features should plug into existing entities rather than introduce parallel group structures:

- A trip already has members. Extend, do not replace.
- Ownership links stops to members. Do not introduce a separate assignee model.
- Do not introduce a permissions model. Ownership and membership are enough for V2.

### AI containment

AI-assisted features should remain surface-level and clearly scoped:

- AI assist in the editor.
- Optional smart defaults for readiness (disabled by default).
- No AI feature that wants the entire itinerary as its input/output by default.

# 10. Final Recommendation

Waypoint V2 should commit to one thesis:

> **Waypoint is the operational layer of a trip. Solo by default, group-capable by design.**

V2 should not chase feature parity with travel-content apps. It should win on:

1. Readiness being real.
2. Next action being honest.
3. Editor depth being calm.
4. Ownership being first-class.
5. Activity being low-noise.
6. Coordination being adaptive.
7. On-trip mode being the payoff.

Ship V2 in the sequence described above, defer everything in Section 5 without negotiation, and protect the existing architectural discipline. If V2 is executed with restraint, Waypoint becomes the rare travel product that feels lighter than a dashboard for solo users and more coordinated than a chat thread for groups — without ever trying to be either.
