# Creators Admin API-based CLI — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate the `creators-admin` CLI from direct DB access to HTTP API calls, with a config file for base URL (default staging) and API key.

**Architecture:** Extend the existing admin API endpoints (`GET /api/admin/creators`, `PATCH /api/admin/creators/[id]`) with search, filter, and commission override support. Rewrite `creators-admin.ts` to use `fetch()` with config from `~/.fooshop/config.json`.

**Tech Stack:** Next.js API routes, Drizzle ORM (server-side), native `fetch()` (CLI-side), vitest

**Spec:** `docs/superpowers/specs/2026-03-15-creators-admin-api-cli-design.md`

---

## Task 1: Extend `GET /api/admin/creators` with search and filter

**Files:**
- Modify: `src/app/api/admin/creators/route.ts`
- Test: `src/app/api/admin/creators/__tests__/route.test.ts`

- [ ] **Step 1: Write failing tests for `?q=` search and `?overrides=active` filter**

Create `src/app/api/admin/creators/__tests__/route.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock db and validateApiKey before importing the handler
vi.mock("@/db", () => ({
  db: {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
  },
}));

vi.mock("@/lib/api-key", () => ({
  validateApiKey: vi.fn(),
  hasScope: vi.fn().mockReturnValue(true),
  insufficientScope: vi.fn(),
}));

import { GET } from "../route";
import { validateApiKey } from "@/lib/api-key";
import { db } from "@/db";
import { NextRequest } from "next/server";

function makeRequest(url: string) {
  return new NextRequest(new URL(url, "http://localhost:3000"));
}

describe("GET /api/admin/creators", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (validateApiKey as any).mockResolvedValue({
      type: "api_key",
      keyId: "k1",
      scopes: ["admin:*"],
      creatorId: null,
    });
  });

  it("returns all creators when no query params", async () => {
    const mockRows = [{ id: "1", name: "Alice", email: "alice@test.com" }];
    (db.select as any).mockReturnValue({
      from: vi.fn().mockResolvedValue(mockRows),
    });

    const res = await GET(makeRequest("/api/admin/creators"));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual(mockRows);
  });

  it("filters by ?q= param using ILIKE", async () => {
    const mockRows = [{ id: "1", name: "Alice" }];
    const mockWhere = vi.fn().mockResolvedValue(mockRows);
    const mockFrom = vi.fn().mockReturnValue({ where: mockWhere });
    (db.select as any).mockReturnValue({ from: mockFrom });

    const res = await GET(makeRequest("/api/admin/creators?q=alice"));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(mockWhere).toHaveBeenCalled();
    expect(body).toEqual(mockRows);
  });

  it("filters by ?overrides=active", async () => {
    const mockRows = [{ id: "1", name: "Bob", commissionOverridePercent: 0 }];
    const mockWhere = vi.fn().mockResolvedValue(mockRows);
    const mockFrom = vi.fn().mockReturnValue({ where: mockWhere });
    (db.select as any).mockReturnValue({ from: mockFrom });

    const res = await GET(makeRequest("/api/admin/creators?overrides=active"));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(mockWhere).toHaveBeenCalled();
    expect(body).toEqual(mockRows);
  });

  it("returns 401 when not authenticated", async () => {
    (validateApiKey as any).mockResolvedValue(null);

    const res = await GET(makeRequest("/api/admin/creators"));
    expect(res.status).toBe(401);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm vitest run src/app/api/admin/creators/__tests__/route.test.ts`
Expected: FAIL — current route.ts has no query param handling

- [ ] **Step 3: Implement search and filter in the GET handler**

