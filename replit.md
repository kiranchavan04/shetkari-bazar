# Shetkari Bazar

A direct farmers' marketplace where farmers list their produce and buyers browse listings to contact them directly.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm --filter @workspace/shetkari-bazar run dev` — run the frontend (port 20208)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string (auto-provisioned)

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite + Tailwind CSS + shadcn/ui + wouter
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)
- Charts: Recharts

## Where things live

- `lib/api-spec/openapi.yaml` — OpenAPI spec (source of truth for all API contracts)
- `lib/db/src/schema/listings.ts` — Drizzle DB schema for listings table
- `artifacts/api-server/src/routes/listings.ts` — Listings CRUD routes
- `artifacts/api-server/src/routes/stats.ts` — Market stats routes
- `artifacts/shetkari-bazar/src/` — React frontend
- `lib/api-client-react/src/generated/` — Generated React Query hooks (do not edit)
- `lib/api-zod/src/generated/` — Generated Zod schemas for server (do not edit)

## Architecture decisions

- Contract-first: OpenAPI spec gates codegen which gates frontend types
- Grades are fixed: Motha (Large), Medium, Golti (Small), Kharab (Damaged)
- Crops: Kanda (Onion), Tamata (Tomato), Batata (Potato), Mirchi (Chilli), Lasun (Garlic)
- Auth: Mobile OTP login. OTP stored in `otp_codes` table (10 min expiry). Sessions in `sessions` table (30 days). Token stored in localStorage, sent as `Authorization: Bearer <token>`.
- Demo mode: OTP is returned in API response (no SMS provider). Wire in MSG91/Twilio to send real SMS.
- Roles: `shetkari` can add listings; `buyer` can browse only. "Add Produce" nav is hidden for buyers.
- Stats computed in SQL aggregations on-demand (no caching)

## Product

- **Home page**: Browse all listings with crop/grade filters + market summary banner
- **Add Produce page**: Farmer fills form to list produce with grade and price
- **Market Stats page**: Charts showing avg price and volume by crop
- **Listing Detail page**: Full details with farmer phone number to contact

## User preferences

- Marathi-first UI: crop and grade names shown in both Marathi and English
- No emojis anywhere in the UI

## Gotchas

- After editing `lib/api-spec/openapi.yaml`, always run `pnpm --filter @workspace/api-spec run codegen`
- After adding new DB tables, run `pnpm --filter @workspace/db run push`
- The `lib/db` lib must be rebuilt (`pnpm run typecheck:libs`) before the API server can see new table exports

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
