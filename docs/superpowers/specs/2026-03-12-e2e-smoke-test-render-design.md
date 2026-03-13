# E2E Smoke Test su Deploy Render

**Issue:** #7 — [GEN-007] E2E smoke test su deploy Render
**Date:** 2026-03-12
**Status:** Approved

## Goal

Automated HTTP-based smoke tests that verify a Render deploy is healthy: DB reachable, auth wired up, public pages serving, product API responding. Run via `pnpm smoke` against any environment.

## Approach

Vitest as test runner with native `fetch` for HTTP requests. No browser, no heavy dependencies. Separate config from future unit tests.

## Infrastructure

### Config: `vitest.config.smoke.ts`

Dedicated config for smoke tests:
- `include: ["tests/smoke/**/*.test.ts"]`
- `testTimeout: 10000` (10s per test, network latency)
- No DOM environment (pure HTTP)

### Script: `package.json`

```json
"smoke": "vitest run --config vitest.config.smoke.ts"
```

### Dependencies

- `vitest` (dev dependency)

### Environment Variables

| Variable | Default | Purpose |
|----------|---------|---------|
| `SMOKE_TEST_URL` | `http://localhost:3000` | Target deploy URL |
| `SMOKE_TEST_STORE_SLUG` | — | Known creator slug for page tests |
| `SMOKE_TEST_PRODUCT_SLUG` | — | Known product slug for page tests |

## Test Files

### `tests/smoke/public-pages.test.ts`

Verifies public pages return 200 with expected content.

| Test | Method | Path | Assert |
|------|--------|------|--------|
| Homepage loads | GET | `/` | status 200 |
| Explore page loads | GET | `/explore` | status 200, contains product markup |
| Store page loads | GET | `/[STORE_SLUG]` | status 200, contains store content |
| Product page loads | GET | `/[STORE_SLUG]/[PRODUCT_SLUG]` | status 200, contains product content |

### `tests/smoke/api-products.test.ts`

Verifies product API endpoints respond with correct shape.

| Test | Method | Path | Assert |
|------|--------|------|--------|
| List products | GET | `/api/products` | status 200, JSON array |
| Filter by category | GET | `/api/products?category=ebook` | status 200, JSON array |
| Get by slug | GET | `/api/products/by-slug/[PRODUCT_SLUG]` | status 200, has `id`, `title`, `priceCents` fields |

### `tests/smoke/auth.test.ts`

Verifies auth infrastructure is configured.

| Test | Method | Path | Assert |
|------|--------|------|--------|
| Providers available | GET | `/api/auth/providers` | status 200, JSON includes `google` |
| CSRF token | GET | `/api/auth/csrf` | status 200, has `csrfToken` field |
| Dashboard redirects | GET | `/dashboard` | redirects to sign-in (302 or resolved to auth page) |

### `tests/smoke/db-health.test.ts`

Verifies database connectivity through existing endpoints.

| Test | Method | Path | Assert |
|------|--------|------|--------|
| Products from DB | GET | `/api/products` | status 200, returns data (proves DB connection) |
| Store from DB | GET | `/api/stores/[STORE_SLUG]` | status 200, returns store object |

## Test Conventions

- **HTTP-only**: Pure `fetch`, no browser automation
- **Independent**: No shared state, no ordering between tests
- **Assertions**: Status codes, content-type, key JSON fields, key HTML strings
- **Timeout**: 10s per test
- **No retries**: Smoke tests should pass on first try — failure = real problem
- **Base URL pattern**: `const BASE_URL = process.env.SMOKE_TEST_URL || "http://localhost:3000"`
- **Conditional skip**: Tests depending on `SMOKE_TEST_STORE_SLUG` or `SMOKE_TEST_PRODUCT_SLUG` use `describe.skipIf` when the variable is not set, with a console warning. This way `pnpm smoke` with no config still runs the non-slug tests.
- **Page view side effect**: Smoke tests hitting `/api/products/by-slug/[slug]` will insert `page_views` records. Pass `?source=smoke` if you want to distinguish these from real traffic.

## Out of Scope

These require auth, external services, or side effects — not appropriate for smoke tests:

- Stripe checkout flow (requires payment)
- File upload/download (requires auth + R2)
- AI store generation (requires Anthropic API credits)
- Coupon CRUD (requires auth)
- Analytics endpoints (requires auth)
- Order endpoints (requires auth)

## Usage

```bash
# Against local dev
pnpm smoke

# Against production
SMOKE_TEST_URL=https://fooshop.ai \
SMOKE_TEST_STORE_SLUG=mystore \
SMOKE_TEST_PRODUCT_SLUG=my-product \
pnpm smoke
```
