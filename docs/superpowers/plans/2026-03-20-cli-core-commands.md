# CLI Core Commands Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement 9 CLI commands (init, products add/list/edit/delete, orders list, analytics, config, open) plus a new `GET /api/orders` backend endpoint.

**Architecture:** Flat command files in `cli/src/commands/`, shared HTTP client in `lib/api.ts`, formatting helpers in `lib/format.ts`. Each command is a Commander.js `Command` registered in `index.ts`. New backend endpoint follows existing `authenticateCreator` + Drizzle query pattern.

**Tech Stack:** Commander.js, chalk, ora, cli-table3, @inquirer/prompts, vitest, Node.js fetch API

**Worktree:** `/Users/ematomax/Documents/fooshop/.worktrees/feat/issue-84-cli-core-commands`

**Spec:** `docs/superpowers/specs/2026-03-20-cli-core-commands-design.md`

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `cli/src/lib/api.ts` | HTTP client with auth, error handling |
| Create | `cli/src/lib/format.ts` | chalk/ora/table helpers, price formatting |
| Create | `cli/src/commands/init.ts` | `fooshop init` command |
| Create | `cli/src/commands/products.ts` | `fooshop products add\|list\|edit\|delete` |
| Create | `cli/src/commands/orders.ts` | `fooshop orders list` |
| Create | `cli/src/commands/analytics.ts` | `fooshop analytics` |
| Create | `cli/src/commands/config-cmd.ts` | `fooshop config` (named to avoid clash with lib/config.ts) |
| Create | `cli/src/commands/open.ts` | `fooshop open` |
| Create | `cli/src/__tests__/api.test.ts` | Tests for HTTP client |
| Create | `cli/src/__tests__/format.test.ts` | Tests for format helpers |
| Create | `cli/src/__tests__/init.test.ts` | Tests for init command |
| Create | `cli/src/__tests__/products.test.ts` | Tests for products commands |
| Create | `cli/src/__tests__/orders.test.ts` | Tests for orders command |
| Create | `cli/src/__tests__/analytics.test.ts` | Tests for analytics command |
| Create | `src/app/api/orders/route.ts` | `GET /api/orders` backend endpoint |
| Modify | `cli/src/index.ts` | Register all new commands + `--json` global flag |
| Modify | `cli/package.json` | Add chalk, ora, cli-table3, @inquirer/prompts |

---

## Task 1: Add dependencies

**Files:**
- Modify: `cli/package.json`

- [ ] **Step 1: Install new dependencies**

```bash
cd /Users/ematomax/Documents/fooshop/.worktrees/feat/issue-84-cli-core-commands/cli
pnpm add chalk ora cli-table3 @inquirer/prompts
pnpm add -D @types/cli-table3
```

- [ ] **Step 2: Verify build still works**

```bash
cd /Users/ematomax/Documents/fooshop/.worktrees/feat/issue-84-cli-core-commands/cli
pnpm build
```

Expected: Build succeeds with no errors.

- [ ] **Step 3: Commit**

```bash
git add cli/package.json cli/pnpm-lock.yaml
git commit -m "feat(cli): add chalk, ora, cli-table3, @inquirer/prompts (#84)"
```

---

## Task 2: Shared HTTP client (`lib/api.ts`)

**Files:**
- Create: `cli/src/lib/api.ts`
- Create: `cli/src/__tests__/api.test.ts`

- [ ] **Step 1: Write failing tests for api.ts**

Create `cli/src/__tests__/api.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

// Mock global fetch
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

// Mock process.exit
const mockExit = vi.spyOn(process, "exit").mockImplementation(() => {
  throw new Error("process.exit called");
});

// Mock console
const mockConsoleError = vi.spyOn(console, "error").mockImplementation(() => {});

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "fooshop-test-"));
  vi.stubEnv("FOOSHOP_CONFIG_DIR", tmpDir);
  vi.stubEnv("FOOSHOP_BASE_URL", "https://test.fooshop.ai");
  vi.stubEnv("FOOSHOP_API_KEY", "fsk_testkey123");
  mockFetch.mockReset();
  mockExit.mockClear();
  mockConsoleError.mockClear();
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
  vi.unstubAllEnvs();
});

describe("api", () => {
  it("sends GET with auth header", async () => {
    const { api } = await import("../lib/api.js");
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ data: "test" }),
    });

    const result = await api.get("/api/products");

    expect(mockFetch).toHaveBeenCalledWith(
      "https://test.fooshop.ai/api/products",
      expect.objectContaining({
        method: "GET",
        headers: expect.objectContaining({
          Authorization: "Bearer fsk_testkey123",
        }),
      })
    );
    expect(result).toEqual({ data: "test" });
  });

  it("sends POST with body", async () => {
    const { api } = await import("../lib/api.js");
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ id: "123" }),
    });

    const result = await api.post("/api/products", { title: "Test" });

    expect(mockFetch).toHaveBeenCalledWith(
      "https://test.fooshop.ai/api/products",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "Content-Type": "application/json",
          Authorization: "Bearer fsk_testkey123",
        }),
        body: JSON.stringify({ title: "Test" }),
      })
    );
    expect(result).toEqual({ id: "123" });
  });

  it("exits with error on 4xx/5xx response", async () => {
    const { api } = await import("../lib/api.js");
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 403,
      json: () => Promise.resolve({ error: "Insufficient scope" }),
    });

    await expect(api.get("/api/products")).rejects.toThrow("process.exit called");
    expect(mockConsoleError).toHaveBeenCalled();
  });

  it("exits when no API key configured", async () => {
    vi.stubEnv("FOOSHOP_API_KEY", "");
    // Clear any cached modules
    vi.resetModules();

    const { api } = await import("../lib/api.js");
    await expect(api.get("/api/products")).rejects.toThrow("process.exit called");
  });
});
```

