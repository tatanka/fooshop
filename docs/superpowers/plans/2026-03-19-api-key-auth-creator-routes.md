# API Key Auth on Creator Routes — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable all creator API routes to accept both session auth and API key auth with granular scopes.

**Architecture:** Add `authenticateCreator()` helper to `src/lib/api-key.ts` that tries API key first, falls back to session, looks up creator, checks scopes. Replace auth boilerplate in every creator route with a single call.

**Tech Stack:** Next.js App Router, Auth.js, Drizzle ORM, TypeScript

---

## File Map

| Action | File | Responsibility |
|--------|------|---------------|
| Modify | `src/lib/api-key.ts` | Add `authenticateCreator()`, `CREATOR_SCOPES` constant |
| Modify | `src/app/api/products/route.ts` | Add dual auth to GET(?mine) and POST |
| Modify | `src/app/api/products/[id]/route.ts` | Add dual auth to GET, PUT, DELETE |
| Modify | `src/app/api/store/route.ts` | Add dual auth to GET, PUT |
| Modify | `src/app/api/store/generate/route.ts` | Add dual auth to POST |
| Modify | `src/app/api/store/theme/route.ts` | Add dual auth to PUT |
| Modify | `src/app/api/store/theme/generate/route.ts` | Add dual auth to POST |
| Modify | `src/app/api/upload/route.ts` | Add dual auth to POST |
| Modify | `src/app/api/analytics/route.ts` | Add dual auth to GET |
| Modify | `src/app/api/coupons/route.ts` | Add dual auth to GET, POST |
| Modify | `src/app/api/coupons/[id]/route.ts` | Add dual auth to PUT |
| Modify | `src/app/api/referrals/route.ts` | Add dual auth to GET, POST |
| Modify | `src/app/api/referrals/[id]/route.ts` | Add dual auth to PUT, DELETE |
| Modify | `src/app/api/orders/export/route.ts` | Add dual auth to GET |

**Out of scope:** The spec lists `GET /api/coupons/[id]`, `DELETE /api/coupons/[id]`, and `GET /api/referrals/[id]` but these handlers do not exist in the codebase. They would need to be created in a separate issue. This plan only updates existing handlers.

---

### Task 1: Add `authenticateCreator()` helper

**Files:**
- Modify: `src/lib/api-key.ts`

- [ ] **Step 1: Add the CREATOR_SCOPES constant and authenticateCreator function**

Add after the existing `insufficientScope` function at the end of `src/lib/api-key.ts`:

```typescript
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { creators } from "@/db/schema";
import { eq } from "drizzle-orm";

export const CREATOR_SCOPES = [
  "store:read",
  "store:write",
  "products:read",
  "products:write",
  "orders:read",
  "analytics:read",
  "coupons:read",
  "coupons:write",
  "referrals:read",
  "referrals:write",
] as const;

export type CreatorScope = (typeof CREATOR_SCOPES)[number];

type CreatorRow = typeof creators.$inferSelect;

type AuthenticateCreatorSuccess = {
  creator: CreatorRow;
  authType: "session" | "api_key";
  userId?: string; // present for session auth, useful for Sentry/rate-limit
};

export async function authenticateCreator(
  req: NextRequest,
  requiredScope?: CreatorScope
): Promise<AuthenticateCreatorSuccess | NextResponse> {
  // 1. Check if request has a Bearer token
  const hasBearerToken = req.headers
    .get("authorization")
    ?.startsWith("Bearer fsk_");

  if (hasBearerToken) {
    // If Bearer token present, MUST authenticate via API key — no session fallback
    const apiKeyAuth = await validateApiKey(req);
    if (!apiKeyAuth) {
      return NextResponse.json(
        { error: "Invalid or expired API key" },
        { status: 401 }
      );
    }
    // Check scope
    if (requiredScope && !hasScope(apiKeyAuth, requiredScope)) {
      return insufficientScope(requiredScope);
    }
    // Look up creator by creatorId
    if (!apiKeyAuth.creatorId) {
      return NextResponse.json(
        { error: "API key not linked to a creator" },
        { status: 403 }
      );
    }
    const creator = await db
      .select()
      .from(creators)
      .where(eq(creators.id, apiKeyAuth.creatorId))
      .then((rows) => rows[0]);

    if (!creator) {
      return NextResponse.json(
        { error: "Creator not found" },
        { status: 404 }
      );
    }
    return { creator, authType: "api_key" };
  }

  // 2. Fall back to session auth
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const creator = await db
    .select()
    .from(creators)
    .where(eq(creators.userId, session.user.id))
    .then((rows) => rows[0]);

  if (!creator) {
    return NextResponse.json(
      { error: "Creator not found" },
      { status: 404 }
    );
  }

  return { creator, authType: "session", userId: session.user.id };
}
```

