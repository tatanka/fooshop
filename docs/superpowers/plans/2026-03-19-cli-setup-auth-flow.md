# CLI Package Setup + Auth Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the `fooshop` CLI npm package with `fooshop login` browser-based auth flow, plus the web endpoints (`/cli-auth` page, `/api/auth/cli-callback`) that generate and deliver API keys.

**Architecture:** CLI package in `cli/` (Commander.js + TypeScript), compiled to `dist/`. Web side adds two routes to the existing Next.js app. Auth flow: CLI opens browser → user authenticates via Google OAuth → approves CLI access → server generates API key → redirects to localhost callback → CLI saves key to `~/.fooshop/config.json`.

**Tech Stack:** Commander.js, Node.js `net`/`http` modules, `open` package, Next.js App Router (server components + API route), Drizzle ORM, Auth.js

**Spec:** `docs/superpowers/specs/2026-03-19-cli-setup-auth-flow-design.md`

---

## File Map

### CLI Package (new files in `cli/`)

| File | Responsibility |
|------|---------------|
| `cli/package.json` | Package manifest: name `fooshop`, bin entry, dependencies |
| `cli/tsconfig.json` | TypeScript config (ES2022, Node16 module) |
| `cli/src/index.ts` | Commander entry point, registers `login` command |
| `cli/src/commands/login.ts` | Login command: orchestrates server → browser → callback → save |
| `cli/src/lib/config.ts` | Read/write `~/.fooshop/config.json`, env var overrides |
| `cli/src/lib/server.ts` | Localhost HTTP callback server (find port, start, handle callback) |
| `cli/src/lib/open.ts` | Open URL in default browser (wrapper around `open` package) |

### CLI Tests (new files in `cli/`)

| File | Responsibility |
|------|---------------|
| `cli/src/__tests__/config.test.ts` | Config read/write/env override tests |
| `cli/src/__tests__/server.test.ts` | Callback server tests (port finding, request handling) |
| `cli/src/__tests__/login.test.ts` | Login command integration test (mocked browser + server) |

### Web Endpoints (new files in `src/app/`)

| File | Responsibility |
|------|---------------|
| `src/app/(platform)/cli-auth/page.tsx` | Approval page: session check, nonce cookie, form UI |
| `src/app/api/auth/cli-callback/route.ts` | POST handler: validate session + nonce, find/create creator, generate key, redirect to localhost |

---

## Task 1: CLI Package Scaffold

**Files:**
- Create: `cli/package.json`
- Create: `cli/tsconfig.json`
- Create: `cli/src/index.ts`

- [ ] **Step 1: Create `cli/package.json`**

```json
{
  "name": "fooshop",
  "version": "0.1.0",
  "type": "module",
  "description": "Fooshop CLI — commerce from your terminal",
  "main": "dist/index.js",
  "bin": {
    "fooshop": "dist/index.js"
  },
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "files": ["dist"],
  "engines": {
    "node": ">=18"
  },
  "dependencies": {
    "commander": "^13.0.0",
    "open": "^10.0.0"
  },
  "devDependencies": {
    "@types/node": "^20",
    "typescript": "^5",
    "vitest": "^2.1.9"
  }
}
```

- [ ] **Step 2: Create `cli/tsconfig.json`**

Match the MCP server pattern (`mcp-server/tsconfig.json`):

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "Node16",
    "moduleResolution": "Node16",
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "declaration": true
  },
  "include": ["src"]
}
```

- [ ] **Step 3: Create `cli/src/index.ts`**

Entry point with shebang, registers the `login` command (stubbed for now):

```typescript
#!/usr/bin/env node

import { Command } from "commander";

const program = new Command();

program
  .name("fooshop")
  .description("Fooshop CLI — commerce from your terminal")
  .version("0.1.0");

// Commands will be registered here
// program.addCommand(loginCommand);

