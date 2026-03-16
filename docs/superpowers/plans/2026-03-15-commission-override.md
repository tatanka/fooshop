# Commission Override Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow early-bird creators to have a custom commission rate (e.g. 0%) for a defined period, managed via a Claude Code CLI skill.

**Architecture:** Two nullable columns on `creators` table control override. `calculatePlatformFee()` gains an optional creator parameter. Webhook reads fee from Stripe session instead of recalculating. Dashboard shows a banner when override is active. A `/creators` CLI skill wraps a Node.js admin script for management.

**Tech Stack:** Drizzle ORM (schema + migration), TypeScript, Next.js App Router, Vitest (unit tests), Claude Code skill (SKILL.md)

---

## File Structure

| Action | File | Responsibility |
|--------|------|----------------|
| Modify | `src/db/schema.ts` | Add two nullable columns to `creators` |
| Modify | `src/lib/stripe.ts` | Update `calculatePlatformFee` with optional creator param |
| Modify | `src/app/api/checkout/route.ts` | Pass creator override fields to fee calculation |
| Modify | `src/app/api/stripe/webhook/route.ts` | Read `application_fee_amount` from Stripe payment intent |
| Modify | `src/app/(platform)/dashboard/page.tsx` | Add promotion banner |
| Create | `src/scripts/creators-admin.ts` | CLI admin script for creator management |
| Create | `src/lib/commission.ts` | Helper to check if override is active (shared by dashboard + fee calc) |
| Create | `.claude/skills/creators/SKILL.md` | Claude Code skill definition |
| Create | `src/lib/__tests__/commission.test.ts` | Unit tests for commission logic |
| Modify | `src/scripts/seed.ts` | Add override fields to one seed creator |

---

## Chunk 1: Core Logic

### Task 1: Schema — Add override columns to creators

**Files:**
- Modify: `src/db/schema.ts:133-149`

- [ ] **Step 1: Add two nullable columns to creators table**

In `src/db/schema.ts`, add to the `creators` table definition (after `storeTheme` field, before `createdAt`):

```ts
commissionOverridePercent: integer("commission_override_percent"),
commissionOverrideExpiresAt: timestamp("commission_override_expires_at", { withTimezone: true }),
```

- [ ] **Step 2: Generate and push migration**

Run: `pnpm drizzle-kit generate`
Expected: New migration file created in drizzle output directory.

Run: `pnpm drizzle-kit push`
Expected: Schema pushed successfully, two new nullable columns on `creators`.

- [ ] **Step 3: Verify with build**

