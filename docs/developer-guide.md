# TabUp Developer Guide

## What this project is
TabUp is an iOS/Android app for splitting restaurant and bar tabs without handling money directly.
Users capture the bill, assign shares to friends, and the app generates payment deep links
(PayPal, Venmo, CashApp) that route money directly between users.

## Repo layout
```
apps/mobile/        - Expo/React Native app
apps/api/           - NestJS REST API (deployed on EC2)
packages/shared-types/  - Shared TypeScript types (stub)
docs/               - Architecture, API reference, threat model, this guide
scripts/            - deploy-backend.sh, migrate.sh, restart.sh
infrastructure/     - IaC placeholders
```

Root `package.json` manages all npm deps via workspaces. `apps/api/package.json` is a thin
workspace manifest (name/version/scripts only).

## Prerequisites
- Node.js 22 LTS
- Git + Git Bash (Windows) or any Unix shell
- AWS CLI configured with credentials that can read Secrets Manager and push to ECR
- SSH key `tabup-key.pem` in the repo root (gitignored)
- A `.env` file in the repo root for local API development (never commit it)

## Local API development
```sh
# Install all deps from repo root
npm install

# Run the API locally (needs a .env with DB_HOST, DB_PORT, etc.)
cd apps/api
npm run start:dev
```

The `.env` should contain:
```
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASS=yourpassword
DB_NAME=tabup
PHONE_HASH_SALT=any_local_salt
```
Firebase Admin will be skipped or use a test credential locally.

## Mobile development
```sh
cd apps/mobile
npm start          # Expo bundler
# i = iOS simulator, a = Android, scan QR for Expo Go
```

## Deployment (EC2)

All deploy scripts live in `scripts/`. No local Docker required.

### Full deploy (build + restart)
```sh
./scripts/deploy-backend.sh
```
Syncs source to EC2 via SSH, builds the Docker image on EC2, restarts the container.

### Deploy + run new migrations
```sh
./scripts/deploy-backend.sh --migrate
```

### Run migrations only
```sh
./scripts/migrate.sh          # run pending
./scripts/migrate.sh revert   # revert last
./scripts/migrate.sh show     # show status
```

### Restart container without rebuilding
```sh
./scripts/restart.sh
```

### Config
`scripts/deploy.env` (gitignored) holds:
```
AWS_ACCOUNT_ID=390402548152
AWS_REGION=us-east-1
ECR_REPO=tabup-api
REMOTE_USER=ubuntu
REMOTE_HOST=3.80.28.75
REMOTE_SERVICE=tabup-api
```

## Secrets
All secrets live in AWS Secrets Manager as a single JSON blob named `tabup`:
```json
{
  "DB_HOST": "...",
  "DB_PORT": "5432",
  "DB_USER": "...",
  "DB_PASS": "...",
  "DB_NAME": "tabup",
  "PHONE_HASH_SALT": "...",
  "FIREBASE_SERVICE_ACCOUNT": "{...}",
  "AWS_S3_BUCKET": "..."
}
```
The EC2 IAM role (`tabup-ec2-role`) has read access. Locally, use a `.env` file.
Never commit secrets. Never add individual secrets — update the single `tabup` blob.

## Database migrations
TypeORM migrations only — `synchronize: false` always. Migration files in
`apps/api/src/database/migrations/`. Class names must include a numeric timestamp suffix
(e.g., `CreateUsers0011700000001000`).

To generate a new migration after changing an entity:
```sh
# From repo root
npx typeorm-ts-node-commonjs migration:generate \
  apps/api/src/database/migrations/006_YourMigrationName \
  -d apps/api/src/database/data-source.ts
```

## Code conventions
- File header comment: `// apps/api/src/path/to/file.ts`
- All monetary values in cents (integer)
- Phone/email hashed with HMAC-SHA256 + PHONE_HASH_SALT before storage
- Logger: `private readonly logger = new Logger(ClassName.name);`
- No em dashes in code or comments
- TypeScript strict mode throughout

## Infrastructure
- EC2: ubuntu@3.80.28.75
- Postgres: self-hosted on EC2, accessible from Docker container via 172.17.0.1
- ECR: 390402548152.dkr.ecr.us-east-1.amazonaws.com/tabup-api
- S3 bucket: see `tabup` secret
- Health check: `GET http://3.80.28.75:3000/api/status` (public, no auth)