- [ ] **Step 2: Run tests, verify they fail**

```bash
cd /Users/ematomax/Documents/fooshop/.worktrees/feat/issue-84-cli-core-commands/cli
pnpm test -- src/__tests__/api.test.ts
```

Expected: FAIL — `../lib/api.js` does not exist.

- [ ] **Step 3: Implement api.ts**

Create `cli/src/lib/api.ts`:

```typescript
import { getApiKey, getBaseUrl } from "./config.js";

function ensureAuth(): string {
  const key = getApiKey();
  if (!key) {
    console.error("Not logged in. Run `fooshop login` first.");
    process.exit(1);
  }
  return key;
}

async function request<T>(method: string, path: string, body?: object): Promise<T> {
  const key = ensureAuth();
  const baseUrl = getBaseUrl();

  const headers: Record<string, string> = {
    Authorization: `Bearer ${key}`,
  };

  const init: RequestInit = { method, headers };

  if (body) {
    headers["Content-Type"] = "application/json";
    init.body = JSON.stringify(body);
  }

  let res: Response;
  try {
    res = await fetch(`${baseUrl}${path}`, init);
  } catch {
    console.error("Connection failed. Check your internet or try again.");
    process.exit(1);
  }

  if (!res.ok) {
    const data = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
    console.error(data.error || `Request failed: ${res.status}`);
    process.exit(1);
  }

  return res.json() as Promise<T>;
}

export const api = {
  get: <T>(path: string) => request<T>("GET", path),
  post: <T>(path: string, body: object) => request<T>("POST", path, body),
  put: <T>(path: string, body: object) => request<T>("PUT", path, body),
  del: <T>(path: string) => request<T>("DELETE", path),
};
```

- [ ] **Step 4: Run tests, verify they pass**

```bash
cd /Users/ematomax/Documents/fooshop/.worktrees/feat/issue-84-cli-core-commands/cli
pnpm test -- src/__tests__/api.test.ts
```

Expected: All 4 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add cli/src/lib/api.ts cli/src/__tests__/api.test.ts
git commit -m "feat(cli): add shared HTTP client with auth (#84)"
```

---

## Task 3: Format helpers (`lib/format.ts`)

**Files:**
- Create: `cli/src/lib/format.ts`
- Create: `cli/src/__tests__/format.test.ts`

- [ ] **Step 1: Write failing tests**

Create `cli/src/__tests__/format.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { formatPrice, buildTable } from "../lib/format.js";

describe("formatPrice", () => {
  it("formats cents to dollars", () => {
    expect(formatPrice(2900)).toBe("$29.00");
    expect(formatPrice(100)).toBe("$1.00");
    expect(formatPrice(0)).toBe("$0.00");
    expect(formatPrice(1999)).toBe("$19.99");
  });
});

describe("buildTable", () => {
  it("returns formatted table string", () => {
    const result = buildTable(["Name", "Price"], [["Widget", "$10.00"]]);
    expect(result).toContain("Name");
    expect(result).toContain("Widget");
    expect(result).toContain("$10.00");
  });

  it("handles empty rows", () => {
    const result = buildTable(["Name"], []);
    expect(result).toContain("Name");
  });
});
```

- [ ] **Step 2: Run tests, verify they fail**

```bash
cd /Users/ematomax/Documents/fooshop/.worktrees/feat/issue-84-cli-core-commands/cli
pnpm test -- src/__tests__/format.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement format.ts**

Create `cli/src/lib/format.ts`:

```typescript
import chalk from "chalk";
import ora, { type Ora } from "ora";
import Table from "cli-table3";

export function spinner(text: string): Ora {
  return ora(text).start();
}

export function successMsg(text: string): void {
  console.log(chalk.green(`✓ ${text}`));
}

export function errorMsg(text: string): void {
  console.error(chalk.red(`✗ ${text}`));
}

export function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export function buildTable(headers: string[], rows: string[][]): string {
  const table = new Table({
    head: headers.map((h) => chalk.cyan(h)),
    style: { head: [], border: [] },
  });
  for (const row of rows) {
    table.push(row);
  }
  return table.toString();
}
```

- [ ] **Step 4: Run tests, verify they pass**

