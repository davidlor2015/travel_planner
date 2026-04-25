# Waypoint Mobile - Core Engineering Constraints
1. **Mobile Product Goal:** The mobile app is for fast execution, not deep planning. Prioritize "What's next?" and one-handed ergonomics. If a feature requires heavy editing, refer the user to the web workspace.
2. **Progressive Disclosure:** Do not build SaaS-style dashboards. Keep the primary view focused on the immediate itinerary. Complex coordination (budget, packing, reservations) must be hidden in slide-out drawers or sheets until actively requested.
3. **Thin Renderers:** Screen components must remain presentation-only. All business logic, trip readiness derivation, and state orchestration must be handled by `useTripWorkspaceModel` or pure utility functions.
4. **Solo-First Adaptive UI:** Hide all coordination features (like "handled by" metadata or group chat) if the trip only has one member.
5. **Design System:** Use the "Desert Editorial" aesthetic. Typography is exclusively 'Inter' for UI and 'Playfair Display' for editorial headings. 
