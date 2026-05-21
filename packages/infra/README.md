# @harvverse-monorepo/infra

AWS CDK infrastructure for Harvverse. Stacks live in `lib/`, the app entry point is `bin/infra.ts`.

## Prerequisites

- AWS CLI configured with the `Harvverse` profile (`~/.aws/credentials` or `~/.aws/config`)
- Bootstrap the target account/region once before the first deploy:

```bash
pnpm infra:bootstrap
```

## Commands

From the monorepo root:

| Command | Description |
|---------|-------------|
| `pnpm infra:build` | Compile TypeScript to `dist/` |
| `pnpm infra:synth` | Synthesize CloudFormation templates |
| `pnpm infra:diff` | Compare deployed stack with local changes |
| `pnpm infra:deploy` | Deploy stacks to AWS |
| `pnpm infra:bootstrap` | Bootstrap CDK in the current AWS account/region |
| `pnpm infra:destroy` | Tear down deployed stacks |
| `pnpm infra:test` | Run CDK unit tests |

From `packages/infra`:

```bash
pnpm build
pnpm cdk:synth
pnpm cdk:deploy
```

## Environment

When `CDK_DEFAULT_ACCOUNT` and `CDK_DEFAULT_REGION` are set (via AWS CLI profile or env vars), the stack targets that environment. Otherwise synthesis is environment-agnostic.

Commit `cdk.context.json` after context lookups so deployments stay deterministic.
