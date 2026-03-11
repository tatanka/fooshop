# [GEN-012] Codici Sconto e Coupon — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Let creators create discount codes (percentage or fixed) that buyers apply at checkout for reduced pricing.

**Architecture:** New `coupons` table + 4 API routes (CRUD + validate) + dashboard management page + inline coupon input on product page. Discounts calculated server-side, final price passed to Stripe. Platform fee on post-discount amount.

**Tech Stack:** Drizzle ORM (schema + migration), Next.js App Router (API routes + pages), React (client components), Stripe Checkout (payment).

**Worktree:** `/Users/ematomax/Documents/fooshop/.worktrees/feat/issue-25-codici-sconto-coupon`

---

### Task 1: Schema — Add `coupons` table and `couponId` to `orders`

**Files:**
- Modify: `src/db/schema.ts`

**Step 1: Add the discount type enum and coupons table**

Add after `orderStatusEnum` definition (after line 125):

```typescript
export const discountTypeEnum = pgEnum("discount_type", [
  "percentage",
  "fixed",
]);

export const coupons = pgTable("coupons", {
  id: uuid("id").primaryKey().defaultRandom(),
  creatorId: uuid("creator_id")
    .notNull()
    .references(() => creators.id),
  code: text("code").notNull(),
  discountType: discountTypeEnum("discount_type").notNull(),
  discountValue: integer("discount_value").notNull(),
  productId: uuid("product_id").references(() => products.id),
  minAmountCents: integer("min_amount_cents"),
  maxRedemptions: integer("max_redemptions"),
  redemptionCount: integer("redemption_count").notNull().default(0),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});
```

**Step 2: Add `couponId` to `orders` table**

Add a new column to the `orders` table definition, after `stripePaymentIntentId`:

```typescript
couponId: uuid("coupon_id").references(() => coupons.id),
```

**Step 3: Add unique constraint import and composite unique**

Add `unique` to the imports from `drizzle-orm/pg-core`. Then add a composite unique constraint to the `coupons` table using a table callback:

```typescript
import {
  pgTable,
  pgEnum,
  uuid,
  text,
  integer,
  boolean,
  jsonb,
  timestamp,
  primaryKey,
  unique,
} from "drizzle-orm/pg-core";
```

Change `coupons` definition to use the callback form:

```typescript
export const coupons = pgTable("coupons", {
  // ... columns as above
}, (table) => ({
  uniqueCreatorCode: unique().on(table.creatorId, table.code),
}));
```

**Step 4: Verify build**

Run: `pnpm build`
Expected: Build succeeds (schema is TypeScript-only, no runtime errors).

**Step 5: Generate and push migration**

Run: `pnpm drizzle-kit generate`
Run: `pnpm drizzle-kit push`
Expected: Migration generated and applied to local database.

**Step 6: Commit**

```bash
git add src/db/schema.ts drizzle/
git commit -m "feat(schema): add coupons table and couponId to orders (#25)"
```

---

### Task 2: Discount calculation utility

**Files:**
- Create: `src/lib/coupon.ts`

**Step 1: Create the coupon utility module**

```typescript
export function applyDiscount(
  priceCents: number,
  discountType: "percentage" | "fixed",
  discountValue: number
): number {
  if (discountType === "percentage") {
    return Math.max(0, priceCents - Math.round(priceCents * discountValue / 100));
  }
  return Math.max(0, priceCents - discountValue);
}

export function generateCouponCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}
```

Note: `generateCouponCode` excludes ambiguous characters (0/O, 1/I/L) for readability.

**Step 2: Verify build**

Run: `pnpm build`
Expected: Build succeeds.

**Step 3: Commit**

```bash
git add src/lib/coupon.ts
git commit -m "feat: add discount calculation and coupon code generation (#25)"
```

---

### Task 3: API — `POST /api/coupons/validate` (public endpoint)

**Files:**
- Create: `src/app/api/coupons/validate/route.ts`

**Step 1: Create the validation endpoint**

This is the public endpoint used by the product page to preview discounts. It does NOT increment redemption count — that happens at checkout.

