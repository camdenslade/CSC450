#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# Load deploy config
DEPLOY_ENV="${ROOT_DIR}/scripts/deploy.env"
if [[ -f "$DEPLOY_ENV" ]]; then
  # shellcheck source=/dev/null
  source "$DEPLOY_ENV"
fi

SSH_KEY="${SSH_KEY:-$ROOT_DIR/tabup-key.pem}"
REMOTE_USER="${REMOTE_USER:-ubuntu}"
REMOTE_HOST="${REMOTE_HOST:-3.80.28.75}"
REMOTE_SERVICE="${REMOTE_SERVICE:-tabup-api}"

AWS_ACCOUNT_ID="${AWS_ACCOUNT_ID:-}"
AWS_REGION="${AWS_REGION:-us-east-1}"
ECR_REPO="${ECR_REPO:-tabup-api}"
IMAGE_TAG="${IMAGE_TAG:-$(git -C "$ROOT_DIR" rev-parse --short HEAD)}"

ECR_REGISTRY="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"
FULL_IMAGE="${ECR_REGISTRY}/${ECR_REPO}:${IMAGE_TAG}"
LATEST_IMAGE="${ECR_REGISTRY}/${ECR_REPO}:latest"

if [[ -z "$AWS_ACCOUNT_ID" ]]; then
  echo "AWS_ACCOUNT_ID is required. Add it to scripts/deploy.env or export it." >&2
  exit 1
fi

if [[ ! -f "$SSH_KEY" ]]; then
  echo "SSH key not found at $SSH_KEY" >&2
  exit 1
fi

# Build from repo root so Dockerfile context resolves correctly
cd "$ROOT_DIR"

echo "Building Docker image..."
docker build -t "${ECR_REPO}:${IMAGE_TAG}" .
docker tag "${ECR_REPO}:${IMAGE_TAG}" "$FULL_IMAGE"
docker tag "${ECR_REPO}:${IMAGE_TAG}" "$LATEST_IMAGE"

echo "Pushing to ECR..."
aws ecr get-login-password --region "$AWS_REGION" \
  | docker login --username AWS --password-stdin "$ECR_REGISTRY"
docker push "$FULL_IMAGE"
docker push "$LATEST_IMAGE"

echo "Running migrations on ${REMOTE_HOST}..."
IMAGE_TAG="$IMAGE_TAG" bash "${ROOT_DIR}/scripts/migrate.sh"

echo "Deploying ${FULL_IMAGE} to ${REMOTE_USER}@${REMOTE_HOST}..."
ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no "${REMOTE_USER}@${REMOTE_HOST}" bash -s <<EOF
set -euo pipefail

aws ecr get-login-password --region "${AWS_REGION}" \
  | docker login --username AWS --password-stdin "${ECR_REGISTRY}"

docker pull "${FULL_IMAGE}"

docker stop "${REMOTE_SERVICE}" 2>/dev/null || true
docker rm   "${REMOTE_SERVICE}" 2>/dev/null || true

docker run -d \
  --name "${REMOTE_SERVICE}" \
  --restart unless-stopped \
  -p 3000:3000 \
  "${FULL_IMAGE}"

docker image prune -f
EOF

echo "Deployment finished. Running image: ${FULL_IMAGE}"
