# Fooshop Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build Fooshop V0 — an AI-powered headless marketplace for digital products with MCP server, Stripe checkout, and AI store generation.

**Architecture:** Next.js App Router as a monolith (API routes + frontend). PostgreSQL via Drizzle ORM. Stripe Connect for split payments. Claude API for AI store generation. MCP server as separate TypeScript package in the same repo. Deploy on Render.

**Tech Stack:** Next.js 15, TypeScript, Drizzle ORM, PostgreSQL, Auth.js, Stripe Connect, Claude API (Anthropic SDK), Tailwind CSS, Cloudflare R2, MCP SDK

**Design doc:** `docs/plans/2026-03-06-fooshop-design.md`

---

## Task 1: Project Scaffold

**Files:**
- Create: `fooshop/package.json`
- Create: `fooshop/tsconfig.json`
- Create: `fooshop/.env.example`
- Create: `fooshop/src/app/layout.tsx`
- Create: `fooshop/src/app/page.tsx`
- Create: `fooshop/tailwind.config.ts`
- Create: `fooshop/drizzle.config.ts`

**Step 1: Create Next.js project**

Run:
```bash
cd /Users/ematomax/Documents
npx create-next-app@latest fooshop --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-pnpm
```

Expected: Project created in `fooshop/` directory.

**Step 2: Install core dependencies**

Run:
```bash
cd /Users/ematomax/Documents/fooshop
pnpm add drizzle-orm postgres dotenv
pnpm add -D drizzle-kit @types/node
pnpm add next-auth@beta @auth/drizzle-adapter
pnpm add stripe @stripe/stripe-js
pnpm add @anthropic-ai/sdk
pnpm add @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
```

**Step 3: Create .env.example**

```env
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/fooshop

# Auth
AUTH_SECRET=generate-with-openssl-rand-base64-32
AUTH_GOOGLE_ID=
AUTH_GOOGLE_SECRET=

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...

# Anthropic
ANTHROPIC_API_KEY=sk-ant-...

# Cloudflare R2
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=fooshop-files
R2_PUBLIC_URL=

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**Step 4: Initialize git**

Run:
```bash
cd /Users/ematomax/Documents/fooshop
git init
cp .env.example .env.local
echo ".env.local" >> .gitignore
git add .
git commit -m "chore: scaffold Next.js project with dependencies"
```

---

## Task 2: Database Schema & Drizzle Setup

**Files:**
- Create: `fooshop/src/db/index.ts`
- Create: `fooshop/src/db/schema.ts`
- Create: `fooshop/drizzle.config.ts`

**Step 1: Create database connection**

```typescript
// src/db/index.ts
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL!;
const client = postgres(connectionString);
export const db = drizzle(client, { schema });
```

**Step 2: Create schema**

```typescript
// src/db/schema.ts
import { pgTable, uuid, text, integer, jsonb, timestamp, pgEnum } from "drizzle-orm/pg-core";

export const productStatusEnum = pgEnum("product_status", ["draft", "published"]);
export const orderStatusEnum = pgEnum("order_status", ["pending", "completed", "refunded"]);