```typescript
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { coupons, products } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { applyDiscount } from "@/lib/coupon";

export async function POST(req: NextRequest) {
  const { code, productId } = await req.json();

  if (!code || !productId) {
    return NextResponse.json(
      { valid: false, error: "Code and product ID required" },
      { status: 400 }
    );
  }

  // Fetch the product to get the creator ID and price
  const product = await db
    .select()
    .from(products)
    .where(eq(products.id, productId))
    .then((rows) => rows[0]);

  if (!product) {
    return NextResponse.json(
      { valid: false, error: "Product not found" },
      { status: 404 }
    );
  }

  // Look up coupon by code + creator
  const coupon = await db
    .select()
    .from(coupons)
    .where(
      and(
        eq(coupons.creatorId, product.creatorId),
        eq(coupons.code, code.toUpperCase().trim())
      )
    )
    .then((rows) => rows[0]);

  if (!coupon) {
    return NextResponse.json({ valid: false, error: "Invalid code" });
  }

  // Check active
  if (!coupon.active) {
    return NextResponse.json({ valid: false, error: "Code is no longer active" });
  }

  // Check expiration
  if (coupon.expiresAt && new Date() > coupon.expiresAt) {
    return NextResponse.json({ valid: false, error: "Code has expired" });
  }

  // Check max redemptions
  if (coupon.maxRedemptions !== null && coupon.redemptionCount >= coupon.maxRedemptions) {
    return NextResponse.json({ valid: false, error: "Code has reached its usage limit" });
  }

  // Check product restriction
  if (coupon.productId && coupon.productId !== productId) {
    return NextResponse.json({ valid: false, error: "Code is not valid for this product" });
  }

  // Check minimum amount
  if (coupon.minAmountCents !== null && product.priceCents < coupon.minAmountCents) {
    return NextResponse.json({
      valid: false,
      error: `Minimum order amount: $${(coupon.minAmountCents / 100).toFixed(2)}`,
    });
  }

  const discountedPriceCents = applyDiscount(
    product.priceCents,
    coupon.discountType,
    coupon.discountValue
  );

  return NextResponse.json({
    valid: true,
    discountType: coupon.discountType,
    discountValue: coupon.discountValue,
    originalPriceCents: product.priceCents,
    discountedPriceCents,
  });
}
```

**Step 2: Verify build**

Run: `pnpm build`
Expected: Build succeeds, route appears in output.

**Step 3: Commit**

```bash
git add src/app/api/coupons/validate/route.ts
git commit -m "feat: add public coupon validation endpoint (#25)"
```

---

### Task 4: API — Modify `POST /api/checkout` to accept coupon codes

**Files:**
- Modify: `src/app/api/checkout/route.ts`

**Step 1: Add coupon validation and discount to checkout**

The checkout endpoint now accepts an optional `couponCode`. If provided, it validates the coupon, applies the discount, atomically increments `redemption_count`, and passes the discounted price to Stripe.

Key changes:
1. Accept `couponCode` from request body
2. If couponCode provided: validate coupon (same checks as validate endpoint)
3. Atomically increment `redemption_count` with `WHERE redemption_count < max_redemptions`
4. Calculate discounted price and platform fee on discounted amount
5. Pass `couponId` in Stripe session metadata for the webhook
6. Use `unit_amount` = discounted price in Stripe Checkout

The full updated file:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { getStripe, calculatePlatformFee } from "@/lib/stripe";
import { applyDiscount } from "@/lib/coupon";
import { db } from "@/db";
import { products, creators, coupons } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";

