# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Fooshop is an AI-powered headless marketplace for digital products. Creators sell digital goods (ebooks, templates, courses, presets, prompts, assets) with zero fixed costs (5% commission per sale). Key differentiators: AI-generated storefronts via Claude API, product discovery via MCP server, and a headless/API-first architecture.

Domain: fooshop.ai

## Architecture

**Monolith:** Next.js App Router handles both API routes and frontend in a single deploy.

```
src/
  app/                    # Next.js App Router (pages + API routes)
    api/                  # REST API endpoints
      products/           # CRUD (public GET, auth'd POST/PUT/DELETE)
      checkout/           # Stripe Checkout session creation
      stripe/             # Connect onboarding + webhooks
      store/generate/     # AI store generation endpoint
      upload/             # R2 presigned URL generation
      auth/[...nextauth]/ # Auth.js route handler
    [slug]/               # Public store page (dynamic)
      [productSlug]/      # Public product page (dynamic)
    dashboard/            # Creator dashboard (protected)
    explore/              # Product discovery page
    onboarding/           # AI-powered store setup
  db/
    index.ts              # Drizzle client (postgres-js driver)
    schema.ts             # All tables: creators, products, orders, page_views
  lib/
    auth.ts               # Auth.js config (Google provider, Drizzle adapter)
    stripe.ts             # Stripe client + platform fee calculation (5%)
    r2.ts                 # Cloudflare R2 client (S3-compatible, presigned URLs)
    ai.ts                 # Claude API for store generation
  middleware.ts           # Auth middleware for /dashboard and /api/products
mcp-server/               # Separate TypeScript package (@fooshop/mcp-server)
  src/index.ts            # MCP tools: search_products, get_product, get_store
```

## Tech Stack

| Layer | Choice |
|-------|--------|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript |
| ORM | Drizzle ORM (PostgreSQL via postgres-js) |
| Database | PostgreSQL (Render) |
| Auth | Auth.js (next-auth@beta) with Google + Drizzle adapter |
| Payments | Stripe Connect (Express accounts, 95/5 split) |
| File Storage | Cloudflare R2 (S3-compatible, presigned URLs) |
| AI | Anthropic SDK (Claude API for store generation) |
| Styling | Tailwind CSS |
| MCP Server | @modelcontextprotocol/sdk (stdio transport) |
| Deploy | Render (web service + PostgreSQL) |
| Package Manager | pnpm |

## Common Commands

```bash
# Development
pnpm dev                    # Start Next.js dev server (localhost:3000)
pnpm build                  # Production build
pnpm start                  # Start production server

# Database
pnpm drizzle-kit generate   # Generate migration from schema changes
pnpm drizzle-kit push       # Push schema directly to database
pnpm drizzle-kit studio     # Open Drizzle Studio (DB browser)

# MCP Server (separate package)
cd mcp-server && pnpm install && pnpm build   # Build MCP server
cd mcp-server && pnpm start                   # Run MCP server

# Deploy (production DB migration)
DATABASE_URL=<production_url> pnpm drizzle-kit push
```

## Key Data Model

- **creators** — sellers (linked to Auth.js users), have slug, Stripe Connect ID, store theme (JSONB)
- **products** — digital products with status (draft/published), price in cents, file stored in R2, metadata_json for AI/SEO
- **orders** — completed purchases, tracks platform fee, linked to Stripe payment intent
- **page_views** — analytics, tracks source (web/mcp/api)

All IDs are UUIDs. Prices stored as integers in cents. Currency defaults to USD.

## Key Patterns

- **Auth check:** Use `const session = await auth()` then check `session?.user?.id` in API routes
- **Creator lookup:** After auth, query `creators` table by user ID to get creator profile
- **Slug generation:** `title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")`
- **Platform fee:** 5% of sale amount — `Math.round(amountCents * 5 / 100)`
- **File uploads:** Client gets presigned URL from `/api/upload`, uploads directly to R2
- **Stripe split:** Uses `payment_intent_data.application_fee_amount` + `transfer_data.destination` in Checkout sessions
- **Webhook body:** Stripe webhook at `/api/stripe/webhook` reads raw body (`req.text()`) for signature verification

## Environment Variables

See `.env.example` for all required variables: DATABASE_URL, AUTH_SECRET, AUTH_GOOGLE_*, STRIPE_*, ANTHROPIC_API_KEY, R2_*, NEXT_PUBLIC_APP_URL.

## MCP Server

The `mcp-server/` directory is a separate npm package (`@fooshop/mcp-server`) that exposes the product catalog to AI agents. It calls the public Fooshop API and uses `FOOSHOP_API_URL` env var (defaults to https://fooshop.ai). Tools: `search_products`, `get_product`, `get_store`.

## Design Documents

- `2026-03-06-fooshop-design.md` — Full product design doc (vision, architecture, data model, flows)
- `2026-03-06-fooshop-implementation.md` — Step-by-step implementation plan with code templates for all 13 tasks
