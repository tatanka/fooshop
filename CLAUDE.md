# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Fooshop is a developer-first ecommerce platform. "Add commerce to anything. One command. One API." Developers use CLI, API, or MCP server to deploy stores, build ecommerce for clients, or embed commerce in their products.

**Positioning:** Add commerce to anything. One command. One API. CLI-first, AI-native, MCP-enabled.

**Target segments:**
1. Indie developers selling their own products (templates, boilerplate, courses)
2. Freelancers building ecommerce for clients
3. Agencies managing multiple ecommerce projects
4. Startups embedding commerce in their products
5. Enterprise/SaaS needing a commerce layer

**Three interfaces, one backend API:**
- CLI (`fooshop` npm package) — primary interface
- Dashboard web (fooshop.ai/dashboard) — visual peer to CLI
- MCP server (`@fooshop/mcp`) — AI agent interface (read + write + purchase)

**Products:** Digital (file download) + Physical (dumb shipping — seller handles fulfillment)

**Pricing:**
| Tier | Price | Commission |
|------|-------|-----------|
| Free | $0 | 8% |
| Pro | $19/mo | 3% |
| Business | $49/mo | 0% |

Domain: fooshop.ai (staging: fooshop.exelab.net)

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
    dashboard/            # Seller dashboard (protected)
    explore/              # Product discovery page (secondary)
    onboarding/           # AI-powered store setup
  db/
    index.ts              # Drizzle client (postgres-js driver)
    schema.ts             # All tables: creators, products, orders, page_views, apiKeys
  lib/
    auth.ts               # Auth.js config (Google provider, Drizzle adapter)
    stripe.ts             # Stripe client + platform fee calculation
    r2.ts                 # Cloudflare R2 client (S3-compatible, presigned URLs)
    ai.ts                 # Claude API for store generation
    api-key.ts            # API key generation and validation
    commission.ts         # Commission calculation (tier-based + overrides)
  middleware.ts           # Auth middleware for /dashboard and /api/products
mcp-server/               # Separate TypeScript package (@fooshop/mcp-server)
  src/index.ts            # MCP tools: search_products, get_product, get_store, get_checkout_url
```

## Tech Stack

| Layer | Choice |
|-------|--------|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript |
| ORM | Drizzle ORM (PostgreSQL via postgres-js) |
| Database | PostgreSQL (Render) |
| Auth | Auth.js (next-auth@beta) with Google + Drizzle adapter |
| Payments | Stripe Connect (Express accounts, tiered commission split) |
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

# Admin CLI
pnpm creators-admin search <query>            # Search creators
pnpm creators-admin info <email-or-slug>      # Creator details
pnpm creators-admin set-commission <email-or-slug> <percent> <duration>

# Deploy (production DB migration)
DATABASE_URL=<production_url> pnpm drizzle-kit push
```

## Key Data Model

- **creators** — sellers (linked to Auth.js users), have slug, Stripe Connect ID, store theme (JSONB), tier (free/pro/business), commission override
- **products** — products with status (draft/published), price in cents, file stored in R2, metadata_json for AI/SEO
- **orders** — completed purchases, tracks platform fee, linked to Stripe payment intent
- **page_views** — analytics, tracks source (web/mcp/api)
- **apiKeys** — API keys for CLI and MCP auth (keyHash, keyPrefix, scopes, expiresAt)

All IDs are UUIDs. Prices stored as integers in cents. Currency defaults to USD.

## Key Patterns

- **Auth check:** Use `const session = await auth()` then check `session?.user?.id` in API routes
- **API key auth:** API routes accept both session cookies and API key via `Authorization: Bearer <key>` header
- **Creator lookup:** After auth, query `creators` table by user ID to get creator profile
- **Slug generation:** `title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")`
- **Platform fee:** Determined by creator tier — Free: 8%, Pro: 3%, Business: 0%. Override system for promotions
- **File uploads:** Client gets presigned URL from `/api/upload`, uploads directly to R2
- **Stripe split:** Uses `payment_intent_data.application_fee_amount` + `transfer_data.destination` in Checkout sessions
- **Webhook body:** Stripe webhook at `/api/stripe/webhook` reads raw body (`req.text()`) for signature verification

## Environment Variables

See `.env.example` for all required variables: DATABASE_URL, AUTH_SECRET, AUTH_GOOGLE_*, STRIPE_*, ANTHROPIC_API_KEY, R2_*, NEXT_PUBLIC_APP_URL.

## MCP Server

The `mcp-server/` directory is a separate npm package (`@fooshop/mcp-server`) that exposes the product catalog to AI agents. It calls the public Fooshop API and uses `FOOSHOP_API_URL` env var (defaults to https://fooshop.ai).

**Read tools (no auth):** `search_products`, `get_product`, `get_store`
**Purchase tools (no auth):** `get_checkout_url` → returns checkout URL
**Write tools (auth via API key):** planned — `create_store`, `add_product`, `update_product`

## Git Workflow

**Branches protetti:** `main` (produzione), `staging` (pre-produzione), `develop` (sviluppo). Mai commit diretti su questi branch.

**Flusso:** `feat/*` o `fix/*` da develop → merge in `develop` → PR in `staging` → PR in `main`

```
feat/my-feature  ──→  develop  ──PR──→  staging  ──PR──→  main
fix/my-bugfix    ──→  develop  ──PR──→  staging  ──PR──→  main
```

## Design Documents

- `docs/superpowers/specs/2026-03-18-fooshop-pivot-developer-platform-design.md` — Pivot design spec (developer platform, CLI-first, AI-native)
- `docs/strategy/business-plan-24m.md` — 24-month business plan with revenue projections
- `2026-03-06-fooshop-design.md` — Original product design doc (pre-pivot, for reference)
- `2026-03-06-fooshop-implementation.md` — Original implementation plan (pre-pivot, for reference)