- [ ] **Step 2: Verify build passes**

Run: `pnpm build`
Expected: Build succeeds (new code is exported but not yet consumed)

- [ ] **Step 3: Commit**

```bash
git add src/lib/api-key.ts
git commit -m "feat: add authenticateCreator() unified auth helper (#82)"
```

---

### Task 2: Update products routes

**Files:**
- Modify: `src/app/api/products/route.ts`
- Modify: `src/app/api/products/[id]/route.ts`

- [ ] **Step 1: Update `src/app/api/products/route.ts`**

Replace the session auth import and boilerplate in both GET (mine=true branch) and POST:

```typescript
// Replace: import { auth } from "@/lib/auth";
// Add:
import { authenticateCreator } from "@/lib/api-key";
```

**GET handler** — only the `?mine=true` branch needs auth. Replace lines 21-34:

```typescript
    const result = await authenticateCreator(req, "products:read");
    if (result instanceof NextResponse) return result;
    const { creator } = result;
```

**POST handler** — replace lines 92-110:

```typescript
  const result = await authenticateCreator(req, "products:write");
  if (result instanceof NextResponse) return result;
  const { creator } = result;
```

Remove the `auth` import from `@/lib/auth` (no longer used in this file).

- [ ] **Step 2: Update `src/app/api/products/[id]/route.ts`**

Same pattern — replace `auth` import with `authenticateCreator` import. Update all three handlers:

**GET:** replace lines 14-28 with:
```typescript
  const result = await authenticateCreator(req, "products:read");
  if (result instanceof NextResponse) return result;
  const { creator } = result;
```

**PUT:** replace lines 46-60 with:
```typescript
  const result = await authenticateCreator(req, "products:write");
  if (result instanceof NextResponse) return result;
  const { creator } = result;
```

**DELETE:** replace lines 107-121 with:
```typescript
  const result = await authenticateCreator(req, "products:write");
  if (result instanceof NextResponse) return result;
  const { creator } = result;
```

Remove `auth` import, remove `creators` from db/schema import (creator lookup now in helper).

- [ ] **Step 3: Verify build passes**

Run: `pnpm build`
Expected: Build succeeds

- [ ] **Step 4: Commit**

```bash
git add src/app/api/products/
git commit -m "feat: add API key auth to products routes (#82)"
```

---

### Task 3: Update store routes

**Files:**
- Modify: `src/app/api/store/route.ts`
- Modify: `src/app/api/store/generate/route.ts`
- Modify: `src/app/api/store/theme/route.ts`
- Modify: `src/app/api/store/theme/generate/route.ts`

- [ ] **Step 1: Update `src/app/api/store/route.ts`**

Replace `auth` import with `authenticateCreator`. Both GET and PUT:

**GET:** replace lines 10-24 with:
```typescript
  const result = await authenticateCreator(req, "store:read");
  if (result instanceof NextResponse) return result;
  const { creator } = result;
```

Note: GET currently takes no `req` parameter. Add `req: NextRequest` to the function signature:
```typescript
export async function GET(req: NextRequest) {
```

**PUT:** replace lines 29-31 with:
```typescript
  const result = await authenticateCreator(req, "store:write");
  if (result instanceof NextResponse) return result;
  const { creator } = result;
```

Update the `.where` clause on the update query to use `creators.id` instead of `creators.userId`:
```typescript
.where(eq(creators.id, creator.id))
```

- [ ] **Step 2: Update `src/app/api/store/generate/route.ts`**

Replace `auth` import with `authenticateCreator`. Replace lines 12-17 with:

```typescript
  const result = await authenticateCreator(req, "store:write");
  if (result instanceof NextResponse) return result;
  const { creator, userId } = result;
```

For Sentry and rate-limit, use `userId` when available (session) or fallback:
```typescript
  if (userId) Sentry.setUser({ id: userId });

  const rateLimitResult = await rateLimit(req, {
    endpoint: "store-generate",
    limit: 5,
    windowMs: 60_000,
    keyStrategy: userId ? "both" : "ip",
    ...(userId && { userId }),
  });
```