Run: `pnpm build`
Expected: Build succeeds (nullable columns don't break existing code).

- [ ] **Step 4: Commit**

```bash
git add src/db/schema.ts drizzle/
git commit -m "feat(schema): add commission override columns to creators (#45)"
```

---

### Task 2: Commission helper — isOverrideActive + fee calculation

**Files:**
- Create: `src/lib/commission.ts`
- Create: `src/lib/__tests__/commission.test.ts`
- Modify: `src/lib/stripe.ts`

- [ ] **Step 1: Create vitest config for unit tests**

Check if a `vitest.config.ts` (not smoke) exists. If not, create `vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    include: ["src/**/__tests__/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
});
```

Add `"test"` script to `package.json`:

```json
"test": "vitest run",
```

- [ ] **Step 2: Write failing tests for commission logic**

Create `src/lib/__tests__/commission.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { isOverrideActive, getEffectiveCommissionPercent } from "../commission";

describe("isOverrideActive", () => {
  it("returns false when override percent is null", () => {
    expect(isOverrideActive(null, null)).toBe(false);
  });

  it("returns true when override is set with no expiry", () => {
    expect(isOverrideActive(0, null)).toBe(true);
  });

  it("returns true when override is set and expiry is in the future", () => {
    const future = new Date(Date.now() + 86400000);
    expect(isOverrideActive(0, future)).toBe(true);
  });

  it("returns false when override is set but expired", () => {
    const past = new Date(Date.now() - 86400000);
    expect(isOverrideActive(0, past)).toBe(false);
  });

  it("returns true for non-zero override percent", () => {
    expect(isOverrideActive(3, null)).toBe(true);
  });
});

describe("getEffectiveCommissionPercent", () => {
  it("returns default 5 when no creator provided", () => {
    expect(getEffectiveCommissionPercent()).toBe(5);
  });

  it("returns default 5 when override is null", () => {
    expect(getEffectiveCommissionPercent({
      commissionOverridePercent: null,
      commissionOverrideExpiresAt: null,
    })).toBe(5);
  });

  it("returns 0 when active 0% override", () => {
    expect(getEffectiveCommissionPercent({
      commissionOverridePercent: 0,
      commissionOverrideExpiresAt: null,
    })).toBe(0);
  });

  it("returns default 5 when override is expired", () => {
    const past = new Date(Date.now() - 86400000);
    expect(getEffectiveCommissionPercent({
      commissionOverridePercent: 0,
      commissionOverrideExpiresAt: past,
    })).toBe(5);
  });

  it("returns custom percent when active", () => {
    const future = new Date(Date.now() + 86400000);
    expect(getEffectiveCommissionPercent({
      commissionOverridePercent: 2,
      commissionOverrideExpiresAt: future,
    })).toBe(2);
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `pnpm test`
Expected: FAIL — module `../commission` not found.

- [ ] **Step 4: Implement commission helper**

Create `src/lib/commission.ts`:

```ts
const DEFAULT_COMMISSION_PERCENT = 5;

export type CommissionOverride = {
  commissionOverridePercent: number | null;
  commissionOverrideExpiresAt: Date | null;
};

export function isOverrideActive(
  percent: number | null,
  expiresAt: Date | null
): boolean {
  if (percent === null) return false;
  if (expiresAt === null) return true;
  return expiresAt > new Date();
}

export function getEffectiveCommissionPercent(
  creator?: CommissionOverride
): number {
  if (!creator) return DEFAULT_COMMISSION_PERCENT;
  if (isOverrideActive(creator.commissionOverridePercent, creator.commissionOverrideExpiresAt)) {
    return creator.commissionOverridePercent!;
  }
  return DEFAULT_COMMISSION_PERCENT;
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `pnpm test`
Expected: All 10 tests PASS.

- [ ] **Step 6: Update calculatePlatformFee to use commission helper**

In `src/lib/stripe.ts`, replace:

```ts
const PLATFORM_FEE_PERCENT = 5;

export function calculatePlatformFee(amountCents: number): number {
  return Math.round((amountCents * PLATFORM_FEE_PERCENT) / 100);
}
```

With:

```ts
import { getEffectiveCommissionPercent, type CommissionOverride } from "./commission";

export function calculatePlatformFee(
  amountCents: number,
  creator?: CommissionOverride
): number {
  const percent = getEffectiveCommissionPercent(creator);
  return Math.round((amountCents * percent) / 100);
}
```

- [ ] **Step 7: Run tests + build to verify nothing breaks**

Run: `pnpm test && pnpm build`
Expected: Tests pass, build succeeds. Existing callers still work (creator param is optional).

- [ ] **Step 8: Commit**

```bash
git add src/lib/commission.ts src/lib/__tests__/commission.test.ts src/lib/stripe.ts vitest.config.ts package.json
git commit -m "feat: add commission override logic with tests (#45)"
```

---

### Task 3: Update checkout route to pass creator override

**Files:**
- Modify: `src/app/api/checkout/route.ts:121`

- [ ] **Step 1: Pass creator to calculatePlatformFee**

In `src/app/api/checkout/route.ts`, line 121, change:

```ts
const platformFee = calculatePlatformFee(finalPriceCents);
```

To:

```ts
const platformFee = calculatePlatformFee(finalPriceCents, creator);
```

The `creator` object is already fetched at line 21-25 and will include the new nullable fields from the schema change.

- [ ] **Step 2: Build to verify**

Run: `pnpm build`
Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/checkout/route.ts
git commit -m "feat(checkout): use commission override in fee calculation (#45)"
```

---

### Task 4: Update webhook to read fee from Stripe session

**Files:**
- Modify: `src/app/api/stripe/webhook/route.ts:43-56`

- [ ] **Step 1: Replace recalculated fee with Stripe's actual fee**

In `src/app/api/stripe/webhook/route.ts`, inside the transaction (around line 45-56), the order insert currently has:

```ts
platformFeeCents: calculatePlatformFee(session.amount_total!),
```

Replace with reading the actual fee from the Stripe payment intent:

```ts
// Read the actual application fee from Stripe (authoritative, set at checkout time)
const paymentIntent = await getStripe().paymentIntents.retrieve(
  session.payment_intent as string
);
const actualPlatformFee = paymentIntent.application_fee_amount ?? 0;
```

Move this BEFORE the transaction block (after the idempotency check, before `try`). Then update the insert:

```ts
platformFeeCents: actualPlatformFee,
```

- [ ] **Step 2: Remove unused calculatePlatformFee import**

In the same file, update the import from:

```ts
import { getStripe, calculatePlatformFee } from "@/lib/stripe";
```

To:

```ts
import { getStripe } from "@/lib/stripe";
```

- [ ] **Step 3: Build to verify**

Run: `pnpm build`
Expected: Build succeeds.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/stripe/webhook/route.ts
git commit -m "fix(webhook): read platform fee from Stripe payment intent (#45)

Instead of recalculating the fee (which could diverge with time-sensitive
commission overrides), read the authoritative application_fee_amount
from the Stripe payment intent."
```

---

## Chunk 2: Dashboard + CLI

### Task 5: Dashboard promotion banner

**Files:**
- Modify: `src/app/(platform)/dashboard/page.tsx:45-77`

- [ ] **Step 1: Add import for commission helper**

At the top of `src/app/(platform)/dashboard/page.tsx`, add:

```ts
import { isOverrideActive } from "@/lib/commission";
```

- [ ] **Step 2: Compute override status after creator fetch**

After line 24 (`if (!creator) redirect("/onboarding");`), add:

```ts
const hasActivePromotion = isOverrideActive(
  creator.commissionOverridePercent,
  creator.commissionOverrideExpiresAt
);
```

- [ ] **Step 3: Add banner JSX between Stripe CTA and quick actions**

After the Stripe CTA block (line 76, closing `</div>` + `})`), add:

```tsx
{/* Commission override banner */}
{hasActivePromotion && (
  <div className="mt-8 bg-green-50 border border-green-200 rounded-xl px-5 py-4 animate-fade-up stagger-4">
    <p className="text-green-800 font-semibold">
      {creator.commissionOverridePercent}% commission
      {creator.commissionOverrideExpiresAt && (
        <span className="font-normal text-green-700">
          {" "}— Your early-bird promotion is active until{" "}
          {new Date(creator.commissionOverrideExpiresAt).toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </span>
      )}
      {!creator.commissionOverrideExpiresAt && (
        <span className="font-normal text-green-700">
          {" "}— Your promotional rate is permanently active
        </span>
      )}
    </p>
  </div>
)}
```

- [ ] **Step 4: Build to verify**

Run: `pnpm build`
Expected: Build succeeds.

- [ ] **Step 5: Commit**

```bash
git add src/app/\(platform\)/dashboard/page.tsx
git commit -m "feat(dashboard): show commission override promotion banner (#45)"
```

---

### Task 6: CLI admin script

**Files:**
- Create: `src/scripts/creators-admin.ts`

- [ ] **Step 1: Create the admin script**

Create `src/scripts/creators-admin.ts`:

```ts
import "dotenv/config";
import { db } from "../db";
import { creators, products, orders } from "../db/schema";
import { eq, or, ilike, isNotNull, count } from "drizzle-orm";
import { isOverrideActive } from "../lib/commission";

type Creator = typeof creators.$inferSelect;

// ─── Helpers ────────────────────────────────────────────────────────────────

function parseDuration(duration: string): Date | null {
  const months: Record<string, number> = {
    "3months": 3,
    "6months": 6,
    "12months": 12,
  };
  if (duration === "permanent") return null;
  const m = months[duration];
  if (!m) {
    console.error(`Invalid duration: ${duration}. Use: 3months, 6months, 12months, permanent`);
    process.exit(1);
  }
  const date = new Date();
  date.setMonth(date.getMonth() + m);
  return date;
}

function formatCreator(c: Creator): string {
  const override = isOverrideActive(c.commissionOverridePercent, c.commissionOverrideExpiresAt)
    ? `${c.commissionOverridePercent}% until ${c.commissionOverrideExpiresAt?.toLocaleDateString() ?? "permanent"}`
    : "none";
  return [
    `  Name:       ${c.name}`,
    `  Email:      ${c.email}`,
    `  Slug:       ${c.slug}`,
    `  Store:      ${c.storeName ?? "(no store name)"}`,
    `  Stripe:     ${c.stripeConnectId ?? "(not connected)"}`,
    `  Override:   ${override}`,
    `  Created:    ${c.createdAt.toLocaleDateString()}`,
  ].join("\n");
}

async function findCreator(query: string): Promise<Creator> {
  const result = await db
    .select()
    .from(creators)
    .where(
      or(
        eq(creators.email, query),
        eq(creators.slug, query)
      )
    )
    .then((rows) => rows[0]);

  if (!result) {
    console.error(`Creator not found: ${query}`);
    process.exit(1);
  }
  return result;
}

// ─── Commands ───────────────────────────────────────────────────────────────

async function cmdSearch(query: string) {
  const results = await db
    .select()
    .from(creators)
    .where(
      or(
        ilike(creators.name, `%${query}%`),
        ilike(creators.email, `%${query}%`),
        ilike(creators.slug, `%${query}%`)
      )
    );

  if (results.length === 0) {
    console.log("No creators found.");
    return;
  }

  console.log(`Found ${results.length} creator(s):\n`);
  for (const c of results) {
    console.log(`- ${c.name} (${c.email}) — slug: ${c.slug}`);
  }
}

async function cmdInfo(query: string) {
  const c = await findCreator(query);

  const [productCount] = await db
    .select({ value: count() })
    .from(products)
    .where(eq(products.creatorId, c.id));

  const [orderCount] = await db
    .select({ value: count() })
    .from(orders)
    .where(eq(orders.creatorId, c.id));

  console.log(`Creator: ${c.name}\n`);
  console.log(formatCreator(c));
  console.log(`  Products:   ${productCount.value}`);
  console.log(`  Orders:     ${orderCount.value}`);
}

async function cmdSetCommission(query: string, percentStr: string, duration: string) {
  const percent = parseInt(percentStr, 10);
  if (isNaN(percent) || percent < 0 || percent > 100) {
    console.error("Percent must be an integer between 0 and 100.");
    process.exit(1);
  }

  const expiresAt = parseDuration(duration);
  const c = await findCreator(query);

  await db
    .update(creators)
    .set({
      commissionOverridePercent: percent,
      commissionOverrideExpiresAt: expiresAt,
    })
    .where(eq(creators.id, c.id));

  const expiryLabel = expiresAt ? expiresAt.toLocaleDateString() : "permanent";
  console.log(`Set ${percent}% commission for ${c.name} (${c.email}), expires: ${expiryLabel}`);
}

async function cmdRemoveCommission(query: string) {
  const c = await findCreator(query);

  await db
    .update(creators)
    .set({
      commissionOverridePercent: null,
      commissionOverrideExpiresAt: null,
    })
    .where(eq(creators.id, c.id));

  console.log(`Removed commission override for ${c.name} (${c.email}). Back to default 5%.`);
}

async function cmdListOverrides() {
  const results = await db
    .select()
    .from(creators)
    .where(isNotNull(creators.commissionOverridePercent));

  const active = results.filter((c) => isOverrideActive(c.commissionOverridePercent, c.commissionOverrideExpiresAt));

  if (active.length === 0) {
    console.log("No active commission overrides.");
    return;
  }

  console.log(`${active.length} active override(s):\n`);
  for (const c of active) {
    const expiry = c.commissionOverrideExpiresAt?.toLocaleDateString() ?? "permanent";
    console.log(`- ${c.name} (${c.email}): ${c.commissionOverridePercent}% until ${expiry}`);
  }
}

// ─── Main ───────────────────────────────────────────────────────────────────

const [command, ...args] = process.argv.slice(2);

const commands: Record<string, () => Promise<void>> = {
  search: () => cmdSearch(args[0]),
  info: () => cmdInfo(args[0]),
  "set-commission": () => cmdSetCommission(args[0], args[1], args[2]),
  "remove-commission": () => cmdRemoveCommission(args[0]),
  "list-overrides": () => cmdListOverrides(),
};

if (!command || !commands[command]) {
  console.log("Usage:");
  console.log("  creators-admin search <query>");
  console.log("  creators-admin info <email-or-slug>");
  console.log("  creators-admin set-commission <email-or-slug> <percent> <duration>");
  console.log("  creators-admin remove-commission <email-or-slug>");
  console.log("  creators-admin list-overrides");
  console.log("\nDurations: 3months, 6months, 12months, permanent");
  process.exit(command ? 1 : 0);
}

commands[command]()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Error:", err);
    process.exit(1);
  });
```

- [ ] **Step 2: Add npm script**

In `package.json`, add to `scripts`:

```json
"creators-admin": "tsx src/scripts/creators-admin.ts"
```

- [ ] **Step 3: Verify script runs**

Run: `pnpm creators-admin`
Expected: Prints usage help and exits with code 0.

- [ ] **Step 4: Commit**

```bash
git add src/scripts/creators-admin.ts package.json
git commit -m "feat: add creators-admin CLI script (#45)"
```

---

### Task 7: Claude Code /creators skill

**Files:**
- Create: `.claude/skills/creators/SKILL.md`

- [ ] **Step 1: Create skill definition**

Create `.claude/skills/creators/SKILL.md`:

```markdown
---
name: creators
description: Admin CLI for managing creators. Search, view details, set/remove commission overrides. Use when needing to manage creator accounts or early-bird promotions.
---

# Creators Admin

Manage creator accounts and commission overrides via the CLI.

**Arguments:** `$ARGUMENTS` contains the subcommand and arguments.

## Commands

### Search creators
`/creators search <query>` — Search by name, email, or slug.

Run: `pnpm creators-admin search <query>`

### View creator details
`/creators info <email-or-slug>` — Show full creator details including products, orders, and commission override status.

Run: `pnpm creators-admin info <email-or-slug>`

### Set commission override
`/creators set-commission <email-or-slug> <percent> <duration>` — Set a commission override.

- `percent`: 0-100 (0 = no commission)
- `duration`: `3months`, `6months`, `12months`, or `permanent`

Run: `pnpm creators-admin set-commission <email-or-slug> <percent> <duration>`

### Remove commission override
`/creators remove-commission <email-or-slug>` — Remove override, revert to default 5%.

Run: `pnpm creators-admin remove-commission <email-or-slug>`

### List active overrides
`/creators list-overrides` — Show all creators with active commission overrides.

Run: `pnpm creators-admin list-overrides`

## Argument Parsing

Parse `$ARGUMENTS` to extract the subcommand and arguments. Examples:

- `search alice` → `pnpm creators-admin search alice`
- `set-commission alice@example.org 0 6months` → `pnpm creators-admin set-commission alice@example.org 0 6months`
- `info bob-demo` → `pnpm creators-admin info bob-demo`

If `$ARGUMENTS` is empty, run `pnpm creators-admin` to show usage help.
```

- [ ] **Step 2: Commit**

```bash
git add .claude/skills/creators/SKILL.md
git commit -m "feat: add /creators Claude Code skill (#45)"
```

---

### Task 8: Update seed data + final verification

**Files:**
- Modify: `src/scripts/seed.ts:45-63`

- [ ] **Step 1: Add commission override to first seed creator**

In `src/scripts/seed.ts`, update Alice's creator entry (first item in `seedCreators` array) to include:

```ts
commissionOverridePercent: 0,
commissionOverrideExpiresAt: new Date("2026-09-15T00:00:00Z"),
```

This gives Alice a 0% override until September 15, 2026 for testing the dashboard banner.

- [ ] **Step 2: Run build**

Run: `pnpm build`
Expected: Build succeeds.

- [ ] **Step 3: Run all tests**

Run: `pnpm test`
Expected: All commission tests pass.

- [ ] **Step 4: Commit**

```bash
git add src/scripts/seed.ts
git commit -m "feat(seed): add commission override to seed creator for testing (#45)"
```
