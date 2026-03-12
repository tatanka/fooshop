# E2E Smoke Test Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Vitest-based HTTP smoke tests that verify a Render deploy is healthy (DB, auth, pages, API).

**Architecture:** Vitest with a dedicated `vitest.config.smoke.ts` config runs pure `fetch`-based tests in `tests/smoke/`. Each test file covers one area: public pages, product API, auth, DB health. Tests target a configurable URL via `SMOKE_TEST_URL` env var.

**Tech Stack:** Vitest, native fetch, TypeScript

**Spec:** `docs/superpowers/specs/2026-03-12-e2e-smoke-test-render-design.md`

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `vitest.config.smoke.ts` | Smoke test Vitest config (separate from future unit tests) |
| Create | `tests/smoke/env.ts` | Shared env var helpers + conditional skip logic |
| Create | `tests/smoke/public-pages.test.ts` | Homepage, explore, store page, product page |
| Create | `tests/smoke/api-products.test.ts` | Product list, filter, get-by-slug |
| Create | `tests/smoke/auth.test.ts` | Auth providers, CSRF, dashboard redirect |
| Create | `tests/smoke/db-health.test.ts` | DB connectivity via product + store endpoints |
| Modify | `package.json` | Add `smoke` script, `vitest` dev dependency |

---

## Task 1: Install Vitest and create config

**Files:**
- Modify: `package.json` (add vitest dev dep + smoke script)
- Create: `vitest.config.smoke.ts`

- [ ] **Step 1: Install vitest**

Run: `pnpm add -D vitest`

- [ ] **Step 2: Add smoke script to package.json**

Add to `"scripts"`:
```json
"smoke": "vitest run --config vitest.config.smoke.ts"
```

- [ ] **Step 3: Create vitest.config.smoke.ts**

```typescript
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/smoke/**/*.test.ts"],
    testTimeout: 10_000,
  },
});
```

- [ ] **Step 4: Verify config loads**

Run: `pnpm smoke`
Expected: Vitest runs, finds 0 tests, exits cleanly (no config errors).

- [ ] **Step 5: Commit**

```bash
git add vitest.config.smoke.ts package.json pnpm-lock.yaml
git commit -m "chore: add vitest and smoke test config"
```

---

## Task 2: Create shared env helpers

**Files:**
- Create: `tests/smoke/env.ts`

- [ ] **Step 1: Create tests/smoke/env.ts**

```typescript
export const BASE_URL =
  process.env.SMOKE_TEST_URL || "http://localhost:3000";

export const STORE_SLUG = process.env.SMOKE_TEST_STORE_SLUG || "";
export const PRODUCT_SLUG = process.env.SMOKE_TEST_PRODUCT_SLUG || "";

export const HAS_STORE_SLUG = STORE_SLUG.length > 0;
export const HAS_PRODUCT_SLUG = PRODUCT_SLUG.length > 0;

if (!HAS_STORE_SLUG) {
  console.warn(
    "⚠ SMOKE_TEST_STORE_SLUG not set — store/product page tests will be skipped"
  );
}
if (!HAS_PRODUCT_SLUG) {
  console.warn(
    "⚠ SMOKE_TEST_PRODUCT_SLUG not set — product-specific tests will be skipped"
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add tests/smoke/env.ts
git commit -m "chore: add smoke test shared env helpers"
```

---

## Task 3: Public pages smoke tests

**Files:**
- Create: `tests/smoke/public-pages.test.ts`

- [ ] **Step 1: Write the tests**

```typescript
import { describe, it, expect } from "vitest";
import {
  BASE_URL,
  STORE_SLUG,
  PRODUCT_SLUG,
  HAS_STORE_SLUG,
  HAS_PRODUCT_SLUG,
} from "./env";

describe("Public Pages", () => {
  it("GET / returns 200", async () => {
    const res = await fetch(`${BASE_URL}/`);
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain("</html>");
  });

  it("GET /explore returns 200", async () => {
    const res = await fetch(`${BASE_URL}/explore`);
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain("</html>");
  });
});

describe.skipIf(!HAS_STORE_SLUG)("Store Page", () => {
  it(`GET /${STORE_SLUG} returns 200`, async () => {
    const res = await fetch(`${BASE_URL}/${STORE_SLUG}`);
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain("</html>");
  });
});

describe.skipIf(!HAS_STORE_SLUG || !HAS_PRODUCT_SLUG)("Product Page", () => {
  it(`GET /${STORE_SLUG}/${PRODUCT_SLUG} returns 200`, async () => {
    const res = await fetch(`${BASE_URL}/${STORE_SLUG}/${PRODUCT_SLUG}`);
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain("</html>");
  });
});
```

- [ ] **Step 2: Run tests against local dev**

Run: `pnpm smoke`
Expected: "Public Pages" tests pass (2 passed). Store/Product Page tests skipped if env vars not set, or pass if set.

- [ ] **Step 3: Commit**

```bash
git add tests/smoke/public-pages.test.ts
git commit -m "test: add public pages smoke tests"
```

---

## Task 4: API products smoke tests

**Files:**
- Create: `tests/smoke/api-products.test.ts`

