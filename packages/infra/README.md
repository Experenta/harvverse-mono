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
| `Harvversev2Ecr` | ECR repository `harvverse/web` (scan on push, retain last 10 images) | 2 |

Later phases add `Harvversev2Data`, `Harvversev2Storage`, `Harvversev2Platform`, `Harvversev2Web`, `Harvversev2Migrate`, and `Harvversev2Cicd` — see `.docs/aws-deployment-plan.md`.

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
