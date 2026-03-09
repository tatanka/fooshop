# MCP Native Discovery — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make Fooshop products discoverable and purchasable by AI agents via MCP protocol.

**Architecture:** MCP server (separate package) calls Fooshop REST API. New/enhanced API endpoints support search, slug lookups, and source tracking.

**Tech Stack:** Next.js API routes, Drizzle ORM, MCP SDK, Zod, Stripe

---

## Task 1: Enhance `GET /api/products` with search and filters

**Files:**
- Modify: `src/app/api/products/route.ts`

**Step 1: Add query param parsing**

Update the GET handler to extract `q`, `maxPrice`, and `source` from searchParams:

```typescript
const q = searchParams.get("q");
const maxPrice = searchParams.get("maxPrice");
const source = searchParams.get("source") ?? "web";
```

**Step 2: Build dynamic where clause**

Add ILIKE search on title+description and maxPrice filter:

```typescript
import { eq, and, or, ilike, lte } from "drizzle-orm";

const conditions = [eq(products.status, "published")];

if (category) {
  conditions.push(eq(products.category, category));
}
if (q) {
  conditions.push(
    or(
      ilike(products.title, `%${q}%`),
      ilike(products.description, `%${q}%`)
    )!
  );
}
if (maxPrice) {
  conditions.push(lte(products.priceCents, parseInt(maxPrice, 10)));
}

const results = await db
  .select()
  .from(products)
  .where(and(...conditions))
  .limit(50);
```

**Step 3: Track page view**

If `source` param is present and `q` is present, record a page view:

```typescript
import { pageViews } from "@/db/schema";

if (q) {
  await db.insert(pageViews).values({ source });
}
```

**Step 4: Commit**

```bash
git add src/app/api/products/route.ts
git commit -m "feat: add search, maxPrice filter and source tracking to GET /api/products"
```

---

## Task 2: New `GET /api/products/[slug]` public endpoint

**Files:**
- Create: `src/app/api/products/[slug]/route.ts`

**Step 1: Create the route handler**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { products, creators, pageViews } from "@/db/schema";
import { eq, and } from "drizzle-orm";

interface Context {
  params: Promise<{ slug: string }>;
}

export async function GET(req: NextRequest, context: Context) {
  const { slug } = await context.params;
  const source = new URL(req.url).searchParams.get("source") ?? "web";

  const result = await db
    .select({
      product: products,
      creatorSlug: creators.slug,
      creatorName: creators.storeName,
    })
    .from(products)
    .innerJoin(creators, eq(products.creatorId, creators.id))
    .where(and(eq(products.slug, slug), eq(products.status, "published")))
    .then((rows) => rows[0]);

  if (!result) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }

  // Track page view
  await db.insert(pageViews).values({
    productId: result.product.id,
    source,
  });

  return NextResponse.json({
    ...result.product,
    creatorSlug: result.creatorSlug,
    creatorName: result.creatorName,
    url: `${process.env.NEXT_PUBLIC_APP_URL}/${result.creatorSlug}/${result.product.slug}`,
  });
}
```

**Step 2: Commit**

```bash
git add src/app/api/products/\[slug\]/route.ts
git commit -m "feat: add public GET /api/products/[slug] endpoint"
```

---

## Task 3: New `GET /api/stores/[slug]` public endpoint

**Files:**
- Create: `src/app/api/stores/[slug]/route.ts`

**Step 1: Create the route handler**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { creators, products, pageViews } from "@/db/schema";
import { eq, and } from "drizzle-orm";

interface Context {
  params: Promise<{ slug: string }>;
}

export async function GET(req: NextRequest, context: Context) {
  const { slug } = await context.params;
  const source = new URL(req.url).searchParams.get("source") ?? "web";

  const creator = await db
    .select()
    .from(creators)
    .where(eq(creators.slug, slug))
    .then((rows) => rows[0]);

  if (!creator) {
    return NextResponse.json({ error: "Store not found" }, { status: 404 });
  }

  const storeProducts = await db
    .select()
    .from(products)
    .where(
      and(eq(products.creatorId, creator.id), eq(products.status, "published"))
    );

  // Track page view
  await db.insert(pageViews).values({
    storeSlug: slug,
    source,
  });

  return NextResponse.json({
    name: creator.storeName,
    description: creator.storeDescription,
    slug: creator.slug,
    url: `${process.env.NEXT_PUBLIC_APP_URL}/${creator.slug}`,
    products: storeProducts.map((p) => ({
      id: p.id,
      title: p.title,
      slug: p.slug,
      description: p.description,
      priceCents: p.priceCents,
      currency: p.currency,
      category: p.category,
      url: `${process.env.NEXT_PUBLIC_APP_URL}/${creator.slug}/${p.slug}`,
    })),
  });
}
```

