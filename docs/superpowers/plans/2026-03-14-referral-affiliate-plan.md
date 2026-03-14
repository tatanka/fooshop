# Referral Affiliate System Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a referral/affiliate tracking system where creators generate referral codes for affiliates, track clicks and conversions, and view commission analytics in the dashboard.

**Architecture:** Two new DB tables (`referrals`, `referral_conversions`) following existing coupon patterns. CRUD API endpoints for referral management. Checkout route and webhook modified to capture and record referral attribution. Client-side localStorage persistence for referral codes with 30-day TTL. Dashboard pages mirroring the coupon UI structure.

**Tech Stack:** Next.js App Router, Drizzle ORM, PostgreSQL, TypeScript, Tailwind CSS

**Spec:** `docs/superpowers/specs/2026-03-13-referral-affiliate-design.md`

---

## File Structure

**Create:**
- `src/lib/referral.ts` — Referral code generation utility
- `src/app/api/referrals/route.ts` — GET (list with stats) + POST (create)
- `src/app/api/referrals/[id]/route.ts` — PUT (update) + DELETE (delete/deactivate)
- `src/app/api/referrals/track/route.ts` — GET (click tracking, public)
- `src/components/referral-tracker.tsx` — Client component: captures `?ref=` from URL, saves to localStorage, fires track API
- `src/components/referral-toggle.tsx` — Client component: active/inactive toggle for dashboard table
- `src/components/copy-referral-link.tsx` — Client component: copy referral link to clipboard
- `src/app/(platform)/dashboard/referrals/page.tsx` — Referral list page
- `src/app/(platform)/dashboard/referrals/new/page.tsx` — New referral form

**Modify:**
- `src/db/schema.ts` — Add `referrals` and `referralConversions` tables
- `src/app/api/checkout/route.ts` — Add `referralCode` handling (soft failure)
- `src/app/api/stripe/webhook/route.ts` — Add referral conversion creation inside transaction
- `src/components/buy-button.tsx` — Read referral code from localStorage, pass to checkout
- `src/app/[slug]/page.tsx` — Add `ReferralTracker` component
- `src/app/[slug]/[productSlug]/page.tsx` — Add `ReferralTracker` component
- `src/app/(platform)/dashboard/page.tsx` — Add "Referrals" quick action link
- `src/app/(platform)/dashboard/orders/page.tsx` — Show referral affiliate name and commission on orders

---

## Chunk 1: Data Model + Utilities

### Task 1: Add referrals and referral_conversions tables to schema

**Files:**
- Modify: `src/db/schema.ts:240-251` (after `buyIntents` table)

- [ ] **Step 1: Add the referrals table to schema.ts**

Add after the `buyIntents` table definition (line 251):

```typescript
export const referrals = pgTable("referrals", {
  id: uuid("id").primaryKey().defaultRandom(),
  creatorId: uuid("creator_id")
    .notNull()
    .references(() => creators.id),
  code: text("code").notNull(), // Application layer must .toUpperCase().trim() before save/lookup
  affiliateName: text("affiliate_name").notNull(),
  affiliateEmail: text("affiliate_email"),
  productId: uuid("product_id").references(() => products.id),
  commissionPercent: integer("commission_percent").notNull(),
  clickCount: integer("click_count").notNull().default(0),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
}, (table) => ({
  uniqueCreatorCode: unique().on(table.creatorId, table.code),
}));

export const referralConversions = pgTable("referral_conversions", {
  id: uuid("id").primaryKey().defaultRandom(),
  referralId: uuid("referral_id")
    .notNull()
    .references(() => referrals.id),
  orderId: uuid("order_id")
    .notNull()
    .unique()
    .references(() => orders.id),
  commissionCents: integer("commission_cents").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});
```

- [ ] **Step 2: Verify build**

Run: `pnpm build`
Expected: Build succeeds. New tables are defined but not yet pushed to DB.

- [ ] **Step 3: Generate migration**

Run: `pnpm drizzle-kit generate`
Expected: Migration file generated for the two new tables.

- [ ] **Step 4: Push schema to dev database**

Run: `pnpm drizzle-kit push`
Expected: Tables `referrals` and `referral_conversions` created in database.

- [ ] **Step 5: Commit**

```bash
git add src/db/schema.ts drizzle/
git commit -m "feat: add referrals and referral_conversions tables"
```

---

### Task 2: Create referral utility library

**Files:**
- Create: `src/lib/referral.ts`

Reference: `src/lib/coupon.ts` — same pattern for code generation.

