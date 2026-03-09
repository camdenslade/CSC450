#!/usr/bin/env bash
# Run TypeORM migrations on the EC2 host.
# Fetches DB credentials from AWS Secrets Manager so nothing is hardcoded.
# Usage: ./scripts/migrate.sh [revert|show]
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# Load deploy config (AWS_ACCOUNT_ID, AWS_REGION, ECR_REPO, etc.)
DEPLOY_ENV="${ROOT_DIR}/scripts/deploy.env"
if [[ -f "$DEPLOY_ENV" ]]; then
  # shellcheck source=/dev/null
  source "$DEPLOY_ENV"
fi

SSH_KEY="${SSH_KEY:-$ROOT_DIR/tabup-key.pem}"
REMOTE_USER="${REMOTE_USER:-ubuntu}"
REMOTE_HOST="${REMOTE_HOST:-3.80.28.75}"

AWS_ACCOUNT_ID="${AWS_ACCOUNT_ID:-}"
AWS_REGION="${AWS_REGION:-us-east-1}"
ECR_REPO="${ECR_REPO:-tabup-api}"
IMAGE_TAG="${IMAGE_TAG:-latest}"

MIGRATION_CMD="${1:-run}"  # run | revert | show

ECR_REGISTRY="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"
FULL_IMAGE="${ECR_REGISTRY}/${ECR_REPO}:${IMAGE_TAG}"

if [[ -z "$AWS_ACCOUNT_ID" ]]; then
  echo "AWS_ACCOUNT_ID is required. Add it to scripts/deploy.env or export it." >&2
  exit 1
fi

if [[ ! -f "$SSH_KEY" ]]; then
  echo "SSH key not found at $SSH_KEY" >&2
  exit 1
fi

echo "Running migration:${MIGRATION_CMD} on ${REMOTE_HOST}..."

ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no "${REMOTE_USER}@${REMOTE_HOST}" bash -s <<EOF
set -euo pipefail

# Fetch DB credentials from Secrets Manager
get_secret() {
  aws secretsmanager get-secret-value \
    --region "${AWS_REGION}" \
    --secret-id "\$1" \
    --query SecretString \
    --output text
}

DB_HOST=\$(get_secret tabup/db-host)
DB_PORT=\$(get_secret tabup/db-port)
DB_USER=\$(get_secret tabup/db-user)
DB_PASS=\$(get_secret tabup/db-pass)
DB_NAME=\$(get_secret tabup/db-name)

docker run --rm \
  -e DB_HOST="\$DB_HOST" \
  -e DB_PORT="\$DB_PORT" \
  -e DB_USER="\$DB_USER" \
  -e DB_PASS="\$DB_PASS" \
  -e DB_NAME="\$DB_NAME" \
  -e NODE_ENV=production \
  "${FULL_IMAGE}" \
  npx typeorm migration:${MIGRATION_CMD} -d dist/apps/api/src/database/data-source.js

echo "migration:${MIGRATION_CMD} complete."
EOF
