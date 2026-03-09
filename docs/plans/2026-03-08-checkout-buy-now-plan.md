# Checkout Buy Now Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Polish the checkout flow with error handling in BuyButton, add token-based digital file delivery, and enhance the success page.

**Architecture:** Webhook creates a download token alongside the order. Success page fetches session details from Stripe and displays a download button. A new `/api/download/[token]` route validates the token and redirects to a presigned R2 URL.

**Tech Stack:** Next.js App Router, Drizzle ORM, Stripe API, Cloudflare R2 (`@aws-sdk/client-s3`)

---

### Task 1: Add `downloadTokens` table to schema

**Files:**
- Modify: `src/db/schema.ts:167` (after orders table)

**Step 1: Add the downloadTokens table**

Add after the `orders` table definition (line 167):

```typescript
export const downloadTokens = pgTable("download_tokens", {
  id: uuid("id").primaryKey().defaultRandom(),
  orderId: uuid("order_id")
    .notNull()
    .references(() => orders.id),
  token: uuid("token").notNull().unique().$defaultFn(() => crypto.randomUUID()),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  downloadCount: integer("download_count").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});
```

**Step 2: Push schema to dev database**

Run: `pnpm drizzle-kit push`
Expected: Table `download_tokens` created successfully.

**Step 3: Commit**

```bash
git add src/db/schema.ts
git commit -m "feat: add downloadTokens table for digital delivery"
```

---

### Task 2: Update webhook to create download token

**Files:**
- Modify: `src/app/api/stripe/webhook/route.ts`

**Step 1: Update imports and create token after order**

Replace the full webhook handler with:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { getStripe, calculatePlatformFee } from "@/lib/stripe";
import { db } from "@/db";
import { orders, downloadTokens } from "@/db/schema";

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature")!;

  let event;
  try {
    event = getStripe().webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const { productId, creatorId } = session.metadata!;

    const [order] = await db.insert(orders).values({
      productId,
      creatorId,
      buyerEmail: session.customer_details?.email ?? "unknown",
      buyerName: session.customer_details?.name,
      amountCents: session.amount_total!,
      platformFeeCents: calculatePlatformFee(session.amount_total!),
      stripePaymentIntentId: session.payment_intent as string,
      status: "completed",
    }).returning();

    await db.insert(downloadTokens).values({
      orderId: order.id,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24h
    });
  }

  return NextResponse.json({ received: true });
}
```

**Step 2: Verify build**

Run: `pnpm build`
Expected: Build succeeds with no errors.

**Step 3: Commit**

```bash
git add src/app/api/stripe/webhook/route.ts
git commit -m "feat: create download token on checkout completion"
```

---

### Task 3: Create download route `/api/download/[token]`

**Files:**
- Create: `src/app/api/download/[token]/route.ts`

**Step 1: Create the download route**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { downloadTokens, orders, products } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getDownloadUrl } from "@/lib/r2";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  const result = await db
    .select({
      tokenId: downloadTokens.id,
      expiresAt: downloadTokens.expiresAt,
      fileUrl: products.fileUrl,
    })
    .from(downloadTokens)
    .innerJoin(orders, eq(downloadTokens.orderId, orders.id))
    .innerJoin(products, eq(orders.productId, products.id))
    .where(eq(downloadTokens.token, token))
    .then((rows) => rows[0]);

  if (!result) {
    return NextResponse.json({ error: "Invalid download link" }, { status: 404 });
  }

  if (new Date() > result.expiresAt) {
    return NextResponse.json({ error: "Download link expired" }, { status: 410 });
  }

  if (!result.fileUrl) {
    return NextResponse.json({ error: "File not available" }, { status: 404 });
  }

  // Increment download count
  await db
    .update(downloadTokens)
    .set({ downloadCount: result.downloadCount + 1 })
    .where(eq(downloadTokens.id, result.tokenId));

  // fileUrl is the R2 object key
  const presignedUrl = await getDownloadUrl(result.fileUrl);
  return NextResponse.redirect(presignedUrl);
}
```

Note: The `downloadCount` increment has a race condition but is acceptable for analytics-only use. The select doesn't fetch `downloadCount` — fix: add it to the select.

**Step 1b: Fix — add downloadCount to select**

Add `downloadCount: downloadTokens.downloadCount` to the select object.

**Step 2: Verify build**

Run: `pnpm build`
Expected: Build succeeds.

**Step 3: Commit**

```bash
git add src/app/api/download/[token]/route.ts
git commit -m "feat: add token-based download route for digital delivery"
```

---