- [ ] **Step 1: Create src/lib/referral.ts**

```typescript
const REFERRAL_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generateReferralCode(): string {
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += REFERRAL_CHARS[Math.floor(Math.random() * REFERRAL_CHARS.length)];
  }
  return code;
}
```

- [ ] **Step 2: Verify build**

Run: `pnpm build`
Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/lib/referral.ts
git commit -m "feat: add referral code generation utility"
```

---

## Chunk 2: API Endpoints (CRUD + Track)

### Task 3: Create referrals CRUD API (GET + POST)

**Files:**
- Create: `src/app/api/referrals/route.ts`

Reference: `src/app/api/coupons/route.ts` — identical auth/creator pattern.

- [ ] **Step 1: Create src/app/api/referrals/route.ts**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { creators, referrals, referralConversions, products } from "@/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { generateReferralCode } from "@/lib/referral";

export async function GET() {
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
    return NextResponse.json({ error: "Creator not found" }, { status: 404 });
  }

  const rows = await db
    .select({
      referral: referrals,
      productTitle: products.title,
      conversions: sql<number>`count(${referralConversions.id})::int`,
      totalCommissionCents: sql<number>`coalesce(sum(${referralConversions.commissionCents}), 0)::int`,
    })
    .from(referrals)
    .leftJoin(products, eq(referrals.productId, products.id))
    .leftJoin(referralConversions, eq(referrals.id, referralConversions.referralId))
    .where(eq(referrals.creatorId, creator.id))
    .groupBy(referrals.id, products.title)
    .orderBy(desc(referrals.createdAt));

  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
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
    return NextResponse.json({ error: "Creator not found" }, { status: 404 });
  }

  const body = await req.json();
  const { code, affiliateName, affiliateEmail, productId, commissionPercent } = body;

  // Validate required fields
  if (!affiliateName || typeof affiliateName !== "string" || !affiliateName.trim()) {
    return NextResponse.json(
      { error: "Affiliate name is required" },
      { status: 400 }
    );
  }

  if (
    commissionPercent === undefined ||
    commissionPercent === null ||
    typeof commissionPercent !== "number" ||
    !Number.isInteger(commissionPercent) ||
    commissionPercent < 1 ||
    commissionPercent > 100
  ) {
    return NextResponse.json(
      { error: "Commission must be an integer between 1 and 100" },
      { status: 400 }
    );
  }

  // Validate product belongs to creator (if provided)
  if (productId) {
    const product = await db
      .select({ id: products.id })
      .from(products)
      .where(and(eq(products.id, productId), eq(products.creatorId, creator.id)))
      .then((rows) => rows[0]);

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }
  }

  const finalCode = (code || generateReferralCode()).toUpperCase().trim();

  try {
    const [referral] = await db
      .insert(referrals)
      .values({
        creatorId: creator.id,
        code: finalCode,
        affiliateName: affiliateName.trim(),
        affiliateEmail: affiliateEmail?.trim() || null,
        productId: productId || null,
        commissionPercent,
      })
      .returning();

    return NextResponse.json(referral, { status: 201 });
  } catch (err) {
    if (err instanceof Error && err.message.includes("unique")) {
      return NextResponse.json(
        { error: "A referral with this code already exists" },
        { status: 409 }
      );
    }
    throw err;
  }
}
```

- [ ] **Step 2: Verify build**

