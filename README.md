# Luke UX – AI-Augmented UX Design Copilot

Desktop-only, production-grade UX design copilot. This repo is isolated from fukari.me and is intended for Vercel (web) + Railway (API/DB) deployment with Stripe billing and pluggable LLM providers.

## Structure
- `apps/web` – Next.js (App Router) desktop web experience, API routes, and admin console.
- `packages/shared` – Shared types, domain contracts, and provider interfaces.

## Getting Started
1. Install Node 18+.
2. Install deps: `npm install` (workspace aware).
3. Copy `env.example` to `.env` and fill values.
4. Generate Prisma client: `npm exec -w @luke-ux/web prisma generate -- --schema prisma/schema.prisma`.
5. Run the app: `npm run dev` (root).

## Branching / backups
- Snapshot branch: `backup/lukeux` (created as a restore point after initial setup).
- Working branch: `main` (current).

## Environment variables
- `DATABASE_URL` – Postgres connection (Railway/local per env).
- `SESSION_SECRET` – Long random string for session signing.
- Stripe: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_PRO`.
- LLM keys: `OPENAI_API_KEY`, `ANTHROPIC_API_KEY` (or other providers).
- `NEXT_PUBLIC_APP_URL` – Base URL for building absolute links.

## Auth & Billing notes
- Email/password with verification; strong password rules enforced server-side.
- Dev convenience: registration/forgot responses include tokens when `NODE_ENV=development` until email delivery is wired.
- Free vs Pro gating to be enforced via usage ledger + Stripe events (next steps).

## Accessibility
- WCAG 2.1 AA targeted; forms include labels, focus states, and clear error messaging.

