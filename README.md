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