Run: `pnpm build`
Expected: Build succeeds with new API route.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/referrals/route.ts
git commit -m "feat: add referrals GET/POST API endpoints"
```

---

### Task 4: Create referrals PUT/DELETE API

**Files:**
- Create: `src/app/api/referrals/[id]/route.ts`

Reference: `src/app/api/coupons/[id]/route.ts` — same auth + ownership check pattern.

- [ ] **Step 1: Create src/app/api/referrals/[id]/route.ts**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { creators, referrals, referralConversions } from "@/db/schema";
import { eq, and } from "drizzle-orm";

interface Props {
  params: Promise<{ id: string }>;
}

export async function PUT(req: NextRequest, { params }: Props) {
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
    return NextResponse.json({ error: "Creator not found" }, { status: 404 });
  }

  const { id } = await params;
  const body = await req.json();

  const allowedFields: Record<string, unknown> = {};
  if (body.affiliateName !== undefined) allowedFields.affiliateName = body.affiliateName.trim();
  if (body.affiliateEmail !== undefined) allowedFields.affiliateEmail = body.affiliateEmail?.trim() || null;
  if (body.commissionPercent !== undefined) {
    if (
      typeof body.commissionPercent !== "number" ||
      !Number.isInteger(body.commissionPercent) ||
      body.commissionPercent < 1 ||
      body.commissionPercent > 100
    ) {
      return NextResponse.json(
        { error: "Commission must be an integer between 1 and 100" },
        { status: 400 }
      );
    }
    allowedFields.commissionPercent = body.commissionPercent;
  }
  if (body.active !== undefined) allowedFields.active = body.active;
  if (body.productId !== undefined) allowedFields.productId = body.productId || null;

  if (Object.keys(allowedFields).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  const updated = await db
    .update(referrals)
    .set(allowedFields)
    .where(and(eq(referrals.id, id), eq(referrals.creatorId, creator.id)))
    .returning();

  if (updated.length === 0) {
    return NextResponse.json({ error: "Referral not found" }, { status: 404 });
  }

  return NextResponse.json(updated[0]);
}

export async function DELETE(req: NextRequest, { params }: Props) {
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
    return NextResponse.json({ error: "Creator not found" }, { status: 404 });
  }

  const { id } = await params;

  // Check if referral has conversions
  const hasConversions = await db
    .select({ id: referralConversions.id })
    .from(referralConversions)
    .where(eq(referralConversions.referralId, id))
    .limit(1)
    .then((rows) => rows.length > 0);

  if (hasConversions) {
    // Deactivate instead of deleting
    const updated = await db
      .update(referrals)
      .set({ active: false })
      .where(and(eq(referrals.id, id), eq(referrals.creatorId, creator.id)))
      .returning();

    if (updated.length === 0) {
      return NextResponse.json({ error: "Referral not found" }, { status: 404 });
    }

    return NextResponse.json({
      ...updated[0],
      _note: "Referral deactivated (has conversion history)",
    });
  }

  const deleted = await db
    .delete(referrals)
    .where(and(eq(referrals.id, id), eq(referrals.creatorId, creator.id)))
    .returning();

  if (deleted.length === 0) {
    return NextResponse.json({ error: "Referral not found" }, { status: 404 });
  }

  return NextResponse.json({ deleted: true });
}
```

- [ ] **Step 2: Verify build**

Run: `pnpm build`
Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/referrals/[id]/route.ts
git commit -m "feat: add referrals PUT/DELETE API endpoints"
```

---

### Task 5: Create click tracking API endpoint

**Files:**
- Create: `src/app/api/referrals/track/route.ts`

- [ ] **Step 1: Create src/app/api/referrals/track/route.ts**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { referrals } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");

  if (!code) {
    return NextResponse.json({ error: "Code required" }, { status: 400 });
  }

  const normalizedCode = code.toUpperCase().trim();

  // Atomic increment of click count
  const updated = await db
    .update(referrals)
    .set({ clickCount: sql`${referrals.clickCount} + 1` })
    .where(
      and(
        eq(referrals.code, normalizedCode),
        eq(referrals.active, true)
      )
    )
    .returning({ id: referrals.id });

  if (updated.length === 0) {
    // Soft failure: code not found or inactive, just return ok
    return NextResponse.json({ tracked: false });
  }

  return NextResponse.json({ tracked: true });
}
```

- [ ] **Step 2: Verify build**

Run: `pnpm build`
Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/referrals/track/route.ts
git commit -m "feat: add referral click tracking endpoint"
```

---

## Chunk 3: Checkout + Webhook Integration

### Task 6: Modify checkout route to handle referral codes

**Files:**
- Modify: `src/app/api/checkout/route.ts`

Key principle: **soft failure** — invalid referral codes are silently ignored. The checkout proceeds without referral attribution.

- [ ] **Step 1: Add referrals import and referralCode extraction**

In `src/app/api/checkout/route.ts`, add `referrals` to the schema import (line 5) and extract `referralCode` from the request body (line 9).

At line 5, change:
```typescript
import { products, creators, coupons } from "@/db/schema";
```
to:
```typescript
import { products, creators, coupons, referrals } from "@/db/schema";
```

At line 9, change:
```typescript
  const { productId, couponCode, source } = await req.json();
```
to:
```typescript
  const { productId, couponCode, referralCode, source } = await req.json();
