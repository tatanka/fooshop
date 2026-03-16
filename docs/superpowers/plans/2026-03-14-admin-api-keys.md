# Admin API Keys Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add scoped API key authentication for platform admin access, enabling a HubSpot CRM connector to read/write Fooshop data across all creators.

**Architecture:** New `api_keys` table with hashed keys and scopes. An `authenticateRequest()` helper checks `Authorization: Bearer <key>` first, then falls back to session auth — so all existing routes keep working. New admin-only API routes under `/api/admin/` for cross-creator data access. A seed script generates the first admin key for HubSpot.

**Tech Stack:** Drizzle ORM (schema + migration), Node.js `crypto` (SHA-256 hashing), Next.js API routes.

---

## Chunk 1: Schema, Auth Helper, and Seed Script

### Task 1: Add `api_keys` table to schema

**Files:**
- Modify: `src/db/schema.ts`

- [ ] **Step 1: Add the `apiKeys` table definition to schema**

After the `referralConversions` table, add:

```typescript
export const apiKeys = pgTable("api_keys", {
  id: uuid("id").primaryKey().defaultRandom(),
  creatorId: uuid("creator_id").references(() => creators.id),
  keyHash: text("key_hash").notNull(),
  keyPrefix: text("key_prefix").notNull(),
  name: text("name").notNull(),
  scopes: text("scopes").array().notNull(),
  lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});
```

Note: `creatorId` is nullable — `NULL` means admin key (cross-creator access). Non-null means scoped to one creator (for future use).

- [ ] **Step 2: Push schema to database**

Run: `pnpm drizzle-kit push`
Expected: table `api_keys` created

- [ ] **Step 3: Commit**

```bash
git add src/db/schema.ts
git commit -m "feat: add api_keys table to schema"
```

---

### Task 2: Create API key auth helper

**Files:**
- Create: `src/lib/api-key.ts`

- [ ] **Step 1: Create `src/lib/api-key.ts`**

```typescript
import { createHash } from "crypto";
import { db } from "@/db";
import { apiKeys } from "@/db/schema";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export function hashApiKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}

export function generateApiKey(): { key: string; prefix: string; hash: string } {
  const key = `fsk_${crypto.randomUUID().replace(/-/g, "")}`;
  const prefix = key.slice(0, 12);
  const hash = hashApiKey(key);
  return { key, prefix, hash };
}

export type ApiKeyAuth = {
  type: "api_key";
  keyId: string;
  scopes: string[];
  creatorId: string | null;
};

export type SessionAuth = {
  type: "session";
  userId: string;
};

export type AuthResult = ApiKeyAuth | SessionAuth | null;

/**
 * Validates an API key from the Authorization header.
 * Returns the key record if valid, null otherwise.
 */
export async function validateApiKey(
  req: NextRequest
): Promise<ApiKeyAuth | null> {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer fsk_")) return null;

  const key = authHeader.slice(7); // Remove "Bearer "
  const hash = hashApiKey(key);

  const [record] = await db
    .select()
    .from(apiKeys)
    .where(eq(apiKeys.keyHash, hash));

  if (!record) return null;
  if (record.expiresAt && record.expiresAt < new Date()) return null;

  // Update last_used_at (fire-and-forget)
  db.update(apiKeys)
    .set({ lastUsedAt: new Date() })
    .where(eq(apiKeys.id, record.id))
    .then(() => {});

  return {
    type: "api_key",
    keyId: record.id,
    scopes: record.scopes,
    creatorId: record.creatorId,
  };
}

/**
 * Checks if the API key has the required scope.
 */
export function hasScope(auth: ApiKeyAuth, scope: string): boolean {
  return auth.scopes.includes(scope) || auth.scopes.includes("admin:*");
}

/**
 * Helper to return 403 when scope is missing.
 */
export function insufficientScope(scope: string) {
  return NextResponse.json(
    { error: "Insufficient scope", required: scope },
    { status: 403 }
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/api-key.ts
git commit -m "feat: add API key validation helper"
```

---

