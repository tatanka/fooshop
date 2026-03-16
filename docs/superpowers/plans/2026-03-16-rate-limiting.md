# Rate Limiting Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Protect public API endpoints from abuse with per-IP and per-user rate limiting, returning 429 with Retry-After headers.

**Architecture:** A `src/lib/rate-limit.ts` module with `RateLimitStore` interface, `InMemoryStore` implementation, and `rateLimit()` helper. Each protected route calls `rateLimit()` at the top of its handler. No middleware, no external dependencies.

**Tech Stack:** Next.js 15 App Router, TypeScript, Vitest

**Spec:** `docs/superpowers/specs/2026-03-16-rate-limiting-design.md`

---

## Chunk 1: Core Rate Limiting Library

### Task 1: InMemoryStore and rateLimit() with tests

**Files:**
- Create: `src/lib/rate-limit.ts`
- Create: `src/lib/__tests__/rate-limit.test.ts`

- [ ] **Step 1: Write tests for InMemoryStore and rateLimit()**

Create `src/lib/__tests__/rate-limit.test.ts`:

```typescript
import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { InMemoryStore, rateLimit, getClientIp, _resetStoreForTesting } from "@/lib/rate-limit";
import { NextRequest } from "next/server";

describe("InMemoryStore", () => {
  let store: InMemoryStore;

  beforeEach(() => {
    store = new InMemoryStore();
  });

  it("increments counter for new key", async () => {
    const result = await store.increment("test-key", 60_000);
    expect(result.count).toBe(1);
    expect(result.resetAt).toBeGreaterThan(Date.now());
  });

  it("increments counter for existing key within window", async () => {
    await store.increment("test-key", 60_000);
    const result = await store.increment("test-key", 60_000);
    expect(result.count).toBe(2);
  });

  it("resets counter after window expires", async () => {
    vi.useFakeTimers();
    await store.increment("test-key", 1_000);
    vi.advanceTimersByTime(1_100);
    const result = await store.increment("test-key", 1_000);
    expect(result.count).toBe(1);
    vi.useRealTimers();
  });

  it("tracks keys independently", async () => {
    await store.increment("key-a", 60_000);
    await store.increment("key-a", 60_000);
    const result = await store.increment("key-b", 60_000);
    expect(result.count).toBe(1);
  });

  it("cleans up expired entries", async () => {
    vi.useFakeTimers();
    await store.increment("expired-key", 1_000);
    vi.advanceTimersByTime(1_100);
    store.cleanup();
    // After cleanup, key should be gone — next increment starts at 1
    const result = await store.increment("expired-key", 1_000);
    expect(result.count).toBe(1);
    vi.useRealTimers();
  });
});

describe("getClientIp", () => {
  it("extracts IP from x-forwarded-for (first value)", () => {
    const req = new NextRequest("http://localhost/api/test", {
      headers: { "x-forwarded-for": "1.2.3.4, 5.6.7.8" },
    });
    expect(getClientIp(req)).toBe("1.2.3.4");
  });

  it("falls back to x-real-ip", () => {
    const req = new NextRequest("http://localhost/api/test", {
      headers: { "x-real-ip": "9.8.7.6" },
    });
    expect(getClientIp(req)).toBe("9.8.7.6");
  });

  it("returns 'unknown' when no IP headers", () => {
    const req = new NextRequest("http://localhost/api/test");
    expect(getClientIp(req)).toBe("unknown");
  });
});

describe("rateLimit", () => {
  beforeEach(() => {
    _resetStoreForTesting();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns null when under limit", async () => {
    const req = new NextRequest("http://localhost/api/test", {
      headers: { "x-forwarded-for": "1.2.3.4" },
    });
    const result = await rateLimit(req, {
      endpoint: "test",
      limit: 5,
      windowMs: 60_000,
      keyStrategy: "ip",
    });
    expect(result).toBeNull();
  });

  it("returns 429 response when limit exceeded", async () => {
    const req = new NextRequest("http://localhost/api/test", {
      headers: { "x-forwarded-for": "1.2.3.4" },
    });
    const config = {
      endpoint: "test",
      limit: 2,
      windowMs: 60_000,
      keyStrategy: "ip" as const,
    };

    await rateLimit(req, config);
    await rateLimit(req, config);
    const result = await rateLimit(req, config);

    expect(result).not.toBeNull();
    expect(result!.status).toBe(429);

    const body = await result!.json();
    expect(body.error).toBe("Too many requests. Please try again later.");
  });

  it("includes rate limit headers on 429", async () => {
    const req = new NextRequest("http://localhost/api/test", {
      headers: { "x-forwarded-for": "1.2.3.4" },
    });
    const config = {
      endpoint: "test",
      limit: 1,
      windowMs: 60_000,
      keyStrategy: "ip" as const,
    };

    await rateLimit(req, config);
    const result = await rateLimit(req, config);

    expect(result!.headers.get("Retry-After")).toBeTruthy();
    expect(result!.headers.get("X-RateLimit-Limit")).toBe("1");
    expect(result!.headers.get("X-RateLimit-Remaining")).toBe("0");
    expect(result!.headers.get("X-RateLimit-Reset")).toBeTruthy();
  });

  it("limits by userId when keyStrategy is 'user'", async () => {
    const req = new NextRequest("http://localhost/api/test", {
      headers: { "x-forwarded-for": "1.2.3.4" },
    });
    const config = {
      endpoint: "test",
      limit: 1,
      windowMs: 60_000,
      keyStrategy: "user" as const,
      userId: "user-123",
    };

    await rateLimit(req, config);
    const result = await rateLimit(req, config);
    expect(result).not.toBeNull();
    expect(result!.status).toBe(429);
  });

  it("'both' strategy triggers 429 via user limit across different IPs", async () => {
    const req1 = new NextRequest("http://localhost/api/test", {
      headers: { "x-forwarded-for": "1.1.1.1" },
    });
    const req2 = new NextRequest("http://localhost/api/test", {
      headers: { "x-forwarded-for": "2.2.2.2" },
    });
    const config = {
      endpoint: "both-user",
      limit: 1,
      windowMs: 60_000,
      keyStrategy: "both" as const,
      userId: "user-456",
    };

    await rateLimit(req1, config);
    const result = await rateLimit(req2, config);
    expect(result).not.toBeNull();
    expect(result!.status).toBe(429);
  });

  it("'both' strategy triggers 429 via IP limit across different users", async () => {
    const req = new NextRequest("http://localhost/api/test", {
      headers: { "x-forwarded-for": "3.3.3.3" },
    });

    await rateLimit(req, {
      endpoint: "both-ip",
      limit: 1,
      windowMs: 60_000,
      keyStrategy: "both" as const,
      userId: "user-aaa",
    });
    const result = await rateLimit(req, {
      endpoint: "both-ip",
      limit: 1,
      windowMs: 60_000,
      keyStrategy: "both" as const,
      userId: "user-bbb",
    });
    expect(result).not.toBeNull();
    expect(result!.status).toBe(429);
  });

  it("different users have independent counters", async () => {
    const req = new NextRequest("http://localhost/api/test", {
      headers: { "x-forwarded-for": "4.4.4.4" },
    });
    const baseConfig = {
      endpoint: "user-isolation",
      limit: 1,
      windowMs: 60_000,
      keyStrategy: "user" as const,
    };

    await rateLimit(req, { ...baseConfig, userId: "user-x" });
    const result = await rateLimit(req, { ...baseConfig, userId: "user-y" });
    expect(result).toBeNull();
  });

  it("resets after window expires", async () => {
    const req = new NextRequest("http://localhost/api/test", {
      headers: { "x-forwarded-for": "1.2.3.4" },
    });
    const config = {
      endpoint: "test",
      limit: 1,
      windowMs: 60_000,
      keyStrategy: "ip" as const,
    };

    await rateLimit(req, config);
    vi.advanceTimersByTime(61_000);
    const result = await rateLimit(req, config);
    expect(result).toBeNull();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm vitest run src/lib/__tests__/rate-limit.test.ts`