```bash
cd /Users/ematomax/Documents/fooshop/.worktrees/feat/issue-84-cli-core-commands/cli
pnpm test -- src/__tests__/format.test.ts
```

Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add cli/src/lib/format.ts cli/src/__tests__/format.test.ts
git commit -m "feat(cli): add format helpers (chalk, ora, table, price) (#84)"
```

---

## Task 4: Backend `GET /api/orders` endpoint

**Files:**
- Create: `src/app/api/orders/route.ts`

- [ ] **Step 1: Implement the endpoint**

Create `src/app/api/orders/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { orders, products } from "@/db/schema";
import { eq, desc, gte, and } from "drizzle-orm";
import { authenticateCreator } from "@/lib/api-key";

export async function GET(req: NextRequest) {
  const result = await authenticateCreator(req, "orders:read");
  if (result instanceof NextResponse) return result;
  const { creator } = result;

  const period = req.nextUrl.searchParams.get("period") || "all";

  const conditions = [eq(orders.creatorId, creator.id)];

  if (period !== "all") {
    const days = parseInt(period);
    if (!isNaN(days)) {
      const since = new Date();
      since.setDate(since.getDate() - days);
      conditions.push(gte(orders.createdAt, since));
    }
  }

  const rows = await db
    .select({
      id: orders.id,
      createdAt: orders.createdAt,
      productTitle: products.title,
      amountCents: orders.amountCents,
      platformFeeCents: orders.platformFeeCents,
      currency: products.currency,
      buyerEmail: orders.buyerEmail,
      status: orders.status,
    })
    .from(orders)
    .innerJoin(products, eq(orders.productId, products.id))
    .where(and(...conditions))
    .orderBy(desc(orders.createdAt));

  return NextResponse.json({ orders: rows });
}
```

Note: The `period` param accepts `7d`, `30d`, `90d` — we parse the integer prefix. `all` skips the date filter.

- [ ] **Step 2: Verify build**

```bash
cd /Users/ematomax/Documents/fooshop/.worktrees/feat/issue-84-cli-core-commands
pnpm build 2>&1 | tail -5
```

Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/orders/route.ts
git commit -m "feat(api): add GET /api/orders endpoint for creator orders (#84)"
```

---

## Task 5: `fooshop init` command

**Files:**
- Create: `cli/src/commands/init.ts`
- Create: `cli/src/__tests__/init.test.ts`

- [ ] **Step 1: Write failing tests**

Create `cli/src/__tests__/init.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

// Mock dependencies
vi.mock("@inquirer/prompts", () => ({
  input: vi.fn(),
  confirm: vi.fn(),
}));

vi.mock("ora", () => {
  const spinner = {
    start: vi.fn().mockReturnThis(),
    succeed: vi.fn().mockReturnThis(),
    fail: vi.fn().mockReturnThis(),
    stop: vi.fn().mockReturnThis(),
  };
  return { default: vi.fn(() => spinner) };
});

vi.mock("open", () => ({
  default: vi.fn().mockResolvedValue(undefined),
}));

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "fooshop-test-"));
  vi.stubEnv("FOOSHOP_CONFIG_DIR", tmpDir);
  vi.stubEnv("FOOSHOP_BASE_URL", "https://test.fooshop.ai");
  vi.stubEnv("FOOSHOP_API_KEY", "fsk_testkey123");
  mockFetch.mockReset();
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("fooshop init", () => {
  it("generates a store from description", async () => {
    const { input, confirm } = await import("@inquirer/prompts");
    (input as ReturnType<typeof vi.fn>).mockResolvedValueOnce("Selling React templates");
    (confirm as ReturnType<typeof vi.fn>).mockResolvedValueOnce(false);

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          storeName: "React Templates Pro",
          storeDescription: "Premium React templates",
          slug: "react-templates-pro",
          suggestedProducts: [],
          theme: {},
        }),
    });

    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const { initCommand } = await import("../commands/init.js");
    await initCommand.parseAsync([], { from: "user" });

    expect(mockFetch).toHaveBeenCalledWith(
      "https://test.fooshop.ai/api/store/generate",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ description: "Selling React templates" }),
      })
    );
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("react-templates-pro")
    );
    consoleSpy.mockRestore();
  });
});
```

- [ ] **Step 2: Run tests, verify they fail**

```bash
cd /Users/ematomax/Documents/fooshop/.worktrees/feat/issue-84-cli-core-commands/cli
pnpm test -- src/__tests__/init.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement init.ts**

Create `cli/src/commands/init.ts`:

```typescript
import { Command } from "commander";
import { input, confirm } from "@inquirer/prompts";
import { api } from "../lib/api.js";
import { spinner, successMsg, formatPrice } from "../lib/format.js";
import { getBaseUrl } from "../lib/config.js";
import { openBrowser } from "../lib/open.js";

interface GeneratedStore {
  storeName: string;
  storeDescription: string;
  slug: string;
  suggestedProducts: {
    title: string;
    description: string;
    suggestedPriceCents: number;
    category: string;
  }[];
  theme: Record<string, unknown>;
}