Update `src/app/api/admin/creators/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { validateApiKey, hasScope, insufficientScope } from "@/lib/api-key";
import { db } from "@/db";
import { creators } from "@/db/schema";
import { sql, ilike, or, and, isNotNull, SQL } from "drizzle-orm";

const SCOPE = "admin:read:creators";

export async function GET(req: NextRequest) {
  const auth = await validateApiKey(req);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!hasScope(auth, SCOPE)) return insufficientScope(SCOPE);

  const q = req.nextUrl.searchParams.get("q")?.trim();
  const overrides = req.nextUrl.searchParams.get("overrides");

  const conditions: SQL[] = [];

  if (q) {
    conditions.push(
      or(
        ilike(creators.name, `%${q}%`),
        ilike(creators.email, `%${q}%`),
        ilike(creators.slug, `%${q}%`)
      )!
    );
  }

  if (overrides === "active") {
    conditions.push(isNotNull(creators.commissionOverridePercent));
    conditions.push(
      or(
        sql`${creators.commissionOverrideExpiresAt} IS NULL`,
        sql`${creators.commissionOverrideExpiresAt} > NOW()`
      )!
    );
  }

  const query = db
    .select({
      id: creators.id,
      userId: creators.userId,
      email: creators.email,
      name: creators.name,
      slug: creators.slug,
      storeName: creators.storeName,
      stripeConnectId: creators.stripeConnectId,
      commissionOverridePercent: creators.commissionOverridePercent,
      commissionOverrideExpiresAt: creators.commissionOverrideExpiresAt,
      createdAt: creators.createdAt,
      productCount: sql<number>`(
        select count(*) from products where products.creator_id = creators.id
      )`,
      orderCount: sql<number>`(
        select count(*) from orders where orders.creator_id = creators.id and orders.status = 'completed'
      )`,
      revenueCents: sql<number>`(
        select coalesce(sum(orders.amount_cents), 0) from orders where orders.creator_id = creators.id and orders.status = 'completed'
      )`,
    })
    .from(creators);

  const rows = conditions.length > 0
    ? await query.where(and(...conditions))
    : await query;

  return NextResponse.json(rows);
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm vitest run src/app/api/admin/creators/__tests__/route.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/app/api/admin/creators/route.ts src/app/api/admin/creators/__tests__/route.test.ts
git commit -m "feat(api): add search and override filter to admin creators endpoint"
```

---

## Task 2: Extend `PATCH /api/admin/creators/[id]` with commission fields

**Files:**
- Modify: `src/app/api/admin/creators/[id]/route.ts`
- Test: `src/app/api/admin/creators/[id]/__tests__/route.test.ts`

- [ ] **Step 1: Write failing tests for commission PATCH**

Create `src/app/api/admin/creators/[id]/__tests__/route.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/db", () => ({
  db: {
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    returning: vi.fn(),
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
  },
}));

vi.mock("@/lib/api-key", () => ({
  validateApiKey: vi.fn(),
  hasScope: vi.fn().mockReturnValue(true),
  insufficientScope: vi.fn(),
}));

import { PATCH } from "../route";
import { validateApiKey } from "@/lib/api-key";
import { db } from "@/db";
import { NextRequest } from "next/server";

function makePatchRequest(body: Record<string, unknown>) {
  return new NextRequest(new URL("http://localhost:3000/api/admin/creators/uuid-1"), {
    method: "PATCH",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

const mockParams = Promise.resolve({ id: "uuid-1" });

describe("PATCH /api/admin/creators/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (validateApiKey as any).mockResolvedValue({
      type: "api_key",
      keyId: "k1",
      scopes: ["admin:*"],
      creatorId: null,
    });
  });

  it("accepts commissionOverridePercent field", async () => {
    const updated = { id: "uuid-1", commissionOverridePercent: 0 };
    (db.update as any).mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([updated]),
        }),
      }),
    });

    const res = await PATCH(
      makePatchRequest({ commissionOverridePercent: 0 }),
      { params: mockParams }
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.commissionOverridePercent).toBe(0);
  });

  it("accepts commissionOverrideExpiresAt field", async () => {
    const expires = "2026-09-15T00:00:00.000Z";
    const updated = { id: "uuid-1", commissionOverrideExpiresAt: expires };
    (db.update as any).mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([updated]),
        }),
      }),
    });

    const res = await PATCH(
      makePatchRequest({ commissionOverrideExpiresAt: expires }),
      { params: mockParams }
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.commissionOverrideExpiresAt).toBe(expires);
  });

  it("accepts null values to remove override", async () => {
    const updated = { id: "uuid-1", commissionOverridePercent: null, commissionOverrideExpiresAt: null };
    (db.update as any).mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([updated]),
        }),
      }),
    });

    const res = await PATCH(
      makePatchRequest({ commissionOverridePercent: null, commissionOverrideExpiresAt: null }),
      { params: mockParams }
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.commissionOverridePercent).toBeNull();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm vitest run src/app/api/admin/creators/\\[id\\]/__tests__/route.test.ts`
Expected: FAIL — current PATCH does not accept commission fields