Expected: FAIL — module `@/lib/rate-limit` does not exist

- [ ] **Step 3: Implement rate-limit.ts**

Create `src/lib/rate-limit.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";

// --- Storage abstraction ---

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

export interface RateLimitStore {
  increment(key: string, windowMs: number): Promise<RateLimitEntry>;
}

export class InMemoryStore implements RateLimitStore {
  private store = new Map<string, RateLimitEntry>();

  async increment(key: string, windowMs: number): Promise<RateLimitEntry> {
    const now = Date.now();
    const existing = this.store.get(key);

    if (existing && now < existing.resetAt) {
      existing.count++;
      return { count: existing.count, resetAt: existing.resetAt };
    }

    const entry: RateLimitEntry = { count: 1, resetAt: now + windowMs };
    this.store.set(key, entry);
    return { count: entry.count, resetAt: entry.resetAt };
  }

  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.store) {
      if (now >= entry.resetAt) {
        this.store.delete(key);
      }
    }
  }
}

// --- Singleton store with periodic cleanup ---

let store = new InMemoryStore();

if (typeof setInterval !== "undefined") {
  setInterval(() => store.cleanup(), 60_000).unref();
}

/** Reset the singleton store — test use only */
export function _resetStoreForTesting(): void {
  store = new InMemoryStore();
}

// --- IP extraction ---

export function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();

  const realIp = req.headers.get("x-real-ip");
  if (realIp) return realIp;

  return "unknown";
}

// --- Rate limit check ---

interface RateLimitConfig {
  endpoint: string;
  limit: number;
  windowMs: number;
  keyStrategy: "ip" | "user" | "both";
  userId?: string;
}

export async function rateLimit(
  req: NextRequest,
  config: RateLimitConfig
): Promise<NextResponse | null> {
  const { endpoint, limit, windowMs, keyStrategy, userId } = config;
  const ip = getClientIp(req);

  const checks: string[] = [];

  if (keyStrategy === "ip" || keyStrategy === "both") {
    checks.push(`${endpoint}:${ip}`);
  }
  if ((keyStrategy === "user" || keyStrategy === "both") && userId) {
    checks.push(`${endpoint}:user:${userId}`);
  }

  for (const key of checks) {
    const { count, resetAt } = await store.increment(key, windowMs);

    if (count > limit) {
      const retryAfterSeconds = Math.ceil((resetAt - Date.now()) / 1000);
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        {
          status: 429,
          headers: {
            "Retry-After": String(retryAfterSeconds),
            "X-RateLimit-Limit": String(limit),
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": String(Math.ceil(resetAt / 1000)),
          },
        }
      );
    }
  }

  return null;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm vitest run src/lib/__tests__/rate-limit.test.ts`
Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/rate-limit.ts src/lib/__tests__/rate-limit.test.ts
git commit -m "feat: add rate limiting library with in-memory store (#49)"
```

---

## Chunk 2: Integrate Rate Limiting into Routes

### Task 2: Add rateLimit() to public IP-only endpoints

**Files:**
- Modify: `src/app/api/checkout/route.ts:8` (top of POST handler)
- Modify: `src/app/api/coupons/validate/route.ts:7` (top of POST handler)
- Modify: `src/app/api/buy-intents/route.ts:6` (top of POST handler)
- Modify: `src/app/api/products/route.ts:7` (top of GET handler)
- Modify: `src/app/api/stores/[slug]/route.ts:10` (top of GET handler)
- Modify: `src/app/api/products/by-slug/[slug]/route.ts:10` (top of GET handler)

For each file, add `import { rateLimit } from "@/lib/rate-limit";` at the top, then add the rate limit check as the first lines inside the handler function.

- [ ] **Step 1: Add rate limiting to POST /api/checkout**

Add import and rate limit call at top of `POST` handler in `src/app/api/checkout/route.ts`:

```typescript
import { rateLimit } from "@/lib/rate-limit";
```

Then as first lines of `POST`:
```typescript
  const rateLimitResult = await rateLimit(req, {
    endpoint: "checkout",
    limit: 10,
    windowMs: 60_000,
    keyStrategy: "ip",
  });
  if (rateLimitResult) return rateLimitResult;
