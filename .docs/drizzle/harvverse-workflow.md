# Harvverse database migrations (codebase-first)

Harvverse uses Drizzle **Option 3** ([migrations fundamentals](./migrations.md)): TypeScript schema is the source of truth, SQL files are generated with `drizzle-kit generate` and applied with `pnpm db:migrate` (`packages/db/scripts/migrate-prod.mjs`).

## Source of truth

| Path | Role |
|------|------|
| `packages/db/src/schema/` | Declarative schema (`pgTable`, etc.) |
| `packages/db/src/migrations/*.sql` | Generated SQL (review and commit) |
| `packages/db/src/migrations/meta/` | Snapshots + `_journal.json` (commit with SQL) |
| `packages/db/drizzle.config.ts` | `schema`, `out`, `DATABASE_URL` |

## Commands (repo root)

```bash
pnpm db:start          # local Postgres (Docker)
pnpm db:generate       # after schema edits → new SQL + meta
pnpm db:migrate        # apply committed migrations locally
pnpm db:push           # local prototyping only — never RDS
```

## Workflow by environment

| Environment | Change schema | Apply to database |
|-------------|---------------|-------------------|
| **Local** | Edit `packages/db/src/schema/*` | `pnpm db:push` while iterating; before PR use generate + migrate |
| **PR** | Same | `pnpm db:generate` → commit SQL + meta → `pnpm db:migrate` locally |
| **Production RDS** | Same commits | One-off ECS task → `pnpm db:migrate` (never `db:push`) |

Deploy order on `main`: **migrate task succeeds → then** web ECS service update.

## Production runner

- **Image:** `packages/db/Dockerfile.migrate` → ECR `harvverse/migrate`
- **ECS task:** `Harvversev2Migrate` / family `harvverse-migrate`
- **Secrets:** `DATABASE_URL` from `harvverse/prod/database`
- **Logs:** CloudWatch `/harvverse/migrate`

### Manual run (after image push)

```bash
chmod +x scripts/ecs/*.sh
pnpm ecs:run-migrate
```

Or use stack outputs from `Harvversev2Migrate` and `Harvversev2Platform` with `aws ecs run-task` (see `packages/infra/README.md`).

### Build migrate image only

```bash
# ECR_REGISTRY=<account>.dkr.ecr.us-east-2.amazonaws.com
pnpm docker:build:migrate
# CodeBuild: buildspec.migrate.yml
```

## PR checklist (schema changes)

- [ ] Changes are in `packages/db/src/schema/`, not ad-hoc SQL on RDS
- [ ] `pnpm db:generate` run; `*.sql` and `meta/*` included in the PR
- [ ] `pnpm db:migrate` succeeds against local Docker Postgres
- [ ] Destructive SQL reviewed (drops, renames)
- [ ] App code in the same PR works with the new schema

## What we do not use

- `drizzle-kit pull` (database-first)
- `drizzle-kit push` on RDS
- `drizzle-kit migrate` in the ECS migrate image (use `migrate-prod.mjs`)
- `migrate()` in the Next.js app boot (Option 4)

**RDS `DATABASE_URL`:** URL-encode the password; omit `?sslmode=require` from the secret — see `.docs/aws-deployment-plan.md` §10.4.

See `.docs/aws-deployment-plan.md` §9 for ECS/CDK and pipeline details.
