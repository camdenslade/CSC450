# ---- Build stage ----
FROM node:22-alpine AS builder

WORKDIR /app

# Copy manifests and root tsconfig first for layer caching
COPY package.json package-lock.json tsconfig.json ./

# Copy only the API source (not mobile)
COPY apps/api/ apps/api/

# Install all deps (devDeps needed for tsc)
RUN npm ci

# Compile TypeScript
RUN npx tsc -p apps/api/tsconfig.app.json

# ---- Production stage ----
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Copy manifests and install production deps only
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Copy compiled output from builder
COPY --from=builder /app/dist ./dist

EXPOSE 3000

CMD ["node", "dist/apps/api/src/main.js"]