Update the `db.insert` to use `creator.userId` and `creator.email` instead of `session.user.*`:
```typescript
  await db
    .insert(creators)
    .values({
      userId: creator.userId,
      email: creator.email,
      name: creator.name,
      storeName: generated.storeName,
      storeDescription: generated.storeDescription,
      storeTheme: generated.theme,
      slug,
    })
    .onConflictDoUpdate({
      target: creators.userId,
      set: {
        storeName: generated.storeName,
        storeDescription: generated.storeDescription,
        storeTheme: generated.theme,
        slug,
      },
    });
```

Also update the Sentry extra to reference `creator.userId`:
```typescript
  extra: { userId: creator.userId },
```

- [ ] **Step 3: Update `src/app/api/store/theme/route.ts`**

Replace `auth` import with `authenticateCreator`. Replace lines 9-13 with:

```typescript
  const result = await authenticateCreator(req, "store:write");
  if (result instanceof NextResponse) return result;
  const { creator } = result;
```

Update the `.where` clause:
```typescript
.where(eq(creators.id, creator.id))
```

- [ ] **Step 4: Update `src/app/api/store/theme/generate/route.ts`**

Replace `auth` import with `authenticateCreator`. Replace lines 8-12 with:

```typescript
  const result = await authenticateCreator(req, "store:write");
  if (result instanceof NextResponse) return result;
  const { creator, userId } = result;
```

Update rate-limit:
```typescript
  const rateLimitResult = await rateLimit(req, {
    endpoint: "store-theme-generate",
    limit: 5,
    windowMs: 60_000,
    keyStrategy: userId ? "both" : "ip",
    ...(userId && { userId }),
  });
```

- [ ] **Step 5: Verify build passes**

Run: `pnpm build`
Expected: Build succeeds

- [ ] **Step 6: Commit**

```bash
git add src/app/api/store/
git commit -m "feat: add API key auth to store routes (#82)"
```

---

### Task 4: Update upload route

**Files:**
- Modify: `src/app/api/upload/route.ts`

- [ ] **Step 1: Update `src/app/api/upload/route.ts`**

Replace `auth` import with `authenticateCreator`. Replace lines 13-16 with:

```typescript
  const result = await authenticateCreator(req, "products:write");
  if (result instanceof NextResponse) return result;
  const { creator, userId } = result;
```

Update Sentry and rate-limit to use `userId` when available:
```typescript
  if (userId) Sentry.setUser({ id: userId });

  const rateLimitResult = await rateLimit(req, {
    endpoint: "upload",
    limit: 5,
    windowMs: 60_000,
    keyStrategy: userId ? "both" : "ip",
    ...(userId && { userId }),
  });
```

Update the R2 key path and Sentry extra to use `creator.userId`:
```typescript
  const key = `products/${creator.userId}/${randomUUID()}/${safeName}`;
  // ...
  extra: { userId: creator.userId, filename: safeName, purpose },
```

- [ ] **Step 2: Verify build passes**

Run: `pnpm build`
Expected: Build succeeds

- [ ] **Step 3: Commit**

```bash
git add src/app/api/upload/route.ts
git commit -m "feat: add API key auth to upload route (#82)"
```

---

### Task 5: Update analytics route

**Files:**
- Modify: `src/app/api/analytics/route.ts`

- [ ] **Step 1: Update `src/app/api/analytics/route.ts`**

Replace `auth` import with `authenticateCreator`. Replace lines 50-64 with:

```typescript
  const result = await authenticateCreator(request, "analytics:read");
  if (result instanceof NextResponse) return result;
  const { creator } = result;
```

Remove `creators` from the db/schema import (still needed for traffic source queries that join on `creators.slug`). Actually, keep `creators` — it's used in `queryPageViewCount` and `queryTrafficSources`.

Remove only the `auth` import from `@/lib/auth`.

- [ ] **Step 2: Verify build passes**

Run: `pnpm build`
Expected: Build succeeds

- [ ] **Step 3: Commit**

```bash
git add src/app/api/analytics/route.ts
git commit -m "feat: add API key auth to analytics route (#82)"
```

---

### Task 6: Update coupons routes

**Files:**
- Modify: `src/app/api/coupons/route.ts`
- Modify: `src/app/api/coupons/[id]/route.ts`

- [ ] **Step 1: Update `src/app/api/coupons/route.ts`**

Replace `auth` import with `authenticateCreator`.