export async function POST(req: NextRequest) {
  const { productId, couponCode, source } = await req.json();

  const product = await db
    .select()
    .from(products)
    .where(eq(products.id, productId))
    .then((rows) => rows[0]);

  if (!product || product.status !== "published") {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }

  const creator = await db
    .select()
    .from(creators)
    .where(eq(creators.id, product.creatorId))
    .then((rows) => rows[0]);

  if (!creator?.stripeConnectId) {
    return NextResponse.json(
      { error: "Creator not set up for payments" },
      { status: 400 }
    );
  }

  // Verify the Connect account can receive transfers
  const account = await getStripe().accounts.retrieve(creator.stripeConnectId);
  if (!account.charges_enabled) {
    return NextResponse.json(
      { error: "Creator has not completed payment setup yet" },
      { status: 400 }
    );
  }

  // Coupon validation (if provided)
  let finalPriceCents = product.priceCents;
  let couponId: string | null = null;

  if (couponCode) {
    const coupon = await db
      .select()
      .from(coupons)
      .where(
        and(
          eq(coupons.creatorId, product.creatorId),
          eq(coupons.code, couponCode.toUpperCase().trim())
        )
      )
      .then((rows) => rows[0]);

    if (!coupon || !coupon.active) {
      return NextResponse.json({ error: "Invalid coupon code" }, { status: 400 });
    }

    if (coupon.expiresAt && new Date() > coupon.expiresAt) {
      return NextResponse.json({ error: "Coupon has expired" }, { status: 400 });
    }

    if (coupon.productId && coupon.productId !== productId) {
      return NextResponse.json({ error: "Coupon not valid for this product" }, { status: 400 });
    }

    if (coupon.minAmountCents !== null && product.priceCents < coupon.minAmountCents) {
      return NextResponse.json({ error: "Order does not meet minimum amount" }, { status: 400 });
    }

    // Atomically increment redemption count (prevents race conditions)
    const updated = await db
      .update(coupons)
      .set({ redemptionCount: sql`${coupons.redemptionCount} + 1` })
      .where(
        and(
          eq(coupons.id, coupon.id),
          coupon.maxRedemptions !== null
            ? sql`${coupons.redemptionCount} < ${coupon.maxRedemptions}`
            : sql`true`
        )
      )
      .returning({ id: coupons.id });

    if (updated.length === 0) {
      return NextResponse.json({ error: "Coupon has reached its usage limit" }, { status: 400 });
    }

    finalPriceCents = applyDiscount(product.priceCents, coupon.discountType, coupon.discountValue);
    couponId = coupon.id;
  }

  const platformFee = calculatePlatformFee(finalPriceCents);

  try {
    const checkoutSession = await getStripe().checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: product.currency,
            product_data: {
              name: product.title,
              description: product.description,
            },
            unit_amount: finalPriceCents,
          },
          quantity: 1,
        },
      ],
      payment_intent_data: {
        application_fee_amount: platformFee,
        transfer_data: {
          destination: creator.stripeConnectId,
        },
      },
      metadata: {
        productId: product.id,
        creatorId: creator.id,
        source: source ?? "web",
        ...(couponId && { couponId }),
      },
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/${creator.slug}/${product.slug}`,
    });

    return NextResponse.json({ url: checkoutSession.url });
  } catch (err) {
    console.error("Checkout session creation failed:", err);
    const message = err instanceof Error ? err.message : "Payment service error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
```

**Step 2: Verify build**

Run: `pnpm build`
Expected: Build succeeds.

**Step 3: Commit**

```bash
git add src/app/api/checkout/route.ts
git commit -m "feat: apply coupon discount at checkout with atomic redemption (#25)"
```

---

### Task 5: Webhook — Store `couponId` on order

**Files:**
- Modify: `src/app/api/stripe/webhook/route.ts`

**Step 1: Pass couponId from metadata to order insert**

In the webhook handler, extract `couponId` from `session.metadata` and include it in the order insert. This is a small change.

In the line where metadata is destructured (around line 25):

```typescript
const { productId, creatorId, couponId } = session.metadata!;
```

In the `tx.insert(orders).values(...)` call, add:

```typescript
couponId: couponId || null,
```

**Step 2: Verify build**

Run: `pnpm build`
Expected: Build succeeds.

**Step 3: Commit**

```bash
git add src/app/api/stripe/webhook/route.ts
git commit -m "feat: track couponId on orders from webhook metadata (#25)"
```

---

### Task 6: API — Creator coupon CRUD endpoints

**Files:**
- Create: `src/app/api/coupons/route.ts` (GET list + POST create)
- Create: `src/app/api/coupons/[id]/route.ts` (PUT update)

**Step 1: Create GET and POST handler**