- [ ] **Step 3: Add commission fields to PATCH handler**

In `src/app/api/admin/creators/[id]/route.ts`, add these lines after the `storeDescription` check (line 52) in the PATCH handler:

```typescript
  if (body.commissionOverridePercent !== undefined)
    allowedFields.commissionOverridePercent = body.commissionOverridePercent;
  if (body.commissionOverrideExpiresAt !== undefined)
    allowedFields.commissionOverrideExpiresAt = body.commissionOverrideExpiresAt;
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm vitest run src/app/api/admin/creators/\\[id\\]/__tests__/route.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/app/api/admin/creators/\[id\]/route.ts src/app/api/admin/creators/\[id\]/__tests__/route.test.ts
git commit -m "feat(api): allow commission override fields in admin creators PATCH"
```

---

## Task 3: Rewrite CLI to use HTTP API

**Files:**
- Modify: `src/scripts/creators-admin.ts` (full rewrite)
- Test: `src/scripts/__tests__/creators-admin.test.ts`

- [ ] **Step 1: Write tests for config loading and API client**

Create `src/scripts/__tests__/creators-admin.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { loadConfig, apiGet, apiPatch, parseDuration, findCreator } from "../creators-admin";

describe("loadConfig", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("uses env vars when set", () => {
    process.env.FOOSHOP_BASE_URL = "https://example.com";
    process.env.FOOSHOP_API_KEY = "fsk_test123";

    const config = loadConfig();
    expect(config.baseUrl).toBe("https://example.com");
    expect(config.apiKey).toBe("fsk_test123");
  });

  it("env vars override config file", () => {
    process.env.FOOSHOP_BASE_URL = "https://override.com";
    process.env.FOOSHOP_API_KEY = "fsk_override";

    const config = loadConfig();
    expect(config.baseUrl).toBe("https://override.com");
    expect(config.apiKey).toBe("fsk_override");
  });
});

describe("parseDuration", () => {
  it("returns null for permanent", () => {
    expect(parseDuration("permanent")).toBeNull();
  });

  it("returns a future date for 3months", () => {
    const result = parseDuration("3months");
    expect(result).toBeInstanceOf(Date);
    expect(result!.getTime()).toBeGreaterThan(Date.now());
  });

  it("returns a future date for 6months", () => {
    const result = parseDuration("6months");
    expect(result).toBeInstanceOf(Date);
  });

  it("returns a future date for 12months", () => {
    const result = parseDuration("12months");
    expect(result).toBeInstanceOf(Date);
  });

  it("throws for invalid duration", () => {
    expect(() => parseDuration("2weeks")).toThrow();
  });
});

describe("apiGet", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("calls fetch with correct URL and auth header", async () => {
    const mockResponse = { ok: true, status: 200, json: () => Promise.resolve([]) };
    (fetch as any).mockResolvedValue(mockResponse);

    const config = { baseUrl: "https://example.com", apiKey: "fsk_test" };
    await apiGet(config, "/api/admin/creators?q=alice");

    expect(fetch).toHaveBeenCalledWith(
      "https://example.com/api/admin/creators?q=alice",
      expect.objectContaining({
        headers: { Authorization: "Bearer fsk_test" },
      })
    );
  });

  it("throws on 401", async () => {
    const mockResponse = { ok: false, status: 401, json: () => Promise.resolve({ error: "Unauthorized" }) };
    (fetch as any).mockResolvedValue(mockResponse);

    const config = { baseUrl: "https://example.com", apiKey: "fsk_bad" };
    await expect(apiGet(config, "/api/admin/creators")).rejects.toThrow("Invalid API key");
  });
});

describe("apiPatch", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("sends PATCH with correct method, headers, and body", async () => {
    const mockResponse = { ok: true, status: 200, json: () => Promise.resolve({ id: "1" }) };
    (fetch as any).mockResolvedValue(mockResponse);

    const config = { baseUrl: "https://example.com", apiKey: "fsk_test" };
    await apiPatch(config, "/api/admin/creators/uuid-1", { commissionOverridePercent: 0 });

    expect(fetch).toHaveBeenCalledWith(
      "https://example.com/api/admin/creators/uuid-1",
      expect.objectContaining({
        method: "PATCH",
        headers: {
          Authorization: "Bearer fsk_test",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ commissionOverridePercent: 0 }),
      })
    );
  });

  it("throws on 403", async () => {
    const mockResponse = { ok: false, status: 403, json: () => Promise.resolve({ required: "admin:write:creators" }) };
    (fetch as any).mockResolvedValue(mockResponse);

    const config = { baseUrl: "https://example.com", apiKey: "fsk_test" };
    await expect(apiPatch(config, "/api/admin/creators/uuid-1", {})).rejects.toThrow("Insufficient permissions");
  });
});

describe("findCreator", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns exact match on email", async () => {
    const creators = [
      { id: "1", email: "alice@test.com", slug: "alice", name: "Alice" },
      { id: "2", email: "alice2@test.com", slug: "alice2", name: "Alice Two" },
    ];
    const mockResponse = { ok: true, status: 200, json: () => Promise.resolve(creators) };
    (fetch as any).mockResolvedValue(mockResponse);

    const config = { baseUrl: "https://example.com", apiKey: "fsk_test" };
    const result = await findCreator(config, "alice@test.com");
    expect(result.id).toBe("1");
  });

  it("returns exact match on slug", async () => {
    const creators = [
      { id: "1", email: "alice@test.com", slug: "alice", name: "Alice" },
    ];
    const mockResponse = { ok: true, status: 200, json: () => Promise.resolve(creators) };
    (fetch as any).mockResolvedValue(mockResponse);

    const config = { baseUrl: "https://example.com", apiKey: "fsk_test" };
    const result = await findCreator(config, "alice");
    expect(result.id).toBe("1");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm vitest run src/scripts/__tests__/creators-admin.test.ts`
