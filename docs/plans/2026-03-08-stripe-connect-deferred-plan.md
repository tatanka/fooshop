# Stripe Connect Deferred Flow — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Enable deferred Stripe Connect — creators publish without Stripe, buy intents tracked as incentive, dashboard CTA with missed sales counter.

**Architecture:** New `buy_intents` table, new `/api/buy-intents` endpoint, `BuyButton` client component with modal, dashboard extracted to client components for Stripe connect and incentive CTA.

**Tech Stack:** Next.js 15 App Router, Drizzle ORM, PostgreSQL, Stripe Connect Express, Tailwind CSS

---

### Task 1: Add `buyIntents` table to schema

**Files:**
- Modify: `src/db/schema.ts:169-177` (add after `pageViews` table)

**Step 1: Add the table definition**

Add after the `pageViews` table at end of file:

```typescript
export const buyIntents = pgTable("buy_intents", {
  id: uuid("id").primaryKey().defaultRandom(),
  productId: uuid("product_id")
    .notNull()
    .references(() => products.id),
  creatorId: uuid("creator_id")
    .notNull()
    .references(() => creators.id),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});
```

**Step 2: Generate migration**

Run: `pnpm drizzle-kit generate`
Expected: Migration file created in `drizzle/` directory

**Step 3: Push schema to local DB**

Run: `pnpm drizzle-kit push`
Expected: Schema pushed successfully

**Step 4: Verify build**

Run: `pnpm build 2>&1 | tail -5`
Expected: Build succeeds

**Step 5: Commit**

```bash
git add src/db/schema.ts drizzle/
git commit -m "feat: add buy_intents table for deferred Stripe tracking"
```

---

### Task 2: Create `/api/buy-intents` endpoint

**Files:**
- Create: `src/app/api/buy-intents/route.ts`

**Step 1: Create the endpoint**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { buyIntents, products } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST(req: NextRequest) {
  const { productId } = await req.json();

  if (!productId) {
    return NextResponse.json({ error: "productId required" }, { status: 400 });
  }

  const product = await db
    .select()
    .from(products)
    .where(eq(products.id, productId))
    .then((rows) => rows[0]);

  if (!product) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }

  await db.insert(buyIntents).values({
    productId: product.id,
    creatorId: product.creatorId,
  });

  return NextResponse.json({ ok: true });
}
```

**Step 2: Verify build**

Run: `pnpm build 2>&1 | tail -5`
Expected: Build succeeds

**Step 3: Commit**

```bash
git add src/app/api/buy-intents/route.ts
git commit -m "feat: add buy-intents API endpoint"
```

---

### Task 3: Create `BuyButton` client component with modal

**Files:**
- Create: `src/components/buy-button.tsx`

**Step 1: Create the component**

```tsx
"use client";

import { useState } from "react";

interface BuyButtonProps {
  productId: string;
  hasStripe: boolean;
}

export function BuyButton({ productId, hasStripe }: BuyButtonProps) {
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    if (hasStripe) {
      setLoading(true);
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
      setLoading(false);
      return;
    }

    // No Stripe — show modal and track buy intent
    setShowModal(true);
    fetch("/api/buy-intents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId }),
    });
  }

  return (
    <>
      <button
        onClick={handleClick}
        disabled={loading}
        className="bg-black text-white px-8 py-3 rounded-lg text-lg font-semibold hover:bg-gray-800 transition-colors disabled:opacity-50"
      >
        {loading ? "Loading..." : "Buy Now"}
      </button>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl p-8 max-w-md mx-4 text-center">
            <h2 className="text-xl font-bold">
              Questo prodotto sarà disponibile a breve
            </h2>
            <p className="mt-3 text-gray-600">
              Il creator è stato avvisato!
            </p>
            <button
              onClick={() => setShowModal(false)}
              className="mt-6 bg-black text-white px-6 py-2 rounded-lg font-semibold hover:bg-gray-800 transition-colors"
            >
              Chiudi
            </button>
          </div>
        </div>
      )}
    </>
  );
}
```

**Step 2: Verify build**

Run: `pnpm build 2>&1 | tail -5`
Expected: Build succeeds

**Step 3: Commit**

```bash
git add src/components/buy-button.tsx
git commit -m "feat: add BuyButton component with deferred modal"
```

---

### Task 4: Wire `BuyButton` into product page

**Files:**
- Modify: `src/app/[slug]/[productSlug]/page.tsx:90-96`

**Step 1: Add import at top of file**

Add after existing imports (line 4):
```typescript
import { BuyButton } from "@/components/buy-button";
```

**Step 2: Replace the static Buy Now button**

Replace lines 94-96 (the static `<button>` element) with:

```tsx
        <BuyButton
          productId={product.id}
          hasStripe={!!creator.stripeConnectId}
        />
```

The full `<div>` at lines 90-96 should become:
```tsx
      <div className="mt-8 flex items-center gap-4">
        <span className="text-3xl font-bold">
          ${(product.priceCents / 100).toFixed(2)}
        </span>
        <BuyButton
          productId={product.id}
          hasStripe={!!creator.stripeConnectId}
        />
      </div>
```

**Step 3: Verify build**

Run: `pnpm build 2>&1 | tail -5`
Expected: Build succeeds

**Step 4: Commit**

```bash
git add src/app/[slug]/[productSlug]/page.tsx
git commit -m "feat: wire BuyButton into product page"
```

---

### Task 5: Create `ConnectStripeButton` client component

**Files:**
- Create: `src/components/connect-stripe-button.tsx`

**Step 1: Create the component**

```tsx
"use client";

import { useState } from "react";