```

- [ ] **Step 2: Add referral validation after coupon validation**

After the coupon validation block (after line 95, before `const platformFee`), add:

```typescript
  // Referral validation (soft failure — invalid codes are silently ignored)
  let referralId: string | null = null;

  if (referralCode) {
    const referral = await db
      .select()
      .from(referrals)
      .where(
        and(
          eq(referrals.creatorId, product.creatorId),
          eq(referrals.code, referralCode.toUpperCase().trim()),
          eq(referrals.active, true)
        )
      )
      .then((rows) => rows[0]);

    if (referral) {
      // If per-product, verify productId matches
      if (!referral.productId || referral.productId === productId) {
        referralId = referral.id;
      }
    }
  }
```

- [ ] **Step 3: Add referralId to Stripe metadata**

In the metadata object of the checkout session (around line 122), change:
```typescript
        ...(couponId && { couponId }),
```
to:
```typescript
        ...(couponId && { couponId }),
        ...(referralId && { referralId }),
```

- [ ] **Step 4: Verify build**

Run: `pnpm build`
Expected: Build succeeds.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/checkout/route.ts
git commit -m "feat: add referral code handling to checkout route"
```

---

### Task 7: Modify webhook to create referral conversions

**Files:**
- Modify: `src/app/api/stripe/webhook/route.ts`

- [ ] **Step 1: Add referral imports**

At line 5, change:
```typescript
import { orders, downloadTokens, products, creators } from "@/db/schema";
```
to:
```typescript
import { orders, downloadTokens, products, creators, referrals, referralConversions } from "@/db/schema";
```

- [ ] **Step 2: Extract referralId from metadata**

At line 25, change:
```typescript
    const { productId, creatorId, couponId } = session.metadata!;
```
to:
```typescript
    const { productId, creatorId, couponId, referralId } = session.metadata!;
```

- [ ] **Step 3: Add referral conversion inside the transaction**

Inside the `db.transaction` block, after the `downloadTokens` insert (after line 62, before `return [order]`), add:

```typescript
        // Create referral conversion if applicable
        if (referralId) {
          const referral = await tx
            .select({ commissionPercent: referrals.commissionPercent })
            .from(referrals)
            .where(eq(referrals.id, referralId))
            .then((rows) => rows[0]);

          if (referral) {
            const commissionCents = Math.round(
              session.amount_total! * referral.commissionPercent / 100
            );

            if (commissionCents > 0) {
              await tx.insert(referralConversions).values({
                referralId,
                orderId: order.id,
                commissionCents,
              });
            }
          }
        }
```

- [ ] **Step 4: Verify build**

Run: `pnpm build`
Expected: Build succeeds.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/stripe/webhook/route.ts
git commit -m "feat: create referral conversions in webhook transaction"
```

---

## Chunk 4: Frontend Components

### Task 8: Create ReferralTracker component

**Files:**
- Create: `src/components/referral-tracker.tsx`

This client component captures `?ref=CODE` from the URL, saves to localStorage with 30-day TTL, and fires the track API.

- [ ] **Step 1: Create src/components/referral-tracker.tsx**

```typescript
"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";

const STORAGE_KEY = "fooshop_ref";
const TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export function ReferralTracker() {
  const searchParams = useSearchParams();

  useEffect(() => {
    const ref = searchParams.get("ref");
    if (!ref) return;

    const code = ref.toUpperCase().trim();

    // Save to localStorage with TTL (last-click wins)
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ code, timestamp: Date.now() })
    );

    // Fire click tracking (fire-and-forget)
    fetch(`/api/referrals/track?code=${encodeURIComponent(code)}`).catch(
      () => {}
    );
  }, [searchParams]);

  return null;
}

/** Read the stored referral code, checking TTL. Returns null if expired or absent. */
export function getStoredReferralCode(): string | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const { code, timestamp } = JSON.parse(raw);
    if (Date.now() - timestamp > TTL_MS) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }

    return code;
  } catch {
    return null;
  }
}
```

- [ ] **Step 2: Verify build**

Run: `pnpm build`
Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/components/referral-tracker.tsx
git commit -m "feat: add ReferralTracker component with localStorage persistence"
```

---

### Task 9: Add ReferralTracker to store and product pages

**Files:**
- Modify: `src/app/[slug]/page.tsx`
- Modify: `src/app/[slug]/[productSlug]/page.tsx`

- [ ] **Step 1: Add ReferralTracker to the store page**

In `src/app/[slug]/page.tsx`, add imports with the other imports at the top of the file:
```typescript
import { Suspense } from "react";
import { ReferralTracker } from "@/components/referral-tracker";
```

Then inside the `<main>` element, right after the `<script type="application/ld+json">` tag and before `<StoreHero>`, add:
```typescript
        <Suspense fallback={null}>
          <ReferralTracker />
        </Suspense>
```

