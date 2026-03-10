# Editorial Redesign — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Redesign all platform UI with an editorial/magazine aesthetic — distinctive typography, warm palette, generous spacing, subtle animations.

**Architecture:** Replace Geist fonts with Playfair Display + DM Sans via `next/font/google`. Add CSS custom properties for the editorial palette and fadeUp animation in `globals.css`. Then update each page/component file to use the new design tokens and typography. No new dependencies.

**Tech Stack:** Next.js App Router, Tailwind CSS, next/font/google, CSS custom properties, CSS @keyframes

**Design doc:** `docs/plans/2026-03-10-editorial-redesign-design.md`

---

### Task 1: Design system foundations — fonts, palette, animations

**Files:**
- Modify: `src/app/layout.tsx`
- Modify: `src/app/globals.css`

**Step 1: Update root layout to use Playfair Display + DM Sans**

Replace Geist fonts with the new editorial fonts in `src/app/layout.tsx`:

```tsx
import type { Metadata } from "next";
import { Playfair_Display, DM_Sans } from "next/font/google";
import "./globals.css";

const playfair = Playfair_Display({
  variable: "--font-display",
  subsets: ["latin"],
  display: "swap",
});

const dmSans = DM_Sans({
  variable: "--font-body",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Fooshop — AI-powered marketplace for digital products",
  description:
    "Sell digital products with zero fixed costs. AI generates your storefront, MCP server exposes your catalog to AI agents.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${playfair.variable} ${dmSans.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
```

**Step 2: Update globals.css with editorial palette and animations**

Replace entire `src/app/globals.css`:

```css
@import "tailwindcss";

:root {
  --ink: #1a1a1a;
  --paper: #faf9f7;
  --accent: #e85d04;
  --muted: #6b6b6b;
  --border: #e5e2dd;
  --surface: #ffffff;
}

@theme inline {
  --color-ink: var(--ink);
  --color-paper: var(--paper);
  --color-accent: var(--accent);
  --color-muted: var(--muted);
  --color-border: var(--border);
  --color-surface: var(--surface);
  --font-display: var(--font-display);
  --font-body: var(--font-body);
}

body {
  background: var(--paper);
  color: var(--ink);
  font-family: var(--font-body), ui-sans-serif, system-ui, sans-serif;
}

h1, h2, h3 {
  font-family: var(--font-display), ui-serif, Georgia, serif;
}

@keyframes fadeUp {
  from {
    opacity: 0;
    transform: translateY(16px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.animate-fade-up {
  animation: fadeUp 0.5s ease-out both;
}

.stagger-1 { animation-delay: 0ms; }
.stagger-2 { animation-delay: 80ms; }
.stagger-3 { animation-delay: 160ms; }
.stagger-4 { animation-delay: 240ms; }
.stagger-5 { animation-delay: 320ms; }
.stagger-6 { animation-delay: 400ms; }
```

**Step 3: Verify build**

Run: `pnpm build`
Expected: Build succeeds. All pages now use the warm background and DM Sans body font. h1/h2/h3 use Playfair Display.

**Step 4: Commit**

```bash
git add src/app/layout.tsx src/app/globals.css
git commit -m "feat: add editorial design system — fonts, palette, animations"
```

---

### Task 2: Navbar redesign

**Files:**
- Modify: `src/components/navbar.tsx`

**Step 1: Rewrite the navbar component**

Replace the entire content of `src/components/navbar.tsx`:

```tsx
import { auth, signIn, signOut } from "@/lib/auth";
import Link from "next/link";

export async function Navbar() {
  const session = await auth();
  const initials = session?.user?.name
    ? session.user.name.charAt(0).toUpperCase()
    : "?";

  return (
    <nav className="sticky top-0 z-50 backdrop-blur-sm bg-paper/80">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link
          href="/"
          className="font-[family-name:var(--font-display)] text-xl font-bold italic text-ink"
        >
          fooshop.
        </Link>
        <div className="flex items-center gap-6">
          <Link
            href="/explore"
            className="text-sm font-medium text-muted hover:text-ink transition-colors relative after:absolute after:bottom-[-2px] after:left-1/2 after:w-0 after:h-[1.5px] after:bg-accent after:transition-all after:duration-200 hover:after:left-0 hover:after:w-full"
          >
            Explore
          </Link>
          {session?.user ? (
            <>
              <Link
                href="/dashboard"
                className="text-sm font-medium text-muted hover:text-ink transition-colors relative after:absolute after:bottom-[-2px] after:left-1/2 after:w-0 after:h-[1.5px] after:bg-accent after:transition-all after:duration-200 hover:after:left-0 hover:after:w-full"
              >
                Dashboard
              </Link>
              <form
                action={async () => {
                  "use server";
                  await signOut();
                }}
              >
                <button
                  type="submit"
                  className="w-8 h-8 rounded-full bg-ink text-white text-xs font-bold flex items-center justify-center hover:bg-accent transition-colors"
                  title="Sign out"
                >
                  {initials}
                </button>
              </form>
            </>
          ) : (
            <form
              action={async () => {
                "use server";
                await signIn("google");
              }}
            >
              <button
                type="submit"
                className="text-sm font-medium border border-border px-4 py-1.5 rounded-full hover:bg-ink hover:text-white hover:border-ink transition-colors"
              >
                Sign in
              </button>
            </form>
          )}
        </div>
      </div>
    </nav>
  );
}
```

