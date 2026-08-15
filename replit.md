# SafeSig (SafeSignal AI) Workspace

SafeSig is an intelligent secure navigation and network risk mapping system providing physical crime risk mapping, real-time threat scanning (Wi-Fi, Bluetooth, Phishing), live safety alerts, route planning, and emergency SOS services.

## Run & Operate

- `pnpm --filter @workspace/safesignal-ai run dev` — run the SafeSignal AI Expo / React Native App (web/mobile)
- `pnpm --filter @workspace/api-server run dev` — run the API server (Express 5, port 5000)
- `pnpm --filter @workspace/mockup-sandbox run dev` — run the UI mockup sandbox (Vite + React + Tailwind v4)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — PostgreSQL connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- App: React Native (0.81), Expo (v54), Expo Router (v6), `@tanstack/react-query`
- API: Express 5, Pino logging, esbuild (CJS bundle)
- UI Sandbox: Vite 7, React 19, TailwindCSS v4, Radix UI, Framer Motion
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)

## Where things live

- **`artifacts/safesignal-ai`**: React Native / Expo mobile & web app implementing all 7 screens (Splash, Home Dashboard, Route Planner, Threat Scanner, Live Alerts, SOS Emergency, Profile/Settings).
- **`artifacts/api-server`**: Express 5 backend server with `/api/healthz` status endpoint.
- **`artifacts/mockup-sandbox`**: Standalone web UI sandbox for component prototyping.
- **`lib/db`**: Database schema source-of-truth and Drizzle ORM setup.
- **`lib/api-spec`**: OpenAPI 3.1 schema specification (`openapi.yaml`) and Orval configuration.
- **`lib/api-zod`**: Auto-generated Zod validation schemas.
- **`lib/api-client-react`**: Auto-generated React Query API hooks.

## Architecture Decisions & Features

- Mobile-first design system with responsive card layouts and strict color coding (Blue #2563EB primary, Red #EF4444 danger/SOS, Orange #F59E0B warning, Green #10B981 success).
- Zero external map dependency: uses plain interactive card placeholders for map visualizations.
- Tabbed navigation and modal overlays for emergency contacts management and live security filters.