```

- [ ] **Step 2: Add rate limiting to POST /api/coupons/validate**

Same pattern in `src/app/api/coupons/validate/route.ts`:

```typescript
import { rateLimit } from "@/lib/rate-limit";
```

First lines of `POST`:
```typescript
  const rateLimitResult = await rateLimit(req, {
    endpoint: "coupons-validate",
    limit: 20,
    windowMs: 60_000,
    keyStrategy: "ip",
  });
  if (rateLimitResult) return rateLimitResult;
```

- [ ] **Step 3: Add rate limiting to POST /api/buy-intents**

Same pattern in `src/app/api/buy-intents/route.ts`:

```typescript
import { rateLimit } from "@/lib/rate-limit";
```

First lines of `POST`:
```typescript
  const rateLimitResult = await rateLimit(req, {
    endpoint: "buy-intents",
    limit: 30,
    windowMs: 60_000,
    keyStrategy: "ip",
  });
  if (rateLimitResult) return rateLimitResult;
```

- [ ] **Step 4: Add rate limiting to GET /api/products**

In `src/app/api/products/route.ts`, add to the `GET` handler only (POST is auth-protected and not in scope):

```typescript
import { rateLimit } from "@/lib/rate-limit";
```

First lines of `GET`:
```typescript
  const rateLimitResult = await rateLimit(req, {
    endpoint: "products",
    limit: 60,
    windowMs: 60_000,
    keyStrategy: "ip",
  });
  if (rateLimitResult) return rateLimitResult;