**Step 2: Commit**

```bash
git add src/app/api/stores/\[slug\]/route.ts
git commit -m "feat: add public GET /api/stores/[slug] endpoint"
```

---

## Task 4: Enhance `POST /api/checkout` with source tracking

**Files:**
- Modify: `src/app/api/checkout/route.ts`

**Step 1: Accept source in request body**

```typescript
const { productId, source } = await req.json();
```

**Step 2: Add source to Stripe metadata**

In the `checkout.sessions.create` call, add source to metadata:

```typescript
metadata: {
  productId: product.id,
  creatorId: creator.id,
  source: source ?? "web",
},
```

**Step 3: Commit**

```bash
git add src/app/api/checkout/route.ts
git commit -m "feat: add source tracking to checkout session metadata"
```

---

## Task 5: Update MCP server — `search_products` tool

**Files:**
- Modify: `mcp-server/src/index.ts`

**Step 1: Update search_products tool**

Fix the tool to properly format results with product URLs and purchase info:

```typescript
server.tool(
  "search_products",
  "Search digital products on Fooshop marketplace. Returns products matching the query with title, description, price, and purchase link.",
  {
    query: z.string().describe("Search query, e.g. 'notion template project management'"),
    category: z.string().optional().describe("Filter by category: templates, presets, luts, prompts, guides, courses, assets"),
    maxPrice: z.number().optional().describe("Maximum price in USD (e.g. 29.99)"),
  },
  async ({ query, category, maxPrice }) => {
    const params = new URLSearchParams({ q: query, source: "mcp" });
    if (category) params.set("category", category);
    if (maxPrice) params.set("maxPrice", Math.round(maxPrice * 100).toString());

    const res = await fetch(`${API_URL}/api/products?${params}`);
    if (!res.ok) {
      return { content: [{ type: "text" as const, text: "Search failed. Please try again." }] };
    }
    const products = await res.json();

    if (products.length === 0) {
      return { content: [{ type: "text" as const, text: "No products found matching your query." }] };
    }

    const formatted = products.map((p: any) => ({
      title: p.title,
      description: p.description,
      price: `$${(Number(p.priceCents) / 100).toFixed(2)}`,
      category: p.category,
      slug: p.slug,
      url: `${API_URL}/${p.creatorSlug ?? ""}/${p.slug}`,
    }));

    return {
      content: [{ type: "text" as const, text: JSON.stringify(formatted, null, 2) }],
    };
  }
);
```

Note: The GET /api/products response needs to include creator slug. We need to join creators in Task 1.

**Step 2: Commit**

```bash
cd mcp-server
git add src/index.ts
git commit -m "feat: update search_products tool with real search and source tracking"
```

---

## Task 6: Update MCP server — `get_product` and `get_store` tools

**Files:**
- Modify: `mcp-server/src/index.ts`

**Step 1: Update get_product tool**