export const creators = pgTable("creators", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  stripeConnectId: text("stripe_connect_id"),
  storeName: text("store_name"),
  storeDescription: text("store_description"),
  storeTheme: jsonb("store_theme").$type<{
    primaryColor: string;
    layout: string;
  }>(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const products = pgTable("products", {
  id: uuid("id").primaryKey().defaultRandom(),
  creatorId: uuid("creator_id").notNull().references(() => creators.id),
  title: text("title").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description").notNull(),
  priceCents: integer("price_cents").notNull(),
  currency: text("currency").notNull().default("usd"),
  fileUrl: text("file_url"),
  coverImageUrl: text("cover_image_url"),
  category: text("category"),
  metadataJson: jsonb("metadata_json").$type<{
    tags: string[];
    format: string;
    aiDescription: string;
  }>(),
  status: productStatusEnum("status").notNull().default("draft"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const orders = pgTable("orders", {
  id: uuid("id").primaryKey().defaultRandom(),
  productId: uuid("product_id").notNull().references(() => products.id),
  creatorId: uuid("creator_id").notNull().references(() => creators.id),
  buyerEmail: text("buyer_email").notNull(),
  buyerName: text("buyer_name"),
  amountCents: integer("amount_cents").notNull(),
  platformFeeCents: integer("platform_fee_cents").notNull(),
  stripePaymentIntentId: text("stripe_payment_intent_id"),
  status: orderStatusEnum("status").notNull().default("pending"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const pageViews = pgTable("page_views", {
  id: uuid("id").primaryKey().defaultRandom(),
  productId: uuid("product_id").references(() => products.id),
  storeSlug: text("store_slug"),
  source: text("source").notNull().default("web"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
```

**Step 3: Create Drizzle config**

```typescript
// drizzle.config.ts
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
```

**Step 4: Generate and run migration**

Run:
```bash
pnpm drizzle-kit generate
pnpm drizzle-kit push
```

Expected: Tables created in PostgreSQL.

**Step 5: Commit**

```bash
git add .
git commit -m "feat: add database schema with Drizzle ORM"
```

---

## Task 3: Auth Setup

**Files:**
- Create: `fooshop/src/lib/auth.ts`
- Create: `fooshop/src/app/api/auth/[...nextauth]/route.ts`
- Create: `fooshop/src/middleware.ts`

**Step 1: Configure Auth.js**

```typescript
// src/lib/auth.ts
import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { db } from "@/db";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: DrizzleAdapter(db),
  providers: [Google],
  callbacks: {
    session({ session, user }) {
      session.user.id = user.id;
      return session;
    },
  },
});
```

Note: Auth.js with Drizzle adapter requires additional tables (users, accounts, sessions, verification_tokens). Check Auth.js docs and add them to `schema.ts`. The `creators` table will be created from the `users` table via a trigger or application logic on first login.

**Step 2: Create route handler**

```typescript
// src/app/api/auth/[...nextauth]/route.ts
import { handlers } from "@/lib/auth";
export const { GET, POST } = handlers;
```

**Step 3: Create middleware for protected routes**

```typescript
// src/middleware.ts
export { auth as middleware } from "@/lib/auth";

export const config = {
  matcher: ["/dashboard/:path*", "/api/products/:path*"],
};
```

**Step 4: Test auth flow manually**

Run:
```bash
pnpm dev
```

Navigate to `http://localhost:3000/api/auth/signin` — verify Google login works.

**Step 5: Commit**

```bash
git add .
git commit -m "feat: add authentication with Auth.js and Google provider"
```

---

## Task 4: Creator CRUD & Store Page

**Files:**
- Create: `fooshop/src/app/api/products/route.ts`
- Create: `fooshop/src/app/api/products/[id]/route.ts`
- Create: `fooshop/src/app/[slug]/page.tsx` (public store page)
- Create: `fooshop/src/app/[slug]/[productSlug]/page.tsx` (public product page)

**Step 1: Products API — create & list**

```typescript
// src/app/api/products/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { products, creators } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category");
  const query = searchParams.get("q");

  let results = await db.select().from(products)
    .where(eq(products.status, "published"))
    .limit(50);

  return NextResponse.json(results);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const creator = await db.select().from(creators)
    .where(eq(creators.id, session.user.id))
    .then(rows => rows[0]);

  if (!creator) {
    return NextResponse.json({ error: "Creator not found" }, { status: 404 });
  }

  const slug = body.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

  const [product] = await db.insert(products).values({
    creatorId: creator.id,
    title: body.title,
    slug,
    description: body.description,
    priceCents: body.priceCents,
    category: body.category,
    status: "draft",
  }).returning();

  return NextResponse.json(product, { status: 201 });
}
```

**Step 2: Products API — update & delete**

```typescript
// src/app/api/products/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { products } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const [updated] = await db.update(products)
    .set(body)
    .where(and(eq(products.id, params.id), eq(products.creatorId, session.user.id)))
    .returning();

  if (!updated) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await db.delete(products)
    .where(and(eq(products.id, params.id), eq(products.creatorId, session.user.id)));

  return NextResponse.json({ ok: true });
}
```

**Step 3: Public store page**

```tsx
// src/app/[slug]/page.tsx
import { db } from "@/db";
import { creators, products } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

interface Props {
  params: { slug: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const creator = await db.select().from(creators)
    .where(eq(creators.slug, params.slug))
    .then(rows => rows[0]);

  if (!creator) return {};

  return {
    title: `${creator.storeName} | Fooshop`,
    description: creator.storeDescription,
  };
}

export default async function StorePage({ params }: Props) {
  const creator = await db.select().from(creators)
    .where(eq(creators.slug, params.slug))
    .then(rows => rows[0]);

  if (!creator) notFound();

  const storeProducts = await db.select().from(products)
    .where(and(eq(products.creatorId, creator.id), eq(products.status, "published")));

  return (
    <main className="max-w-4xl mx-auto px-4 py-12">
      <header className="mb-12">
        <h1 className="text-4xl font-bold">{creator.storeName}</h1>
        <p className="mt-4 text-lg text-gray-600">{creator.storeDescription}</p>
      </header>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {storeProducts.map((product) => (
          <a
            key={product.id}
            href={`/${params.slug}/${product.slug}`}
            className="block border rounded-lg p-6 hover:shadow-lg transition-shadow"
          >
            {product.coverImageUrl && (
              <img src={product.coverImageUrl} alt={product.title} className="w-full rounded mb-4" />
            )}
            <h2 className="text-xl font-semibold">{product.title}</h2>
            <p className="text-gray-500 mt-2 line-clamp-2">{product.description}</p>
            <p className="mt-4 text-2xl font-bold">${(product.priceCents / 100).toFixed(2)}</p>
          </a>
        ))}
      </div>
      <footer className="mt-16 text-center text-sm text-gray-400">
        Powered by <a href="https://fooshop.ai" className="underline">Fooshop</a>
      </footer>
    </main>
  );
}
```

**Step 4: Public product page**

```tsx
// src/app/[slug]/[productSlug]/page.tsx
import { db } from "@/db";
import { creators, products } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

interface Props {
  params: { slug: string; productSlug: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const product = await db.select().from(products)
    .where(eq(products.slug, params.productSlug))
    .then(rows => rows[0]);

  if (!product) return {};

  return {
    title: `${product.title} | Fooshop`,
    description: product.description,
    openGraph: {
      title: product.title,
      description: product.description,
      images: product.coverImageUrl ? [product.coverImageUrl] : [],
    },
  };
}

export default async function ProductPage({ params }: Props) {
  const creator = await db.select().from(creators)
    .where(eq(creators.slug, params.slug))
    .then(rows => rows[0]);

  if (!creator) notFound();

  const product = await db.select().from(products)
    .where(and(
      eq(products.slug, params.productSlug),
      eq(products.creatorId, creator.id),
      eq(products.status, "published"),
    ))
    .then(rows => rows[0]);

  if (!product) notFound();

  return (
    <main className="max-w-2xl mx-auto px-4 py-12">
      {product.coverImageUrl && (
        <img src={product.coverImageUrl} alt={product.title} className="w-full rounded-lg mb-8" />
      )}
      <h1 className="text-4xl font-bold">{product.title}</h1>
      <p className="mt-4 text-lg text-gray-600">{product.description}</p>
      <div className="mt-8 flex items-center gap-4">
        <span className="text-3xl font-bold">${(product.priceCents / 100).toFixed(2)}</span>
        <form action={`/api/checkout`} method="POST">
          <input type="hidden" name="productId" value={product.id} />
          <button
            type="submit"
            className="bg-black text-white px-8 py-3 rounded-lg text-lg font-semibold hover:bg-gray-800 transition-colors"
          >
            Buy Now
          </button>
        </form>
      </div>
      <footer className="mt-16 text-sm text-gray-400">
        Sold by <a href={`/${params.slug}`} className="underline">{creator.storeName}</a> on{" "}
        <a href="https://fooshop.ai" className="underline">Fooshop</a>
      </footer>
    </main>
  );
}
```

**Step 5: Verify manually**

Run `pnpm dev`, create a test creator and product via DB seed or API call, verify store and product pages render.

**Step 6: Commit**

```bash
git add .
git commit -m "feat: add product CRUD API and public store/product pages"
```

---

## Task 5: File Upload (Cloudflare R2)

**Files:**
- Create: `fooshop/src/lib/r2.ts`
- Create: `fooshop/src/app/api/upload/route.ts`

**Step 1: Create R2 client**

```typescript
// src/lib/r2.ts
import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export const r2 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

export async function getUploadUrl(key: string, contentType: string) {
  const command = new PutObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME!,
    Key: key,
    ContentType: contentType,
  });
  return getSignedUrl(r2, command, { expiresIn: 3600 });
}

export async function getDownloadUrl(key: string) {
  const command = new GetObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME!,
    Key: key,
  });
  return getSignedUrl(r2, command, { expiresIn: 3600 });
}
```

**Step 2: Create upload API route**

```typescript
// src/app/api/upload/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getUploadUrl } from "@/lib/r2";
import { randomUUID } from "crypto";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { filename, contentType } = await req.json();
  const key = `products/${session.user.id}/${randomUUID()}/${filename}`;
  const uploadUrl = await getUploadUrl(key, contentType);

  return NextResponse.json({ uploadUrl, key });
}
```

**Step 3: Commit**

```bash
git add .
git commit -m "feat: add file upload via Cloudflare R2 presigned URLs"
```

---

## Task 6: Stripe Connect & Checkout

**Files:**
- Create: `fooshop/src/lib/stripe.ts`
- Create: `fooshop/src/app/api/stripe/connect/route.ts`
- Create: `fooshop/src/app/api/checkout/route.ts`
- Create: `fooshop/src/app/api/stripe/webhook/route.ts`
- Create: `fooshop/src/app/checkout/success/page.tsx`

**Step 1: Create Stripe client**

```typescript
// src/lib/stripe.ts
import Stripe from "stripe";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-12-18.acacia",
});

const PLATFORM_FEE_PERCENT = 5;

export function calculatePlatformFee(amountCents: number): number {
  return Math.round(amountCents * PLATFORM_FEE_PERCENT / 100);
}
```

**Step 2: Stripe Connect onboarding**

```typescript
// src/app/api/stripe/connect/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { stripe } from "@/lib/stripe";
import { db } from "@/db";
import { creators } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const creator = await db.select().from(creators)
    .where(eq(creators.id, session.user.id))
    .then(rows => rows[0]);

  if (!creator) {
    return NextResponse.json({ error: "Creator not found" }, { status: 404 });
  }

  let accountId = creator.stripeConnectId;

  if (!accountId) {
    const account = await stripe.accounts.create({
      type: "express",
      email: creator.email,
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
    });
    accountId = account.id;

    await db.update(creators)
      .set({ stripeConnectId: accountId })
      .where(eq(creators.id, creator.id));
  }

  const accountLink = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`,
    return_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`,
    type: "account_onboarding",
  });

  return NextResponse.json({ url: accountLink.url });
}
```

**Step 3: Checkout session creation**

```typescript
// src/app/api/checkout/route.ts
import { NextRequest, NextResponse } from "next/server";
import { stripe, calculatePlatformFee } from "@/lib/stripe";
import { db } from "@/db";
import { products, creators } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST(req: NextRequest) {
  const { productId } = await req.json();

  const product = await db.select().from(products)
    .where(eq(products.id, productId))
    .then(rows => rows[0]);

  if (!product || product.status !== "published") {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }

  const creator = await db.select().from(creators)
    .where(eq(creators.id, product.creatorId))
    .then(rows => rows[0]);

  if (!creator?.stripeConnectId) {
    return NextResponse.json({ error: "Creator not set up for payments" }, { status: 400 });
  }

  const platformFee = calculatePlatformFee(product.priceCents);

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [{
      price_data: {
        currency: product.currency,
        product_data: {
          name: product.title,
          description: product.description,
        },
        unit_amount: product.priceCents,
      },
      quantity: 1,
    }],
    payment_intent_data: {
      application_fee_amount: platformFee,
      transfer_data: {
        destination: creator.stripeConnectId,
      },
    },
    metadata: {
      productId: product.id,
      creatorId: creator.id,
    },
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/${creator.slug}/${product.slug}`,
  });

  return NextResponse.json({ url: session.url });
}
```

**Step 4: Stripe webhook for order completion**

```typescript
// src/app/api/stripe/webhook/route.ts
import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { db } from "@/db";
import { orders } from "@/db/schema";
import { getDownloadUrl } from "@/lib/r2";
import { products } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature")!;

  let event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const { productId, creatorId } = session.metadata!;

    const product = await db.select().from(products)
      .where(eq(products.id, productId))
      .then(rows => rows[0]);

    await db.insert(orders).values({
      productId,
      creatorId,
      buyerEmail: session.customer_details?.email ?? "unknown",
      buyerName: session.customer_details?.name,
      amountCents: session.amount_total!,
      platformFeeCents: Math.round(session.amount_total! * 0.05),
      stripePaymentIntentId: session.payment_intent as string,
      status: "completed",
    });

    // TODO: send email with download link
    // const downloadUrl = await getDownloadUrl(product.fileUrl!);
  }

  return NextResponse.json({ received: true });
}

export const config = {
  api: { bodyParser: false },
};
```

**Step 5: Success page**

```tsx
// src/app/checkout/success/page.tsx
export default function CheckoutSuccess() {
  return (
    <main className="max-w-lg mx-auto px-4 py-24 text-center">
      <h1 className="text-3xl font-bold">Purchase complete!</h1>
      <p className="mt-4 text-gray-600">
        Check your email for the download link.
      </p>
      <a href="/" className="mt-8 inline-block underline">
        Back to Fooshop
      </a>
    </main>
  );
}
```

**Step 6: Commit**

```bash
git add .
git commit -m "feat: add Stripe Connect onboarding, checkout, and webhook"
```

---

## Task 7: AI Store Generation

**Files:**
- Create: `fooshop/src/lib/ai.ts`
- Create: `fooshop/src/app/api/store/generate/route.ts`
- Create: `fooshop/src/app/onboarding/page.tsx`

**Step 1: Create AI generation service**

```typescript
// src/lib/ai.ts
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic();

interface GeneratedStore {
  storeName: string;
  storeDescription: string;
  suggestedProducts: {
    title: string;
    description: string;
    suggestedPriceCents: number;
    category: string;
    tags: string[];
  }[];
  theme: {
    primaryColor: string;
    layout: string;
  };
}

export async function generateStore(userDescription: string): Promise<GeneratedStore> {
  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2000,
    messages: [{
      role: "user",
      content: `You are helping a creator set up their digital product store. Based on their description, generate a store configuration.

Creator says: "${userDescription}"

Respond with ONLY valid JSON (no markdown, no backticks):
{
  "storeName": "catchy store name",
  "storeDescription": "compelling 1-2 sentence description",
  "suggestedProducts": [
    {
      "title": "product name",
      "description": "compelling product description (2-3 sentences)",
      "suggestedPriceCents": 1999,
      "category": "one of: templates, ebooks, courses, presets, prompts, assets, other",
      "tags": ["tag1", "tag2", "tag3"]
    }
  ],
  "theme": {
    "primaryColor": "#hex color that fits the brand",
    "layout": "grid"
  }
}

Generate 2-4 suggested products based on what they sell. Price realistically for digital products.`,
    }],
  });

  const text = message.content[0].type === "text" ? message.content[0].text : "";
  return JSON.parse(text) as GeneratedStore;
}
```

**Step 2: Store generation API**

```typescript
// src/app/api/store/generate/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { generateStore } from "@/lib/ai";
import { db } from "@/db";
import { creators } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { description } = await req.json();
  const generated = await generateStore(description);

  const slug = generated.storeName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

  await db.update(creators).set({
    storeName: generated.storeName,
    storeDescription: generated.storeDescription,
    storeTheme: generated.theme,
    slug,
  }).where(eq(creators.id, session.user.id));

  return NextResponse.json({ ...generated, slug });
}
```

**Step 3: Onboarding page**

Build a simple form with a single textarea: "Describe what you sell". On submit, call `/api/store/generate`, show the result, let the creator confirm or regenerate. Then redirect to dashboard to upload files and publish products.

This is a client component with state management. Keep it simple — textarea, submit button, loading state, result preview with confirm/retry buttons.

**Step 4: Commit**

```bash
git add .
git commit -m "feat: add AI store generation with Claude API"
```

---

## Task 8: MCP Server

**Files:**
- Create: `fooshop/mcp-server/package.json`
- Create: `fooshop/mcp-server/src/index.ts`
- Create: `fooshop/mcp-server/tsconfig.json`

**Step 1: Set up MCP server package**

```json
// mcp-server/package.json
{
  "name": "@fooshop/mcp-server",
  "version": "0.1.0",
  "description": "MCP server for Fooshop - search and discover digital products",
  "main": "dist/index.js",
  "bin": {
    "fooshop-mcp": "dist/index.js"
  },
  "scripts": {
    "build": "tsc",
    "start": "node dist/index.js"
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.0.0"
  },
  "devDependencies": {
    "typescript": "^5.0.0"
  }
}
```

**Step 2: Implement MCP server**

Check `@modelcontextprotocol/sdk` docs via context7 for current API. The server should expose three tools:

- `search_products` — search the Fooshop catalog by query, category, price range. Calls `GET /api/products?q=...&category=...`
- `get_product` — get full product details by slug. Calls `GET /api/products/:slug`
- `get_store` — get all products from a creator. Calls `GET /api/stores/:slug`

```typescript
// mcp-server/src/index.ts
// Implementation depends on current MCP SDK API.
// Core pattern: create server, register tools, each tool calls Fooshop public API.
// Use FOOSHOP_API_URL env var (defaults to https://fooshop.ai).

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const API_URL = process.env.FOOSHOP_API_URL || "https://fooshop.ai";

const server = new McpServer({
  name: "fooshop",
  version: "0.1.0",
});

server.tool(
  "search_products",
  "Search digital products on Fooshop marketplace. Returns products matching the query with title, description, price, and purchase link.",
  {
    query: z.string().describe("Search query, e.g. 'notion template project management'"),
    category: z.string().optional().describe("Filter by category: templates, ebooks, courses, presets, prompts, assets"),
    maxPrice: z.number().optional().describe("Maximum price in cents"),
  },
  async ({ query, category, maxPrice }) => {
    const params = new URLSearchParams({ q: query });
    if (category) params.set("category", category);
    if (maxPrice) params.set("maxPrice", maxPrice.toString());

    const res = await fetch(`${API_URL}/api/products?${params}`);
    const products = await res.json();

    return {
      content: [{
        type: "text",
        text: JSON.stringify(products.map((p: any) => ({
          title: p.title,
          description: p.description,
          price: `$${(p.priceCents / 100).toFixed(2)}`,
          url: `${API_URL}/${p.creatorSlug}/${p.slug}`,
          category: p.category,
          tags: p.metadataJson?.tags,
        })), null, 2),
      }],
    };
  }
);

server.tool(
  "get_product",
  "Get detailed information about a specific product on Fooshop.",
  {
    slug: z.string().describe("Product slug"),
  },
  async ({ slug }) => {
    const res = await fetch(`${API_URL}/api/products/${slug}`);
    const product = await res.json();

    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          title: product.title,
          description: product.description,
          price: `$${(product.priceCents / 100).toFixed(2)}`,
          url: `${API_URL}/${product.creatorSlug}/${product.slug}`,
          category: product.category,
          tags: product.metadataJson?.tags,
          aiDescription: product.metadataJson?.aiDescription,
        }, null, 2),
      }],
    };
  }
);