`src/app/api/coupons/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { creators, coupons, products } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { generateCouponCode } from "@/lib/coupon";

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
      coupon: coupons,
      productTitle: products.title,
    })
    .from(coupons)
    .leftJoin(products, eq(coupons.productId, products.id))
    .where(eq(coupons.creatorId, creator.id))
    .orderBy(desc(coupons.createdAt));

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
  const {
    code,
    discountType,
    discountValue,
    productId,
    minAmountCents,
    maxRedemptions,
    expiresAt,
  } = body;

  // Validate required fields
  if (!discountType || !discountValue) {
    return NextResponse.json(
      { error: "Discount type and value are required" },
      { status: 400 }
    );
  }

  if (!["percentage", "fixed"].includes(discountType)) {
    return NextResponse.json(
      { error: "Discount type must be 'percentage' or 'fixed'" },
      { status: 400 }
    );
  }

  if (discountType === "percentage" && (discountValue < 1 || discountValue > 100)) {
    return NextResponse.json(
      { error: "Percentage must be between 1 and 100" },
      { status: 400 }
    );
  }

  if (discountType === "fixed" && discountValue < 1) {
    return NextResponse.json(
      { error: "Fixed discount must be at least 1 cent" },
      { status: 400 }
    );
  }

  // Validate product belongs to creator (if provided)
  if (productId) {
    const product = await db
      .select({ id: products.id })
      .from(products)
      .where(eq(products.id, productId))
      .then((rows) => rows[0]);

    if (!product) {
      return NextResponse.json(
        { error: "Product not found" },
        { status: 404 }
      );
    }
  }

  const finalCode = (code || generateCouponCode()).toUpperCase().trim();

  try {
    const [coupon] = await db
      .insert(coupons)
      .values({
        creatorId: creator.id,
        code: finalCode,
        discountType,
        discountValue,
        productId: productId || null,
        minAmountCents: minAmountCents || null,
        maxRedemptions: maxRedemptions || null,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
      })
      .returning();

    return NextResponse.json(coupon, { status: 201 });
  } catch (err) {
    // Handle unique constraint violation (duplicate code for this creator)
    if (err instanceof Error && err.message.includes("unique")) {
      return NextResponse.json(
        { error: "A coupon with this code already exists" },
        { status: 409 }
      );
    }
    throw err;
  }
}
```

**Step 2: Create PUT handler**

`src/app/api/coupons/[id]/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { creators, coupons } from "@/db/schema";
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

  // Only allow updating specific fields
  const allowedFields: Record<string, unknown> = {};
  if (body.active !== undefined) allowedFields.active = body.active;
  if (body.maxRedemptions !== undefined) allowedFields.maxRedemptions = body.maxRedemptions || null;
  if (body.expiresAt !== undefined) allowedFields.expiresAt = body.expiresAt ? new Date(body.expiresAt) : null;
  if (body.minAmountCents !== undefined) allowedFields.minAmountCents = body.minAmountCents || null;

  if (Object.keys(allowedFields).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  const updated = await db
    .update(coupons)
    .set(allowedFields)
    .where(and(eq(coupons.id, id), eq(coupons.creatorId, creator.id)))
    .returning();

  if (updated.length === 0) {
    return NextResponse.json({ error: "Coupon not found" }, { status: 404 });
  }

  return NextResponse.json(updated[0]);
}
```

**Step 3: Verify build**

Run: `pnpm build`
Expected: Build succeeds, routes appear in output.

**Step 4: Commit**

```bash
git add src/app/api/coupons/
git commit -m "feat: add creator coupon CRUD API endpoints (#25)"
```

---

### Task 7: Dashboard — Coupons list page

**Files:**
- Create: `src/app/(platform)/dashboard/coupons/page.tsx`

**Step 1: Create the coupons list page**

Server component that fetches and displays the creator's coupons with inline toggle.