```typescript
server.tool(
  "get_product",
  "Get detailed information about a specific product on Fooshop, including price, description, and purchase link.",
  {
    slug: z.string().describe("Product slug (from search results)"),
  },
  async ({ slug }) => {
    const res = await fetch(`${API_URL}/api/products/${slug}?source=mcp`);
    if (!res.ok) {
      return { content: [{ type: "text" as const, text: "Product not found." }] };
    }
    const product = await res.json();

    return {
      content: [{
        type: "text" as const,
        text: JSON.stringify({
          title: product.title,
          description: product.description,
          price: `$${(Number(product.priceCents) / 100).toFixed(2)}`,
          category: product.category,
          creator: product.creatorName,
          url: product.url,
        }, null, 2),
      }],
    };
  }
);
```

**Step 2: Update get_store tool**

```typescript
server.tool(
  "get_store",
  "Get all products from a specific creator's store on Fooshop.",
  {
    slug: z.string().describe("Creator store slug"),
  },
  async ({ slug }) => {
    const res = await fetch(`${API_URL}/api/stores/${slug}?source=mcp`);
    if (!res.ok) {
      return { content: [{ type: "text" as const, text: "Store not found." }] };
    }
    const store = await res.json();

    return {
      content: [{ type: "text" as const, text: JSON.stringify(store, null, 2) }],
    };
  }
);
```

**Step 3: Commit**

```bash
cd mcp-server
git add src/index.ts
git commit -m "feat: update get_product and get_store tools with real API calls"
```

---

## Task 7: New MCP tool — `get_checkout_url`

**Files:**
- Modify: `mcp-server/src/index.ts`

**Step 1: Add get_checkout_url tool**

```typescript
server.tool(
  "get_checkout_url",
  "Get a Stripe checkout URL to purchase a product. Share this link with the user to complete their purchase.",
  {
    productId: z.string().describe("Product ID (UUID from search or product details)"),
  },
  async ({ productId }) => {
    const res = await fetch(`${API_URL}/api/checkout`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId, source: "mcp" }),
    });

    if (!res.ok) {
      const error = await res.json().catch(() => ({ error: "Checkout failed" }));
      return { content: [{ type: "text" as const, text: `Cannot create checkout: ${error.error}` }] };
    }

    const { url } = await res.json();
    return {
      content: [{ type: "text" as const, text: `Checkout URL: ${url}\n\nShare this link with the user to complete the purchase.` }],
    };
  }
);
```

**Step 2: Commit**

```bash
cd mcp-server
git add src/index.ts
git commit -m "feat: add get_checkout_url tool for agent-driven purchases"
```

---

## Task 8: Enhance GET /api/products to return creator info

**Files:**
- Modify: `src/app/api/products/route.ts`

The search_products MCP tool needs creator slugs in search results to build product URLs. Update the GET handler to join with creators table:

```typescript
const results = await db
  .select({
    product: products,
    creatorSlug: creators.slug,
  })
  .from(products)
  .innerJoin(creators, eq(products.creatorId, creators.id))
  .where(and(...conditions))
  .limit(50);

return NextResponse.json(
  results.map(({ product, creatorSlug }) => ({
    ...product,
    creatorSlug,
  }))
);
```

**Step 1: Commit**

```bash
git add src/app/api/products/route.ts
git commit -m "feat: include creator slug in product search results"
```

Note: This change is part of Task 1 (can be combined).

---

## Task 9: MCP server documentation

**Files:**
- Create: `mcp-server/README.md`

**Step 1: Write README**

Include:
- What Fooshop MCP server does
- Available tools with descriptions
- Installation and setup
- `claude_desktop_config.json` example
- Environment variables

**Step 2: Commit**

```bash
cd mcp-server
git add README.md
git commit -m "docs: add MCP server README with setup instructions"
```

---

## Consolidated Task Order

Tasks 1+8 can be merged (both modify `GET /api/products`). Tasks 5+6+7 can be merged (all modify MCP server `index.ts`).

**Execution order:**
1. Task 1+8: Enhance `GET /api/products` (search + filters + creator join)
2. Task 2: New `GET /api/products/[slug]`
3. Task 3: New `GET /api/stores/[slug]`
4. Task 4: Enhance `POST /api/checkout` with source
5. Tasks 5+6+7: Update all MCP server tools
6. Task 9: Documentation