server.tool(
  "get_store",
  "Get all products from a specific creator's store on Fooshop.",
  {
    slug: z.string().describe("Creator store slug"),
  },
  async ({ slug }) => {
    const res = await fetch(`${API_URL}/api/stores/${slug}`);
    const store = await res.json();

    return {
      content: [{
        type: "text",
        text: JSON.stringify(store, null, 2),
      }],
    };
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch(console.error);
```

**Step 3: Build and test locally**

Run:
```bash
cd mcp-server
pnpm install
pnpm build
```

Test with Claude Code by adding to `.mcp.json`:
```json
{
  "mcpServers": {
    "fooshop": {
      "command": "node",
      "args": ["./mcp-server/dist/index.js"],
      "env": {
        "FOOSHOP_API_URL": "http://localhost:3000"
      }
    }
  }
}
```

**Step 4: Commit**

```bash
git add .
git commit -m "feat: add MCP server for AI product discovery"
```

---

## Task 9: Explore Page

**Files:**
- Create: `fooshop/src/app/explore/page.tsx`
- Modify: `fooshop/src/app/page.tsx` (landing → redirect or hero + explore)

**Step 1: Build explore page**

```tsx
// src/app/explore/page.tsx
import { db } from "@/db";
import { products, creators } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Explore Digital Products | Fooshop",
  description: "Discover digital products from creators worldwide. Templates, ebooks, courses, presets, and more.",
};

const CATEGORIES = ["templates", "ebooks", "courses", "presets", "prompts", "assets"];

export default async function ExplorePage({
  searchParams,
}: {
  searchParams: { category?: string; q?: string };
}) {
  // Fetch published products, optionally filtered
  let query = db
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

  const results = await query;

  return (
    <main className="max-w-6xl mx-auto px-4 py-12">
      <h1 className="text-4xl font-bold">Explore</h1>
      <p className="mt-2 text-gray-600">Digital products from creators worldwide</p>

      <nav className="mt-8 flex gap-2 flex-wrap">
        <a href="/explore" className="px-4 py-2 rounded-full border hover:bg-gray-100">All</a>
        {CATEGORIES.map((cat) => (
          <a
            key={cat}
            href={`/explore?category=${cat}`}
            className="px-4 py-2 rounded-full border hover:bg-gray-100 capitalize"
          >
            {cat}
          </a>
        ))}
      </nav>

      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {results.map(({ product, creatorSlug, creatorName }) => (
          <a
            key={product.id}
            href={`/${creatorSlug}/${product.slug}`}
            className="block border rounded-lg p-6 hover:shadow-lg transition-shadow"
          >
            {product.coverImageUrl && (
              <img src={product.coverImageUrl} alt={product.title} className="w-full rounded mb-4" />
            )}
            <h2 className="text-lg font-semibold">{product.title}</h2>
            <p className="text-sm text-gray-500 mt-1">by {creatorName}</p>
            <p className="text-gray-500 mt-2 line-clamp-2 text-sm">{product.description}</p>
            <p className="mt-3 text-xl font-bold">${(product.priceCents / 100).toFixed(2)}</p>
          </a>
        ))}
      </div>

      {results.length === 0 && (
        <p className="mt-12 text-center text-gray-400">No products yet. Be the first to sell!</p>
      )}
    </main>
  );
}
```

**Step 2: Update landing page**

Update `src/app/page.tsx` to be the Fooshop landing page with:
- Hero: "Your AI-powered storefront. Drop your products, AI finds your buyers."
- CTA: "Start selling — it's free"
- Link to `/explore`
- Brief feature explanation (AI generation, MCP, zero fees)

**Step 3: Commit**

```bash
git add .
git commit -m "feat: add explore page and landing page"
```

---

## Task 10: Creator Dashboard

**Files:**
- Create: `fooshop/src/app/dashboard/page.tsx`
- Create: `fooshop/src/app/dashboard/products/page.tsx`
- Create: `fooshop/src/app/dashboard/products/new/page.tsx`

**Step 1: Dashboard overview**

Show: total sales, total revenue, total products, recent orders. Query `orders` and `products` tables filtered by creator ID.

**Step 2: Products list**

List creator's products with status (draft/published), edit/delete actions, and "New product" button.

**Step 3: New product form**

Form with: title, description, price, category, file upload (via presigned URL to R2), cover image upload. On submit, create product via API and redirect to products list.

**Step 4: Commit**

```bash
git add .
git commit -m "feat: add creator dashboard with products management"
```

---

## Task 11: SEO & Structured Data

**Files:**
- Modify: `fooshop/src/app/[slug]/[productSlug]/page.tsx`
- Modify: `fooshop/src/app/[slug]/page.tsx`
- Create: `fooshop/src/app/sitemap.ts`

**Step 1: Add JSON-LD structured data to product pages**

Add `<script type="application/ld+json">` with Product schema (schema.org) to each product page. Include: name, description, price, currency, availability, seller, image.

**Step 2: Add JSON-LD to store pages**

Add Organization/Person schema for creator stores.

**Step 3: Dynamic sitemap**

```typescript
// src/app/sitemap.ts
import { db } from "@/db";
import { products, creators } from "@/db/schema";
import { eq } from "drizzle-orm";

export default async function sitemap() {
  const allProducts = await db.select({
    productSlug: products.slug,
    creatorSlug: creators.slug,
    updatedAt: products.createdAt,
  })
    .from(products)
    .innerJoin(creators, eq(products.creatorId, creators.id))
    .where(eq(products.status, "published"));

  const allCreators = await db.select().from(creators);

  return [
    { url: "https://fooshop.ai", lastModified: new Date() },
    { url: "https://fooshop.ai/explore", lastModified: new Date() },
    ...allCreators.map((c) => ({
      url: `https://fooshop.ai/${c.slug}`,
      lastModified: c.createdAt,
    })),
    ...allProducts.map((p) => ({
      url: `https://fooshop.ai/${p.creatorSlug}/${p.productSlug}`,
      lastModified: p.updatedAt,
    })),
  ];
}
```

**Step 4: Commit**

```bash
git add .
git commit -m "feat: add SEO structured data and dynamic sitemap"
```

---

## Task 12: Deploy to Render

**Files:**
- Create: `fooshop/render.yaml`
- Create: `fooshop/Dockerfile` (if needed, otherwise use Render native Node)

**Step 1: Create render.yaml**

```yaml
services:
  - type: web
    name: fooshop
    runtime: node
    plan: starter
    buildCommand: pnpm install && pnpm build
    startCommand: pnpm start
    envVars:
      - key: DATABASE_URL
        fromDatabase:
          name: fooshop-db
          property: connectionString
      - key: AUTH_SECRET
        generateValue: true
      - key: NODE_ENV
        value: production

databases:
  - name: fooshop-db
    plan: starter
    databaseName: fooshop
```

**Step 2: Set environment variables on Render**

Add all env vars from `.env.example` to Render dashboard.

**Step 3: Deploy and verify**

Push to GitHub, connect to Render, trigger deploy. Verify:
- Landing page loads
- Google auth works
- Onboarding AI generation works
- Product creation works
- Checkout flow works (test mode)
- Explore page shows products
- Store/product public pages render with correct meta tags

**Step 4: Run Drizzle migration on production**

```bash
DATABASE_URL=<production_url> pnpm drizzle-kit push
```

**Step 5: Commit**

```bash
git add .
git commit -m "chore: add Render deployment configuration"
```

---

## Task 13: End-to-End Smoke Test

**No new files — manual testing.**

**Step 1: Full creator flow**
1. Go to fooshop.ai
2. Sign up with Google
3. Describe what you sell → verify AI generates store
4. Upload a test file → verify R2 upload
5. Connect Stripe → verify Connect onboarding
6. Publish product → verify it appears on explore page
7. Visit store page → verify SEO meta tags

**Step 2: Full buyer flow**
1. Go to a product page
2. Click Buy → verify Stripe Checkout opens
3. Complete test payment → verify success page
4. Verify order recorded in DB
5. Verify webhook fires

**Step 3: MCP flow**
1. Add fooshop MCP server to Claude Code config
2. Ask Claude "search for products on Fooshop about [topic]"
3. Verify tool is called and returns results

**Step 4: Fix any issues found, commit**

```bash
git add .
git commit -m "fix: post-deployment smoke test fixes"
```