**GET:** replace lines 10-24 with:
```typescript
  const result = await authenticateCreator(req, "coupons:read");
  if (result instanceof NextResponse) return result;
  const { creator } = result;
```

Note: GET currently takes no parameters. Add `req: NextRequest`:
```typescript
export async function GET(req: NextRequest) {
```

**POST:** replace lines 40-53 with:
```typescript
  const result = await authenticateCreator(req, "coupons:write");
  if (result instanceof NextResponse) return result;
  const { creator } = result;
```

Remove `creators` from db/schema import (no longer needed). Remove `auth` import.

- [ ] **Step 2: Update `src/app/api/coupons/[id]/route.ts`**

Replace `auth` import with `authenticateCreator`. Replace lines 13-27 with:

```typescript
  const result = await authenticateCreator(req, "coupons:write");
  if (result instanceof NextResponse) return result;
  const { creator } = result;
```

Remove `creators` from db/schema import. Remove `auth` import.

- [ ] **Step 3: Verify build passes**

Run: `pnpm build`
Expected: Build succeeds

- [ ] **Step 4: Commit**

```bash
git add src/app/api/coupons/
git commit -m "feat: add API key auth to coupons routes (#82)"
```

---

### Task 7: Update referrals routes

**Files:**
- Modify: `src/app/api/referrals/route.ts`
- Modify: `src/app/api/referrals/[id]/route.ts`

- [ ] **Step 1: Update `src/app/api/referrals/route.ts`**

Replace `auth` import with `authenticateCreator`.

**GET:** replace lines 10-24 with:
```typescript
  const result = await authenticateCreator(req, "referrals:read");
  if (result instanceof NextResponse) return result;
  const { creator } = result;
```

Note: GET currently takes no parameters. Add `req: NextRequest`:
```typescript
export async function GET(req: NextRequest) {
```

**POST:** replace lines 44-57 with:
```typescript
  const result = await authenticateCreator(req, "referrals:write");
  if (result instanceof NextResponse) return result;
  const { creator } = result;
```

Remove `creators` from db/schema import. Remove `auth` import.

- [ ] **Step 2: Update `src/app/api/referrals/[id]/route.ts`**

Replace `auth` import with `authenticateCreator`.

**PUT:** replace lines 13-27 with:
```typescript
  const result = await authenticateCreator(req, "referrals:write");
  if (result instanceof NextResponse) return result;
  const { creator } = result;
```

**DELETE:** replace lines 70-83 with:
```typescript
  const result = await authenticateCreator(req, "referrals:write");
  if (result instanceof NextResponse) return result;
  const { creator } = result;
```

Remove `creators` from db/schema import. Remove `auth` import.

- [ ] **Step 3: Verify build passes**

Run: `pnpm build`
Expected: Build succeeds

- [ ] **Step 4: Commit**

```bash
git add src/app/api/referrals/
git commit -m "feat: add API key auth to referrals routes (#82)"
```

---

### Task 8: Update orders export route

**Files:**
- Modify: `src/app/api/orders/export/route.ts`

- [ ] **Step 1: Update `src/app/api/orders/export/route.ts`**

Replace `auth` import with `authenticateCreator`. Add `req: NextRequest` to GET signature. Replace lines 14-27 with:

```typescript
export async function GET(req: NextRequest) {
  const result = await authenticateCreator(req, "orders:read");
  if (result instanceof NextResponse) return result;
  const { creator } = result;
```

Remove `creators` from db/schema import. Remove `auth` import. Add `NextRequest` import.

- [ ] **Step 2: Verify build passes**

Run: `pnpm build`
Expected: Build succeeds

- [ ] **Step 3: Commit**

```bash
git add src/app/api/orders/export/route.ts
git commit -m "feat: add API key auth to orders export route (#82)"
```

---

### Task 9: Final verification

- [ ] **Step 1: Full build**

Run: `pnpm build`
Expected: Build succeeds with zero errors

- [ ] **Step 2: Verify no remaining direct `auth()` calls in creator routes**

Run: `grep -r "await auth()" src/app/api/ --include="*.ts" | grep -v admin | grep -v nextauth | grep -v stripe | grep -v checkout | grep -v stores | grep -v download | grep -v buy-intents | grep -v "coupons/validate"`

Expected: No output (all creator routes now use `authenticateCreator`)

- [ ] **Step 3: Commit (if any cleanup needed)**

Only if step 2 found stragglers.
