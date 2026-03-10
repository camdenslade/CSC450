#!/usr/bin/env bash
# Run TypeORM migrations on the EC2 host using the currently deployed image.
# Fetches DB credentials from AWS Secrets Manager (single JSON blob named "tabup").
#
# Usage:
#   ./scripts/migrate.sh          # run pending migrations
#   ./scripts/migrate.sh revert   # revert last migration
#   ./scripts/migrate.sh show     # show migration status
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

DEPLOY_ENV="${ROOT_DIR}/scripts/deploy.env"
[[ -f "$DEPLOY_ENV" ]] && source "$DEPLOY_ENV"

SSH_KEY="${SSH_KEY:-$ROOT_DIR/tabup-key.pem}"
REMOTE_USER="${REMOTE_USER:-ubuntu}"
REMOTE_HOST="${REMOTE_HOST:-3.80.28.75}"
REMOTE_SERVICE="${REMOTE_SERVICE:-tabup-api}"
AWS_REGION="${AWS_REGION:-us-east-1}"

MIGRATION_CMD="${1:-run}"  # run | revert | show

if [[ ! -f "$SSH_KEY" ]]; then
  echo "SSH key not found at $SSH_KEY" >&2
  exit 1
fi

echo "Running migration:${MIGRATION_CMD} on ${REMOTE_HOST}..."

ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no "${REMOTE_USER}@${REMOTE_HOST}" bash -s \
  "$REMOTE_SERVICE" "$AWS_REGION" "$MIGRATION_CMD" <<'ENDSSH'
set -euo pipefail

REMOTE_SERVICE="$1"
AWS_REGION="$2"
MIGRATION_CMD="$3"

# Parse DB credentials from the single JSON blob in Secrets Manager
SECRET_JSON=$(aws secretsmanager get-secret-value \
  --region "$AWS_REGION" \
  --secret-id "tabup" \
  --query SecretString \
  --output text)

DB_HOST=$(echo "$SECRET_JSON" | python3 -c "import sys,json; print(json.load(sys.stdin)['DB_HOST'])")
DB_PORT=$(echo "$SECRET_JSON" | python3 -c "import sys,json; print(json.load(sys.stdin)['DB_PORT'])")
DB_USER=$(echo "$SECRET_JSON" | python3 -c "import sys,json; print(json.load(sys.stdin)['DB_USER'])")
DB_PASS=$(echo "$SECRET_JSON" | python3 -c "import sys,json; print(json.load(sys.stdin)['DB_PASS'])")
DB_NAME=$(echo "$SECRET_JSON" | python3 -c "import sys,json; print(json.load(sys.stdin)['DB_NAME'])")

docker run --rm \
  -e DB_HOST="$DB_HOST" \
  -e DB_PORT="$DB_PORT" \
  -e DB_USER="$DB_USER" \
  -e DB_PASS="$DB_PASS" \
  -e DB_NAME="$DB_NAME" \
  -e NODE_ENV=production \
  "${REMOTE_SERVICE}:latest" \
  npx typeorm migration:"$MIGRATION_CMD" -d dist/apps/api/database/data-source.js

echo "migration:${MIGRATION_CMD} complete."
ENDSSH
