#!/usr/bin/env bash
# Wait for an ECS Fargate task to stop and exit non-zero if the container failed.
set -euo pipefail

CLUSTER="${1:?Usage: wait-ecs-task.sh <cluster> <task-arn> [profile] [region]}"
TASK_ARN="${2:?Usage: wait-ecs-task.sh <cluster> <task-arn> [profile] [region]}"
PROFILE="${3:-${HARVVERSE_AWS_PROFILE:-Harvverse}}"
REGION="${4:-${AWS_REGION:-us-east-2}}"

echo "Waiting for task to stop: ${TASK_ARN}"
aws ecs wait tasks-stopped \
  --cluster "${CLUSTER}" \
  --tasks "${TASK_ARN}" \
  --profile "${PROFILE}" \
  --region "${REGION}"

EXIT_CODE="$(aws ecs describe-tasks \
  --cluster "${CLUSTER}" \
  --tasks "${TASK_ARN}" \
  --profile "${PROFILE}" \
  --region "${REGION}" \
  --query 'tasks[0].containers[0].exitCode' \
  --output text)"

STOP_REASON="$(aws ecs describe-tasks \
  --cluster "${CLUSTER}" \
  --tasks "${TASK_ARN}" \
  --profile "${PROFILE}" \
  --region "${REGION}" \
  --query 'tasks[0].stoppedReason' \
  --output text)"

echo "Task stopped. exitCode=${EXIT_CODE} reason=${STOP_REASON}"

if [[ "${EXIT_CODE}" != "0" ]]; then
  echo "Migration task failed (exit ${EXIT_CODE}). Logs: /harvverse/migrate" >&2
  exit 1
fi