Note: `Suspense` wraps `ReferralTracker` because `useSearchParams()` requires it in Next.js App Router.

- [ ] **Step 2: Add ReferralTracker to the product page**

In `src/app/[slug]/[productSlug]/page.tsx`, add imports with the other imports at the top of the file:
```typescript
import { Suspense } from "react";
import { ReferralTracker } from "@/components/referral-tracker";
```

Then inside the `<main>` element, right after the `<script type="application/ld+json">` tag and before the store header `<a>` link, add:
```typescript
        <Suspense fallback={null}>
          <ReferralTracker />
        </Suspense>
```

- [ ] **Step 3: Verify build**

Run: `pnpm build`
Expected: Build succeeds.

- [ ] **Step 4: Commit**

```bash
git add src/app/[slug]/page.tsx src/app/[slug]/[productSlug]/page.tsx
git commit -m "feat: add referral tracking to store and product pages"
```

---

### Task 10: Modify BuyButton to pass referral code to checkout

**Files:**
- Modify: `src/components/buy-button.tsx`

- [ ] **Step 1: Import getStoredReferralCode**

At the top of `src/components/buy-button.tsx` (after line 2), add:
```typescript
import { getStoredReferralCode } from "@/components/referral-tracker";
```

- [ ] **Step 2: Pass referral code in checkout request**

In the `handleClick` function, where the body is built (around line 76-77), change:
```typescript
        const body: Record<string, string> = { productId };
        if (appliedCoupon) body.couponCode = appliedCoupon.code;
```
to:
```typescript
        const body: Record<string, string> = { productId };
        if (appliedCoupon) body.couponCode = appliedCoupon.code;
        const refCode = getStoredReferralCode();
        if (refCode) body.referralCode = refCode;
```

- [ ] **Step 3: Verify build**

Run: `pnpm build`
Expected: Build succeeds.

- [ ] **Step 4: Commit**

```bash
git add src/components/buy-button.tsx
git commit -m "feat: pass referral code from localStorage to checkout"
```

---

## Chunk 5: Dashboard UI

### Task 11: Create ReferralToggle component

**Files:**
- Create: `src/components/referral-toggle.tsx`

Reference: `src/components/coupon-toggle.tsx` — identical pattern, different API endpoint.

- [ ] **Step 1: Create src/components/referral-toggle.tsx**

```typescript
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface ReferralToggleProps {
  referralId: string;
  active: boolean;
}

export function ReferralToggle({ referralId, active: initialActive }: ReferralToggleProps) {
  const router = useRouter();
  const [active, setActive] = useState(initialActive);
  const [loading, setLoading] = useState(false);

  async function toggle() {
    setLoading(true);
    try {
      const res = await fetch(`/api/referrals/${referralId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !active }),
      });
      if (res.ok) {
        setActive(!active);
        router.refresh();
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors disabled:opacity-50 ${
        active ? "bg-green-500" : "bg-border"
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
          active ? "translate-x-6" : "translate-x-1"
        }`}
      />
    </button>
  );
}
```

- [ ] **Step 2: Verify build**

Run: `pnpm build`
Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/components/referral-toggle.tsx
git commit -m "feat: add ReferralToggle component"
```

---

### Task 12: Create CopyReferralLink component

**Files:**
- Create: `src/components/copy-referral-link.tsx`

- [ ] **Step 1: Create src/components/copy-referral-link.tsx**

```typescript
"use client";

import { useState } from "react";

interface CopyReferralLinkProps {
  url: string;
}

export function CopyReferralLink({ url }: CopyReferralLinkProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      onClick={handleCopy}
      className="text-xs text-muted hover:text-ink transition-colors underline"
    >
      {copied ? "Copied!" : "Copy link"}
    </button>
  );
}
```

- [ ] **Step 2: Verify build**

Run: `pnpm build`
Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/components/copy-referral-link.tsx
git commit -m "feat: add CopyReferralLink component"
```

---

### Task 13: Create referrals dashboard list page

**Files:**
- Create: `src/app/(platform)/dashboard/referrals/page.tsx`

Reference: `src/app/(platform)/dashboard/coupons/page.tsx` — same layout, table structure, auth pattern.

- [ ] **Step 1: Create src/app/(platform)/dashboard/referrals/page.tsx**