export const initCommand = new Command("init")
  .description("Create a new store with AI")
  .action(async () => {
    const description = await input({
      message: "What are you selling?",
    });

    const s = spinner("Generating your store...");

    let store: GeneratedStore;
    try {
      store = await api.post<GeneratedStore>("/api/store/generate", {
        description,
      });
      s.succeed("Store generated!");
    } catch {
      s.fail("Failed to generate store");
      return;
    }

    console.log();
    console.log(`  Store:    ${store.storeName}`);
    console.log(`  About:    ${store.storeDescription}`);
    console.log(`  URL:      ${getBaseUrl()}/${store.slug}`);

    if (store.suggestedProducts.length > 0) {
      console.log();
      console.log("  Suggested products:");
      for (const p of store.suggestedProducts) {
        console.log(`    - ${p.title} (${formatPrice(p.suggestedPriceCents)}) [${p.category}]`);
      }
    }

    console.log();

    const connectStripe = await confirm({
      message: "Connect Stripe for payments?",
      default: true,
    });

    if (connectStripe) {
      await openBrowser(`${getBaseUrl()}/dashboard/settings`);
      console.log("Complete Stripe setup in your browser.");
    } else {
      console.log("You can connect Stripe later with `fooshop config`.");
    }

    console.log();
    successMsg(`Your store is live → ${getBaseUrl()}/${store.slug}`);
  });
```

- [ ] **Step 4: Run tests, verify they pass**

```bash
cd /Users/ematomax/Documents/fooshop/.worktrees/feat/issue-84-cli-core-commands/cli
pnpm test -- src/__tests__/init.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add cli/src/commands/init.ts cli/src/__tests__/init.test.ts
git commit -m "feat(cli): add fooshop init command (#84)"
```

---

## Task 6: `fooshop products` command (add, list, edit, delete)

**Files:**
- Create: `cli/src/commands/products.ts`
- Create: `cli/src/__tests__/products.test.ts`

- [ ] **Step 1: Write failing tests**

Create `cli/src/__tests__/products.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

vi.mock("@inquirer/prompts", () => ({
  input: vi.fn(),
  select: vi.fn(),
  confirm: vi.fn(),
}));

vi.mock("ora", () => {
  const spinner = {
    start: vi.fn().mockReturnThis(),
    succeed: vi.fn().mockReturnThis(),
    fail: vi.fn().mockReturnThis(),
    stop: vi.fn().mockReturnThis(),
  };
  return { default: vi.fn(() => spinner) };
});

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "fooshop-test-"));
  vi.stubEnv("FOOSHOP_CONFIG_DIR", tmpDir);
  vi.stubEnv("FOOSHOP_BASE_URL", "https://test.fooshop.ai");
  vi.stubEnv("FOOSHOP_API_KEY", "fsk_testkey123");
  mockFetch.mockReset();
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("fooshop products list", () => {
  it("displays products in a table", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve([
          {
            id: "1",
            title: "React Kit",
            slug: "react-kit",
            priceCents: 2900,
            status: "published",
            creatorSlug: "my-store",
          },
        ]),
    });

    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const { productsCommand } = await import("../commands/products.js");
    await productsCommand.parseAsync(["list"], { from: "user" });

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("React Kit"));
    consoleSpy.mockRestore();
  });

  it("shows empty message when no products", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve([]),
    });

    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const { productsCommand } = await import("../commands/products.js");
    await productsCommand.parseAsync(["list"], { from: "user" });

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("No products yet")
    );
    consoleSpy.mockRestore();
  });
});

describe("fooshop products delete", () => {
  it("deletes a product after confirmation", async () => {
    const { confirm } = await import("@inquirer/prompts");
    (confirm as ReturnType<typeof vi.fn>).mockResolvedValueOnce(true);

    // First call: GET products list to find by slug
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve([
          { id: "1", title: "React Kit", slug: "react-kit", priceCents: 2900, status: "published" },
        ]),
    });
    // Second call: DELETE
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ ok: true }),
    });

    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const { productsCommand } = await import("../commands/products.js");
    await productsCommand.parseAsync(["delete", "react-kit"], { from: "user" });

    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("deleted"));
    consoleSpy.mockRestore();
  });
});
```

- [ ] **Step 2: Run tests, verify they fail**

```bash
cd /Users/ematomax/Documents/fooshop/.worktrees/feat/issue-84-cli-core-commands/cli
pnpm test -- src/__tests__/products.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Implement products.ts**

Create `cli/src/commands/products.ts`:

```typescript
import { Command } from "commander";
import { input, select, confirm } from "@inquirer/prompts";
import * as fs from "fs";
import * as path from "path";
import { api } from "../lib/api.js";
import { spinner, successMsg, formatPrice, buildTable } from "../lib/format.js";
import { getBaseUrl } from "../lib/config.js";

interface Product {
  id: string;
  title: string;
  slug: string;
  description: string;
  priceCents: number;
  category: string;
  status: string;
  fileUrl?: string;
  coverImageUrl?: string;
  creatorSlug?: string;
}

interface UploadResponse {
  uploadUrl: string;
  key: string;
}

const CATEGORIES = [
  "templates",
  "presets",
  "luts",
  "prompts",
  "guides",
  "courses",
  "assets",
  "other",
];

async function uploadFile(
  filePath: string,
  purpose: "product" | "cover"
): Promise<string> {
  const filename = path.basename(filePath);
  const ext = path.extname(filename).slice(1);
  const contentTypeMap: Record<string, string> = {
    zip: "application/zip",
    pdf: "application/pdf",
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    webp: "image/webp",
    gif: "image/gif",
  };
  const contentType = contentTypeMap[ext] || "application/octet-stream";

  const { uploadUrl, key } = await api.post<UploadResponse>("/api/upload", {
    filename,
    contentType,
    purpose,
  });

  const fileBuffer = fs.readFileSync(filePath);
  const res = await fetch(uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": contentType },
    body: fileBuffer,
  });

  if (!res.ok) {
    console.error("File upload failed.");
    process.exit(1);
  }

  return key;
}

export const productsCommand = new Command("products")
  .description("Manage your products");

// --- products list ---
productsCommand
  .command("list")
  .description("List your products")
  .action(async () => {
    const json = productsCommand.parent?.opts().json;
    const products = await api.get<Product[]>("/api/products?mine=true");

    if (json) {
      console.log(JSON.stringify(products, null, 2));
      return;
    }

    if (products.length === 0) {
      console.log("No products yet. Create one with `fooshop products add`.");
      return;
    }

    const baseUrl = getBaseUrl();
    const rows = products.map((p) => [
      p.title,
      formatPrice(p.priceCents),
      p.status,
      `${baseUrl}/${p.creatorSlug}/${p.slug}`,
    ]);

    console.log(buildTable(["Name", "Price", "Status", "URL"], rows));
  });

// --- products add ---
productsCommand
  .command("add")
  .description("Add a new product")
  .action(async () => {
    const title = await input({ message: "Product name:" });

    const priceStr = await input({
      message: "Price (USD):",
      validate: (v) => {
        const n = parseFloat(v);
        return !isNaN(n) && n >= 0 ? true : "Enter a valid price (e.g. 29.99)";
      },
    });
    const priceCents = Math.round(parseFloat(priceStr) * 100);

    const description = await input({ message: "Description:" });

    const category = await select({
      message: "Category:",
      choices: CATEGORIES.map((c) => ({ name: c, value: c })),
    });

    const filePath = await input({
      message: "Product file path:",
      validate: (v) => (fs.existsSync(v) ? true : "File not found"),
    });

    const coverPath = await input({
      message: "Cover image path (optional, press Enter to skip):",
    });

    const s = spinner("Uploading files...");

    let fileUrl: string;
    try {
      fileUrl = await uploadFile(filePath, "product");
    } catch {
      s.fail("File upload failed");
      return;
    }

    let coverImageUrl: string | undefined;
    if (coverPath && coverPath.trim()) {
      try {
        coverImageUrl = await uploadFile(coverPath.trim(), "cover");
      } catch {
        s.fail("Cover upload failed");
        return;
      }
    }

    s.succeed("Files uploaded!");

    const s2 = spinner("Creating product...");

    try {
      const product = await api.post<Product>("/api/products", {
        title,
        description,
        priceCents,
        category,
        status: "published",
        fileUrl,
        coverImageUrl,
      });

      s2.succeed("Product created!");
      const baseUrl = getBaseUrl();
      successMsg(`${baseUrl}/${product.creatorSlug}/${product.slug}`);
    } catch {
      s2.fail("Failed to create product");
    }
  });

// --- products edit ---
productsCommand
  .command("edit <slug>")
  .description("Edit a product")
  .action(async (slug: string) => {
    const products = await api.get<Product[]>("/api/products?mine=true");
    const product = products.find((p) => p.slug === slug);

    if (!product) {
      console.error(`Product "${slug}" not found.`);
      process.exit(1);
    }

    console.log(`Editing: ${product.title} (${formatPrice(product.priceCents)})`);
    console.log("Press Enter to keep current value.\n");

    const title = await input({
      message: "Product name:",
      default: product.title,
    });

    const priceStr = await input({
      message: "Price (USD):",
      default: (product.priceCents / 100).toFixed(2),
      validate: (v) => {
        const n = parseFloat(v);
        return !isNaN(n) && n >= 0 ? true : "Enter a valid price";
      },
    });
    const priceCents = Math.round(parseFloat(priceStr) * 100);

    const description = await input({
      message: "Description:",
      default: product.description,
    });

    const category = await select({
      message: "Category:",
      choices: CATEGORIES.map((c) => ({ name: c, value: c })),
      default: product.category,
    });

    const s = spinner("Updating product...");
    try {
      await api.put(`/api/products/${product.id}`, {
        title,
        description,
        priceCents,
        category,
      });
      s.succeed("Product updated!");
    } catch {
      s.fail("Failed to update product");
    }
  });

// --- products delete ---
productsCommand
  .command("delete <slug>")
  .description("Delete a product")
  .action(async (slug: string) => {
    const products = await api.get<Product[]>("/api/products?mine=true");
    const product = products.find((p) => p.slug === slug);

    if (!product) {
      console.error(`Product "${slug}" not found.`);
      process.exit(1);
    }

    console.log(`${product.title} — ${formatPrice(product.priceCents)}`);

    const yes = await confirm({
      message: `Delete ${product.title}? This cannot be undone.`,
      default: false,
    });

    if (!yes) {
      console.log("Cancelled.");
      return;
    }

    await api.del(`/api/products/${product.id}`);
    successMsg("Product deleted");
  });
```