```

- [ ] **Step 5: Add rate limiting to GET /api/stores/[slug]**

In `src/app/api/stores/[slug]/route.ts`:

```typescript
import { rateLimit } from "@/lib/rate-limit";
```

First lines of `GET`:
```typescript
  const rateLimitResult = await rateLimit(req, {
    endpoint: "stores",
    limit: 60,
    windowMs: 60_000,
    keyStrategy: "ip",
  });
  if (rateLimitResult) return rateLimitResult;
```

- [ ] **Step 6: Add rate limiting to GET /api/products/by-slug/[slug]**

In `src/app/api/products/by-slug/[slug]/route.ts`:

```typescript
import { rateLimit } from "@/lib/rate-limit";
```

First lines of `GET`:
```typescript
  const rateLimitResult = await rateLimit(req, {
    endpoint: "products-by-slug",
    limit: 60,
    windowMs: 60_000,
    keyStrategy: "ip",
  });
  if (rateLimitResult) return rateLimitResult;
```

- [ ] **Step 7: Commit**

```bash
git add src/app/api/checkout/route.ts \
        src/app/api/coupons/validate/route.ts \
        src/app/api/buy-intents/route.ts \
        src/app/api/products/route.ts \
        src/app/api/stores/\[slug\]/route.ts \
        src/app/api/products/by-slug/\[slug\]/route.ts
git commit -m "feat: add rate limiting to public IP-only endpoints (#49)"
```

### Task 3: Add rateLimit() to authenticated "both" endpoints

**Files:**
- Modify: `src/app/api/store/generate/route.ts:8` (after auth check)
- Modify: `src/app/api/store/theme/generate/route.ts:6` (after auth check)
- Modify: `src/app/api/upload/route.ts:9` (after auth check)

For these endpoints, the rate limit call goes **after** the auth check so we have `session.user.id` available.

- [ ] **Step 1: Add rate limiting to POST /api/store/generate**

In `src/app/api/store/generate/route.ts`, add import and rate limit **after** the auth check (after line 12):

```typescript
import { rateLimit } from "@/lib/rate-limit";
```

After the `if (!session?.user?.id)` block:
```typescript
  const rateLimitResult = await rateLimit(req, {
    endpoint: "store-generate",
    limit: 5,
    windowMs: 60_000,
    keyStrategy: "both",
    userId: session.user.id,
  });
  if (rateLimitResult) return rateLimitResult;
```

- [ ] **Step 2: Add rate limiting to POST /api/store/theme/generate**

Same pattern in `src/app/api/store/theme/generate/route.ts`, after the auth check:

```typescript
import { rateLimit } from "@/lib/rate-limit";
```

After the `if (!session?.user?.id)` block:
```typescript
  const rateLimitResult = await rateLimit(req, {
    endpoint: "store-theme-generate",
    limit: 5,
    windowMs: 60_000,
    keyStrategy: "both",
    userId: session.user.id,
  });
  if (rateLimitResult) return rateLimitResult;
```

- [ ] **Step 3: Add rate limiting to POST /api/upload**

Same pattern in `src/app/api/upload/route.ts`, after the auth check:

```typescript
import { rateLimit } from "@/lib/rate-limit";
```

After the `if (!session?.user?.id)` block:
```typescript
  const rateLimitResult = await rateLimit(req, {
    endpoint: "upload",
    limit: 5,
    windowMs: 60_000,
    keyStrategy: "both",
    userId: session.user.id,
  });
  if (rateLimitResult) return rateLimitResult;
```

- [ ] **Step 4: Commit**

```bash
git add src/app/api/store/generate/route.ts \
        src/app/api/store/theme/generate/route.ts \
        src/app/api/upload/route.ts
git commit -m "feat: add rate limiting to authenticated endpoints (#49)"
```

### Task 4: Build verification

- [ ] **Step 1: Run all tests**

Run: `pnpm vitest run`
Expected: All tests PASS

- [ ] **Step 2: Run build**

Run: `pnpm build`
Expected: Build succeeds with no errors

- [ ] **Step 3: Commit (if any fixes needed)**

Only if previous steps required changes.
