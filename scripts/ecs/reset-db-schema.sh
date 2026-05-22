#!/usr/bin/env bash
# Destructive one-time helper for pre-production RDS baseline resets.
# This drops the application schemas, so it requires an explicit confirmation
# phrase and creates an RDS snapshot before touching the database.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

PROFILE="${HARVVERSE_AWS_PROFILE:-Harvverse}"
REGION="${AWS_REGION:-us-east-2}"
DATA_STACK="${DATA_STACK:-Harvversev2Data}"
PLATFORM_STACK="${PLATFORM_STACK:-Harvversev2Platform}"
MIGRATE_STACK="${MIGRATE_STACK:-Harvversev2Migrate}"
EXPECTED_ACCOUNT="${HARVVERSE_AWS_ACCOUNT:-500501923704}"
CONFIRM_PHRASE="reset-harvverse-rds"

if [[ "${HARVVERSE_CONFIRM_DB_RESET:-}" != "${CONFIRM_PHRASE}" ]]; then
  echo "Refusing to reset RDS without explicit confirmation." >&2
  echo "Run with: HARVVERSE_CONFIRM_DB_RESET=${CONFIRM_PHRASE} pnpm ecs:reset-db-schema" >&2
  exit 1
fi

ACTUAL_ACCOUNT="$(aws sts get-caller-identity \
  --profile "${PROFILE}" \
  --region "${REGION}" \
  --query Account \
  --output text 2>/dev/null || true)"

if [[ "${ACTUAL_ACCOUNT}" != "${EXPECTED_ACCOUNT}" ]]; then
  echo "Wrong AWS account for Harvverse: profile=${PROFILE} account=${ACTUAL_ACCOUNT:-unknown} (expected ${EXPECTED_ACCOUNT})." >&2
  exit 1
fi

stack_output() {
  local stack="$1"
  local key="$2"
  aws cloudformation describe-stacks \
    --stack-name "${stack}" \
    --profile "${PROFILE}" \
    --region "${REGION}" \
    --query "Stacks[0].Outputs[?OutputKey=='${key}'].OutputValue | [0]" \
    --output text
}

DB_INSTANCE_ID="$(aws cloudformation describe-stack-resources \
  --stack-name "${DATA_STACK}" \
  --profile "${PROFILE}" \
  --region "${REGION}" \
  --query "StackResources[?ResourceType=='AWS::RDS::DBInstance'].PhysicalResourceId | [0]" \
  --output text)"

if [[ -z "${DB_INSTANCE_ID}" || "${DB_INSTANCE_ID}" == "None" ]]; then
  echo "Could not resolve RDS DB instance from ${DATA_STACK}." >&2
  exit 1
fi

SNAPSHOT_ID="${SNAPSHOT_ID:-harvverse-pre-baseline-reset-$(date -u +%Y%m%d%H%M%S)}"

echo "Creating RDS snapshot ${SNAPSHOT_ID} from ${DB_INSTANCE_ID}..."
aws rds create-db-snapshot \
  --db-instance-identifier "${DB_INSTANCE_ID}" \
  --db-snapshot-identifier "${SNAPSHOT_ID}" \
  --profile "${PROFILE}" \
  --region "${REGION}" \
  >/dev/null

echo "Waiting for snapshot to complete..."
aws rds wait db-snapshot-completed \
  --db-snapshot-identifier "${SNAPSHOT_ID}" \
  --profile "${PROFILE}" \
  --region "${REGION}"

CLUSTER="$(stack_output "${PLATFORM_STACK}" ClusterName)"
TASK_FAMILY="$(stack_output "${MIGRATE_STACK}" MigrateTaskDefinitionFamily)"
SUBNETS="$(stack_output "${MIGRATE_STACK}" MigratePrivateSubnetIds)"
SECURITY_GROUP="$(stack_output "${MIGRATE_STACK}" MigrateSecurityGroupId)"

if [[ -z "${CLUSTER}" || "${CLUSTER}" == "None" ]]; then
  echo "Missing ClusterName output from ${PLATFORM_STACK}." >&2
  exit 1
fi
if [[ -z "${TASK_FAMILY}" || "${TASK_FAMILY}" == "None" ]]; then
  echo "Missing MigrateTaskDefinitionFamily output from ${MIGRATE_STACK}." >&2
  exit 1
fi

OVERRIDES="$(node <<'NODE'
const code = `import pg from "pg";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL is not set");
}

const client = new pg.Client({
  connectionString: databaseUrl,
  ssl: { rejectUnauthorized: false },
});

await client.connect();

const statements = [
  "DROP SCHEMA IF EXISTS drizzle CASCADE",
  "DROP SCHEMA IF EXISTS public CASCADE",
  "CREATE SCHEMA public",
  "GRANT USAGE, CREATE ON SCHEMA public TO PUBLIC",
];

for (const statement of statements) {
  console.log(statement);
  await client.query(statement);
}

await client.end();
console.log("RDS schema reset complete. Run the baseline migration next.");
`;

process.stdout.write(JSON.stringify({
  containerOverrides: [
    {
      name: "migrate",
      command: ["node", "--input-type=module", "-e", code],
    },
  ],
}));
NODE
)"

echo "Running destructive schema reset task..."
TASK_ARN="$(aws ecs run-task \
  --cluster "${CLUSTER}" \
  --task-definition "${TASK_FAMILY}" \
  --launch-type FARGATE \
  --profile "${PROFILE}" \
  --region "${REGION}" \
  --network-configuration "awsvpcConfiguration={subnets=[${SUBNETS}],securityGroups=[${SECURITY_GROUP}],assignPublicIp=DISABLED}" \
  --overrides "${OVERRIDES}" \
  --query 'tasks[0].taskArn' \
  --output text)"

if [[ -z "${TASK_ARN}" || "${TASK_ARN}" == "None" ]]; then
  echo "ecs run-task did not return a task ARN" >&2
  exit 1
fi

echo "Started reset task: ${TASK_ARN}"
"${SCRIPT_DIR}/wait-ecs-task.sh" "${CLUSTER}" "${TASK_ARN}" "${PROFILE}" "${REGION}"

echo "RDS schema reset complete."
echo "Snapshot: ${SNAPSHOT_ID}"
echo "Next: run the pipeline or pnpm ecs:run-migrate using the freshly pushed baseline migration image."