- [ ] **Step 4: Run tests, verify they pass**

```bash
cd /Users/ematomax/Documents/fooshop/.worktrees/feat/issue-84-cli-core-commands/cli
pnpm test -- src/__tests__/products.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add cli/src/commands/products.ts cli/src/__tests__/products.test.ts
git commit -m "feat(cli): add fooshop products add/list/edit/delete commands (#84)"
```

---

## Task 7: `fooshop orders list` command

**Files:**
- Create: `cli/src/commands/orders.ts`
- Create: `cli/src/__tests__/orders.test.ts`

- [ ] **Step 1: Write failing tests**

Create `cli/src/__tests__/orders.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

vi.mock("ora", () => {
  const spinner = {
    start: vi.fn().mockReturnThis(),
    succeed: vi.fn().mockReturnThis(),
    stop: vi.fn().mockReturnThis(),
  };
  return { default: vi.fn(() => spinner) };
});

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "fooshop-test-"));
  vi.stubEnv("FOOSHOP_CONFIG_DIR", tmpDir);
  vi.stubEnv("FOOSHOP_BASE_URL", "https://test.fooshop.ai");
  vi.stubEnv("FOOSHOP_API_KEY", "fsk_testkey123");
  mockFetch.mockReset();
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("fooshop orders list", () => {
  it("displays orders in a table", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          orders: [
            {
              id: "1",
              createdAt: "2026-03-15T10:00:00Z",
              productTitle: "React Kit",
              amountCents: 2900,
              platformFeeCents: 232,
              currency: "usd",
              buyerEmail: "buyer@test.com",
              status: "completed",
            },
          ],
        }),
    });

    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const { ordersCommand } = await import("../commands/orders.js");
    await ordersCommand.parseAsync(["list"], { from: "user" });

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("React Kit"));
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("buyer@test.com"));
    consoleSpy.mockRestore();
  });

  it("passes period filter", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ orders: [] }),
    });

    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const { ordersCommand } = await import("../commands/orders.js");
    await ordersCommand.parseAsync(["list", "--last", "7d"], { from: "user" });

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("period=7d"),
      expect.anything()
    );
    consoleSpy.mockRestore();
  });
});
```

- [ ] **Step 2: Run tests, verify they fail**

```bash
cd /Users/ematomax/Documents/fooshop/.worktrees/feat/issue-84-cli-core-commands/cli
pnpm test -- src/__tests__/orders.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Implement orders.ts**

Create `cli/src/commands/orders.ts`:

```typescript
import { Command } from "commander";
import { api } from "../lib/api.js";
import { formatPrice, buildTable } from "../lib/format.js";

interface Order {
  id: string;
  createdAt: string;
  productTitle: string;
  amountCents: number;
  platformFeeCents: number;
  currency: string;
  buyerEmail: string;
  status: string;
}

interface OrdersResponse {
  orders: Order[];
}

export const ordersCommand = new Command("orders").description(
  "Manage your orders"
);

ordersCommand
  .command("list")
  .description("List your orders")
  .option("--last <period>", "Filter by period (7d, 30d, 90d)")
  .action(async (opts) => {
    const json = ordersCommand.parent?.opts().json;
    const period = opts.last;
    const query = period ? `?period=${period}` : "";
    const data = await api.get<OrdersResponse>(`/api/orders${query}`);

    if (json) {
      console.log(JSON.stringify(data.orders, null, 2));
      return;
    }

    if (data.orders.length === 0) {
      console.log("No orders yet.");
      return;
    }

    const rows = data.orders.map((o) => [
      new Date(o.createdAt).toLocaleDateString(),
      o.productTitle,
      formatPrice(o.amountCents),
      o.buyerEmail,
    ]);

    console.log(buildTable(["Date", "Product", "Amount", "Buyer"], rows));
  });
```

- [ ] **Step 4: Run tests, verify they pass**

```bash
cd /Users/ematomax/Documents/fooshop/.worktrees/feat/issue-84-cli-core-commands/cli
pnpm test -- src/__tests__/orders.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add cli/src/commands/orders.ts cli/src/__tests__/orders.test.ts
git commit -m "feat(cli): add fooshop orders list command (#84)"
```

---

## Task 8: `fooshop analytics` command

**Files:**
- Create: `cli/src/commands/analytics.ts`
- Create: `cli/src/__tests__/analytics.test.ts`

- [ ] **Step 1: Write failing tests**

Create `cli/src/__tests__/analytics.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

