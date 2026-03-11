#!/usr/bin/env bash
# Restart the running tabup-api container on EC2 without rebuilding.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

DEPLOY_ENV="${ROOT_DIR}/scripts/deploy.env"
[[ -f "$DEPLOY_ENV" ]] && source "$DEPLOY_ENV"

SSH_KEY="${SSH_KEY:-$ROOT_DIR/tabup-key.pem}"
REMOTE_USER="${REMOTE_USER:-ubuntu}"
REMOTE_HOST="${REMOTE_HOST:-3.80.28.75}"
REMOTE_SERVICE="${REMOTE_SERVICE:-tabup-api}"

if [[ ! -f "$SSH_KEY" ]]; then
  echo "SSH key not found at $SSH_KEY" >&2
  exit 1
fi

echo "Restarting ${REMOTE_SERVICE} on ${REMOTE_HOST}..."
ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no "${REMOTE_USER}@${REMOTE_HOST}" \
  "docker restart ${REMOTE_SERVICE}"

echo "Recent logs:"
ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no "${REMOTE_USER}@${REMOTE_HOST}" \
  "docker logs ${REMOTE_SERVICE} --tail 30"