### Task 4: Enhance success page

**Files:**
- Modify: `src/app/(platform)/checkout/success/page.tsx`

**Step 1: Rewrite success page to fetch session details and show download link**

```typescript
import { db } from "@/db";
import { orders, downloadTokens, products } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getStripe } from "@/lib/stripe";
import { redirect } from "next/navigation";

interface Props {
  searchParams: Promise<{ session_id?: string }>;
}

export default async function CheckoutSuccess({ searchParams }: Props) {
  const { session_id } = await searchParams;

  if (!session_id) redirect("/");

  // Fetch Stripe session to get payment intent
  let session;
  try {
    session = await getStripe().checkout.sessions.retrieve(session_id);
  } catch {
    redirect("/");
  }

  if (!session.payment_intent) redirect("/");

  // Look up order + download token
  const result = await db
    .select({
      productTitle: products.title,
      amountCents: orders.amountCents,
      currency: products.currency,
      token: downloadTokens.token,
    })
    .from(orders)
    .innerJoin(products, eq(orders.productId, products.id))
    .innerJoin(downloadTokens, eq(downloadTokens.orderId, orders.id))
    .where(eq(orders.stripePaymentIntentId, session.payment_intent as string))
    .then((rows) => rows[0]);

  return (
    <main className="max-w-lg mx-auto px-4 py-24 text-center">
      <h1 className="text-3xl font-bold">Purchase complete!</h1>
      {result ? (
        <>
          <p className="mt-4 text-gray-600">
            You bought <strong>{result.productTitle}</strong> for{" "}
            <strong>
              ${(result.amountCents / 100).toFixed(2)}{" "}
              {result.currency.toUpperCase()}
            </strong>
          </p>
          <a
            href={`/api/download/${result.token}`}
            className="mt-8 inline-block bg-black text-white px-8 py-3 rounded-lg text-lg font-semibold hover:bg-gray-800 transition-colors"
          >
            Download
          </a>
          <p className="mt-4 text-sm text-gray-400">
            This link expires in 24 hours.
          </p>
        </>
      ) : (
        <p className="mt-4 text-gray-600">
          Your purchase is being processed. Please check back shortly.
        </p>
      )}
      <a href="/" className="mt-8 inline-block text-sm underline text-gray-500">
        Back to Fooshop
      </a>
    </main>
  );
}
```

Note: The order might not exist yet if the webhook hasn't fired by the time the user reaches the success page. The fallback message handles this race condition gracefully.

**Step 2: Verify build**

Run: `pnpm build`
Expected: Build succeeds.

**Step 3: Commit**

```bash
git add src/app/\(platform\)/checkout/success/page.tsx
git commit -m "feat: enhance success page with purchase details and download link"
```

---

### Task 5: Add error handling to BuyButton

**Files:**
- Modify: `src/components/buy-button.tsx`

**Step 1: Replace BuyButton with error-aware version**

```typescript
"use client";

import { useState } from "react";

interface BuyButtonProps {
  productId: string;
  hasStripe: boolean;
}

export function BuyButton({ productId, hasStripe }: BuyButtonProps) {
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    if (hasStripe) {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ productId }),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error ?? "Something went wrong. Please try again.");
          return;
        }
        if (data.url) {
          window.location.href = data.url;
          return;
        }
        setError("Something went wrong. Please try again.");
      } catch {
        setError("Connection failed. Please check your internet and try again.");
      } finally {
        setLoading(false);
      }
      return;
    }

    // No Stripe — show modal and track buy intent
    setShowModal(true);
    fetch("/api/buy-intents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId }),
    }).catch(() => {});
  }

  return (
    <>
      <div>
        <button
          onClick={handleClick}
          disabled={loading}
          className="bg-black text-white px-8 py-3 rounded-lg text-lg font-semibold hover:bg-gray-800 transition-colors disabled:opacity-50"
        >
          {loading ? "Loading..." : "Buy Now"}
        </button>
        {error && (
          <p className="mt-2 text-sm text-red-600">{error}</p>
        )}
      </div>

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

Run: `pnpm build`
Expected: Build succeeds.

**Step 3: Commit**

```bash
git add src/components/buy-button.tsx
git commit -m "feat: add error feedback to BuyButton component"
```

---

### Task 6: Final verification

**Step 1: Full build check**

Run: `pnpm build`
Expected: Build succeeds with no errors or warnings.

**Step 2: Verify all new routes appear**

Expected in build output:
- `ƒ /api/download/[token]`
- `ƒ /checkout/success`

All other existing routes should still be present.