**Step 2: Verify build**

Run: `pnpm build`
Expected: Build succeeds

**Step 3: Commit**

```bash
git add src/components/navbar.tsx
git commit -m "feat: editorial navbar with logo, animated underlines, avatar"
```

---

### Task 3: Landing page redesign

**Files:**
- Modify: `src/app/(platform)/page.tsx`

**Step 1: Rewrite the landing page**

Replace entire content of `src/app/(platform)/page.tsx`:

```tsx
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Fooshop — AI-powered marketplace for digital products",
  description:
    "Sell digital products with zero fixed costs. AI generates your storefront. 5% commission only when you sell.",
};

export default function Home() {
  return (
    <main>
      {/* Hero */}
      <section className="max-w-4xl mx-auto px-4 py-32 animate-fade-up">
        <h1 className="text-5xl md:text-6xl font-bold leading-tight tracking-tight">
          Sell digital products
          <br />
          with zero upfront costs.
        </h1>
        <p className="mt-6 text-lg md:text-xl text-muted max-w-xl">
          AI-powered storefronts. 5% only when you sell.
        </p>
        <div className="mt-10 flex gap-4">
          <a
            href="/onboarding"
            className="bg-accent text-white px-8 py-4 rounded-full text-lg font-semibold hover:opacity-85 transition-opacity"
          >
            Start Selling
          </a>
          <a
            href="/explore"
            className="border border-border text-ink px-8 py-4 rounded-full text-lg font-semibold hover:border-ink transition-colors"
          >
            Explore Products &rarr;
          </a>
        </div>
      </section>

      {/* How it works */}
      <section className="max-w-5xl mx-auto px-4 py-20">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
          {[
            {
              num: "01.",
              title: "Describe your store",
              desc: "AI generates your storefront, copy, and product listings in 30 seconds.",
            },
            {
              num: "02.",
              title: "Upload your products",
              desc: "Set your price, we handle the rest. Templates, ebooks, courses, anything digital.",
            },
            {
              num: "03.",
              title: "Get paid instantly",
              desc: "5% commission. That's it. No subscription, no hidden fees.",
            },
          ].map((step, i) => (
            <div key={step.num} className={`animate-fade-up stagger-${i + 1}`}>
              <span className="font-[family-name:var(--font-display)] text-5xl font-bold text-accent/30">
                {step.num}
              </span>
              <h3 className="mt-3 text-xl font-semibold">{step.title}</h3>
              <p className="mt-2 text-muted">{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="max-w-5xl mx-auto px-4 pb-20">
        <div className="bg-ink text-white rounded-2xl px-8 py-16 text-center">
          <h2 className="text-3xl md:text-4xl font-bold">
            Ready to start selling?
          </h2>
          <p className="mt-4 text-white/60">
            Templates, ebooks, courses, presets, prompts, assets — any digital product.
          </p>
          <a
            href="/onboarding"
            className="mt-8 inline-block bg-accent text-white px-8 py-4 rounded-full text-lg font-semibold hover:opacity-85 transition-opacity"
          >
            Create your store &rarr;
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="text-center py-8 text-sm text-muted">
        &copy; 2026 Fooshop
      </footer>
    </main>
  );
}
```

**Step 2: Verify build**

Run: `pnpm build`
Expected: Build succeeds

**Step 3: Commit**

```bash
git add src/app/\(platform\)/page.tsx
git commit -m "feat: editorial landing page with hero, how-it-works, CTA"
```

---

### Task 4: Explore page redesign

**Files:**
- Modify: `src/app/(platform)/explore/page.tsx`

**Step 1: Rewrite the explore page**

Replace entire content of `src/app/(platform)/explore/page.tsx`:

```tsx
export const dynamic = "force-dynamic";

import { db } from "@/db";
import { products, creators } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import type { Metadata } from "next";
import { CATEGORIES, categoryLabel } from "@/lib/categories";
import { r2PublicUrl } from "@/lib/r2-url";

export const metadata: Metadata = {
  title: "Explore Digital Products | Fooshop",
  description:
    "Discover digital products from creators worldwide. Templates, presets, LUTs, prompts, and more.",
};

const EXPLORE_CATEGORIES = CATEGORIES.filter((c) => c !== "other");

export default async function ExplorePage() {
  const results = await db
    .select({
      product: products,
      creatorSlug: creators.slug,
      creatorName: creators.storeName,
    })
    .from(products)
    .innerJoin(creators, eq(products.creatorId, creators.id))
    .where(eq(products.status, "published"))
    .orderBy(desc(products.createdAt))
    .limit(50);

  return (
    <main className="max-w-6xl mx-auto px-4 py-16">
      {/* Header */}
      <div className="animate-fade-up">
        <h1 className="text-4xl md:text-5xl font-bold">Explore</h1>
        <p className="mt-3 text-lg text-muted">
          Curated digital products from independent creators.
        </p>
      </div>

      {/* Category filters */}
      <nav className="mt-10 flex gap-2 flex-wrap animate-fade-up stagger-2">
        <a
          href="/explore"
          className="px-4 py-1.5 rounded-full text-sm font-medium bg-ink text-white"
        >
          All
        </a>
        {EXPLORE_CATEGORIES.map((cat) => (
          <a
            key={cat}
            href={`/explore?category=${cat}`}
            className="px-4 py-1.5 rounded-full text-sm font-medium border border-border text-muted hover:text-ink hover:border-ink transition-colors"
          >
            {categoryLabel(cat)}
          </a>
        ))}
      </nav>

      {/* Product grid — magazine layout */}
      <div className="mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {results.map(({ product, creatorSlug, creatorName }, i) => {
          const isFeatured = i === 0;
          return (
            <a
              key={product.id}
              href={`/${creatorSlug}/${product.slug}`}
              className={`group block border border-border rounded-xl overflow-hidden hover:-translate-y-1 hover:shadow-lg transition-all duration-200 animate-fade-up stagger-${Math.min(i + 1, 6)} ${
                isFeatured ? "md:row-span-2" : ""
              }`}
            >
              {r2PublicUrl(product.coverImageUrl) && (
                <img
                  src={r2PublicUrl(product.coverImageUrl)!}
                  alt={product.title}
                  className={`w-full object-cover ${
                    isFeatured ? "aspect-[3/4]" : "aspect-[4/3]"
                  }`}
                />
              )}
              <div className="p-5">
                <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold group-hover:text-accent transition-colors">
                  {product.title}
                </h2>
                <p className="text-sm text-muted mt-1">by {creatorName}</p>
                <p className="mt-3 text-base font-semibold">
                  ${(product.priceCents / 100).toFixed(2)}
                </p>
              </div>
            </a>
          );
        })}
      </div>

      {results.length === 0 && (
        <p className="mt-16 text-center text-muted">
          No products yet. Be the first to sell!
        </p>
      )}
    </main>
  );
}
```

**Step 2: Verify build**

Run: `pnpm build`
Expected: Build succeeds

**Step 3: Commit**

```bash
git add src/app/\(platform\)/explore/page.tsx
git commit -m "feat: editorial explore page with magazine grid and pill filters"
```

---

### Task 5: Dashboard hub redesign

**Files:**
- Modify: `src/app/(platform)/dashboard/page.tsx`
- Modify: `src/components/stripe-cta.tsx`

**Step 1: Rewrite the dashboard hub**

Replace entire content of `src/app/(platform)/dashboard/page.tsx`:

```tsx
export const dynamic = "force-dynamic";

import { auth } from "@/lib/auth";
import { db } from "@/db";
import { creators, products, orders } from "@/db/schema";
import { eq, sql, desc } from "drizzle-orm";
import { redirect } from "next/navigation";
import Link from "next/link";
import { StripeCTA } from "@/components/stripe-cta";
import { StripeToast } from "@/components/stripe-toast";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/api/auth/signin");

  const creator = await db
    .select()
    .from(creators)
    .where(eq(creators.userId, session.user.id))
    .then((rows) => rows[0]);

  if (!creator) redirect("/onboarding");

  const stripeCheckPromise = creator.stripeConnectId
    ? import("@/lib/stripe")
        .then(({ getStripe }) => getStripe().accounts.retrieve(creator.stripeConnectId!))
        .then((account) => !!account.charges_enabled)
        .catch(() => false)
    : Promise.resolve(false);

  const [stripeReady, [stats], [orderStats], recentOrders] = await Promise.all([
    stripeCheckPromise,
    db
      .select({
        totalProducts: sql<number>`count(distinct ${products.id})`,
      })
      .from(products)
      .where(eq(products.creatorId, creator.id)),
    db
      .select({
        totalOrders: sql<number>`count(*)`,
        totalRevenue: sql<number>`coalesce(sum(${orders.amountCents} - ${orders.platformFeeCents}), 0)`,
      })
      .from(orders)
      .where(eq(orders.creatorId, creator.id)),
    db
      .select()
      .from(orders)
      .where(eq(orders.creatorId, creator.id))
      .orderBy(desc(orders.createdAt))
      .limit(5),
  ]);

  const statCards = [
    { label: "Products", value: Number(stats.totalProducts) },
    { label: "Orders", value: Number(orderStats.totalOrders) },
    {
      label: "Revenue",
      value: `$${(Number(orderStats.totalRevenue) / 100).toFixed(2)}`,
    },
  ];

  return (
    <main className="max-w-5xl mx-auto px-4 py-16">
      <StripeToast />

      {/* Header */}
      <div className="flex justify-between items-start animate-fade-up">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold">Dashboard</h1>
          <p className="text-muted mt-1">{creator.storeName}</p>
        </div>
        <div className="flex gap-4 text-sm">
          <Link
            href="/dashboard/store"
            className="text-muted hover:text-ink transition-colors"
          >
            Edit store
          </Link>
          <Link
            href={`/${creator.slug}`}
            className="text-accent font-medium hover:opacity-80 transition-opacity"
          >
            View store &rarr;
          </Link>
        </div>
      </div>

      {/* Stat cards */}
      <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-6">
        {statCards.map((stat, i) => (
          <div
            key={stat.label}
            className={`bg-surface border border-border rounded-xl p-6 animate-fade-up stagger-${i + 1}`}
          >
            <p className="text-sm text-muted">{stat.label}</p>
            <p className="text-3xl font-bold mt-1">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Stripe CTA */}
      {!stripeReady && (
        <div className="mt-8 animate-fade-up stagger-4">
          <StripeCTA creatorId={creator.id} />
        </div>
      )}

      {/* Quick actions */}
      <div className="mt-8 flex flex-wrap gap-3 animate-fade-up stagger-4">
        <Link
          href="/dashboard/products"
          className="bg-accent text-white px-6 py-3 rounded-full font-semibold hover:opacity-85 transition-opacity"
        >
          Manage Products
        </Link>
        <Link
          href="/dashboard/orders"
          className="border border-border px-6 py-3 rounded-full font-semibold hover:border-ink transition-colors"
        >
          View Orders
        </Link>
        {stripeReady && (
          <span className="text-sm text-green-700 font-medium flex items-center gap-1 px-3">
            Stripe connected
          </span>
        )}
      </div>

      {/* Recent orders */}
      {recentOrders.length > 0 && (
        <div className="mt-14 animate-fade-up stagger-5">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold">Recent Orders</h2>
            <Link
              href="/dashboard/orders"
              className="text-sm text-muted hover:text-ink transition-colors"
            >
              View all &rarr;
            </Link>
          </div>
          <div className="mt-4 border border-border rounded-xl divide-y divide-border overflow-hidden">
            {recentOrders.map((order) => (
              <div
                key={order.id}
                className="px-5 py-4 flex justify-between items-center hover:bg-paper/50 transition-colors"
              >
                <div>
                  <p className="font-medium text-sm">{order.buyerEmail}</p>
                  <p className="text-xs text-muted mt-0.5">
                    {new Date(order.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <p className="font-semibold">
                  ${(order.amountCents / 100).toFixed(2)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </main>
  );
}
```

**Step 2: Update Stripe CTA component**