- [ ] **Step 1: Write the tests**

```typescript
import { describe, it, expect } from "vitest";
import { BASE_URL, PRODUCT_SLUG, HAS_PRODUCT_SLUG } from "./env";

describe("API Products", () => {
  it("GET /api/products returns 200 with JSON array", async () => {
    const res = await fetch(`${BASE_URL}/api/products`);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("application/json");
    const data = await res.json();
    expect(Array.isArray(data)).toBe(true);
  });

  it("GET /api/products?category=ebook returns 200 with JSON array", async () => {
    const res = await fetch(`${BASE_URL}/api/products?category=ebook`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data)).toBe(true);
  });
});

describe.skipIf(!HAS_PRODUCT_SLUG)("API Product By Slug", () => {
  it(`GET /api/products/by-slug/${PRODUCT_SLUG} returns correct shape`, async () => {
    const res = await fetch(
      `${BASE_URL}/api/products/by-slug/${PRODUCT_SLUG}?source=smoke`
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveProperty("id");
    expect(data).toHaveProperty("title");
    expect(data).toHaveProperty("priceCents");
    expect(data).toHaveProperty("creatorSlug");
  });
});
```

Note: `?source=smoke` on by-slug request to distinguish page_view records from real traffic.

- [ ] **Step 2: Run tests**

Run: `pnpm smoke`
Expected: "API Products" tests pass. "API Product By Slug" passes if env var set, skipped otherwise.

- [ ] **Step 3: Commit**

```bash
git add tests/smoke/api-products.test.ts
git commit -m "test: add API products smoke tests"
```

---

## Task 5: Auth smoke tests

**Files:**
- Create: `tests/smoke/auth.test.ts`

- [ ] **Step 1: Write the tests**

```typescript
import { describe, it, expect } from "vitest";
import { BASE_URL } from "./env";

describe("Auth", () => {
  it("GET /api/auth/providers returns google provider", async () => {
    const res = await fetch(`${BASE_URL}/api/auth/providers`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveProperty("google");
    expect(data.google).toHaveProperty("id", "google");
  });

  it("GET /api/auth/csrf returns csrfToken", async () => {
    const res = await fetch(`${BASE_URL}/api/auth/csrf`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveProperty("csrfToken");
    expect(typeof data.csrfToken).toBe("string");
    expect(data.csrfToken.length).toBeGreaterThan(0);
  });

  it("GET /dashboard redirects to sign-in when unauthenticated", async () => {
    const res = await fetch(`${BASE_URL}/dashboard`, { redirect: "manual" });
    expect(res.status).toBe(307);
    const location = res.headers.get("location") || "";
    expect(location).toContain("/api/auth/signin");
  });
});
```

Note: The middleware returns `NextResponse.redirect()` which produces a 307. Using `redirect: "manual"` to capture the redirect instead of following it.

- [ ] **Step 2: Run tests**

Run: `pnpm smoke`
Expected: All 3 auth tests pass.

- [ ] **Step 3: Commit**

```bash
git add tests/smoke/auth.test.ts
git commit -m "test: add auth smoke tests"
```

---

## Task 6: DB health smoke tests

**Files:**
- Create: `tests/smoke/db-health.test.ts`

- [ ] **Step 1: Write the tests**

```typescript
import { describe, it, expect } from "vitest";
import { BASE_URL, STORE_SLUG, HAS_STORE_SLUG } from "./env";

describe("DB Health", () => {
  it("GET /api/products succeeds (proves DB connection)", async () => {
    const res = await fetch(`${BASE_URL}/api/products`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data)).toBe(true);
  });
});

describe.skipIf(!HAS_STORE_SLUG)("DB Health — Store", () => {
  it(`GET /api/stores/${STORE_SLUG} returns store object`, async () => {
    const res = await fetch(
      `${BASE_URL}/api/stores/${STORE_SLUG}?source=smoke`
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveProperty("name");
    expect(data).toHaveProperty("slug", STORE_SLUG);
    expect(data).toHaveProperty("products");
    expect(Array.isArray(data.products)).toBe(true);
  });
});
```

Note: `?source=smoke` on store request to distinguish page_view records.

- [ ] **Step 2: Run tests**

Run: `pnpm smoke`
Expected: All DB health tests pass.

- [ ] **Step 3: Commit**

```bash
git add tests/smoke/db-health.test.ts
git commit -m "test: add DB health smoke tests"
```

---

## Task 7: Full suite run and final commit

- [ ] **Step 1: Run entire smoke suite**

Run: `pnpm smoke`
Expected: All non-skipped tests pass. Skipped tests show a warning about missing env vars.

- [ ] **Step 2: Run with slug env vars (if known test data exists)**

Run:
```bash
SMOKE_TEST_STORE_SLUG=<known-slug> \
SMOKE_TEST_PRODUCT_SLUG=<known-product-slug> \
pnpm smoke
```
Expected: All tests pass including store/product specific ones.

- [ ] **Step 3: Verify build still passes**

Run: `pnpm build`
Expected: Build succeeds (smoke tests don't interfere with Next.js build).

- [ ] **Step 4: Final commit if any cleanup needed**

If any adjustments were made during the full run, commit them.
