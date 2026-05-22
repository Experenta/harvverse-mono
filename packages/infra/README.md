# @harvverse-monorepo/infra

AWS CDK infrastructure for Harvverse. Stacks live in `lib/`, the app entry point is `bin/infra.ts`.

All CDK stack IDs use the **`Harvversev2`** prefix (e.g. `Harvversev2Network`) to avoid clashing with earlier stacks in the same AWS account. Helpers: `stackId()` and `cfnExportName()` in `lib/config.ts`.

## Prerequisites

- AWS CLI configured with the `Harvverse` profile (`~/.aws/credentials` or `~/.aws/config`)
- Bootstrap the target account/region once before the first deploy:

```bash
pnpm infra:bootstrap
```

## Stacks

| Stack | Resources | Phase |
|-------|-----------|-------|
| `Harvversev2Network` | VPC (`10.0.0.0/16`), 2 AZs, 1× NAT, public / private-app / private-data subnets, ALB/ECS/RDS/migration security groups | 2 |
| `Harvversev2Ecr` | ECR repositories `harvverse/web`, `harvverse/migrate` | 2 |
| `Harvversev2Data` | RDS PostgreSQL `db.t4g.micro` (20 GB gp3, single-AZ), Secrets Manager `harvverse/prod/database` | 3 |
| `Harvversev2Storage` | Private S3 bucket for farm images (SSE-S3, block public access) | 3 |
| `Harvversev2Platform` | ECS cluster, internet ALB, HTTPS (`defi.harvverse.farm` ACM cert), HTTP→HTTPS redirect | 4 |
| `Harvversev2Web` | Fargate **ARM64** web service (1 task), target group `/api/health`, Secrets Manager + S3 IAM | 4 |
| `Harvversev2Migrate` | One-off **ARM64** migration task definition (`harvverse-migrate`) | 5 |
| `Harvversev2Cicd` | CodePipeline (`main` → build/migrate → ECS deploy), CodeBuild (ARM) | 6–7 |

Production URL: **`https://defi.harvverse.farm`** (`CORS_ORIGIN` and ALB host-header rule). ACM certificate ARN is in `lib/config.ts`.

**Manual migrate/deploy** (`pnpm ecs:run-migrate`, local Docker push) remains the break-glass path after CI/CD is live.

## Commands

From the monorepo root:

| Command | Description |
|---------|-------------|
| `pnpm infra:build` | Compile TypeScript to `dist/` |
| `pnpm infra:synth` | Synthesize CloudFormation templates |
| `pnpm infra:diff` | Compare deployed stack with local changes |
| `pnpm infra:deploy -- <stacks...>` | Deploy specific CDK stacks (non-interactive; review with `infra:diff` first) |
| `pnpm infra:deploy:all` | Deploy all CDK stacks (non-interactive) |
| `pnpm infra:bootstrap` | Bootstrap CDK in the current AWS account/region |
| `pnpm infra:destroy` | Tear down deployed stacks |
| `pnpm infra:test` | Run CDK unit tests |

From `packages/infra`:

```bash
pnpm build
pnpm cdk:synth
pnpm cdk:deploy
```

### Phase 2 deploy (manual)

Deploy scripts pass `--require-approval never` so Turbo/pnpm deploys work without an interactive `(y/n)` prompt. Review changes first with `pnpm infra:diff`.

Deploy networking and ECR once before building ECS/RDS:

```bash
pnpm infra:build
pnpm infra:diff -- Harvversev2Network Harvversev2Ecr
pnpm infra:deploy -- Harvversev2Network Harvversev2Ecr
```

Or deploy individually:

```bash
cd packages/infra
pnpm cdk:deploy:network
pnpm cdk:deploy:ecr
```

For interactive IAM/security prompts, run from `packages/infra` without the flag:

```bash
pnpm cdk:deploy:interactive Harvversev2Network
```

After deploy, note the `WebRepositoryUri` output from `Harvversev2Ecr`.

### Phase 3 deploy (manual)

Deploy RDS and S3 after Phase 2. `Harvversev2Data` depends on `Harvversev2Network` (VPC + RDS security group).

```bash
pnpm infra:build
pnpm infra:diff -- Harvversev2Data Harvversev2Storage
pnpm infra:deploy -- Harvversev2Data Harvversev2Storage
```