Expected: FAIL — exports don't exist yet

- [ ] **Step 3: Rewrite `creators-admin.ts`**

Full rewrite of `src/scripts/creators-admin.ts`:

```typescript
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { homedir } from "os";

// ─── Types ──────────────────────────────────────────────────────────────────

type Config = { baseUrl: string; apiKey: string };

type Creator = {
  id: string;
  email: string;
  name: string;
  slug: string;
  storeName: string | null;
  stripeConnectId: string | null;
  commissionOverridePercent: number | null;
  commissionOverrideExpiresAt: string | null;
  createdAt: string;
  productCount: number;
  orderCount: number;
  revenueCents: number;
};

// ─── Config ─────────────────────────────────────────────────────────────────

export function loadConfig(): Config {
  const baseUrl = process.env.FOOSHOP_BASE_URL;
  const apiKey = process.env.FOOSHOP_API_KEY;

  if (baseUrl && apiKey) {
    return { baseUrl: baseUrl.replace(/\/$/, ""), apiKey };
  }

  const configPath = join(homedir(), ".fooshop", "config.json");
  if (existsSync(configPath)) {
    const file = JSON.parse(readFileSync(configPath, "utf-8"));
    return {
      baseUrl: (baseUrl ?? file.baseUrl ?? "").replace(/\/$/, ""),
      apiKey: apiKey ?? file.apiKey ?? "",
    };
  }

  console.error("Missing configuration. Create ~/.fooshop/config.json:");
  console.error(JSON.stringify({ baseUrl: "https://fooshop-staging.onrender.com", apiKey: "fsk_..." }, null, 2));
  console.error("\nOr set FOOSHOP_BASE_URL and FOOSHOP_API_KEY environment variables.");
  process.exit(1);
}

// ─── HTTP helpers ───────────────────────────────────────────────────────────

async function handleResponse(res: Response): Promise<unknown> {
  if (res.ok) return res.json();
  const body = await res.json().catch(() => ({}));
  if (res.status === 401) throw new Error("Invalid API key");
  if (res.status === 403) throw new Error(`Insufficient permissions (requires ${(body as any).required ?? "admin scope"})`);
  if (res.status === 404) throw new Error("Not found");
  throw new Error(`Server error (${res.status})`);
}

export async function apiGet(config: Config, path: string): Promise<unknown> {
  const res = await fetch(`${config.baseUrl}${path}`, {
    headers: { Authorization: `Bearer ${config.apiKey}` },
  }).catch(() => {
    throw new Error(`Could not connect to ${config.baseUrl}`);
  });
  return handleResponse(res);
}

export async function apiPatch(config: Config, path: string, body: Record<string, unknown>): Promise<unknown> {
  const res = await fetch(`${config.baseUrl}${path}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  }).catch(() => {
    throw new Error(`Could not connect to ${config.baseUrl}`);
  });
  return handleResponse(res);
}

