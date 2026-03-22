# CLI Core Commands Design

**Issue:** #84
**Date:** 2026-03-20
**Status:** Approved

## Overview

Implement the 9 core CLI commands that make `fooshop` a complete interface for managing a store: `init`, `products add/list/edit/delete`, `orders list`, `analytics`, `config`, `open`.

## Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Scope | All 9 commands in one issue | Full CLI experience in one shot |
| Architecture | Flat commands (Approach A) | Follows existing `login.ts` pattern, simple, YAGNI |
| UX libs | chalk + ora + cli-table3 + @inquirer/prompts | Full UX polish; CLI is the primary interface |
| Upload progress | Spinner (ora), no progress bar | YAGNI — most files under 50MB |
| Stripe onboarding | Open browser to dashboard | Stripe onboarding is a browser flow regardless |
| Orders endpoint | Create new `GET /api/orders` | Clean JSON API, no CSV parsing workaround |

## File Structure

### New files

```
cli/src/
  commands/
    init.ts           # fooshop init
    products.ts       # fooshop products add|list|edit|delete
    orders.ts         # fooshop orders list
    analytics.ts      # fooshop analytics
    config.ts         # fooshop config (command, not lib/config.ts)
    open.ts           # fooshop open (command, not lib/open.ts)
  lib/
    api.ts            # HTTP client with auth
    format.ts         # Chalk helpers, table builder, spinner wrapper

src/app/api/orders/route.ts   # New backend endpoint
```

### Modified files

- `cli/src/index.ts` — register 6 new commands
- `cli/package.json` — add new dependencies

### New dependencies

| Package | Purpose |
|---------|---------|
| chalk | Colored terminal output |
| ora | Async spinners |
| cli-table3 | Formatted tables |
| @inquirer/prompts | Interactive input prompts |

## Shared Libraries

### `lib/api.ts` — HTTP Client

Wrapper around `fetch` centralizing auth, base URL, and error handling.

**Interface:**
```typescript
api.get(path: string): Promise<T>
api.post(path: string, body: object): Promise<T>
api.put(path: string, body: object): Promise<T>
api.del(path: string): Promise<T>
```

**Behavior:**
- Reads API key from `getApiKey()`. If null, prints "Not logged in. Run `fooshop login` first." and exits with code 1.
- Sets `Authorization: Bearer <key>` on every request.
- Base URL from `getBaseUrl()`.
- Content-Type: `application/json`.
- On non-ok response (4xx/5xx): parses JSON body, prints server error message in red, exits with code 1.
- On network error: prints "Connection failed. Check your internet or try again.", exits with code 1.

### `lib/format.ts` — Output Helpers

```typescript
spinner(text: string): Ora         // wrapper on ora
successMsg(text: string): void     // chalk.green("✓ " + text)
errorMsg(text: string): void       // chalk.red("✗ " + text)
table(headers: string[], rows: string[][]): string  // cli-table3 formatted
formatPrice(cents: number): string // cents → "$X.XX"
```

## Commands

### `fooshop init`

1. Verify auth (API key present, else "Run `fooshop login` first")
2. Prompt: "What are you selling?" (single free-text input)
3. Spinner: "Generating your store..."
4. `POST /api/store/generate` with `{ description: answer }`
5. Display result: store name, tagline, slug, suggested products
6. Prompt: "Connect Stripe for payments?" (confirm y/n)
   - Yes: open browser to `{baseUrl}/dashboard/settings`, message "Complete Stripe setup in browser"
   - No: skip, message "You can connect Stripe later with `fooshop config`"
7. Output: `✓ Your store is live → https://fooshop.ai/<slug>`

### `fooshop products add`

Sequential prompts (one at a time):
1. "Product name:" (text input)
2. "Price (USD):" (text input, numeric validation, converted to cents)
3. "Description:" (text input)
4. "Category:" (select from supported categories)
5. "Product file path:" (text input, file existence validation)
6. "Cover image path (optional):" (text input, skip if empty)
7. Upload file: `POST /api/upload` for presigned URL, then `PUT` to R2 (spinner)
8. Upload cover if present (same flow)
9. `POST /api/products` with all data, status: `published`
10. Output: `✓ Product created → https://fooshop.ai/<store-slug>/<product-slug>`

