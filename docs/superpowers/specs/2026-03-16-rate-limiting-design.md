# Rate Limiting su Endpoint Pubblici

**Issue:** #49
**Date:** 2026-03-16
**Status:** Approved

## Goal

Protect public and authenticated API endpoints from abuse with per-IP and per-user rate limiting. Return 429 responses with `Retry-After` header when limits are exceeded.

## Architecture

A `src/lib/rate-limit.ts` module exposing a `rateLimit()` utility function. Each protected route calls it at the top of its handler — no middleware, no Edge runtime constraints.

```
Request → Route Handler → rateLimit(config) → 429 or proceed
                              ↓
                    InMemoryStore (Map<string, {count, resetAt}>)
                              ↓
                    (future: RedisStore — same interface)
```

## Storage Abstraction

```typescript
interface RateLimitStore {
  increment(key: string, windowMs: number): Promise<{ count: number; resetAt: number }>;
}
```

Ships with `InMemoryStore` backed by a `Map`. Stale entries cleaned up via periodic sweep (every 60s). The interface is designed so a `RedisStore` can be swapped in later without changing any route code.

## Algorithm

Fixed window counter. Each key (e.g. `checkout:192.168.1.1`) gets a counter that resets when the window expires. Chosen over sliding window for simplicity — sufficient for current traffic patterns.

## Key Strategy

- **`ip`** — public/unauthenticated endpoints. Key: `{endpoint}:{ip}`
- **`user`** — authenticated endpoints. Key: `{endpoint}:user:{userId}`
- **`both`** — authenticated endpoints needing dual protection. Checks both IP and user limits independently; either exceeding triggers 429.

IP extraction: `x-forwarded-for` header (first value) with fallback to `req.headers.get("x-real-ip")` then `"unknown"`.

## Per-Route Usage

```typescript
const result = await rateLimit(req, {
  endpoint: "checkout",
  limit: 10,
  windowMs: 60_000,
  keyStrategy: "ip",
});
if (result) return result; // 429 NextResponse
```

For `keyStrategy: "both"`, the function also needs the user ID:

```typescript
const result = await rateLimit(req, {
  endpoint: "store-generate",
  limit: 5,
  windowMs: 60_000,
  keyStrategy: "both",
  userId: session.user.id,
});
if (result) return result;
```

## Rate Limits

| Endpoint | Limit | Window | Key Strategy |
|----------|-------|--------|-------------|
| `POST /api/checkout` | 10/min | 60s | ip |
| `POST /api/coupons/validate` | 20/min | 60s | ip |
| `POST /api/store/generate` | 5/min | 60s | both |
| `POST /api/store/theme/generate` | 5/min | 60s | both |
| `POST /api/upload` | 5/min | 60s | both |
| `POST /api/buy-intents` | 30/min | 60s | ip |
| `GET /api/products` | 60/min | 60s | ip |
| `GET /api/stores/[slug]` | 60/min | 60s | ip |
| `GET /api/products/by-slug/[slug]` | 60/min | 60s | ip |

## 429 Response

```json
{ "error": "Too many requests. Please try again later." }
```

Headers included:
- `Retry-After: <seconds until window reset>`
- `X-RateLimit-Limit: <max requests>`
- `X-RateLimit-Remaining: <requests left>`
- `X-RateLimit-Reset: <unix timestamp of reset>`

## Files

### New
- `src/lib/rate-limit.ts` — `RateLimitStore` interface, `InMemoryStore` class, `rateLimit()` function

### Modified (add `rateLimit()` call at top of handler)
- `src/app/api/checkout/route.ts`
- `src/app/api/coupons/validate/route.ts`
- `src/app/api/store/generate/route.ts`
- `src/app/api/store/theme/generate/route.ts`
- `src/app/api/upload/route.ts`
- `src/app/api/buy-intents/route.ts`
- `src/app/api/products/route.ts`
- `src/app/api/stores/[slug]/route.ts`
- `src/app/api/products/by-slug/[slug]/route.ts`

## Out of Scope

- Redis/Upstash store (future — same interface, swap when needed)
- Sliding window algorithm (fixed window sufficient for now)
- Global middleware approach (per-route is more explicit)
- Rate limiting on admin/API-key endpoints (already access-gated)
- Rate limiting on Stripe webhook (authenticated via signature)
