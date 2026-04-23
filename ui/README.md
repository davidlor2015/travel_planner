# Waypoint — Frontend

React 19 + TypeScript frontend for the Waypoint travel planning app. See the root README for full project setup and backend instructions.

## Getting started

```bash
npm install
npm run dev
```

Runs at `http://localhost:5173`. Expects the backend at `http://localhost:8000` by default.

To point at a different backend, create a `.env` file in this directory:

```
VITE_API_URL=http://localhost:8000
```

## Commands

```bash
npm run dev        # development server with hot reload
npm run build      # type-check (tsc) then bundle with Vite
npm run lint       # ESLint
npm run test       # Vitest unit tests
npm run test:e2e   # Playwright end-to-end tests
npm run preview    # preview the production build locally
```

## Structure

```
src/
├── features/
│   ├── trips/         # Trip workspace, itinerary editor, logistics, map, live execution
│   ├── matching/      # Companion matching profile and requests
│   ├── explore/       # Destination discovery and mood filtering
│   ├── archive/       # Past trips view with summary stats
│   ├── profile/       # User profile and travel history stats
│   ├── auth/          # Login, registration, password reset, email verification
│   └── landing/       # Landing page
└── shared/
    ├── api/           # Typed API client functions — all HTTP calls go through here
    ├── auth/          # Auth state helpers and session utilities
    ├── hooks/         # Shared hooks
    └── ui/            # Shared UI primitives (form fields, inputs, etc.)
```

Each feature owns its components, hooks, adapters, and types. Business logic stays in hooks, adapters, and model files — components are kept thin.