export function ConnectStripeButton() {
  const [loading, setLoading] = useState(false);

  async function handleConnect() {
    setLoading(true);
    const res = await fetch("/api/stripe/connect", {
      method: "POST",
    });
    const data = await res.json();
    if (data.url) {
      window.location.href = data.url;
    }
    setLoading(false);
  }

  return (
    <button
      onClick={handleConnect}
      disabled={loading}
      className="border px-6 py-3 rounded-lg font-semibold hover:bg-gray-50 transition-colors disabled:opacity-50"
    >
      {loading ? "Connecting..." : "Connect Stripe"}
    </button>
  );
}
```

**Step 2: Verify build**

Run: `pnpm build 2>&1 | tail -5`
Expected: Build succeeds

**Step 3: Commit**

```bash
git add src/components/connect-stripe-button.tsx
git commit -m "feat: add ConnectStripeButton client component"
```

---

### Task 6: Create `StripeCta` component for dashboard incentive

**Files:**
- Create: `src/components/stripe-cta.tsx`

**Step 1: Create the component**

This is a server component that shows the incentive CTA with buy intent count.

```tsx
import { db } from "@/db";
import { buyIntents } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { ConnectStripeButton } from "./connect-stripe-button";

interface StripeCTAProps {
  creatorId: string;
}

export async function StripeCTA({ creatorId }: StripeCTAProps) {
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(buyIntents)
    .where(eq(buyIntents.creatorId, creatorId));

  const intentCount = Number(count);

  return (
    <div className="border rounded-lg p-6">
      {intentCount > 0 ? (
        <div className="mb-4">
          <p className="text-red-600 font-bold">
            Stai perdendo vendite!
          </p>
          <p className="text-sm text-red-600 mt-1">
            {intentCount} {intentCount === 1 ? "persona ha" : "persone hanno"} provato ad acquistare i tuoi prodotti
          </p>
        </div>
      ) : (
        <p className="text-gray-600 mb-4">
          Collega Stripe per ricevere pagamenti
        </p>
      )}
      <ConnectStripeButton />
    </div>
  );
}
```

**Step 2: Verify build**

Run: `pnpm build 2>&1 | tail -5`
Expected: Build succeeds

**Step 3: Commit**

```bash
git add src/components/stripe-cta.tsx
git commit -m "feat: add StripeCTA component with buy intent counter"
```

---

### Task 7: Wire dashboard with StripeCTA and Stripe return URL

**Files:**
- Modify: `src/app/(platform)/dashboard/page.tsx:1-126`
- Modify: `src/app/api/stripe/connect/route.ts:46` (return_url)

**Step 1: Update Stripe Connect return URL**

In `src/app/api/stripe/connect/route.ts`, change line 46:
```typescript
    return_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?stripe=connected`,
```

**Step 2: Update dashboard page**

Add imports at top of `src/app/(platform)/dashboard/page.tsx`:
```typescript
import { StripeCTA } from "@/components/stripe-cta";
```

Replace the old static Connect Stripe button block (lines 94-101):
```tsx
        {!creator.stripeConnectId && (
          <button
            className="border px-6 py-3 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
            id="connect-stripe"
          >
            Connect Stripe
          </button>
        )}
```

With:
```tsx
        {creator.stripeConnectId && (
          <span className="text-sm text-green-600 font-medium flex items-center gap-1">
            Stripe connected
          </span>
        )}
```

Then add the `StripeCTA` section. After the buttons `<div>` (after line 102), add:
```tsx
      {!creator.stripeConnectId && (
        <div className="mt-6">
          <StripeCTA creatorId={creator.id} />
        </div>
      )}
```

**Step 3: Add toast for Stripe connected return**

The dashboard is a server component. To show a toast for `?stripe=connected`, add a small client component. Create `src/components/stripe-toast.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

export function StripeToast() {
  const searchParams = useSearchParams();
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (searchParams.get("stripe") === "connected") {
      setShow(true);
      const timer = setTimeout(() => setShow(false), 4000);
      return () => clearTimeout(timer);
    }
  }, [searchParams]);

  if (!show) return null;

  return (
    <div className="fixed top-4 right-4 z-50 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg">
      Stripe collegato con successo!
    </div>
  );
}
```

Add to dashboard page imports:
```typescript
import { StripeToast } from "@/components/stripe-toast";
```

Add `<StripeToast />` as first child inside `<main>`:
```tsx
    <main className="max-w-4xl mx-auto px-4 py-12">
      <StripeToast />
      ...
```

**Step 4: Verify build**

Run: `pnpm build 2>&1 | tail -5`
Expected: Build succeeds

**Step 5: Commit**

```bash
git add src/app/(platform)/dashboard/page.tsx src/app/api/stripe/connect/route.ts src/components/stripe-toast.tsx
git commit -m "feat: wire dashboard with StripeCTA and connect return toast"
```

---

### Task 8: Final verification

**Step 1: Full build**

Run: `pnpm build`
Expected: Build succeeds with no errors

**Step 2: Review all changes**

Run: `git log --oneline develop..HEAD`
Expected: 7 commits covering schema, API, components, and wiring

**Step 3: Verify file structure**

New/modified files:
- `src/db/schema.ts` — `buyIntents` table added
- `src/app/api/buy-intents/route.ts` — new endpoint
- `src/components/buy-button.tsx` — new client component
- `src/components/connect-stripe-button.tsx` — new client component
- `src/components/stripe-cta.tsx` — new server component
- `src/components/stripe-toast.tsx` — new client component
- `src/app/[slug]/[productSlug]/page.tsx` — BuyButton wired in
- `src/app/(platform)/dashboard/page.tsx` — StripeCTA + toast wired in
- `src/app/api/stripe/connect/route.ts` — return URL updated
- `drizzle/` — migration files
