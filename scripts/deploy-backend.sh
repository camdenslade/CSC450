#!/usr/bin/env bash
set -euo pipefail

# 1. Build locally so we can catch compile issues before touching the server.
# 2. Pull the latest code on the EC2 host, install deps, run migrations, and restart the service.

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SSH_KEY="${SSH_KEY:-$ROOT_DIR/tabup-key.pem}"
REMOTE_USER="${REMOTE_USER:-ubuntu}"
REMOTE_HOST="${REMOTE_HOST:-3.80.28.75}"
REMOTE_PATH="${REMOTE_PATH:-/home/ubuntu/tabup}"
REMOTE_BRANCH="${REMOTE_BRANCH:-backend}"
REMOTE_SERVICE="${REMOTE_SERVICE:-tabup-api}"

readonly LOCAL_PACKAGE="@tabup/api"

if [[ ! -f "$SSH_KEY" ]]; then
  echo "SSH key not found at $SSH_KEY" >&2
  exit 1
fi

echo "Installing/updating dependencies locally..."
npm install

echo "Building $LOCAL_PACKAGE..."
npm run --workspace "$LOCAL_PACKAGE" build

echo "Deploying to ${REMOTE_USER}@${REMOTE_HOST}:${REMOTE_PATH} (branch ${REMOTE_BRANCH})"
ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no "${REMOTE_USER}@${REMOTE_HOST}" bash -s <<EOF
set -euo pipefail
cd "$REMOTE_PATH"
git fetch origin "$REMOTE_BRANCH"
git reset --hard "origin/$REMOTE_BRANCH"
npm install --production
npm run --workspace "$LOCAL_PACKAGE" build
npm run --workspace "$LOCAL_PACKAGE" migration:run
if command -v pm2 >/dev/null 2>&1; then
  pm2 reload "$REMOTE_SERVICE" || pm2 start --name "$REMOTE_SERVICE" -- npm --workspace "$LOCAL_PACKAGE" start
elif sudo systemctl list-units --full --all | grep -q "${REMOTE_SERVICE}.service"; then
  sudo systemctl restart "$REMOTE_SERVICE"
else
  echo "WARN: Could not detect pm2 or systemd-managed service; restart '$REMOTE_SERVICE' manually."
fi
EOF

echo "Deployment finished."