Replace entire content of `src/components/stripe-cta.tsx`:

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
    <div className="border border-accent/30 bg-accent/5 rounded-xl p-5 flex items-center justify-between gap-4">
      <div>
        {intentCount > 0 ? (
          <>
            <p className="font-semibold text-accent">
              Stai perdendo vendite!
            </p>
            <p className="text-sm text-muted mt-0.5">
              {intentCount} {intentCount === 1 ? "persona ha" : "persone hanno"} provato ad acquistare i tuoi prodotti
            </p>
          </>
        ) : (
          <p className="text-muted">Collega Stripe per ricevere pagamenti</p>
        )}
      </div>
      <ConnectStripeButton />
    </div>
  );
}
```

**Step 3: Verify build**

Run: `pnpm build`
Expected: Build succeeds

**Step 4: Commit**

```bash
git add src/app/\(platform\)/dashboard/page.tsx src/components/stripe-cta.tsx
git commit -m "feat: editorial dashboard hub with stat cards and styled Stripe CTA"
```

---

### Task 6: Products list + Orders page redesign

**Files:**
- Modify: `src/app/(platform)/dashboard/products/page.tsx`
- Modify: `src/app/(platform)/dashboard/orders/page.tsx`

**Step 1: Rewrite products list page**

Replace entire content of `src/app/(platform)/dashboard/products/page.tsx`:

```tsx
export const dynamic = "force-dynamic";

import { auth } from "@/lib/auth";
import { db } from "@/db";
import { creators, products } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { redirect } from "next/navigation";
import { r2PublicUrl } from "@/lib/r2-url";