program.parse();
```

- [ ] **Step 4: Create `cli/.gitignore`**

```
node_modules/
dist/
```

- [ ] **Step 5: Verify `cli/` is not captured by pnpm workspace**

Run: `cat pnpm-workspace.yaml 2>/dev/null || echo "no workspace file"`

If the workspace file has a glob that would match `cli/`, add `"!cli"` to the `packages` array to exclude it. The CLI is a standalone package, not part of the monorepo workspace.

- [ ] **Step 6: Install dependencies and verify build**

Run: `cd cli && pnpm install && pnpm build`
Expected: Clean compile, `dist/index.js` created with shebang

- [ ] **Step 7: Verify CLI runs**

Run: `node cli/dist/index.js --help`
Expected: Shows "Fooshop CLI — commerce from your terminal" and version

- [ ] **Step 8: Commit**

```bash
git add cli/
git commit -m "feat: scaffold fooshop CLI package with Commander.js (#81)"
```

---

## Task 2: Config Module

**Files:**
- Create: `cli/src/lib/config.ts`
- Create: `cli/src/__tests__/config.test.ts`

- [ ] **Step 1: Write failing tests for config module**

Create `cli/src/__tests__/config.test.ts`:

```typescript
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { readConfig, writeConfig, getApiKey, getBaseUrl } from "../lib/config.js";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

// Use a temp dir to avoid touching real ~/.fooshop
let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "fooshop-test-"));
  vi.stubEnv("FOOSHOP_CONFIG_DIR", tmpDir);
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
  vi.unstubAllEnvs();
});

describe("readConfig", () => {
  it("returns null when config file does not exist", () => {
    expect(readConfig()).toBeNull();
  });

  it("reads existing config file", () => {
    const config = { apiKey: "fsk_test123", baseUrl: "https://fooshop.ai", email: "test@example.com" };
    fs.writeFileSync(path.join(tmpDir, "config.json"), JSON.stringify(config));
    expect(readConfig()).toEqual(config);
  });

  it("returns null for malformed JSON", () => {
    fs.writeFileSync(path.join(tmpDir, "config.json"), "not json");
    expect(readConfig()).toBeNull();
  });
});

describe("writeConfig", () => {
  it("creates directory and writes config", () => {
    const nestedDir = path.join(tmpDir, "nested");
    vi.stubEnv("FOOSHOP_CONFIG_DIR", nestedDir);
    writeConfig({ apiKey: "fsk_abc", baseUrl: "https://fooshop.ai", email: "a@b.com" });
    const content = JSON.parse(fs.readFileSync(path.join(nestedDir, "config.json"), "utf-8"));
    expect(content.apiKey).toBe("fsk_abc");
  });
});

describe("getApiKey", () => {
  it("returns env var over config file", () => {
    vi.stubEnv("FOOSHOP_API_KEY", "fsk_from_env");
    const config = { apiKey: "fsk_from_file", baseUrl: "https://fooshop.ai", email: "t@t.com" };
    fs.writeFileSync(path.join(tmpDir, "config.json"), JSON.stringify(config));
    expect(getApiKey()).toBe("fsk_from_env");
  });

  it("returns config file value when env not set", () => {
    const config = { apiKey: "fsk_from_file", baseUrl: "https://fooshop.ai", email: "t@t.com" };
    fs.writeFileSync(path.join(tmpDir, "config.json"), JSON.stringify(config));
    expect(getApiKey()).toBe("fsk_from_file");
  });

  it("returns null when nothing is set", () => {
    expect(getApiKey()).toBeNull();
  });
});