// ─── Helpers ────────────────────────────────────────────────────────────────

export function parseDuration(duration: string): Date | null {
  const months: Record<string, number> = {
    "3months": 3,
    "6months": 6,
    "12months": 12,
  };
  if (duration === "permanent") return null;
  const m = months[duration];
  if (!m) throw new Error(`Invalid duration: ${duration}. Use: 3months, 6months, 12months, permanent`);
  const date = new Date();
  date.setMonth(date.getMonth() + m);
  return date;
}

function formatOverride(c: Creator): string {
  if (c.commissionOverridePercent === null) return "none";
  if (c.commissionOverrideExpiresAt === null) return `${c.commissionOverridePercent}% until permanent`;
  const expires = new Date(c.commissionOverrideExpiresAt);
  if (expires <= new Date()) return "none (expired)";
  return `${c.commissionOverridePercent}% until ${expires.toLocaleDateString()}`;
}

function formatCreator(c: Creator): string {
  return [
    `  Name:       ${c.name}`,
    `  Email:      ${c.email}`,
    `  Slug:       ${c.slug}`,
    `  Store:      ${c.storeName ?? "(no store name)"}`,
    `  Stripe:     ${c.stripeConnectId ?? "(not connected)"}`,
    `  Override:   ${formatOverride(c)}`,
    `  Created:    ${new Date(c.createdAt).toLocaleDateString()}`,
  ].join("\n");
}

export async function findCreator(config: Config, query: string): Promise<Creator> {
  const results = (await apiGet(config, `/api/admin/creators?q=${encodeURIComponent(query)}`)) as Creator[];
  const match = results.find((c) => c.email === query || c.slug === query);
  if (!match) {
    console.error(`Creator not found: ${query}`);
    process.exit(1);
  }
  return match;
}

// ─── Commands ───────────────────────────────────────────────────────────────

async function cmdSearch(config: Config, query: string) {
  const results = (await apiGet(config, `/api/admin/creators?q=${encodeURIComponent(query)}`)) as Creator[];

  if (results.length === 0) {
    console.log("No creators found.");
    return;
  }

  console.log(`Found ${results.length} creator(s):\n`);
  for (const c of results) {
    console.log(`- ${c.name} (${c.email}) — slug: ${c.slug}`);
  }
}

async function cmdInfo(config: Config, query: string) {
  const c = await findCreator(config, query);

  console.log(`Creator: ${c.name}\n`);
  console.log(formatCreator(c));
  console.log(`  Products:   ${c.productCount}`);
  console.log(`  Orders:     ${c.orderCount}`);
}

async function cmdSetCommission(config: Config, query: string, percentStr: string, duration: string) {
  const percent = parseInt(percentStr, 10);
  if (isNaN(percent) || percent < 0 || percent > 100) {
    console.error("Percent must be an integer between 0 and 100.");
    process.exit(1);
  }

  const expiresAt = parseDuration(duration);
  const c = await findCreator(config, query);

  await apiPatch(config, `/api/admin/creators/${c.id}`, {
    commissionOverridePercent: percent,
    commissionOverrideExpiresAt: expiresAt?.toISOString() ?? null,
  });

  const expiryLabel = expiresAt ? expiresAt.toLocaleDateString() : "permanent";
  console.log(`Set ${percent}% commission for ${c.name} (${c.email}), expires: ${expiryLabel}`);
}