```typescript
export const dynamic = "force-dynamic";

import { auth } from "@/lib/auth";
import { db } from "@/db";
import { creators, referrals, referralConversions, products } from "@/db/schema";
import { eq, desc, sql } from "drizzle-orm";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ReferralToggle } from "@/components/referral-toggle";
import { CopyReferralLink } from "@/components/copy-referral-link";

export default async function ReferralsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/api/auth/signin");

  const creator = await db
    .select()
    .from(creators)
    .where(eq(creators.userId, session.user.id))
    .then((rows) => rows[0]);

  if (!creator) redirect("/onboarding");

  const rows = await db
    .select({
      id: referrals.id,
      code: referrals.code,
      affiliateName: referrals.affiliateName,
      affiliateEmail: referrals.affiliateEmail,
      productTitle: products.title,
      commissionPercent: referrals.commissionPercent,
      clickCount: referrals.clickCount,
      active: referrals.active,
      createdAt: referrals.createdAt,
      conversions: sql<number>`count(${referralConversions.id})::int`,
      totalCommissionCents: sql<number>`coalesce(sum(${referralConversions.commissionCents}), 0)::int`,
    })
    .from(referrals)
    .leftJoin(products, eq(referrals.productId, products.id))
    .leftJoin(referralConversions, eq(referrals.id, referralConversions.referralId))
    .where(eq(referrals.creatorId, creator.id))
    .groupBy(referrals.id, products.title)
    .orderBy(desc(referrals.createdAt));

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://fooshop.ai";

  return (
    <main className="max-w-5xl mx-auto px-4 py-16">
      <div className="flex justify-between items-center animate-fade-up">
        <div>
          <h1 className="text-3xl font-bold">Referrals</h1>
          <p className="text-muted mt-1">
            {rows.length} {rows.length === 1 ? "referral" : "referrals"}
          </p>
        </div>
        <Link
          href="/dashboard/referrals/new"
          className="bg-accent text-white px-6 py-2.5 rounded-full font-semibold text-sm hover:opacity-85 transition-opacity"
        >
          + New Referral
        </Link>
      </div>

      {rows.length === 0 ? (
        <p className="text-muted mt-12 text-center">
          No referrals yet. Create your first one to start tracking affiliate sales!
        </p>
      ) : (
        <div className="mt-8 overflow-x-auto animate-fade-up stagger-2">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-border">
                <th className="py-3 pr-4 text-xs uppercase tracking-wider text-muted font-medium">Code</th>
                <th className="py-3 pr-4 text-xs uppercase tracking-wider text-muted font-medium">Affiliate</th>
                <th className="py-3 pr-4 text-xs uppercase tracking-wider text-muted font-medium">Product</th>
                <th className="py-3 pr-4 text-xs uppercase tracking-wider text-muted font-medium">Comm.</th>
                <th className="py-3 pr-4 text-xs uppercase tracking-wider text-muted font-medium">Clicks</th>
                <th className="py-3 pr-4 text-xs uppercase tracking-wider text-muted font-medium">Sales</th>
                <th className="py-3 pr-4 text-xs uppercase tracking-wider text-muted font-medium">Conv.</th>
                <th className="py-3 pr-4 text-xs uppercase tracking-wider text-muted font-medium">Commission</th>
                <th className="py-3 text-xs uppercase tracking-wider text-muted font-medium">Active</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const convRate =
                  row.clickCount > 0
                    ? ((row.conversions / row.clickCount) * 100).toFixed(1)
                    : "0.0";

                const referralUrl = `${appUrl}/${creator.slug}?ref=${row.code}`;

                return (
                  <tr
                    key={row.id}
                    className="border-b border-border hover:bg-paper/50 transition-colors"
                  >
                    <td className="py-3 pr-4">
                      <code className="text-sm font-mono font-semibold">{row.code}</code>
                      <div className="mt-1">
                        <CopyReferralLink url={referralUrl} />
                      </div>
                    </td>
                    <td className="py-3 pr-4">
                      <p className="text-sm font-medium">{row.affiliateName}</p>
                      {row.affiliateEmail && (
                        <p className="text-xs text-muted">{row.affiliateEmail}</p>
                      )}
                    </td>
                    <td className="py-3 pr-4 text-sm text-muted">
                      {row.productTitle ?? "All products"}
                    </td>
                    <td className="py-3 pr-4 text-sm">{row.commissionPercent}%</td>
                    <td className="py-3 pr-4 text-sm">{row.clickCount}</td>
                    <td className="py-3 pr-4 text-sm">{row.conversions}</td>
                    <td className="py-3 pr-4 text-sm">{convRate}%</td>
                    <td className="py-3 pr-4 text-sm font-medium">
                      ${(row.totalCommissionCents / 100).toFixed(2)}
                    </td>
                    <td className="py-3">
                      <ReferralToggle referralId={row.id} active={row.active} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Link
        href="/dashboard"
        className="mt-8 inline-block text-sm text-muted hover:text-ink transition-colors"
      >
        &larr; Back to dashboard
      </Link>
    </main>
  );
}
```