describe("getBaseUrl", () => {
  it("returns env var over config file", () => {
    vi.stubEnv("FOOSHOP_BASE_URL", "https://staging.fooshop.ai");
    expect(getBaseUrl()).toBe("https://staging.fooshop.ai");
  });

  it("returns config value when env not set", () => {
    const config = { apiKey: "fsk_x", baseUrl: "https://custom.fooshop.ai", email: "t@t.com" };
    fs.writeFileSync(path.join(tmpDir, "config.json"), JSON.stringify(config));
    expect(getBaseUrl()).toBe("https://custom.fooshop.ai");
  });

  it("returns default when nothing is set", () => {
    expect(getBaseUrl()).toBe("https://fooshop.ai");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd cli && pnpm test`
Expected: All tests FAIL — module `../lib/config.js` not found

- [ ] **Step 3: Implement config module**

Create `cli/src/lib/config.ts`:

```typescript
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

export interface FooshopConfig {
  apiKey: string;
  baseUrl: string;
  email: string;
}

const DEFAULT_BASE_URL = "https://fooshop.ai";

function getConfigDir(): string {
  return process.env.FOOSHOP_CONFIG_DIR || path.join(os.homedir(), ".fooshop");
}

function getConfigPath(): string {
  return path.join(getConfigDir(), "config.json");
}

export function readConfig(): FooshopConfig | null {
  try {
    const raw = fs.readFileSync(getConfigPath(), "utf-8");
    return JSON.parse(raw) as FooshopConfig;
  } catch {
    return null;
  }
}

export function writeConfig(config: FooshopConfig): void {
  const dir = getConfigDir();
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(getConfigPath(), JSON.stringify(config, null, 2) + "\n", {
    mode: 0o600,
  });
}

export function getApiKey(): string | null {
  return process.env.FOOSHOP_API_KEY || readConfig()?.apiKey || null;
}

export function getBaseUrl(): string {
  return process.env.FOOSHOP_BASE_URL || readConfig()?.baseUrl || DEFAULT_BASE_URL;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd cli && pnpm test`
Expected: All config tests PASS

- [ ] **Step 5: Commit**

```bash
git add cli/src/lib/config.ts cli/src/__tests__/config.test.ts
git commit -m "feat: add CLI config module with env var overrides (#81)"
```

---

## Task 3: Localhost Callback Server

**Files:**
- Create: `cli/src/lib/server.ts`
- Create: `cli/src/__tests__/server.test.ts`

- [ ] **Step 1: Write failing tests for callback server**

Create `cli/src/__tests__/server.test.ts`:

```typescript
import { describe, it, expect, afterEach } from "vitest";
import { startCallbackServer } from "../lib/server.js";
import http from "http";

let cleanup: (() => void) | undefined;

afterEach(() => {
  cleanup?.();
  cleanup = undefined;
});

function httpGet(url: string): Promise<{ status: number; body: string }> {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let body = "";
      res.on("data", (chunk) => (body += chunk));
      res.on("end", () => resolve({ status: res.statusCode!, body }));
    }).on("error", reject);
  });
}

describe("startCallbackServer", () => {
  it("picks a random available port", async () => {
    const { port, promise, close } = await startCallbackServer();
    cleanup = close;
    expect(port).toBeGreaterThan(0);
    expect(port).toBeLessThan(65536);
    close();
  });

  it("resolves with key and email on successful callback", async () => {
    const { port, promise, close } = await startCallbackServer();
    cleanup = close;

    const res = await httpGet(`http://127.0.0.1:${port}/callback?key=fsk_test123&email=test@example.com`);
    expect(res.status).toBe(200);
    expect(res.body).toContain("Authentication complete");

    const result = await promise;
    expect(result).toEqual({ key: "fsk_test123", email: "test@example.com" });
  });

  it("returns 400 when key param is missing", async () => {
    const { port, promise, close } = await startCallbackServer();
    cleanup = close;

    const res = await httpGet(`http://127.0.0.1:${port}/callback?email=test@example.com`);
    expect(res.status).toBe(400);
    close();
  });

  it("resolves with error on denied callback", async () => {
    const { port, promise, close } = await startCallbackServer();
    cleanup = close;

    const res = await httpGet(`http://127.0.0.1:${port}/callback?error=denied`);
    expect(res.status).toBe(200);

    const result = await promise;
    expect(result).toEqual({ error: "denied" });
  });

  it("only binds to 127.0.0.1", async () => {
    const { port, close } = await startCallbackServer();
    cleanup = close;

    // Server should be listening on 127.0.0.1, confirmed by successful connection
    const res = await httpGet(`http://127.0.0.1:${port}/callback?key=fsk_x&email=a@b.com`);
    expect(res.status).toBe(200);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd cli && pnpm test -- src/__tests__/server.test.ts`
Expected: FAIL — module `../lib/server.js` not found

- [ ] **Step 3: Implement callback server**

Create `cli/src/lib/server.ts`:

```typescript
import * as http from "http";
import * as net from "net";
import { URL } from "url";

export type CallbackResult =
  | { key: string; email: string }
  | { error: string };

interface ServerHandle {
  port: number;
  promise: Promise<CallbackResult>;
  close: () => void;
}

function findFreePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.listen(0, "127.0.0.1", () => {
      const addr = srv.address() as net.AddressInfo;
      srv.close(() => resolve(addr.port));
    });
    srv.on("error", reject);
  });
}

export async function startCallbackServer(): Promise<ServerHandle> {
  const port = await findFreePort();

  let resolvePromise: (result: CallbackResult) => void;
  const promise = new Promise<CallbackResult>((resolve) => {
    resolvePromise = resolve;
  });

  const server = http.createServer((req, res) => {
    const url = new URL(req.url!, `http://127.0.0.1:${port}`);

    if (url.pathname !== "/callback") {
      res.writeHead(404);
      res.end("Not found");
      return;
    }

    const error = url.searchParams.get("error");
    if (error) {
      res.writeHead(200, { "Content-Type": "text/html" });
      res.end("<html><body><h1>Authentication denied.</h1><p>You can close this tab.</p></body></html>");
      resolvePromise({ error });
      return;
    }

    const key = url.searchParams.get("key");
    const email = url.searchParams.get("email");

    if (!key || !email) {
      res.writeHead(400, { "Content-Type": "text/plain" });
      res.end("Missing key or email parameter");
      return;
    }

    res.writeHead(200, { "Content-Type": "text/html" });
    res.end(
      "<html><body><h1>&#10003; Authentication complete.</h1><p>You can close this tab and return to your terminal.</p></body></html>"
    );

    resolvePromise({ key, email });
  });

  await new Promise<void>((resolve) => {
    server.listen(port, "127.0.0.1", () => resolve());
  });

  const close = () => {
    server.close();
  };

  return { port, promise, close };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd cli && pnpm test -- src/__tests__/server.test.ts`
Expected: All server tests PASS

- [ ] **Step 5: Commit**

```bash
git add cli/src/lib/server.ts cli/src/__tests__/server.test.ts
git commit -m "feat: add localhost callback server for CLI auth (#81)"
```

---

## Task 4: Browser Open Utility

**Files:**
- Create: `cli/src/lib/open.ts`

- [ ] **Step 1: Create browser open wrapper**

Create `cli/src/lib/open.ts`:

```typescript
import open from "open";

export async function openBrowser(url: string): Promise<void> {
  try {
    await open(url);
  } catch {
    // If open fails (e.g., no display), print the URL for manual copy
    console.log(`\nOpen this URL in your browser:\n  ${url}\n`);
  }
}
```

No tests needed — thin wrapper around `open` package with a fallback.

- [ ] **Step 2: Commit**

```bash
git add cli/src/lib/open.ts
git commit -m "feat: add browser open utility for CLI (#81)"
```

---

## Task 5: Login Command

**Files:**
- Create: `cli/src/commands/login.ts`
- Modify: `cli/src/index.ts` (register login command)
- Create: `cli/src/__tests__/login.test.ts`

- [ ] **Step 1: Write failing test for login command**

Create `cli/src/__tests__/login.test.ts`. This tests the login command action by mocking the browser open and simulating the callback:

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import http from "http";

// Mock the open module before any imports that use it
vi.mock("open", () => ({
  default: vi.fn().mockResolvedValue(undefined),
}));

import { readConfig } from "../lib/config.js";
import open from "open";

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "fooshop-test-"));
  vi.stubEnv("FOOSHOP_CONFIG_DIR", tmpDir);
  vi.stubEnv("FOOSHOP_BASE_URL", "https://test.fooshop.ai");
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("login command", () => {
  it("opens browser, receives callback, saves config", async () => {
    // Import login command (uses mocked open)
    const { loginCommand } = await import("../commands/login.js");

    // Capture the URL that open() is called with so we can extract the port
    let capturedUrl = "";
    vi.mocked(open).mockImplementation(async (url: string) => {
      capturedUrl = url;
      // Simulate the browser callback after a short delay
      const parsedUrl = new URL(url);
      const port = parsedUrl.searchParams.get("port");
      setTimeout(() => {
        http.get(`http://127.0.0.1:${port}/callback?key=fsk_testkey123&email=test@example.com`);
      }, 50);
      return undefined as any;
    });

    // Run the login action directly
    await loginCommand.parseAsync(["login"], { from: "user" });

    // Verify browser was opened with correct URL
    expect(open).toHaveBeenCalledOnce();
    expect(capturedUrl).toContain("https://test.fooshop.ai/cli-auth?port=");

    // Verify config was saved
    const config = readConfig();
    expect(config).not.toBeNull();
    expect(config!.apiKey).toBe("fsk_testkey123");
    expect(config!.email).toBe("test@example.com");
    expect(config!.baseUrl).toBe("https://test.fooshop.ai");
  });

  it("exits with error on denied callback", async () => {
    const { loginCommand } = await import("../commands/login.js");

    const mockExit = vi.spyOn(process, "exit").mockImplementation(() => { throw new Error("exit"); });

    vi.mocked(open).mockImplementation(async (url: string) => {
      const parsedUrl = new URL(url);
      const port = parsedUrl.searchParams.get("port");
      setTimeout(() => {
        http.get(`http://127.0.0.1:${port}/callback?error=denied`);
      }, 50);
      return undefined as any;
    });

    await expect(loginCommand.parseAsync(["login"], { from: "user" })).rejects.toThrow("exit");
    expect(mockExit).toHaveBeenCalledWith(1);

    // Config should NOT be saved
    expect(readConfig()).toBeNull();
    mockExit.mockRestore();
  });
});
```

- [ ] **Step 2: Run test to verify it fails** (login command not yet implemented)

Run: `cd cli && pnpm test -- src/__tests__/login.test.ts`
Expected: FAIL — module `../commands/login.js` not found

- [ ] **Step 3: Implement login command**

Create `cli/src/commands/login.ts`:

```typescript
import { Command } from "commander";
import { readConfig, writeConfig, getBaseUrl } from "../lib/config.js";
import { startCallbackServer } from "../lib/server.js";
import { openBrowser } from "../lib/open.js";