### Task 3: Create seed script for admin API key

**Files:**
- Create: `src/scripts/generate-api-key.ts`

- [ ] **Step 1: Create the key generation script**

```typescript
import "dotenv/config";
import { db } from "../db";
import { apiKeys } from "../db/schema";
import { generateApiKey } from "../lib/api-key";

const ADMIN_SCOPES = [
  "admin:read:creators",
  "admin:read:orders",
  "admin:read:products",
  "admin:read:analytics",
  "admin:write:creators",
  "admin:write:coupons",
];

async function main() {
  const name = process.argv[2] || "HubSpot CRM";

  const { key, prefix, hash } = generateApiKey();

  await db.insert(apiKeys).values({
    name,
    keyHash: hash,
    keyPrefix: prefix,
    scopes: ADMIN_SCOPES,
    creatorId: null, // admin key
  });

  console.log("API key created successfully!");
  console.log(`  Name:   ${name}`);
  console.log(`  Key:    ${key}`);
  console.log(`  Prefix: ${prefix}`);
  console.log(`  Scopes: ${ADMIN_SCOPES.join(", ")}`);
  console.log("");
  console.log("⚠ Save this key now — it cannot be retrieved later.");

  process.exit(0);
}

main().catch((err) => {
  console.error("Failed:", err);
  process.exit(1);
});
```

- [ ] **Step 2: Add npm script to package.json**

In `package.json` scripts, add:
```json
"generate-api-key": "tsx src/scripts/generate-api-key.ts"
```

- [ ] **Step 3: Commit**

```bash
git add src/scripts/generate-api-key.ts package.json
git commit -m "feat: add script to generate admin API keys"
```

---

## Chunk 2: Admin API Routes (Read)

### Task 4: Admin creators endpoint

**Files:**
- Create: `src/app/api/admin/creators/route.ts`

This endpoint returns all creators with their key metrics. HubSpot uses it to sync contacts.

- [ ] **Step 1: Create the admin creators route**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { validateApiKey, hasScope, insufficientScope } from "@/lib/api-key";
import { db } from "@/db";
import { creators, orders, products } from "@/db/schema";
import { eq, sql } from "drizzle-orm";

const SCOPE = "admin:read:creators";

export async function GET(req: NextRequest) {
  const auth = await validateApiKey(req);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!hasScope(auth, SCOPE)) return insufficientScope(SCOPE);

  const rows = await db
    .select({
      id: creators.id,
      userId: creators.userId,
      email: creators.email,
      name: creators.name,
      slug: creators.slug,
      storeName: creators.storeName,
      stripeConnectId: creators.stripeConnectId,
      createdAt: creators.createdAt,
      productCount: sql<number>`(
        select count(*) from products where products.creator_id = creators.id
      )`,
      orderCount: sql<number>`(
        select count(*) from orders where orders.creator_id = creators.id and orders.status = 'completed'
      )`,
      revenueCents: sql<number>`(
        select coalesce(sum(orders.amount_cents), 0) from orders where orders.creator_id = creators.id and orders.status = 'completed'
      )`,
    })
    .from(creators);

  return NextResponse.json(rows);
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/admin/creators/route.ts
git commit -m "feat: add admin GET /api/admin/creators"
```

---

### Task 5: Admin orders endpoint

**Files:**
- Create: `src/app/api/admin/orders/route.ts`

Returns all orders across all creators. Supports `?since=ISO_DATE` for incremental sync.

- [ ] **Step 1: Create the admin orders route**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { validateApiKey, hasScope, insufficientScope } from "@/lib/api-key";
import { db } from "@/db";
import { orders, products, creators } from "@/db/schema";
import { eq, gte, desc } from "drizzle-orm";

const SCOPE = "admin:read:orders";

export async function GET(req: NextRequest) {
  const auth = await validateApiKey(req);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!hasScope(auth, SCOPE)) return insufficientScope(SCOPE);

  const since = req.nextUrl.searchParams.get("since");
  const limit = Math.min(
    parseInt(req.nextUrl.searchParams.get("limit") ?? "100", 10),
    500
  );

  const conditions = [];
  if (since) {
    conditions.push(gte(orders.createdAt, new Date(since)));
  }

  const rows = await db
    .select({
      id: orders.id,
      productId: orders.productId,
      productTitle: products.title,
      creatorId: orders.creatorId,
      creatorName: creators.name,
      creatorEmail: creators.email,
      buyerEmail: orders.buyerEmail,
      buyerName: orders.buyerName,
      amountCents: orders.amountCents,
      platformFeeCents: orders.platformFeeCents,
      status: orders.status,
      couponId: orders.couponId,
      createdAt: orders.createdAt,
    })
    .from(orders)
    .innerJoin(products, eq(orders.productId, products.id))
    .innerJoin(creators, eq(orders.creatorId, creators.id))
    .where(conditions.length > 0 ? conditions[0] : undefined)
    .orderBy(desc(orders.createdAt))
    .limit(limit);

  return NextResponse.json(rows);
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/admin/orders/route.ts
git commit -m "feat: add admin GET /api/admin/orders"
```

