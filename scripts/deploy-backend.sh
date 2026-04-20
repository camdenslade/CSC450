#!/usr/bin/env bash
# Deploy the API to EC2 by rsyncing source and building the Docker image on the server.
# No local Docker installation required.
#
# Usage:
#   ./scripts/deploy-backend.sh           # build + deploy
#   ./scripts/deploy-backend.sh --migrate # build + run migrations + deploy
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

DEPLOY_ENV="${ROOT_DIR}/scripts/deploy.env"
[[ -f "$DEPLOY_ENV" ]] && source "$DEPLOY_ENV"

SSH_KEY="${SSH_KEY:-$ROOT_DIR/tabup-key.pem}"
REMOTE_USER="${REMOTE_USER:-ubuntu}"
REMOTE_HOST="${REMOTE_HOST:-3.80.28.75}"
REMOTE_SERVICE="${REMOTE_SERVICE:-tabup-api}"
AWS_REGION="${AWS_REGION:-us-east-1}"
REMOTE_DIR="${REMOTE_DIR:-/home/ubuntu/tabup}"
RUN_MIGRATIONS=false

for arg in "$@"; do
  [[ "$arg" == "--migrate" ]] && RUN_MIGRATIONS=true
done

if [[ ! -f "$SSH_KEY" ]]; then
  echo "SSH key not found at $SSH_KEY" >&2
  exit 1
fi

# 1. Sync source to EC2 via tar over SSH (no rsync needed locally)
echo "Syncing source to ${REMOTE_HOST}:${REMOTE_DIR} ..."
ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no "${REMOTE_USER}@${REMOTE_HOST}" \
  "mkdir -p ${REMOTE_DIR}"

tar -C "$ROOT_DIR" \
  --exclude='.git' \
  --exclude='node_modules' \
  --exclude='dist' \
  --exclude='*.env' \
  --exclude='tabup-key.pem' \
  -czf - . \
  | ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no "${REMOTE_USER}@${REMOTE_HOST}" \
      "tar -xzf - -C ${REMOTE_DIR}"

# 2. Build image on EC2 and (re)start container
echo "Building and deploying on ${REMOTE_HOST}..."
ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no "${REMOTE_USER}@${REMOTE_HOST}" bash -s \
  "$REMOTE_DIR" "$REMOTE_SERVICE" "$AWS_REGION" "$RUN_MIGRATIONS" <<'ENDSSH'
set -euo pipefail

REMOTE_DIR="$1"
REMOTE_SERVICE="$2"
AWS_REGION="$3"
RUN_MIGRATIONS="$4"

cd "$REMOTE_DIR"

echo "Building Docker image..."
docker build -t "${REMOTE_SERVICE}:latest" .

if [[ "$RUN_MIGRATIONS" == "true" ]]; then
  echo "Running migrations..."
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
    npx typeorm migration:run -d dist/apps/api/database/data-source.js
fi

echo "Restarting container..."
docker stop  "$REMOTE_SERVICE" 2>/dev/null || true
docker rm    "$REMOTE_SERVICE" 2>/dev/null || true
docker run -d \
  --name "$REMOTE_SERVICE" \
  --restart unless-stopped \
  -p 3000:3000 \
  -e NODE_ENV=production \
  -e AWS_REGION="$AWS_REGION" \
  "${REMOTE_SERVICE}:latest"

docker image prune -f
echo "Done. Container ${REMOTE_SERVICE} is running."
ENDSSH

echo "Deployment complete. API is live at http://${REMOTE_HOST}:3000/api/status"
