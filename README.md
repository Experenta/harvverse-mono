# harvverse-monorepo

This project was created with [Better-T-Stack](https://github.com/AmanVarshney01/create-better-t-stack), a TypeScript stack that combines Next.js, tRPC, Drizzle, PostgreSQL, shared UI primitives, and Turborepo.

## Quickstart

Install dependencies:

```bash
pnpm install
```

Create `apps/web/.env` if it does not already exist:

```bash
CORS_ORIGIN=http://localhost:3001
DATABASE_URL=postgresql://postgres:password@localhost:5432/harvverse-monorepo
```

Start the local Postgres container first:

```bash
pnpm db:start
```

Then apply the current Drizzle schema:

```bash
pnpm db:push
```

Run the web app:

```bash
pnpm dev
```

Open [http://localhost:3001](http://localhost:3001). The home page is a simple todo app that writes through `apps/web` -> `packages/api` -> `packages/db` -> PostgreSQL.

## Database Workflow

Use `pnpm db:start` before any command that needs a live local database. For a new checkout or local schema iteration, run `pnpm db:start` first, then `pnpm db:push`.

- `pnpm db:push`: Pushes the current schema directly to the database. Use this for quick local development when you are still shaping tables.
- `pnpm db:generate`: Creates SQL migration files from schema changes. Use this when a schema change is ready to be reviewed, committed, and replayed elsewhere.
- `pnpm db:migrate`: Applies generated migration files to the database. Use this for shared environments, CI, production-like databases, and after pulling committed migrations from another developer.
- `pnpm db:studio`: Opens Drizzle Studio against the configured database.
- `pnpm db:watch`: Runs the database container in the foreground so logs are visible.
- `pnpm db:stop`: Stops the local container without removing data.
- `pnpm db:down`: Stops and removes the local Compose resources.

Recommended local loop:

```bash
pnpm db:start
pnpm db:push
pnpm dev
```

Migration loop for durable schema changes:

```bash
pnpm db:generate
pnpm db:migrate
```

## Architecture

This is a Turborepo workspace. Applications live in `apps/*`; reusable code lives in `packages/*`. Keep product behavior close to the package that owns it instead of importing across package internals.

```
harvverse-monorepo/
├── apps/
│   └── web/              # Next.js app, route handlers, pages, app-specific UI
├── packages/
│   ├── api/              # tRPC routers and server-side application logic
│   ├── config/           # Shared TypeScript configuration
│   ├── db/               # Drizzle schema, client, migrations, database scripts
│   ├── env/              # Runtime environment validation
│   └── ui/               # Shared shadcn/Base UI primitives and styles
```

Ownership rules:

- Put browser routes, pages, route handlers, layouts, and app-only components in `apps/web`.
- Put reusable UI primitives in `packages/ui`; do not put product-specific flows there.
- Put tRPC procedures, request validation, and server-side use-case logic in `packages/api`.
- Put tables, relations, database client setup, and generated migrations in `packages/db`.
- Put environment variable schemas in `packages/env`.
- Put shared tool configuration in `packages/config`.

The todo demo follows those boundaries:

- `packages/db/src/schema/index.ts` defines the `todos` table.
- `packages/api/src/routers/index.ts` exposes `todos.list`, `todos.create`, `todos.toggle`, and `todos.delete`.
- `apps/web/src/app/page.tsx` renders the todo UI and calls the tRPC procedures.

## UI Customization

React web apps in this stack share shadcn/Base UI primitives through `packages/ui`.

- Change design tokens and global styles in `packages/ui/src/styles/globals.css`.
- Update shared primitives in `packages/ui/src/components/*`.
- Adjust shadcn aliases or style config in `packages/ui/components.json` and `apps/web/components.json`.

Add more shared primitives from the project root:

```bash
npx shadcn@latest add accordion dialog popover sheet table -c packages/ui
```

Import shared components like this:

```tsx
import { Button } from "@harvverse-monorepo/ui/components/button";
```

## Available Scripts

- `pnpm dev`: Start all applications in development mode.
- `pnpm build`: Build all applications.
- `pnpm dev:web`: Start only the web application.
- `pnpm check-types`: Check TypeScript types across the workspace.
- `pnpm db:start`: Start local PostgreSQL with Docker Compose.
- `pnpm db:push`: Push schema changes directly to the configured database.
- `pnpm db:generate`: Generate Drizzle migration files.
- `pnpm db:migrate`: Apply generated Drizzle migrations.
- `pnpm db:studio`: Open Drizzle Studio.
- `pnpm db:stop`: Stop local PostgreSQL.
- `pnpm db:down`: Remove local PostgreSQL Compose resources.

## Environment Variables

Copy `.env.example` to `apps/web/.env` and fill in the required values:

```
# Required
DATABASE_URL=postgresql://postgres:password@localhost:5432/harvverse-monorepo
CORS_ORIGIN=http://localhost:3001

# Clerk authentication — create a project at https://clerk.com/dashboard
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

# Local Hardhat demo contracts (populated automatically — see Demo Contracts below)
NEXT_PUBLIC_USE_LOCAL_CONTRACTS=true
NEXT_PUBLIC_HARDHAT_CHAIN_ID=31337
NEXT_PUBLIC_USDC_ADDRESS=
NEXT_PUBLIC_PARTNERSHIP_ADDRESS=

# Copernicus / satellite risk scoring (optional — degrades gracefully)
SENTINEL_HUB_CLIENT_ID=
SENTINEL_HUB_CLIENT_SECRET=
CDS_API_KEY=
```

## Clerk Authentication

Auth is handled by [Clerk](https://clerk.com). Before running the app:

1. Create a project at [clerk.com/dashboard](https://clerk.com/dashboard).
2. Copy the **Publishable Key** and **Secret Key** into `apps/web/.env`.
3. Enable **Web3 / Ethereum** wallet support in Clerk's dashboard if you want wallet-linked accounts.

The app uses `/sign-in` and `/sign-up` routes (Clerk-hosted components) and an `/onboarding` page where users pick their role (Farmer or Partner) and the DB record is created.

## Demo Contracts (Local Hardhat)

To deploy the Harvverse contracts to a local Hardhat node and populate the DB with demo data:

```bash
# Terminal 1 — start the local chain
pnpm --filter @harvverse-monorepo/contracts node

# Terminal 2 — deploy and seed
pnpm setup:demo
```

`pnpm setup:demo` deploys `MockUSDC`, `HarvverseLot`, `HarvverseEvidence`, and `HarvversePartnership`, then writes their addresses into `apps/web/.env` automatically and seeds the database with a demo farm, lot, plan, and partner account.

Demo wallet (Hardhat account #0, pre-funded with 10 000 ETH and mock USDC):
- Address: `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266`
- Private key: `0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80`
> **Never use Hardhat demo keys outside of localhost.**