- [ ] **Step 2: Verify build**

Run: `pnpm build`
Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/app/\(platform\)/dashboard/referrals/page.tsx
git commit -m "feat: add referrals dashboard list page"
```

---

### Task 14: Create new referral form page

**Files:**
- Create: `src/app/(platform)/dashboard/referrals/new/page.tsx`

Reference: `src/app/(platform)/dashboard/coupons/new/page.tsx` — same form structure, product dropdown pattern.

**Important:** Uses `NumericInput` from `@/components/ui/numeric-input` per project guidelines (never `<input type="number">`). The component exists at `src/components/ui/numeric-input.tsx` in the main repo but may need to be available in the worktree.

- [ ] **Step 1: Create src/app/(platform)/dashboard/referrals/new/page.tsx**

```typescript
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { NumericInput } from "@/components/ui/numeric-input";

export default function NewReferralPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [code, setCode] = useState("");
  const [affiliateName, setAffiliateName] = useState("");
  const [affiliateEmail, setAffiliateEmail] = useState("");
  const [productId, setProductId] = useState("");
  const [commissionPercent, setCommissionPercent] = useState("");

  const [products, setProducts] = useState<{ id: string; title: string }[]>([]);

  // Generate a random code on mount
  useEffect(() => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let generated = "";
    for (let i = 0; i < 6; i++) {
      generated += chars[Math.floor(Math.random() * chars.length)];
    }
    setCode(generated);
  }, []);

  // Fetch creator's products for the optional product restriction
  useEffect(() => {
    fetch("/api/products?mine=true")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setProducts(
            data.map((p: { product: { id: string; title: string } }) => ({
              id: p.product.id,
              title: p.product.title,
            }))
          );
        }
      })
      .catch(() => {});
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const percent = parseInt(commissionPercent, 10);
      if (isNaN(percent) || percent < 1 || percent > 100) {
        throw new Error("Commission must be between 1 and 100");
      }

      const body: Record<string, unknown> = {
        code: code.toUpperCase().trim(),
        affiliateName: affiliateName.trim(),
        commissionPercent: percent,
      };

      if (affiliateEmail.trim()) body.affiliateEmail = affiliateEmail.trim();
      if (productId) body.productId = productId;

      const res = await fetch("/api/referrals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create referral");
      }

      router.push("/dashboard/referrals");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="max-w-2xl mx-auto px-4 py-16">
      <h1 className="text-3xl font-bold">New Referral</h1>
      <form onSubmit={handleSubmit} className="mt-8 space-y-6">
        <div>
          <label className="block text-sm font-medium mb-1">Affiliate Name</label>
          <input
            type="text"
            value={affiliateName}
            onChange={(e) => setAffiliateName(e.target.value)}
            required
            placeholder="Mario Rossi"
            className="w-full border border-border rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-accent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Affiliate Email (optional)</label>
          <input
            type="email"
            value={affiliateEmail}
            onChange={(e) => setAffiliateEmail(e.target.value)}
            placeholder="mario@example.com"
            className="w-full border border-border rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-accent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Code</label>
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            required
            maxLength={20}
            className="w-full border border-border rounded-xl p-3 font-mono uppercase focus:outline-none focus:ring-2 focus:ring-accent"
          />
          <p className="text-xs text-muted mt-1">Pre-generated. Edit to customize.</p>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Product (optional)</label>
          <select
            value={productId}
            onChange={(e) => setProductId(e.target.value)}
            className="w-full border border-border rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-accent"
          >
            <option value="">All products</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Commission (%)</label>
          <NumericInput
            value={commissionPercent}
            onChange={setCommissionPercent}
            placeholder="10"
            required
            className="w-full border border-border rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-accent"
          />
          <p className="text-xs text-muted mt-1">Integer between 1 and 100.</p>
        </div>

        {error && <p className="text-red-600 text-sm">{error}</p>}

        <div className="flex gap-4">
          <button
            type="submit"
            disabled={loading}
            className="bg-accent text-white px-8 py-3 rounded-full font-semibold hover:opacity-85 transition-colors disabled:opacity-50"
          >
            {loading ? "Creating..." : "Create Referral"}
          </button>
          <a
            href="/dashboard/referrals"
            className="border px-8 py-3 rounded-full font-semibold hover:bg-paper/50 transition-colors"
          >
            Cancel
          </a>
        </div>
      </form>
    </main>
  );
}
```

- [ ] **Step 2: Verify build**

Run: `pnpm build`
Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/app/\(platform\)/dashboard/referrals/new/page.tsx
git commit -m "feat: add new referral form page"
```