Or deploy individually:

```bash
cd packages/infra
pnpm cdk:deploy:data
pnpm cdk:deploy:storage
```

**After `Harvversev2Data` deploys**, RDS populates the secret `harvverse/prod/database` with `username`, `password`, `host`, `port`, and `dbname`. The app expects a single `DATABASE_URL` — add it to the same secret (one-time):

```bash
# Read current secret fields, then put-secret-value with DATABASE_URL added
aws secretsmanager get-secret-value \
  --secret-id harvverse/prod/database \
  --profile Harvverse \
  --region us-east-2 \
  --query SecretString --output text

# Example shape after you compose the URL:
# postgresql://harvverse:<password>@<host>:5432/harvverse?sslmode=require
#
# Password must be URL-encoded if it contains :, @, ], /, etc. (common for RDS-generated passwords):
#   chmod +x scripts/aws/fix-database-url-secret.sh && ./scripts/aws/fix-database-url-secret.sh
aws secretsmanager put-secret-value \
  --secret-id harvverse/prod/database \
  --profile Harvverse \
  --region us-east-2 \
  --secret-string '{"username":"harvverse","password":"...","host":"...","port":5432,"dbname":"harvverse","DATABASE_URL":"postgresql://..."}'
```

Note the `FarmImagesBucketName` output from `Harvversev2Storage` — the web ECS task reads it automatically via CDK (`S3_FARM_IMAGES_BUCKET`).

### Phase 4 deploy (manual)

**Prerequisites**

1. `DATABASE_URL` key in `harvverse/prod/database` (see Phase 3 above)
2. `harvverse/prod/clerk` secret with `CLERK_SECRET_KEY`
3. Docker images pushed to ECR **before** `Harvversev2Web` can stabilize (see below)

Deploy platform, web, and migrate stacks. CDK also updates `Harvversev2Ecr` to add `harvverse/migrate`.

```bash
pnpm infra:build
pnpm infra:diff -- Harvversev2Ecr Harvversev2Platform Harvversev2Web Harvversev2Migrate
pnpm infra:deploy -- Harvversev2Ecr Harvversev2Platform Harvversev2Web Harvversev2Migrate
```

**Push container images** (replace `<account>` with `500501923704`):

```bash
aws ecr get-login-password --region us-east-2 --profile Harvverse \
  | docker login --username AWS --password-stdin <account>.dkr.ecr.us-east-2.amazonaws.com

# Web (NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY required at build time)
# Fargate tasks use ARM64 (Graviton) — build on Apple Silicon produces matching linux/arm64 images
export NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...
pnpm docker:build:web
docker tag harvverse/web:local <account>.dkr.ecr.us-east-2.amazonaws.com/harvverse/web:latest
docker push <account>.dkr.ecr.us-east-2.amazonaws.com/harvverse/web:latest

pnpm docker:build:migrate
docker tag harvverse/migrate:local <account>.dkr.ecr.us-east-2.amazonaws.com/harvverse/migrate:latest
docker push <account>.dkr.ecr.us-east-2.amazonaws.com/harvverse/migrate:latest
```

**DNS** — after `Harvversev2Platform` deploys, point your domain at the ALB:

| Record | Name | Value |
|--------|------|-------|
| CNAME (or ALIAS) | `defi.harvverse.farm` | `LoadBalancerDnsName` stack output |

HTTPS is terminated at the ALB using your existing ACM certificate. Port 80 redirects to 443.

Then verify: `https://defi.harvverse.farm/api/health`

Configure Clerk production instance with `https://defi.harvverse.farm` as allowed origin.

### Phase 5 — Database migrations (codebase-first)

**Strategy:** Drizzle Option 3 — schema in `packages/db/src/schema/` → `pnpm db:generate` → commit SQL → apply with `pnpm db:migrate`. See `.docs/drizzle/harvverse-workflow.md`.

**Artifacts in this repo:**

| File | Purpose |
|------|---------|
| `packages/db/Dockerfile.migrate` | ECS migration runner image |
| `buildspec.migrate.yml` | CodeBuild: build/push `harvverse/migrate` |
| `scripts/ecs/run-db-migrate.sh` | Run one-off migrate task + wait for exit 0 |
| `Harvversev2Migrate` | Task definition, subnets/SG outputs for `run-task` |