export default async function ProductsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/api/auth/signin");

  const creator = await db
    .select()
    .from(creators)
    .where(eq(creators.userId, session.user.id))
    .then((rows) => rows[0]);

  if (!creator) redirect("/onboarding");

  const creatorProducts = await db
    .select()
    .from(products)
    .where(eq(products.creatorId, creator.id))
    .orderBy(desc(products.createdAt));

  return (
    <main className="max-w-5xl mx-auto px-4 py-16">
      <div className="flex justify-between items-center animate-fade-up">
        <h1 className="text-3xl font-bold">Products</h1>
        <a
          href="/dashboard/products/new"
          className="bg-accent text-white px-6 py-2.5 rounded-full font-semibold text-sm hover:opacity-85 transition-opacity"
        >
          + New Product
        </a>
      </div>

      {creatorProducts.length === 0 ? (
        <p className="mt-16 text-center text-muted">
          No products yet. Create your first one!
        </p>
      ) : (
        <div className="mt-8 border border-border rounded-xl divide-y divide-border overflow-hidden">
          {creatorProducts.map((product, i) => (
            <a
              key={product.id}
              href={`/dashboard/products/${product.id}/edit`}
              className={`flex items-center gap-4 px-5 py-4 hover:bg-paper/50 transition-colors animate-fade-up stagger-${Math.min(i + 1, 6)}`}
            >
              {r2PublicUrl(product.coverImageUrl) ? (
                <img
                  src={r2PublicUrl(product.coverImageUrl)!}
                  alt=""
                  className="w-10 h-10 rounded-md object-cover shrink-0"
                />
              ) : (
                <div className="w-10 h-10 rounded-md bg-border shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{product.title}</p>
                <p className="text-sm text-muted">
                  ${(product.priceCents / 100).toFixed(2)}
                </p>
              </div>
              <span
                className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                  product.status === "published"
                    ? "bg-ink text-white"
                    : "bg-border text-muted"
                }`}
              >
                {product.status}
              </span>
            </a>
          ))}
        </div>
      )}

      <a
        href="/dashboard"
        className="mt-8 inline-block text-sm text-muted hover:text-ink transition-colors"
      >
        &larr; Back to dashboard
      </a>
    </main>
  );
}
```

**Step 2: Rewrite orders page**

Replace entire content of `src/app/(platform)/dashboard/orders/page.tsx`:

```tsx
export const dynamic = "force-dynamic";

import { auth } from "@/lib/auth";
import { db } from "@/db";
import { creators, orders, products } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function OrdersPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/api/auth/signin");

  const creator = await db
    .select()
    .from(creators)
    .where(eq(creators.userId, session.user.id))
    .then((rows) => rows[0]);

  if (!creator) redirect("/onboarding");

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
    })
    .from(orders)
    .innerJoin(products, eq(orders.productId, products.id))
    .where(eq(orders.creatorId, creator.id))
    .orderBy(desc(orders.createdAt));

  return (
    <main className="max-w-5xl mx-auto px-4 py-16">
      <div className="flex justify-between items-center animate-fade-up">
        <div>
          <h1 className="text-3xl font-bold">Orders</h1>
          <p className="text-muted mt-1">
            {orderRows.length} {orderRows.length === 1 ? "order" : "orders"}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <a
            href="/api/orders/export?format=csv"
            className="border border-border px-4 py-2 rounded-full text-sm font-semibold hover:border-ink transition-colors"
          >
            Export CSV
          </a>
          <Link
            href="/dashboard"
            className="text-sm text-muted hover:text-ink transition-colors"
          >
            &larr; Dashboard
          </Link>
        </div>
      </div>

      {orderRows.length === 0 ? (
        <p className="text-muted mt-12 text-center">No orders yet.</p>
      ) : (
        <div className="mt-8 overflow-x-auto animate-fade-up stagger-2">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-border">
                <th className="py-3 pr-4 text-xs uppercase tracking-wider text-muted font-medium">Buyer</th>
                <th className="py-3 pr-4 text-xs uppercase tracking-wider text-muted font-medium">Product</th>
                <th className="py-3 pr-4 text-xs uppercase tracking-wider text-muted font-medium">Amount</th>
                <th className="py-3 pr-4 text-xs uppercase tracking-wider text-muted font-medium">Net</th>
                <th className="py-3 pr-4 text-xs uppercase tracking-wider text-muted font-medium">Status</th>
                <th className="py-3 text-xs uppercase tracking-wider text-muted font-medium">Date</th>
              </tr>
            </thead>
            <tbody>
              {orderRows.map((order) => (
                <tr
                  key={order.id}
                  className="border-b border-border hover:bg-paper/50 transition-colors"
                >
                  <td className="py-3 pr-4">
                    <p className="font-medium text-sm">{order.buyerEmail}</p>
                    {order.buyerName && (
                      <p className="text-xs text-muted">{order.buyerName}</p>
                    )}
                  </td>
                  <td className="py-3 pr-4 text-sm">{order.productTitle}</td>
                  <td className="py-3 pr-4 text-sm font-medium">
                    ${(order.amountCents / 100).toFixed(2)}
                  </td>
                  <td className="py-3 pr-4 text-sm">
                    ${((order.amountCents - order.platformFeeCents) / 100).toFixed(2)}
                  </td>
                  <td className="py-3 pr-4">
                    <StatusBadge status={order.status} />
                  </td>
                  <td className="py-3 text-sm text-muted">
                    {new Date(order.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}

type OrderStatus = (typeof import("@/db/schema").orderStatusEnum.enumValues)[number];

function StatusBadge({ status }: { status: OrderStatus }) {
  const styles: Record<OrderStatus, string> = {
    completed: "bg-green-50 text-green-700",
    refunded: "bg-red-50 text-red-700",
    pending: "bg-yellow-50 text-yellow-700",
  };

  return (
    <span
      className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium ${styles[status]}`}
    >
      {status}
    </span>
  );
}
```

**Step 3: Verify build**

Run: `pnpm build`
Expected: Build succeeds

**Step 4: Commit**

```bash
git add src/app/\(platform\)/dashboard/products/page.tsx src/app/\(platform\)/dashboard/orders/page.tsx
git commit -m "feat: editorial products list and orders table"
```

---

### Task 7: Store settings, product forms, and theme editor style update

**Files:**
- Modify: `src/app/(platform)/dashboard/store/page.tsx`
- Modify: `src/app/(platform)/dashboard/store/theme/page.tsx`
- Modify: `src/app/(platform)/dashboard/products/new/page.tsx`
- Modify: `src/app/(platform)/dashboard/products/[id]/edit/page.tsx`

These pages are client components with forms. The approach is consistent: update Tailwind classes to use editorial tokens (`--border`, `--accent`, `--muted`, `--paper`, `--surface`), Playfair for page titles, `rounded-xl`/`rounded-full` for inputs/buttons, `--accent` for primary actions.

**Step 1: Update store settings page**

In `src/app/(platform)/dashboard/store/page.tsx`, apply these changes:
- Page title h1: add no extra classes needed (globals.css already applies Playfair to h1)
- `max-w-2xl` → keep, add `py-16`
- All `border rounded-lg` → `border border-border rounded-xl`
- All `focus:ring-2 focus:ring-black` → `focus:ring-2 focus:ring-accent`
- Submit button `bg-black` → `bg-accent rounded-full`
- Cancel button `border` → `border border-border rounded-full`
- "Customize theme" link: `text-gray-500 hover:text-black` → `text-muted hover:text-ink`
- All `text-gray-*` → `text-muted`

**Step 2: Update theme editor page**

In `src/app/(platform)/dashboard/store/theme/page.tsx`, apply:
- h1 and h2: Playfair applied via globals
- All `border-gray-300` → `border-border`
- All `bg-indigo-600` → `bg-accent`
- All `hover:bg-indigo-700` → `hover:opacity-85`
- All `text-gray-500` / `text-gray-700` → `text-muted`
- All `hover:bg-gray-50` → `hover:bg-paper/50`
- All `bg-gray-100` (preview panel) → `bg-paper`
- All `rounded-md` → `rounded-xl` (for larger elements) or `rounded-lg` (for inputs)
- Error div: `bg-red-50 text-red-700` → keep (universal color for errors)

**Step 3: Update new product form**

In `src/app/(platform)/dashboard/products/new/page.tsx`, apply:
- `max-w-2xl` → keep, `py-12` → `py-16`
- All `border rounded-lg` → `border border-border rounded-xl`
- All `focus:ring-2 focus:ring-black` → `focus:ring-2 focus:ring-accent`
- Submit `bg-black` → `bg-accent rounded-full`
- Cancel → `border border-border rounded-full`
- All `text-gray-*` → `text-muted`
- Section labels: already h-level or label elements, keep DM Sans

**Step 4: Update edit product form**

In `src/app/(platform)/dashboard/products/[id]/edit/page.tsx`, apply same changes as new product form above.

**Step 5: Verify build**

Run: `pnpm build`
Expected: Build succeeds

**Step 6: Commit**

```bash
git add src/app/\(platform\)/dashboard/store/page.tsx src/app/\(platform\)/dashboard/store/theme/page.tsx src/app/\(platform\)/dashboard/products/new/page.tsx src/app/\(platform\)/dashboard/products/\[id\]/edit/page.tsx
git commit -m "feat: editorial styles for store settings, theme editor, product forms"
```

---

### Task 8: Onboarding + Checkout success redesign

**Files:**
- Modify: `src/app/(platform)/onboarding/onboarding-form.tsx`
- Modify: `src/app/(platform)/checkout/success/page.tsx`

**Step 1: Rewrite onboarding form**

Replace entire content of `src/app/(platform)/onboarding/onboarding-form.tsx`:

```tsx
"use client";

import { useState } from "react";
import type { StoreTheme } from "@/db/schema";

interface GeneratedStore {
  storeName: string;
  storeDescription: string;
  slug: string;
  suggestedProducts: {
    title: string;
    description: string;
    suggestedPriceCents: number;
    category: string;
    tags: string[];
  }[];
  theme: StoreTheme;
}

export default function OnboardingForm() {
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<GeneratedStore | null>(null);
  const [error, setError] = useState("");

  async function handleGenerate() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/store/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description }),
      });
      if (!res.ok) throw new Error("Failed to generate store");
      const data = await res.json();
      setResult(data);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (result) {
    return (
      <main className="max-w-2xl mx-auto px-4 py-20">
        <h1 className="text-4xl font-bold animate-fade-up">
          Your store is ready.
        </h1>
        <div className="mt-8 bg-surface border border-border rounded-xl p-8 animate-fade-up stagger-2">
          <h2 className="text-2xl font-bold">{result.storeName}</h2>
          <p className="mt-2 text-muted">{result.storeDescription}</p>
          <div className="mt-6">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted">
              Suggested products
            </h3>
            <ul className="mt-3 space-y-3">
              {result.suggestedProducts.map((product, i) => (
                <li
                  key={i}
                  className={`border border-border rounded-xl p-4 animate-fade-up stagger-${Math.min(i + 3, 6)}`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium">{product.title}</p>
                      <p className="text-sm text-muted mt-1">
                        {product.description}
                      </p>
                    </div>
                    <span className="text-lg font-bold whitespace-nowrap ml-4">
                      ${(product.suggestedPriceCents / 100).toFixed(2)}
                    </span>
                  </div>
                  <div className="mt-2 flex gap-1 flex-wrap">
                    {product.tags.map((tag) => (
                      <span
                        key={tag}
                        className="text-xs border border-border px-2 py-0.5 rounded-full text-muted"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="mt-8 flex gap-4 animate-fade-up stagger-5">
          <a
            href="/dashboard"
            className="bg-accent text-white px-6 py-3 rounded-full font-semibold hover:opacity-85 transition-opacity"
          >
            Go to Dashboard &rarr;
          </a>
          <button
            onClick={() => setResult(null)}
            className="border border-border px-6 py-3 rounded-full font-semibold hover:border-ink transition-colors"
          >
            Regenerate
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="max-w-2xl mx-auto px-4 py-20">
      <h1 className="text-4xl font-bold animate-fade-up">
        Set up your store
      </h1>
      <p className="mt-4 text-lg text-muted animate-fade-up stagger-2">
        Describe what you sell and AI will create your storefront in seconds.
      </p>
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="I sell Notion templates for project management and productivity. My audience is freelancers and small teams..."
        className="mt-8 w-full h-40 border border-border rounded-xl p-4 text-lg resize-none focus:outline-none focus:ring-2 focus:ring-accent bg-surface animate-fade-up stagger-3"
      />
      {error && <p className="mt-2 text-red-600 text-sm">{error}</p>}
      <button
        onClick={handleGenerate}
        disabled={loading || !description.trim()}
        className="mt-4 bg-accent text-white px-8 py-3 rounded-full text-lg font-semibold hover:opacity-85 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed animate-fade-up stagger-4"
      >
        {loading ? "Generating..." : "Generate my store →"}
      </button>
    </main>
  );
}
```

**Step 2: Rewrite checkout success page**

Replace entire content of `src/app/(platform)/checkout/success/page.tsx`:

```tsx
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

  let session;
  try {
    session = await getStripe().checkout.sessions.retrieve(session_id);
  } catch {
    redirect("/");
  }

  if (!session.payment_intent) redirect("/");

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
      {/* Check icon */}
      <div className="mx-auto w-16 h-16 bg-accent rounded-full flex items-center justify-center animate-fade-up">
        <svg
          className="w-8 h-8 text-white"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2.5}
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
        </svg>
      </div>

      <h1 className="mt-6 text-3xl font-bold animate-fade-up stagger-2">
        Purchase complete.
      </h1>

      {result ? (
        <div className="animate-fade-up stagger-3">
          <p className="mt-4 text-muted">
            {result.productTitle} &mdash; ${(result.amountCents / 100).toFixed(2)}{" "}
            {result.currency.toUpperCase()}
          </p>
          <a
            href={`/api/download/${result.token}`}
            className="mt-8 inline-block bg-accent text-white px-8 py-3 rounded-full text-lg font-semibold hover:opacity-85 transition-opacity"
          >
            Download your file &darr;
          </a>
          <p className="mt-4 text-sm text-muted">
            Link expires in 24 hours.
          </p>
        </div>
      ) : (
        <p className="mt-4 text-muted animate-fade-up stagger-3">
          Your purchase is being processed. Please check back shortly.
        </p>
      )}

      <a
        href="/"
        className="mt-8 inline-block text-sm text-muted hover:text-ink transition-colors"
      >
        &larr; Back to Fooshop
      </a>
    </main>
  );
}
```

**Step 3: Verify build**

Run: `pnpm build`
Expected: Build succeeds

**Step 4: Commit**

```bash
git add src/app/\(platform\)/onboarding/onboarding-form.tsx src/app/\(platform\)/checkout/success/page.tsx
git commit -m "feat: editorial onboarding and checkout success pages"
```

---

### Task 9: Connect Stripe button + Stripe toast style update

**Files:**
- Modify: `src/components/connect-stripe-button.tsx`
- Modify: `src/components/stripe-toast.tsx`

**Step 1: Update connect-stripe-button**

Update button classes to editorial style:
- `bg-black` → `bg-accent`
- `hover:bg-gray-800` → `hover:opacity-85`
- `rounded-lg` → `rounded-full`
- Add `transition-opacity`

**Step 2: Update stripe-toast**

Update toast styling:
- Background: `bg-green-50 border border-green-200`
- Text: `text-green-800`
- Rounded: `rounded-xl`

**Step 3: Verify build**

Run: `pnpm build`
Expected: Build succeeds

**Step 4: Commit**

```bash
git add src/components/connect-stripe-button.tsx src/components/stripe-toast.tsx
git commit -m "feat: editorial styles for Stripe button and toast"
```

---

### Task 10: Final build verification

**Step 1: Full build**

Run: `pnpm build`
Expected: Build succeeds with no errors or warnings

**Step 2: Visual check list**

Start `pnpm dev` and verify:
- [ ] Navbar: "fooshop." italic logo, animated underlines, avatar/sign-in
- [ ] Landing: Playfair hero, editorial numbers, dark CTA block
- [ ] Explore: pill filters, magazine grid with featured card, warm background
- [ ] Dashboard: stat cards, styled Stripe CTA, clean orders table
- [ ] Products list: thumbnails, status badges, accent "+ New Product" button
- [ ] Orders: uppercase column headers, status badges, "Export CSV" outline button
- [ ] Onboarding: large textarea, accent CTA, card-based results
- [ ] Checkout success: accent check circle, clean centered layout
- [ ] All pages: warm `#faf9f7` background, Playfair headings, DM Sans body, fade-up animations