---

### Task 15: Add Referrals quick action to dashboard

**Files:**
- Modify: `src/app/(platform)/dashboard/page.tsx`

- [ ] **Step 1: Add Referrals link to quick actions**

In `src/app/(platform)/dashboard/page.tsx`, in the quick actions section (around line 92-97), after the Coupons link, add:

```typescript
        <Link
          href="/dashboard/referrals"
          className="border border-border px-6 py-3 rounded-full font-semibold hover:border-ink transition-colors"
        >
          Referrals
        </Link>
```

- [ ] **Step 2: Verify build**

Run: `pnpm build`
Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/app/\(platform\)/dashboard/page.tsx
git commit -m "feat: add Referrals quick action to dashboard"
```

---

### Task 16: Add referral info to orders page

**Files:**
- Modify: `src/app/(platform)/dashboard/orders/page.tsx`

Reference: `src/app/(platform)/dashboard/orders/page.tsx` — existing orders table. Add referral affiliate name and commission columns.

- [ ] **Step 1: Add referral imports and join**

In `src/app/(platform)/dashboard/orders/page.tsx`, add imports at line 3:
```typescript
import { creators, orders, products, referralConversions, referrals } from "@/db/schema";
```
replacing the existing:
```typescript
import { creators, orders, products } from "@/db/schema";
```

And add `sql` to the drizzle-orm import:
```typescript
import { eq, desc, sql } from "drizzle-orm";
```
replacing:
```typescript
import { eq, desc } from "drizzle-orm";
```

- [ ] **Step 2: Modify the query to include referral data**

Replace the existing `orderRows` query with:
```typescript
  const orderRows = await db
    .select({
      id: orders.id,
      buyerEmail: orders.buyerEmail,
      buyerName: orders.buyerName,
      productTitle: products.title,
      amountCents: orders.amountCents,
      platformFeeCents: orders.platformFeeCents,
      status: orders.status,
      createdAt: orders.createdAt,
      affiliateName: referrals.affiliateName,
      commissionCents: referralConversions.commissionCents,
    })
    .from(orders)
    .innerJoin(products, eq(orders.productId, products.id))
    .leftJoin(referralConversions, eq(orders.id, referralConversions.orderId))
    .leftJoin(referrals, eq(referralConversions.referralId, referrals.id))
    .where(eq(orders.creatorId, creator.id))
    .orderBy(desc(orders.createdAt));
```

- [ ] **Step 3: Add Referral column to the table**

In the `<thead>`, after the "Status" `<th>` and before the "Date" `<th>`, add:
```typescript
                <th className="py-3 pr-4 text-xs uppercase tracking-wider text-muted font-medium">Referral</th>
```

In the `<tbody>` row, after the `<StatusBadge>` `<td>` and before the date `<td>`, add:
```typescript
                  <td className="py-3 pr-4 text-sm">
                    {order.affiliateName ? (
                      <div>
                        <p className="text-muted">{order.affiliateName}</p>
                        <p className="text-xs text-muted">
                          ${((order.commissionCents ?? 0) / 100).toFixed(2)}
                        </p>
                      </div>
                    ) : (
                      <span className="text-muted">—</span>
                    )}
                  </td>
```

- [ ] **Step 4: Verify build**

Run: `pnpm build`
Expected: Build succeeds.

- [ ] **Step 5: Commit**

```bash
git add src/app/\(platform\)/dashboard/orders/page.tsx
git commit -m "feat: show referral affiliate and commission on orders page"
```

---

## Chunk 6: Final Verification

### Task 17: Full build verification and cleanup

- [ ] **Step 1: Run full build**

Run: `pnpm build`
Expected: Build succeeds with no errors or warnings.

- [ ] **Step 2: Verify all files are committed**

Run: `git status`
Expected: Working tree clean, no untracked files.

- [ ] **Step 3: Review git log**

Run: `git log --oneline`
Expected: Clean sequence of atomic commits covering all tasks.