async function cmdRemoveCommission(config: Config, query: string) {
  const c = await findCreator(config, query);

  await apiPatch(config, `/api/admin/creators/${c.id}`, {
    commissionOverridePercent: null,
    commissionOverrideExpiresAt: null,
  });

  console.log(`Removed commission override for ${c.name} (${c.email}). Back to default 5%.`);
}

async function cmdListOverrides(config: Config) {
  const results = (await apiGet(config, "/api/admin/creators?overrides=active")) as Creator[];

  if (results.length === 0) {
    console.log("No active commission overrides.");
    return;
  }

  console.log(`${results.length} active override(s):\n`);
  for (const c of results) {
    const expiry = c.commissionOverrideExpiresAt
      ? new Date(c.commissionOverrideExpiresAt).toLocaleDateString()
      : "permanent";
    console.log(`- ${c.name} (${c.email}): ${c.commissionOverridePercent}% until ${expiry}`);
  }
}

// ─── Main ───────────────────────────────────────────────────────────────────

const [command, ...args] = process.argv.slice(2);

if (!command || !["search", "info", "set-commission", "remove-commission", "list-overrides"].includes(command)) {
  console.log("Usage:");
  console.log("  creators-admin search <query>");
  console.log("  creators-admin info <email-or-slug>");
  console.log("  creators-admin set-commission <email-or-slug> <percent> <duration>");
  console.log("  creators-admin remove-commission <email-or-slug>");
  console.log("  creators-admin list-overrides");
  console.log("\nDurations: 3months, 6months, 12months, permanent");
  process.exit(command ? 1 : 0);
}

const config = loadConfig();

const commands: Record<string, () => Promise<void>> = {
  search: () => cmdSearch(config, args[0]),
  info: () => cmdInfo(config, args[0]),
  "set-commission": () => cmdSetCommission(config, args[0], args[1], args[2]),
  "remove-commission": () => cmdRemoveCommission(config, args[0]),
  "list-overrides": () => cmdListOverrides(config),
};

commands[command]()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Error:", err.message);
    process.exit(1);
  });
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm vitest run src/scripts/__tests__/creators-admin.test.ts`
Expected: PASS

- [ ] **Step 5: Run all tests**

Run: `pnpm test`
Expected: All tests PASS

- [ ] **Step 6: Commit**

```bash
git add src/scripts/creators-admin.ts src/scripts/__tests__/creators-admin.test.ts
git commit -m "feat: rewrite creators-admin CLI to use HTTP API with config file"
```

---

## Task 4: Manual smoke test

- [ ] **Step 1: Create config file**

Create `~/.fooshop/config.json` with the staging URL and a valid API key:

```bash
mkdir -p ~/.fooshop
cat > ~/.fooshop/config.json << 'EOF'
{
  "baseUrl": "https://fooshop-staging.onrender.com",
  "apiKey": "fsk_YOUR_STAGING_KEY"
}
EOF
```

- [ ] **Step 2: Test each command**

```bash
pnpm creators-admin search test
pnpm creators-admin list-overrides
pnpm creators-admin info <slug-from-search>
```

- [ ] **Step 3: Verify error handling**

```bash
# Bad API key
FOOSHOP_API_KEY=fsk_bad pnpm creators-admin search test
# Expected: Error: Invalid API key

# No config
mv ~/.fooshop/config.json ~/.fooshop/config.json.bak
unset FOOSHOP_BASE_URL FOOSHOP_API_KEY
pnpm creators-admin search test
# Expected: Missing configuration message
mv ~/.fooshop/config.json.bak ~/.fooshop/config.json
```

- [ ] **Step 4: Commit plan status update**

Update spec status from Draft to Implemented:

```bash
sed -i '' 's/Status: Draft/Status: Implemented/' docs/superpowers/specs/2026-03-15-creators-admin-api-cli-design.md
git add docs/superpowers/specs/2026-03-15-creators-admin-api-cli-design.md
git commit -m "docs: mark creators-admin API CLI spec as implemented"
```