---

### Task 6: Admin products endpoint

**Files:**
- Create: `src/app/api/admin/products/route.ts`

- [ ] **Step 1: Create the admin products route**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { validateApiKey, hasScope, insufficientScope } from "@/lib/api-key";
import { db } from "@/db";
import { products, creators } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

const SCOPE = "admin:read:products";

export async function GET(req: NextRequest) {
  const auth = await validateApiKey(req);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!hasScope(auth, SCOPE)) return insufficientScope(SCOPE);

  const limit = Math.min(
    parseInt(req.nextUrl.searchParams.get("limit") ?? "100", 10),
    500
  );

  const rows = await db
    .select({
      id: products.id,
      creatorId: products.creatorId,
      creatorName: creators.name,
      title: products.title,
      slug: products.slug,
      description: products.description,
      priceCents: products.priceCents,
      currency: products.currency,
      category: products.category,
      status: products.status,
      createdAt: products.createdAt,
    })
    .from(products)
    .innerJoin(creators, eq(products.creatorId, creators.id))
    .orderBy(desc(products.createdAt))
    .limit(limit);

  return NextResponse.json(rows);
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/admin/products/route.ts
git commit -m "feat: add admin GET /api/admin/products"
```

---

## Chunk 3: Admin API Routes (Write)

### Task 7: Admin update creator endpoint

**Files:**
- Create: `src/app/api/admin/creators/[id]/route.ts`

HubSpot can update creator fields (e.g. name, email, store metadata).

- [ ] **Step 1: Create the admin creator update route**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { validateApiKey, hasScope, insufficientScope } from "@/lib/api-key";
import { db } from "@/db";
import { creators } from "@/db/schema";
import { eq } from "drizzle-orm";

const SCOPE = "admin:write:creators";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await validateApiKey(req);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!hasScope(auth, "admin:read:creators")) {
    return insufficientScope("admin:read:creators");
  }

  const { id } = await params;
  const [creator] = await db
    .select()
    .from(creators)
    .where(eq(creators.id, id));

  if (!creator) {
    return NextResponse.json({ error: "Creator not found" }, { status: 404 });
  }

  return NextResponse.json(creator);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await validateApiKey(req);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!hasScope(auth, SCOPE)) return insufficientScope(SCOPE);

  const { id } = await params;
  const body = await req.json();

  const allowedFields: Record<string, unknown> = {};
  if (body.name !== undefined) allowedFields.name = body.name;
  if (body.email !== undefined) allowedFields.email = body.email;
  if (body.storeName !== undefined) allowedFields.storeName = body.storeName;
  if (body.storeDescription !== undefined)
    allowedFields.storeDescription = body.storeDescription;

  if (Object.keys(allowedFields).length === 0) {
    return NextResponse.json(
      { error: "No valid fields to update" },
      { status: 400 }
    );
  }

  const [updated] = await db
    .update(creators)
    .set(allowedFields)
    .where(eq(creators.id, id))
    .returning();

  if (!updated) {
    return NextResponse.json({ error: "Creator not found" }, { status: 404 });
  }

  return NextResponse.json(updated);
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/admin/creators/\[id\]/route.ts
git commit -m "feat: add admin GET/PATCH /api/admin/creators/[id]"
```