vi.mock("ora", () => {
  const spinner = {
    start: vi.fn().mockReturnThis(),
    succeed: vi.fn().mockReturnThis(),
    stop: vi.fn().mockReturnThis(),
  };
  return { default: vi.fn(() => spinner) };
});

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "fooshop-test-"));
  vi.stubEnv("FOOSHOP_CONFIG_DIR", tmpDir);
  vi.stubEnv("FOOSHOP_BASE_URL", "https://test.fooshop.ai");
  vi.stubEnv("FOOSHOP_API_KEY", "fsk_testkey123");
  mockFetch.mockReset();
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("fooshop analytics", () => {
  it("displays KPIs and tables", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          kpis: {
            revenue: 15000,
            orders: 5,
            conversionRate: 3.2,
            pageViews: 156,
            changes: {
              revenue: 25,
              orders: 10,
              conversionRate: -1.5,
              pageViews: 30,
            },
          },
          topProducts: [
            { id: "1", title: "React Kit", sales: 3, revenue: 8700 },
          ],
          trafficSources: [
            { source: "web", count: 100, percentage: 64.1 },
            { source: "api", count: 56, percentage: 35.9 },
          ],
          revenueOverTime: [],
          conversionFunnel: { pageViews: 156, buyIntents: 20, orders: 5 },
          couponPerformance: [],
        }),
    });

    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const { analyticsCommand } = await import("../commands/analytics.js");
    await analyticsCommand.parseAsync([], { from: "user" });

    const output = consoleSpy.mock.calls.map((c) => c[0]).join("\n");
    expect(output).toContain("$150.00");
    expect(output).toContain("React Kit");
    consoleSpy.mockRestore();
  });
});
```

- [ ] **Step 2: Run tests, verify they fail**

```bash
cd /Users/ematomax/Documents/fooshop/.worktrees/feat/issue-84-cli-core-commands/cli
pnpm test -- src/__tests__/analytics.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Implement analytics.ts**

Create `cli/src/commands/analytics.ts`:

```typescript
import { Command } from "commander";
import chalk from "chalk";
import { api } from "../lib/api.js";
import { formatPrice, buildTable } from "../lib/format.js";

interface AnalyticsResponse {
  kpis: {
    revenue: number;
    orders: number;
    conversionRate: number;
    pageViews: number;
    changes: {
      revenue: number | null;
      orders: number | null;
      conversionRate: number | null;
      pageViews: number | null;
    };
  };
  topProducts: { id: string; title: string; sales: number; revenue: number }[];
  trafficSources: { source: string; count: number; percentage: number }[];
  revenueOverTime: { date: string; revenue: number }[];
  conversionFunnel: { pageViews: number; buyIntents: number; orders: number };
  couponPerformance: unknown[];
}

function formatChange(value: number | null): string {
  if (value === null) return chalk.gray("—");
  const sign = value >= 0 ? "+" : "";
  const color = value >= 0 ? chalk.green : chalk.red;
  return color(`${sign}${value.toFixed(1)}%`);
}

export const analyticsCommand = new Command("analytics")
  .description("View store analytics")
  .option("--period <period>", "Time period (7d, 30d, 90d, all)", "30d")
  .action(async (opts) => {
    const json = analyticsCommand.parent?.opts().json;
    const data = await api.get<AnalyticsResponse>(
      `/api/analytics?period=${opts.period}`
    );

    if (json) {
      console.log(JSON.stringify(data, null, 2));
      return;
    }

    const { kpis } = data;

    console.log(chalk.bold("\n  Dashboard\n"));
    console.log(
      `  Revenue:      ${formatPrice(kpis.revenue)}  ${formatChange(kpis.changes.revenue)}`
    );
    console.log(
      `  Orders:       ${kpis.orders}  ${formatChange(kpis.changes.orders)}`
    );
    console.log(
      `  Conversion:   ${kpis.conversionRate.toFixed(1)}%  ${formatChange(kpis.changes.conversionRate)}`
    );
    console.log(
      `  Page views:   ${kpis.pageViews}  ${formatChange(kpis.changes.pageViews)}`
    );

    if (data.topProducts.length > 0) {
      console.log(chalk.bold("\n  Top Products\n"));
      const rows = data.topProducts.slice(0, 5).map((p) => [
        p.title,
        String(p.sales),
        formatPrice(p.revenue),
      ]);
      console.log(buildTable(["Product", "Sales", "Revenue"], rows));
    }

    if (data.trafficSources.length > 0) {
      console.log(chalk.bold("\n  Traffic Sources\n"));
      const rows = data.trafficSources.map((s) => [
        s.source,
        String(s.count),
        `${s.percentage.toFixed(1)}%`,
      ]);
      console.log(buildTable(["Source", "Views", "Share"], rows));
    }
  });
```

- [ ] **Step 4: Run tests, verify they pass**

```bash
cd /Users/ematomax/Documents/fooshop/.worktrees/feat/issue-84-cli-core-commands/cli
pnpm test -- src/__tests__/analytics.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add cli/src/commands/analytics.ts cli/src/__tests__/analytics.test.ts
git commit -m "feat(cli): add fooshop analytics command (#84)"
```

---

## Task 9: `fooshop config` and `fooshop open` commands

**Files:**
- Create: `cli/src/commands/config-cmd.ts`
- Create: `cli/src/commands/open.ts`

- [ ] **Step 1: Implement config-cmd.ts**

