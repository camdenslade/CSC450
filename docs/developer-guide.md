# TabUp Developer Guide

## What this project is
- TabUp is a ios app for starting, splitting, and settling restaurant/bar tabs without handling money directly.
- Core ideas: capture the bill (photo + text fallback), choose friends, pick a payout platform, send reminders/notifications, and keep a ledger of past tabs.
- Current implementation focuses on the mobile shell and visual home experience; backend and shared types are stubs.

## Repo layout
- `apps/mobile` – Expo/React Native app (active). Entry: `apps/mobile/src/App.tsx`, main screen: `apps/mobile/src/home/HomeScreen.tsx`.
- `apps/api` – placeholder for the future Nest.js API (no package.json or code yet). Folders for auth, bills, friends, groups, ledger, notifications, uploads, users.
- `packages/shared-types` – reserved for cross-package TypeScript types (empty).
- `docs` – product docs (this guide, architecture, API contracts, threat model).
- `infrastructure` – empty placeholders for EC2, NGINX, S3, security configs.

## Prerequisites
- Node.js 20 LTS (npm 10) recommended; Expo SDK 54 works with Node >=18.
- npm (preferred, package-locks committed); `npx` available via npm.
- Mobile tooling: Expo Go on device, or Android Studio emulator / Xcode Simulator for platform runs.
- Git and a TypeScript-friendly editor.

## Getting started
1) Clone the repo: `git clone https://github.com/camdenslade/CSC450.git && cd CSC450`.
2) Install workspace deps (root manages workspaces):
   ```sh
   npm install
   ```
   To install only the app: `cd apps/mobile && npm install` (respects local lockfile).
3) Start the mobile app (Expo bundler):
   ```sh
   cd apps/mobile
   npm start
   ```
   - Press `i` for iOS simulator, `a` for Android, or scan the QR in Expo Go.
   - Platform shortcuts: `npm run ios`, `npm run android`, `npm run web`.
4) Lint/tests: none wired yet; Jest deps exist at the root for future API/type testing.

## Mobile architecture (implemented)
- `Layout` (`apps/mobile/src/shared/Layout.tsx`): wraps screens with safe areas, animated `Background`, and shared `NavBar`.
- `Background` (`apps/mobile/src/shared/Background.tsx`): animated soft gradient shapes; keep animations lightweight.
- `NavBar` (`apps/mobile/src/shared/NavBar.tsx`): text-only tab bar; emits `TabKey` in `onTabPress`.
- `HomeScreen` composes:
  - `BrandHeader` (brand badge + title/subtitle)
  - `BalanceCard` (net balance placeholder)
  - `PrimaryActions` (start/view tab buttons)
  - `MetricsRow` (3 stat cards)
  - `NextTabCard` (upcoming tab preview)
  - `ActivityList` (recent activity feed)
  - `Section` helper for titled blocks
- Data is currently mock/filler; replace with real queries once API hooks exist.

## Styling & theming
- Palette lives in `apps/mobile/src/theme/colors.ts` (green-forward scheme from README). Reuse `colors.*` instead of raw hexes.
- Styles use `StyleSheet.create` co-located with components; keep components functional and typed.
- Background/shape aesthetics aim for bold yet minimal surfaces; avoid default system grays.

## Backend/API status
- `apps/api` only has empty module folders and `main.ts`; Nest.js/TypeORM/Postgres are planned but not scaffolded.
- Next steps when you pick this up:
  - `npm create nest@latest` inside `apps/api`, align with planned modules (auth, bills, friends, groups, ledger, notifications, uploads, users).
  - Wire Secrets Manager + TypeORM/Postgres config; add JWT/Firebase auth adapter to match mobile.
  - Create shared DTOs in `packages/shared-types` and import from both API and mobile.

## Development conventions
- TypeScript everywhere; prefer function components with explicit prop types.
- Keep UI copy short; favor accessibility-friendly sizes and tap targets (>=44px).
- Use `console.log` only for temporary scaffolding—swap to proper logging once infra exists.
- When adding features, update docs in `docs/` (architecture, api-contracts, threat-model) alongside code.

## Roadmap snapshots
- Replace mock data on Home with real queries once API exists.
- Build tab creation flow (camera upload + manual entry), friend selection, and platform selection UI.
- Implement notifications: push for app users, SMS via Twilio fallback.
- Add ledger history, groups, favorite friends, and preferred platform toggles.
- Add tests: component smoke tests (React Native Testing Library) and API contract tests (Jest + Supertest).