---

### Task 8: Admin coupons endpoint

**Files:**
- Create: `src/app/api/admin/coupons/route.ts`

HubSpot can create coupons for any creator (marketing campaigns).

- [ ] **Step 1: Create the admin coupons route**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { validateApiKey, hasScope, insufficientScope } from "@/lib/api-key";
import { db } from "@/db";
import { coupons, creators, products } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { generateCouponCode } from "@/lib/coupon";

const READ_SCOPE = "admin:read:orders"; // coupons are part of sales data
const WRITE_SCOPE = "admin:write:coupons";

export async function GET(req: NextRequest) {
  const auth = await validateApiKey(req);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!hasScope(auth, READ_SCOPE)) return insufficientScope(READ_SCOPE);

  const rows = await db
    .select({
      coupon: coupons,
      creatorName: creators.name,
    })
    .from(coupons)
    .innerJoin(creators, eq(coupons.creatorId, creators.id));

  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const auth = await validateApiKey(req);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!hasScope(auth, WRITE_SCOPE)) return insufficientScope(WRITE_SCOPE);

  const body = await req.json();
  const { creatorId, code, discountType, discountValue, productId, maxRedemptions, expiresAt } = body;

  if (!creatorId || !discountType || discountValue === undefined) {
    return NextResponse.json(
      { error: "creatorId, discountType, and discountValue are required" },
      { status: 400 }
    );
  }

  // Verify creator exists
  const [creator] = await db
    .select({ id: creators.id })
    .from(creators)
    .where(eq(creators.id, creatorId));

  if (!creator) {
    return NextResponse.json({ error: "Creator not found" }, { status: 404 });
  }

  // Verify product belongs to creator (if provided)
  if (productId) {
    const [product] = await db
      .select({ id: products.id })
      .from(products)
      .where(and(eq(products.id, productId), eq(products.creatorId, creatorId)));

    if (!product) {
      return NextResponse.json({ error: "Product not found for this creator" }, { status: 404 });
    }
  }

  const finalCode = (code || generateCouponCode()).toUpperCase().trim();

  try {
    const [coupon] = await db
      .insert(coupons)
      .values({
        creatorId,
        code: finalCode,
        discountType,
        discountValue,
        productId: productId || null,
        maxRedemptions: maxRedemptions || null,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
      })
      .returning();

    return NextResponse.json(coupon, { status: 201 });
  } catch (err) {
    if (err instanceof Error && err.message.includes("unique")) {
      return NextResponse.json(
        { error: "A coupon with this code already exists for this creator" },
        { status: 409 }
      );
    }
    throw err;
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/admin/coupons/route.ts
git commit -m "feat: add admin GET/POST /api/admin/coupons"
```

---

## Chunk 4: Build Verification and Key Generation

### Task 9: Verify build and generate key

- [ ] **Step 1: Run build to verify everything compiles**

Run: `pnpm build`
Expected: build succeeds with no errors

- [ ] **Step 2: Push schema to database**

Run: `pnpm drizzle-kit push`
Expected: `api_keys` table created/updated

- [ ] **Step 3: Generate the HubSpot admin key**

Run: `pnpm generate-api-key "HubSpot CRM"`
Expected: key printed to console. Save it securely.

- [ ] **Step 4: Test with curl**

```bash
# Should return all creators
curl -H "Authorization: Bearer fsk_<your-key>" http://localhost:3000/api/admin/creators

# Should return all orders
curl -H "Authorization: Bearer fsk_<your-key>" http://localhost:3000/api/admin/orders

# Should return 401 without key
curl http://localhost:3000/api/admin/creators

# Should return 403 with wrong scope (if you create a key with limited scopes)
```

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "feat: admin API keys for external integrations (HubSpot)"
```