const TIMEOUT_MS = 120_000;

export const loginCommand = new Command("login")
  .description("Authenticate with Fooshop via browser")
  .action(async () => {
    const existing = readConfig();
    if (existing?.apiKey) {
      console.log(`Currently logged in as ${existing.email}`);
      console.log("Running login again will replace the existing API key.\n");
    }

    const { port, promise, close } = await startCallbackServer();
    const baseUrl = getBaseUrl();
    const authUrl = `${baseUrl}/cli-auth?port=${port}`;

    console.log("Opening browser for authentication...");
    await openBrowser(authUrl);
    console.log("Waiting for authentication...\n");

    const timeout = setTimeout(() => {
      close();
      console.error("\nAuthentication timed out after 2 minutes.");
      console.error("Please try again with: fooshop login");
      process.exit(1);
    }, TIMEOUT_MS);

    const result = await promise;
    clearTimeout(timeout);
    close();

    if ("error" in result) {
      console.error(`\nAuthentication denied: ${result.error}`);
      process.exit(1);
    }

    writeConfig({
      apiKey: result.key,
      baseUrl,
      email: result.email,
    });

    console.log(`✓ Logged in as ${result.email}`);
  });
```

- [ ] **Step 4: Register login command in `cli/src/index.ts`**

Update `cli/src/index.ts`:

```typescript
#!/usr/bin/env node

