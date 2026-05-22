#!/usr/bin/env bash
# Run the Harvverse one-off Drizzle migration ECS task against RDS.
# Requires: Harvversev2Platform + Harvversev2Migrate deployed, migrate image pushed to ECR.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Harvverse infra uses profile "Harvverse" (account 500501923704), not the shell default.
PROFILE="${HARVVERSE_AWS_PROFILE:-Harvverse}"
REGION="${AWS_REGION:-us-east-2}"
PLATFORM_STACK="${PLATFORM_STACK:-Harvversev2Platform}"
MIGRATE_STACK="${MIGRATE_STACK:-Harvversev2Migrate}"
EXPECTED_ACCOUNT="${HARVVERSE_AWS_ACCOUNT:-500501923704}"

ACTUAL_ACCOUNT="$(aws sts get-caller-identity \
  --profile "${PROFILE}" \
  --region "${REGION}" \
  --query Account \
  --output text 2>/dev/null || true)"

if [[ "${ACTUAL_ACCOUNT}" != "${EXPECTED_ACCOUNT}" ]]; then
  echo "Wrong AWS account for Harvverse: profile=${PROFILE} account=${ACTUAL_ACCOUNT:-unknown} (expected ${EXPECTED_ACCOUNT})." >&2
  echo "Use: HARVVERSE_AWS_PROFILE=Harvverse pnpm ecs:run-migrate" >&2
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

CLUSTER="$(stack_output "${PLATFORM_STACK}" ClusterName)"
TASK_FAMILY="$(stack_output "${MIGRATE_STACK}" MigrateTaskDefinitionFamily)"
SUBNETS="$(stack_output "${MIGRATE_STACK}" MigratePrivateSubnetIds)"
SECURITY_GROUP="$(stack_output "${MIGRATE_STACK}" MigrateSecurityGroupId)"

if [[ -z "${CLUSTER}" || "${CLUSTER}" == "None" ]]; then
  echo "Missing ClusterName output from ${PLATFORM_STACK} (profile=${PROFILE}, region=${REGION})." >&2
  echo "If stacks exist in console, you may be on the wrong profile (use Harvverse → account ${EXPECTED_ACCOUNT})." >&2
  exit 1
fi
if [[ -z "${TASK_FAMILY}" || "${TASK_FAMILY}" == "None" ]]; then
  echo "Missing MigrateTaskDefinitionFamily output from ${MIGRATE_STACK}" >&2
  exit 1
fi

echo "Cluster: ${CLUSTER}"
echo "Task definition family: ${TASK_FAMILY}"
echo "Subnets: ${SUBNETS}"
echo "Security group: ${SECURITY_GROUP}"

TASK_ARN="$(aws ecs run-task \
  --cluster "${CLUSTER}" \
  --task-definition "${TASK_FAMILY}" \
  --launch-type FARGATE \
  --profile "${PROFILE}" \
  --region "${REGION}" \
  --network-configuration "awsvpcConfiguration={subnets=[${SUBNETS}],securityGroups=[${SECURITY_GROUP}],assignPublicIp=DISABLED}" \
  --query 'tasks[0].taskArn' \
  --output text)"

if [[ -z "${TASK_ARN}" || "${TASK_ARN}" == "None" ]]; then
  echo "ecs run-task did not return a task ARN" >&2
  exit 1
fi

echo "Started migration task: ${TASK_ARN}"
"${SCRIPT_DIR}/wait-ecs-task.sh" "${CLUSTER}" "${TASK_ARN}" "${PROFILE}" "${REGION}"
echo "Database migrations applied successfully."