**After migrate image is in ECR** (same tag as in `lib/config.ts` → `migrateImageTag`, default `latest`):

```bash
chmod +x scripts/ecs/*.sh
pnpm ecs:run-migrate
```

This reads CloudFormation outputs from `Harvversev2Platform` and `Harvversev2Migrate`, runs `harvverse-migrate`, and fails if the container exit code is not 0. Logs: CloudWatch `/harvverse/migrate`.

**Break-glass** (explicit subnets/SG):

```bash
aws ecs run-task \
  --cluster harvversev2-cluster \
  --task-definition harvverse-migrate \
  --launch-type FARGATE \
  --profile Harvverse \
  --region us-east-2 \
  --network-configuration "awsvpcConfiguration={subnets=[subnet-xxx,subnet-yyy],securityGroups=[sg-xxx],assignPublicIp=DISABLED}"
```

**Developer workflow (local):**

```bash
pnpm db:start
# edit packages/db/src/schema/*
pnpm db:generate
pnpm db:migrate
# commit schema + packages/db/src/migrations/*
```

Never run `pnpm db:push` against production RDS.

### Phase 6–7 — CI/CD (CodePipeline)

**Prerequisites (one-time, AWS Console + CLI)**

1. **CodeStar Connections** — Developer Tools → Connections → create GitHub connection for `Experenta/harvverse-mono`, authorize, note the connection ARN (status **Available**).
2. **SSM parameter** for the Clerk publishable key (CodeBuild build-time):

```bash
aws ssm put-parameter \
  --name /harvverse/prod/NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY \
  --type String \
  --value 'pk_live_...' \
  --profile Harvverse \
  --region us-east-2
```

3. Commit and push `buildspec.yml` at the repo root (pipeline uses it from source).

**Deploy the CI/CD stack** (pass the connection ARN via CDK context):

```bash
pnpm infra:build
pnpm infra:diff -- -c githubConnectionArn=arn:aws:codestar-connections:us-east-2:500501923704:connection/XXXXXXXX
pnpm infra:deploy -- Harvversev2Cicd -c githubConnectionArn=arn:aws:codestar-connections:us-east-2:500501923704:connection/XXXXXXXX
```

Or from `packages/infra`:

```bash
pnpm cdk:deploy:cicd -c githubConnectionArn=arn:aws:codestar-connections:us-east-2:500501923704:connection/XXXXXXXX
```

**Pipeline flow:** GitHub `main` → CodeBuild (ARM, privileged Docker) builds/pushes `harvverse/web` + `harvverse/migrate`, runs one-off `harvverse-migrate` ECS task, emits `imagedefinitions.json` → ECS rolling deploy of the web service.

**Validate after first pipeline run:**

- CodeBuild log shows migration exit 0
- `https://defi.harvverse.farm/api/health` → 200
- Clerk sign-in works
- Farm image upload → S3 (`storage_provider = 's3'`)

**Optional:** Test CodeBuild alone before the full pipeline — create a one-off build in the console using project `harvverse-web` and source from GitHub.

### Manual image push (debugging)

Build locally, then push to ECR (replace `<account>` with your AWS account ID):

```bash
# Authenticate Docker to ECR
aws ecr get-login-password --region us-east-2 --profile Harvverse \
  | docker login --username AWS --password-stdin <account>.dkr.ecr.us-east-2.amazonaws.com

# Build and push
pnpm docker:build:web
docker tag harvverse/web:local <account>.dkr.ecr.us-east-2.amazonaws.com/harvverse/web:local
docker push <account>.dkr.ecr.us-east-2.amazonaws.com/harvverse/web:local
```

**Image tagging for production:** prefer immutable `{git_sha}` tags. Avoid relying on `latest` for ECS deploys.

## Environment

Default region is `us-east-2`. When `CDK_DEFAULT_ACCOUNT` and `CDK_DEFAULT_REGION` are set (via AWS CLI profile or env vars), stacks target that environment. Otherwise synthesis is environment-agnostic.

Commit `cdk.context.json` after context lookups so deployments stay deterministic.