Create `cli/src/commands/config-cmd.ts`:

```typescript
import { Command } from "commander";
import chalk from "chalk";
import { readConfig, getBaseUrl } from "../lib/config.js";
import { api } from "../lib/api.js";

interface StoreInfo {
  slug: string;
  storeName: string;
  stripeConnectId: string | null;
}

export const configCommand = new Command("config")
  .description("Show current configuration")
  .action(async () => {
    const config = readConfig();
    const baseUrl = getBaseUrl();

    console.log(chalk.bold("\n  Configuration\n"));
    console.log(`  Email:    ${config?.email || chalk.gray("Not logged in")}`);
    console.log(`  API URL:  ${baseUrl}`);

    try {
      const store = await api.get<StoreInfo>("/api/store");
      console.log(
        `  Stripe:   ${store.stripeConnectId ? chalk.green("Connected") : chalk.yellow("Not connected")}`
      );
      console.log(`  Store:    ${baseUrl}/${store.slug}`);
    } catch {
      console.log(`  Store:    ${chalk.gray("Not set up yet. Run `fooshop init`")}`);
    }

    console.log();
  });
```

- [ ] **Step 2: Implement open.ts command**

Create `cli/src/commands/open.ts`:

```typescript
import { Command } from "commander";
import { api } from "../lib/api.js";
import { getBaseUrl } from "../lib/config.js";
import { openBrowser } from "../lib/open.js";
import { successMsg } from "../lib/format.js";

interface StoreInfo {
  slug: string;
}

export const openCommand = new Command("open")
  .description("Open your store in the browser")
  .action(async () => {
    const store = await api.get<StoreInfo>("/api/store");
    const url = `${getBaseUrl()}/${store.slug}`;
    await openBrowser(url);
    successMsg(`Opening ${url}`);
  });
```

- [ ] **Step 3: Verify build**

```bash
cd /Users/ematomax/Documents/fooshop/.worktrees/feat/issue-84-cli-core-commands/cli
pnpm build
```

Expected: Build succeeds.

- [ ] **Step 4: Commit**

```bash
git add cli/src/commands/config-cmd.ts cli/src/commands/open.ts
git commit -m "feat(cli): add fooshop config and open commands (#84)"
```

---

## Task 10: Register all commands in index.ts + `--json` flag

**Files:**
- Modify: `cli/src/index.ts`

- [ ] **Step 1: Update index.ts**

Replace the content of `cli/src/index.ts` with:

```typescript
#!/usr/bin/env node

import { Command } from "commander";
import { loginCommand } from "./commands/login.js";
import { initCommand } from "./commands/init.js";
import { productsCommand } from "./commands/products.js";
import { ordersCommand } from "./commands/orders.js";
import { analyticsCommand } from "./commands/analytics.js";
import { configCommand } from "./commands/config-cmd.js";
import { openCommand } from "./commands/open.js";

const program = new Command();

program
  .name("fooshop")
  .description("Fooshop CLI — commerce from your terminal")
  .version("0.1.0")
  .option("--json", "Output raw JSON (where supported)");

program.addCommand(loginCommand);
program.addCommand(initCommand);
program.addCommand(productsCommand);
program.addCommand(ordersCommand);
program.addCommand(analyticsCommand);
program.addCommand(configCommand);
program.addCommand(openCommand);

program.parse();
```

- [ ] **Step 2: Run full test suite**

```bash
cd /Users/ematomax/Documents/fooshop/.worktrees/feat/issue-84-cli-core-commands/cli
pnpm test
```

Expected: All tests pass.

- [ ] **Step 3: Verify build**

```bash
cd /Users/ematomax/Documents/fooshop/.worktrees/feat/issue-84-cli-core-commands/cli
pnpm build
```

Expected: Build succeeds with no errors.

- [ ] **Step 4: Verify help output**

```bash
cd /Users/ematomax/Documents/fooshop/.worktrees/feat/issue-84-cli-core-commands/cli
node dist/index.js --help
```

Expected: Shows all commands (login, init, products, orders, analytics, config, open).

- [ ] **Step 5: Commit**

```bash
git add cli/src/index.ts
git commit -m "feat(cli): register all commands and add --json global flag (#84)"
```

---

## Task 11: Full build verification

- [ ] **Step 1: Run full Next.js build to verify backend endpoint**

```bash
cd /Users/ematomax/Documents/fooshop/.worktrees/feat/issue-84-cli-core-commands
pnpm build 2>&1 | tail -10
```

Expected: Build succeeds, `/api/orders` shows in route list.

- [ ] **Step 2: Run CLI test suite**

```bash
cd /Users/ematomax/Documents/fooshop/.worktrees/feat/issue-84-cli-core-commands/cli
pnpm test
```

Expected: All tests pass.

- [ ] **Step 3: Verify `fooshop --help` shows all commands**

```bash
cd /Users/ematomax/Documents/fooshop/.worktrees/feat/issue-84-cli-core-commands/cli
node dist/index.js --help
node dist/index.js products --help
node dist/index.js orders --help
```

Expected: All help output correct with descriptions.