### `fooshop products list`

1. `GET /api/products?mine=true`
2. Table: Name | Price | Status | URL
3. If no products: "No products yet. Create one with `fooshop products add`"
4. `--json` flag: raw JSON output

### `fooshop products edit <slug>`

1. `GET /api/products?mine=true`, find by slug
2. Show current values
3. Prompt for each field (pre-filled with current value, enter to keep)
4. `PUT /api/products/[id]` with changed fields only
5. Output: `✓ Product updated`

### `fooshop products delete <slug>`

1. `GET /api/products?mine=true`, find by slug
2. Show name and price
3. Confirm prompt: "Delete <name>? This cannot be undone." (y/n)
4. `DELETE /api/products/[id]`
5. Output: `✓ Product deleted`

### `fooshop orders list`

1. `GET /api/orders` (new endpoint)
2. Table: Date | Product | Amount | Buyer email
3. `--last 7d|30d|90d` flag: query param `period`
4. `--json` flag: raw JSON output
5. If no orders: "No orders yet."

### `fooshop analytics`

1. `GET /api/analytics?period=30d`
2. Display KPIs: Revenue | Orders | Conversion | Page views (with change %)
3. Top products table (top 5)
4. Traffic sources table
5. `--period 7d|30d|90d|all` flag
6. `--json` flag: raw JSON output

### `fooshop config`

No arguments — shows current config:
```
Email:    user@example.com
API URL:  https://fooshop.ai
Stripe:   Connected / Not connected
Store:    https://fooshop.ai/my-store
```
Reads email/baseUrl from local config, store/stripe info from `GET /api/store`.

### `fooshop open`

1. Read store slug from `GET /api/store`
2. Open `https://fooshop.ai/<slug>` in browser
3. Output: `✓ Opening https://fooshop.ai/<slug>`

## New Backend Endpoint

### `GET /api/orders`

**Auth:** API key with scope `orders:read`

**Query params:**
- `period` — `7d`, `30d`, `90d`, `all` (default: `all`)

**Response:**
```json
{
  "orders": [
    {
      "id": "uuid",
      "createdAt": "2026-03-15T...",
      "productTitle": "My Template",
      "amountCents": 2900,
      "platformFeeCents": 232,
      "currency": "usd",
      "buyerEmail": "buyer@example.com",
      "status": "completed"
    }
  ]
}
```

**Implementation:** Join `orders` with `products`, filter by `creatorId` from auth token. Period filter via `WHERE createdAt >= NOW() - interval`. Ordered by `createdAt DESC`.

## `--json` Flag

Global option on `program` in `index.ts`. Commands that support it (`products list`, `orders list`, `analytics`) check `program.opts().json` — if true, output `JSON.stringify(data, null, 2)` and skip table/formatting.

## Testing Strategy

**Unit tests for libs:**
- `lib/api.ts` — mock fetch, test auth header injection, error handling, exit on 401
- `lib/format.ts` — test formatPrice, table output

**Integration tests for commands:**
- `commands/init.ts` — mock api + @inquirer/prompts, verify full flow
- `commands/products.ts` — mock api, test add/list/edit/delete
- `commands/orders.ts` — mock api, test list + period filter
- `commands/analytics.ts` — mock api, test KPI output

**Backend test:**
- `GET /api/orders` — test with existing API route test patterns

**Mocking approach:** Mock `@inquirer/prompts` with `vi.mock()` to simulate user input. Mock `ora` to avoid spinner output in tests. Same strategy as existing `login.test.ts`.

## Out of Scope

- Progress bar for file uploads (YAGNI)
- `fooshop products add --file` non-interactive mode (future)
- API key management commands (separate issue)
- Coupons/referrals CLI commands (separate issue)
