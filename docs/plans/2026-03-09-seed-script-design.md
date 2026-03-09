# Seed Script — Design

Issue: #6

## Approach

TypeScript script at `src/scripts/seed.ts` using Drizzle ORM. Run via `tsx`.

## Data

- 2 creators (with fake Auth.js users, store names, slugs — no Stripe Connect ID)
- 3-4 products per creator (various categories, prices, draft/published)
- 5-6 orders across both creators (completed/pending/refunded mix)
- Deterministic UUIDs so script is idempotent (delete + re-insert)

## Script behavior

1. Delete existing seed data (orders → products → creators → users) by known IDs
2. Insert users, creators, products, orders
3. Log summary of what was inserted

## Integration

- Add `"seed": "tsx src/scripts/seed.ts"` to package.json
- Add `tsx` as dev dependency