import { Command } from "commander";
import { loginCommand } from "./commands/login.js";

const program = new Command();

program
  .name("fooshop")
  .description("Fooshop CLI — commerce from your terminal")
  .version("0.1.0");

program.addCommand(loginCommand);

program.parse();
```

- [ ] **Step 5: Build and verify `fooshop login --help`**

Run: `cd cli && pnpm build && node dist/index.js login --help`
Expected: Shows "Authenticate with Fooshop via browser"

- [ ] **Step 6: Commit**

```bash
git add cli/src/commands/login.ts cli/src/index.ts cli/src/__tests__/login.test.ts
git commit -m "feat: implement fooshop login command (#81)"
```

---

## Task 6: Web — `/cli-auth` Approval Page

**Files:**
- Create: `src/app/(platform)/cli-auth/page.tsx`

This task is in the **Next.js app** (not the CLI package). Working directory: project root.

- [ ] **Step 1: Create the cli-auth page**

Create `src/app/(platform)/cli-auth/page.tsx`:

```tsx
export const dynamic = "force-dynamic";

import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";

interface Props {
  searchParams: Promise<{ port?: string }>;
}

export default async function CliAuthPage({ searchParams }: Props) {
  const params = await searchParams;
  const port = params.port;

  // Validate port parameter
  const portNum = port ? parseInt(port, 10) : NaN;
  if (!port || isNaN(portNum) || portNum < 1024 || portNum > 65535) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md mx-auto text-center p-8">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Invalid Request</h1>
          <p className="text-gray-600">Missing or invalid port parameter. Please run <code className="bg-gray-100 px-2 py-1 rounded">fooshop login</code> again.</p>
        </div>
      </main>
    );
  }

  // Check session
  const session = await auth();
  if (!session?.user?.id) {
    redirect(`/api/auth/signin?callbackUrl=${encodeURIComponent(`/cli-auth?port=${port}`)}`);
  }

  // Generate CSRF nonce
  const nonce = crypto.randomUUID();
  const cookieStore = await cookies();
  cookieStore.set("cli-auth-nonce", nonce, {
    httpOnly: true,
    sameSite: "strict",
    maxAge: 60,
    path: "/api/auth/cli-callback",
  });

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md mx-auto bg-white rounded-2xl shadow-lg p-8 text-center">
        <div className="mb-6">
          <h1 className="text-3xl font-bold tracking-tight" style={{ fontFamily: "var(--font-display)" }}>
            fooshop
          </h1>
        </div>

        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          CLI wants to access your account
        </h2>

        <p className="text-gray-600 mb-6">
          {session.user.name && <span>{session.user.name}<br /></span>}
          Signed in as <strong>{session.user.email}</strong>
        </p>

        <p className="text-sm text-gray-500 mb-8">
          This will create an API key with full access to your store, products, orders, and analytics.
        </p>

        <form method="POST" action="/api/auth/cli-callback">
          <input type="hidden" name="port" value={port} />
          <input type="hidden" name="nonce" value={nonce} />

          <button
            type="submit"
            className="w-full bg-black text-white py-3 px-6 rounded-lg font-medium hover:bg-gray-800 transition-colors mb-3"
          >
            Approve
          </button>
        </form>

        <a
          href={`http://127.0.0.1:${port}/callback?error=denied`}
          className="block w-full text-center py-3 px-6 rounded-lg font-medium text-gray-600 hover:bg-gray-100 transition-colors"
        >
          Deny
        </a>
      </div>
    </main>
  );
}
```

- [ ] **Step 2: Verify build**

Run: `pnpm build`
Expected: Build succeeds with `/cli-auth` in the route list

- [ ] **Step 3: Commit**

```bash
git add src/app/\(platform\)/cli-auth/page.tsx
git commit -m "feat: add /cli-auth approval page for CLI login (#81)"
```

---

## Task 7: Web — `/api/auth/cli-callback` Endpoint

**Files:**
- Create: `src/app/api/auth/cli-callback/route.ts`

- [ ] **Step 1: Implement the callback endpoint**

Create `src/app/api/auth/cli-callback/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { creators, apiKeys } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { generateApiKey, CREATOR_SCOPES } from "@/lib/api-key";
import { cookies } from "next/headers";

