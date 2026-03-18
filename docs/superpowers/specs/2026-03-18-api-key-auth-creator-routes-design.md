# API Key Auth on All Creator Routes — Design Spec

**Issue:** #82
**Date:** 2026-03-18
**Status:** Approved

## Problem

Creator API routes only accept session auth (cookies). CLI and MCP write operations need API key auth via `Authorization: Bearer <key>` header.

## Solution

### Unified `authenticateCreator()` helper

Add to `src/lib/api-key.ts`:

```typescript
async function authenticateCreator(
  req: NextRequest,
  requiredScope?: string
): Promise<{ creator: Creator; authType: "session" | "api_key" } | NextResponse>
```

**Logic:**
1. Try API key auth via `validateApiKey(req)` — if Bearer token present
2. Fall back to session auth via `auth()`
3. If neither succeeds → 401
4. For API key: check `requiredScope` if provided → 403 if missing
5. Look up creator record (by `creatorId` for API key, by `userId` for session)
6. If creator not found → 404

**Session auth skips scope checks** — session users have full access (same as current dashboard behavior).

### Scope Definitions

New scopes to add to the API key system:

| Scope | Description |
|-------|-------------|
| `store:read` | Read store settings |
| `store:write` | Update store settings, generate store |
| `products:read` | List/get own products |
| `products:write` | Create/update/delete products, upload files |
| `orders:read` | List/export orders |
| `analytics:read` | Read analytics data |
| `coupons:read` | List coupons |
| `coupons:write` | Create/update/delete coupons |
| `referrals:read` | List referrals |
| `referrals:write` | Create/update/delete referrals |

Existing `admin:*` wildcard scope continues to grant all access.

### Route-to-Scope Mapping

| Route | Method | Scope |
|-------|--------|-------|
| `GET /api/products?mine=true` | GET | `products:read` |
| `POST /api/products` | POST | `products:write` |
| `GET /api/products/[id]` | GET | `products:read` |
| `PUT /api/products/[id]` | PUT | `products:write` |
| `DELETE /api/products/[id]` | DELETE | `products:write` |
| `GET /api/store` | GET | `store:read` |
| `PUT /api/store` | PUT | `store:write` |
| `POST /api/store/generate` | POST | `store:write` |
| `POST /api/upload` | POST | `products:write` |
| `GET /api/analytics` | GET | `analytics:read` |
| `GET /api/coupons` | GET | `coupons:read` |
| `POST /api/coupons` | POST | `coupons:write` |
| `GET /api/coupons/[id]` | GET | `coupons:read` |
| `PUT /api/coupons/[id]` | PUT | `coupons:write` |
| `DELETE /api/coupons/[id]` | DELETE | `coupons:write` |
| `GET /api/referrals` | GET | `referrals:read` |
| `POST /api/referrals` | POST | `referrals:write` |
| `GET /api/referrals/[id]` | GET | `referrals:read` |
| `PUT /api/referrals/[id]` | PUT | `referrals:write` |
| `DELETE /api/referrals/[id]` | DELETE | `referrals:write` |
| `GET /api/orders/export` | GET | `orders:read` |

### Routes NOT Changed

- Public routes: checkout, product by slug, store by slug, stores/[slug], download/[token], buy-intents, coupons/validate, referrals/track
- Admin routes: already use API key auth with `admin:*` scope
- Auth routes: NextAuth handlers
- Stripe routes: webhook + connect (Stripe-specific auth)

### Implementation Pattern

Each route handler replaces its auth boilerplate:

**Before:**
```typescript
const session = await auth();
if (!session?.user?.id) {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
const creator = await db.select().from(creators)
  .where(eq(creators.userId, session.user.id))
  .then((rows) => rows[0]);
if (!creator) {
  return NextResponse.json({ error: "Creator not found" }, { status: 404 });
}
```

**After:**
```typescript
const result = await authenticateCreator(req, "products:write");
if (result instanceof NextResponse) return result;
const { creator } = result;
```

### Middleware Consideration

`src/middleware.ts` currently redirects unauthenticated `/dashboard/*` requests to sign-in. This stays unchanged — middleware runs before route handlers and only checks session cookies for browser navigation. API key auth is handled at the route level.

## Testing

- Existing session auth continues to work (dashboard not broken)
- API key with correct scope gets 200
- API key with wrong scope gets 403
- API key expired gets 401
- No auth gets 401
- Build passes
