#!/usr/bin/env bash
# Rebuild DATABASE_URL in harvverse/prod/database with a URL-encoded password.
# RDS passwords often include :, @, ], etc. — those must be percent-encoded in the URL.
set -euo pipefail

PROFILE="${HARVVERSE_AWS_PROFILE:-Harvverse}"
REGION="${AWS_REGION:-us-east-2}"
SECRET_ID="${SECRET_ID:-harvverse/prod/database}"

SECRET_JSON="$(aws secretsmanager get-secret-value \
  --secret-id "${SECRET_ID}" \
  --profile "${PROFILE}" \
  --region "${REGION}" \
  --query SecretString \
  --output text)"

UPDATED_JSON="$(SECRET_JSON="${SECRET_JSON}" python3 <<'PY'
import json, os
from urllib.parse import quote

data = json.loads(os.environ["SECRET_JSON"])
password = data.get("password") or ""
username = data.get("username", "harvverse")
host = data.get("host") or ""
port = data.get("port", 5432)
dbname = data.get("dbname", "harvverse")

if not password or not host:
    print("Secret must include password and host fields.", file=sys.stderr)
    sys.exit(1)

encoded = quote(password, safe="")
# Omit sslmode from the URL — Node pg treats sslmode=require as verify-full and breaks on RDS.
# apps/db use ssl: { rejectUnauthorized: false } when host is *.rds.amazonaws.com.
data["DATABASE_URL"] = f"postgresql://{username}:{encoded}@{host}:{port}/{dbname}"
print(json.dumps(data))
PY
)"

aws secretsmanager put-secret-value \
  --secret-id "${SECRET_ID}" \
  --profile "${PROFILE}" \
  --region "${REGION}" \
  --secret-string "${UPDATED_JSON}"

echo "Updated ${SECRET_ID} with URL-encoded DATABASE_URL."
echo "Re-run: pnpm ecs:run-migrate"