function generateSlug(email: string): string {
  const prefix = email.split("@")[0]
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  const suffix = crypto.randomUUID().slice(0, 4);
  return `${prefix}-${suffix}`;
}

export async function POST(req: NextRequest) {
  // 1. Verify session
  const session = await auth();
  if (!session?.user?.id || !session.user.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. Parse form data
  const formData = await req.formData();
  const nonce = formData.get("nonce") as string | null;
  const portStr = formData.get("port") as string | null;

  // 3. Validate CSRF nonce
  const cookieStore = await cookies();
  const cookieNonce = cookieStore.get("cli-auth-nonce")?.value;
  cookieStore.delete("cli-auth-nonce");

  if (!nonce || !cookieNonce || nonce !== cookieNonce) {
    return NextResponse.json({ error: "Invalid or expired nonce" }, { status: 403 });
  }

  // 4. Validate port
  const port = portStr ? parseInt(portStr, 10) : NaN;
  if (isNaN(port) || port < 1024 || port > 65535) {
    return NextResponse.json({ error: "Invalid port" }, { status: 400 });
  }

  // 5. Find or create creator
  let creator = await db
    .select()
    .from(creators)
    .where(eq(creators.userId, session.user.id))
    .then((rows) => rows[0]);

  if (!creator) {
    const [newCreator] = await db
      .insert(creators)
      .values({
        userId: session.user.id,
        email: session.user.email,
        name: session.user.name || session.user.email.split("@")[0],
        slug: generateSlug(session.user.email),
      })
      .returning();
    creator = newCreator;
  }

  // 6. Revoke existing CLI key (prevent accumulation)
  await db
    .delete(apiKeys)
    .where(
      and(eq(apiKeys.creatorId, creator.id), eq(apiKeys.name, "Fooshop CLI"))
    );

  // 7. Generate new API key
  const { key, prefix, hash } = generateApiKey();
  await db.insert(apiKeys).values({
    creatorId: creator.id,
    keyHash: hash,
    keyPrefix: prefix,
    name: "Fooshop CLI",
    scopes: [...CREATOR_SCOPES],
  });

  // 8. Redirect to localhost callback
  const redirectUrl = `http://127.0.0.1:${port}/callback?key=${encodeURIComponent(key)}&email=${encodeURIComponent(session.user.email)}`;
  return NextResponse.redirect(redirectUrl, 302);
}
```

- [ ] **Step 2: Verify build**

Run: `pnpm build`
Expected: Build succeeds

- [ ] **Step 3: Commit**

```bash
git add src/app/api/auth/cli-callback/route.ts
git commit -m "feat: add /api/auth/cli-callback endpoint for CLI key generation (#81)"
```

---

## Task 8: Build Verification & Manual Test

- [ ] **Step 1: Run all CLI tests**

Run: `cd cli && pnpm test`
Expected: All tests pass

- [ ] **Step 2: Run Next.js build**

Run: `pnpm build`
Expected: Clean build with `/cli-auth` and `/api/auth/cli-callback` in route list

- [ ] **Step 3: Run existing project tests**

Run: `pnpm test`
Expected: All existing tests still pass (no regressions)

- [ ] **Step 4: Commit any fixes if needed**

Only if previous steps revealed issues.

- [ ] **Step 5: Final commit with all files verified**

Verify git status is clean. All changes committed.