```typescript
export const dynamic = "force-dynamic";

import { auth } from "@/lib/auth";
import { db } from "@/db";
import { creators, coupons, products } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { redirect } from "next/navigation";
import Link from "next/link";
import { CouponToggle } from "@/components/coupon-toggle";

export default async function CouponsPage() {
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
      id: coupons.id,
      code: coupons.code,
      discountType: coupons.discountType,
      discountValue: coupons.discountValue,
      productTitle: products.title,
      maxRedemptions: coupons.maxRedemptions,
      redemptionCount: coupons.redemptionCount,
      active: coupons.active,
      expiresAt: coupons.expiresAt,
      createdAt: coupons.createdAt,
    })
    .from(coupons)
    .leftJoin(products, eq(coupons.productId, products.id))
    .where(eq(coupons.creatorId, creator.id))
    .orderBy(desc(coupons.createdAt));

  return (
    <main className="max-w-5xl mx-auto px-4 py-16">
      <div className="flex justify-between items-center animate-fade-up">
        <div>
          <h1 className="text-3xl font-bold">Coupons</h1>
          <p className="text-muted mt-1">
            {rows.length} {rows.length === 1 ? "coupon" : "coupons"}
          </p>
        </div>
        <Link
          href="/dashboard/coupons/new"
          className="bg-accent text-white px-6 py-2.5 rounded-full font-semibold text-sm hover:opacity-85 transition-opacity"
        >
          + New Coupon
        </Link>
      </div>

      {rows.length === 0 ? (
        <p className="text-muted mt-12 text-center">
          No coupons yet. Create your first one!
        </p>
      ) : (
        <div className="mt-8 overflow-x-auto animate-fade-up stagger-2">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-border">
                <th className="py-3 pr-4 text-xs uppercase tracking-wider text-muted font-medium">Code</th>
                <th className="py-3 pr-4 text-xs uppercase tracking-wider text-muted font-medium">Discount</th>
                <th className="py-3 pr-4 text-xs uppercase tracking-wider text-muted font-medium">Product</th>
                <th className="py-3 pr-4 text-xs uppercase tracking-wider text-muted font-medium">Usage</th>
                <th className="py-3 pr-4 text-xs uppercase tracking-wider text-muted font-medium">Expires</th>
                <th className="py-3 text-xs uppercase tracking-wider text-muted font-medium">Active</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const isExpired = row.expiresAt && new Date() > row.expiresAt;
                const isExhausted = row.maxRedemptions !== null && row.redemptionCount >= row.maxRedemptions;

                return (
                  <tr
                    key={row.id}
                    className="border-b border-border hover:bg-paper/50 transition-colors"
                  >
                    <td className="py-3 pr-4">
                      <code className="text-sm font-mono font-semibold">{row.code}</code>
                    </td>
                    <td className="py-3 pr-4 text-sm">
                      {row.discountType === "percentage"
                        ? `${row.discountValue}%`
                        : `$${(row.discountValue / 100).toFixed(2)}`}
                    </td>
                    <td className="py-3 pr-4 text-sm text-muted">
                      {row.productTitle ?? "All products"}
                    </td>
                    <td className="py-3 pr-4 text-sm">
                      {row.redemptionCount}
                      {row.maxRedemptions !== null && ` / ${row.maxRedemptions}`}
                      {isExhausted && (
                        <span className="ml-2 text-xs text-red-600 font-medium">exhausted</span>
                      )}
                    </td>
                    <td className="py-3 pr-4 text-sm text-muted">
                      {row.expiresAt
                        ? new Date(row.expiresAt).toLocaleDateString()
                        : "Never"}
                      {isExpired && (
                        <span className="ml-2 text-xs text-red-600 font-medium">expired</span>
                      )}
                    </td>
                    <td className="py-3">
                      <CouponToggle couponId={row.id} active={row.active} />
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

**Step 2: Create the CouponToggle client component**

`src/components/coupon-toggle.tsx`:

```typescript
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface CouponToggleProps {
  couponId: string;
  active: boolean;
}

