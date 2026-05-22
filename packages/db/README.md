# @harvverse-monorepo/db

Drizzle ORM, PostgreSQL schema, and migrations for Harvverse.

## Scripts

| Script | Command | Use |
|--------|---------|-----|
| `db:start` | `docker compose up -d` | Local Postgres on port 5432 |
| `db:generate` | `drizzle-kit generate` | Create SQL from schema diff |
| `db:migrate` | `drizzle-kit migrate` | Apply committed migrations |
| `db:push` | `drizzle-kit push` | **Local only** — rapid prototyping |
| `db:studio` | `drizzle-kit studio` | Local DB browser |
| `db:seed` | `tsx src/seed.ts` | Optional seed data (not in CI) |

From the monorepo root, prefix with `pnpm` (e.g. `pnpm db:migrate`).

## Configuration

`drizzle.config.ts` reads `DATABASE_URL` from the environment. For local dev it falls back to `apps/web/.env` unless `DOTENV_PATH` is set. ECS migration tasks inject `DATABASE_URL` from Secrets Manager (no `.env` file).

## Production image

```bash
# From repo root
pnpm docker:build:migrate
```

See `Dockerfile.migrate` and `.docs/drizzle/harvverse-workflow.md`.