export function CouponToggle({ couponId, active: initialActive }: CouponToggleProps) {
  const router = useRouter();
  const [active, setActive] = useState(initialActive);
  const [loading, setLoading] = useState(false);

  async function toggle() {
    setLoading(true);
    try {
      const res = await fetch(`/api/coupons/${couponId}`, {
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

**Step 3: Verify build**

Run: `pnpm build`
Expected: Build succeeds.

**Step 4: Commit**

```bash
git add src/app/\(platform\)/dashboard/coupons/page.tsx src/components/coupon-toggle.tsx
git commit -m "feat: add coupons list page in creator dashboard (#25)"
```

---

### Task 8: Dashboard — New coupon form

**Files:**
- Create: `src/app/(platform)/dashboard/coupons/new/page.tsx`

**Step 1: Create the new coupon form page**

Client component form following the same pattern as `dashboard/products/new/page.tsx`.

```typescript
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { NumericInput } from "@/components/ui/numeric-input";

export default function NewCouponPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [code, setCode] = useState("");
  const [discountType, setDiscountType] = useState<"percentage" | "fixed">("percentage");
  const [discountValue, setDiscountValue] = useState("");
  const [productId, setProductId] = useState("");
  const [minAmount, setMinAmount] = useState("");
  const [maxRedemptions, setMaxRedemptions] = useState("");
  const [expiresAt, setExpiresAt] = useState("");

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
          setProducts(data.map((p: { product: { id: string; title: string } }) => ({
            id: p.product.id,
            title: p.product.title,
          })));
        }
      })
      .catch(() => {});
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const value = discountType === "percentage"
        ? parseInt(discountValue, 10)
        : Math.round(parseFloat(discountValue) * 100);

      if (isNaN(value) || value <= 0) {
        throw new Error("Invalid discount value");
      }

      const body: Record<string, unknown> = {
        code: code.toUpperCase().trim(),
        discountType,
        discountValue: value,
      };

      if (productId) body.productId = productId;
      if (minAmount) body.minAmountCents = Math.round(parseFloat(minAmount) * 100);
      if (maxRedemptions) body.maxRedemptions = parseInt(maxRedemptions, 10);
      if (expiresAt) body.expiresAt = new Date(expiresAt).toISOString();

      const res = await fetch("/api/coupons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create coupon");
      }

      router.push("/dashboard/coupons");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="max-w-2xl mx-auto px-4 py-16">
      <h1 className="text-3xl font-bold">New Coupon</h1>
      <form onSubmit={handleSubmit} className="mt-8 space-y-6">
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
          <label className="block text-sm font-medium mb-1">Discount Type</label>
          <select
            value={discountType}
            onChange={(e) => setDiscountType(e.target.value as "percentage" | "fixed")}
            className="w-full border border-border rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-accent"
          >
            <option value="percentage">Percentage (%)</option>
            <option value="fixed">Fixed Amount ($)</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            {discountType === "percentage" ? "Discount (%)" : "Discount Amount (USD)"}
          </label>
          <NumericInput
            value={discountValue}
            onChange={setDiscountValue}
            allowDecimals={discountType === "fixed"}
            placeholder={discountType === "percentage" ? "20" : "5.00"}
            required
            className="w-full border border-border rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-accent"
          />
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
              <option key={p.id} value={p.id}>{p.title}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Minimum Order Amount (optional, USD)</label>
          <NumericInput
            value={minAmount}
            onChange={setMinAmount}
            allowDecimals
            placeholder="0.00"
            className="w-full border border-border rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-accent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Max Redemptions (optional)</label>
          <NumericInput
            value={maxRedemptions}
            onChange={setMaxRedemptions}
            placeholder="Unlimited"
            className="w-full border border-border rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-accent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Expires At (optional)</label>
          <input
            type="date"
            value={expiresAt}
            onChange={(e) => setExpiresAt(e.target.value)}
            min={new Date().toISOString().split("T")[0]}
            className="w-full border border-border rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-accent"
          />
        </div>

        {error && <p className="text-red-600 text-sm">{error}</p>}

        <div className="flex gap-4">
          <button
            type="submit"
            disabled={loading}
            className="bg-accent text-white px-8 py-3 rounded-full font-semibold hover:opacity-85 transition-colors disabled:opacity-50"
          >
            {loading ? "Creating..." : "Create Coupon"}
          </button>
          <a
            href="/dashboard/coupons"
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

**Step 2: Create the NumericInput component (per CLAUDE.md guidelines)**

`src/components/ui/numeric-input.tsx`:

```typescript
"use client";

import { useCallback } from "react";

interface NumericInputProps {
  value: string;
  onChange: (value: string) => void;
  allowDecimals?: boolean;
  placeholder?: string;
  required?: boolean;
  className?: string;
}

export function NumericInput({
  value,
  onChange,
  allowDecimals = false,
  placeholder,
  required,
  className,
}: NumericInputProps) {
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      if (val === "") {
        onChange(val);
        return;
      }
      const pattern = allowDecimals ? /^\d*\.?\d{0,2}$/ : /^\d*$/;
      if (pattern.test(val)) {
        onChange(val);
      }
    },
    [allowDecimals, onChange]
  );

  return (
    <input
      type="text"
      inputMode={allowDecimals ? "decimal" : "numeric"}
      value={value}
      onChange={handleChange}
      placeholder={placeholder}
      required={required}
      className={className}
    />
  );
}
```

**Step 3: Verify build**

Run: `pnpm build`
Expected: Build succeeds.

**Step 4: Commit**

```bash
git add src/app/\(platform\)/dashboard/coupons/new/page.tsx src/components/ui/numeric-input.tsx
git commit -m "feat: add new coupon form and NumericInput component (#25)"
```

---

### Task 9: API — Add `mine=true` filter to products endpoint

**Files:**
- Modify: `src/app/api/products/route.ts`

**Step 1: Support `mine=true` query param**

The new coupon form needs to fetch the creator's own products. Add a `mine=true` filter to the existing GET handler. When `mine=true` is passed, require auth and filter by the authenticated creator's ID.

In the existing GET handler, add this block at the top of the function before the existing query logic:

```typescript
// If ?mine=true, return authenticated creator's products
if (req.nextUrl.searchParams.get("mine") === "true") {
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

  const myProducts = await db
    .select({ product: products, creatorSlug: creators.slug })
    .from(products)
    .innerJoin(creators, eq(products.creatorId, creators.id))
    .where(eq(products.creatorId, creator.id))
    .orderBy(desc(products.createdAt));

  return NextResponse.json(myProducts);
}
```

Note: This requires importing `auth` from `@/lib/auth` if not already imported. Check the existing file — it already imports `auth` for the POST handler.

**Step 2: Verify build**

Run: `pnpm build`
Expected: Build succeeds.

**Step 3: Commit**

```bash
git add src/app/api/products/route.ts
git commit -m "feat: add mine=true filter to products API for coupon form (#25)"
```

---

### Task 10: Product page — Coupon input on BuyButton

**Files:**
- Modify: `src/components/buy-button.tsx`

**Step 1: Add coupon input to BuyButton**

Add a "Have a discount code?" link below the buy button that expands an inline input field. When a valid code is applied, show the discounted price and pass the code to checkout.

Replace the entire `buy-button.tsx` with the updated version that includes coupon support:

```typescript
"use client";

import { useState } from "react";

interface BuyButtonProps {
  productId: string;
  hasStripe: boolean;
  primaryColor?: string;
  priceCents: number;
  currency: string;
}

const GENERIC_ERROR = "Something went wrong. Please try again.";

export function BuyButton({ productId, hasStripe, primaryColor, priceCents, currency }: BuyButtonProps) {
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Coupon state
  const [showCoupon, setShowCoupon] = useState(false);
  const [couponCode, setCouponCode] = useState("");
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [appliedCoupon, setAppliedCoupon] = useState<{
    code: string;
    discountType: string;
    discountValue: number;
    discountedPriceCents: number;
  } | null>(null);

  async function validateCoupon() {
    if (!couponCode.trim()) return;
    setCouponLoading(true);
    setCouponError(null);

    try {
      const res = await fetch("/api/coupons/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: couponCode.trim(), productId }),
      });
      const data = await res.json();

      if (!data.valid) {
        setCouponError(data.error || "Invalid code");
        setAppliedCoupon(null);
        return;
      }

      setAppliedCoupon({
        code: couponCode.trim().toUpperCase(),
        discountType: data.discountType,
        discountValue: data.discountValue,
        discountedPriceCents: data.discountedPriceCents,
      });
      setCouponError(null);
    } catch {
      setCouponError("Failed to validate code");
    } finally {
      setCouponLoading(false);
    }
  }

  function removeCoupon() {
    setAppliedCoupon(null);
    setCouponCode("");
    setCouponError(null);
  }

  async function handleClick() {
    if (hasStripe) {
      setLoading(true);
      setError(null);
      try {
        const body: Record<string, string> = { productId };
        if (appliedCoupon) body.couponCode = appliedCoupon.code;

        const res = await fetch("/api/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error ?? GENERIC_ERROR);
          return;
        }
        if (data.url) {
          window.location.href = data.url;
          return;
        }
        setError(GENERIC_ERROR);
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

  const displayPrice = appliedCoupon ? appliedCoupon.discountedPriceCents : priceCents;
  const currencySymbol = currency.toUpperCase() === "USD" ? "$" : currency.toUpperCase();

  return (
    <>
      <div>
        {/* Price display */}
        <div className="flex items-center gap-3 mb-4">
          <span
            className="text-3xl font-bold"
            style={{ color: primaryColor }}
          >
            {currencySymbol}{(displayPrice / 100).toFixed(2)}
          </span>
          {appliedCoupon && (
            <span className="text-lg line-through opacity-50">
              {currencySymbol}{(priceCents / 100).toFixed(2)}
            </span>
          )}
          {appliedCoupon && (
            <span className="text-sm font-medium text-green-600">
              {appliedCoupon.discountType === "percentage"
                ? `-${appliedCoupon.discountValue}%`
                : `-${currencySymbol}${(appliedCoupon.discountValue / 100).toFixed(2)}`}
            </span>
          )}
        </div>

        <button
          onClick={handleClick}
          disabled={loading}
          className="text-white px-8 py-3 rounded-lg text-lg font-semibold transition-colors disabled:opacity-50"
          style={{
            backgroundColor: primaryColor ?? "#000000",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.85")}
          onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
        >
          {loading ? "Loading..." : "Buy Now"}
        </button>
        {error && (
          <p className="mt-2 text-sm text-red-600">{error}</p>
        )}

        {/* Coupon section */}
        {hasStripe && !showCoupon && !appliedCoupon && (
          <button
            onClick={() => setShowCoupon(true)}
            className="mt-3 block text-sm opacity-60 hover:opacity-100 transition-opacity underline"
          >
            Have a discount code?
          </button>
        )}

        {hasStripe && showCoupon && !appliedCoupon && (
          <div className="mt-3 flex gap-2">
            <input
              type="text"
              value={couponCode}
              onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
              placeholder="Enter code"
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono uppercase w-36 focus:outline-none focus:ring-2 focus:ring-gray-400"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  validateCoupon();
                }
              }}
            />
            <button
              onClick={validateCoupon}
              disabled={couponLoading || !couponCode.trim()}
              className="border border-gray-300 rounded-lg px-4 py-2 text-sm font-semibold hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              {couponLoading ? "..." : "Apply"}
            </button>
          </div>
        )}

        {appliedCoupon && (
          <div className="mt-3 flex items-center gap-2 text-sm">
            <span className="font-mono font-semibold text-green-600">{appliedCoupon.code}</span>
            <span className="text-green-600">applied</span>
            <button
              onClick={removeCoupon}
              className="text-red-500 hover:text-red-700 underline text-xs"
            >
              Remove
            </button>
          </div>
        )}

        {couponError && (
          <p className="mt-2 text-sm text-red-600">{couponError}</p>
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

**Step 2: Update product page to pass price and currency to BuyButton**

Modify `src/app/[slug]/[productSlug]/page.tsx`.

The current BuyButton usage (around line 128-131):

```tsx
<BuyButton
  productId={product.id}
  hasStripe={!!creator.stripeConnectId}
  primaryColor={theme.primaryColor}
/>
```

Change to:

```tsx
<BuyButton
  productId={product.id}
  hasStripe={!!creator.stripeConnectId}
  primaryColor={theme.primaryColor}
  priceCents={product.priceCents}
  currency={product.currency}
/>
```

Also remove the static price display that was previously above the BuyButton (around line 121-127), since the BuyButton now handles price display internally:

Remove:
```tsx
<div className="mt-8 flex items-center gap-4">
  <span
    className="text-3xl font-bold"
    style={{ color: theme.primaryColor }}
  >
    ${(product.priceCents / 100).toFixed(2)}
  </span>
  <BuyButton ... />
</div>
```

Replace with:
```tsx
<div className="mt-8">
  <BuyButton
    productId={product.id}
    hasStripe={!!creator.stripeConnectId}
    primaryColor={theme.primaryColor}
    priceCents={product.priceCents}
    currency={product.currency}
  />
</div>
```

**Step 3: Verify build**

Run: `pnpm build`
Expected: Build succeeds.

**Step 4: Commit**

```bash
git add src/components/buy-button.tsx src/app/\[slug\]/\[productSlug\]/page.tsx
git commit -m "feat: add coupon input to product page BuyButton (#25)"
```

---

### Task 11: Dashboard — Add coupons link to navigation

**Files:**
- Modify: `src/app/(platform)/dashboard/page.tsx`

**Step 1: Add Coupons link to dashboard quick actions**

In the dashboard page, add a "Coupons" link in the quick actions section (around line 110-128), next to "Manage Products" and "View Orders":

Add after the "View Orders" Link:

```tsx
<Link
  href="/dashboard/coupons"
  className="border border-border px-6 py-3 rounded-full font-semibold hover:border-ink transition-colors"
>
  Coupons
</Link>
```

**Step 2: Verify build**

Run: `pnpm build`
Expected: Build succeeds.

**Step 3: Commit**

```bash
git add src/app/\(platform\)/dashboard/page.tsx
git commit -m "feat: add coupons link to dashboard navigation (#25)"
```

---

### Task 12: Final verification

**Step 1: Full build**

Run: `pnpm build`
Expected: Build succeeds with all new routes visible.

**Step 2: Verify all new routes appear**

Expected routes in build output:
- `/api/coupons` (GET, POST)
- `/api/coupons/[id]` (PUT)
- `/api/coupons/validate` (POST)
- `/dashboard/coupons`
- `/dashboard/coupons/new`

**Step 3: Manual smoke test checklist**

- [ ] Dashboard shows "Coupons" link
- [ ] `/dashboard/coupons` loads with empty state
- [ ] `/dashboard/coupons/new` shows form with pre-generated code
- [ ] Creating a percentage coupon works
- [ ] Creating a fixed amount coupon works
- [ ] Toggle active/inactive works on list page
- [ ] Product page shows "Have a discount code?" link
- [ ] Entering a valid code shows discounted price
- [ ] Entering an invalid code shows error
- [ ] Checkout with coupon applies correct price
- [ ] Order records coupon_id in database
