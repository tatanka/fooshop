# Zod Input Validation Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Zod schema validation to all POST/PUT/PATCH API routes with structured 400 error responses.

**Architecture:** Centralized Zod schemas in `src/lib/validations/` with one file per domain. Each route uses direct `safeParse()` — no middleware wrapper. Schemas also serve as TypeScript types via `z.infer<>`.

**Tech Stack:** Zod, Next.js App Router, Vitest

**Spec:** `docs/superpowers/specs/2026-03-16-zod-input-validation-design.md`

---

## File Structure

```
Create: src/lib/validations/helpers.ts        — validationError() helper + parseBody() JSON safety
Create: src/lib/validations/common.ts         — shared schemas: uuid, priceCents, hexColor
Create: src/lib/validations/products.ts       — productCreateSchema, productUpdateSchema
Create: src/lib/validations/coupons.ts        — couponCreateSchema, couponUpdateSchema, couponValidateSchema
Create: src/lib/validations/referrals.ts      — referralCreateSchema, referralUpdateSchema
Create: src/lib/validations/store.ts          — storeUpdateSchema, themeSchema, themeUpdateSchema, themeGenerateSchema, storeGenerateSchema
Create: src/lib/validations/checkout.ts       — checkoutCreateSchema
Create: src/lib/validations/upload.ts         — uploadCreateSchema
Create: src/lib/validations/buy-intents.ts    — buyIntentCreateSchema
Create: src/lib/validations/admin.ts          — adminCouponCreateSchema, adminCreatorUpdateSchema

Create: src/lib/validations/__tests__/helpers.test.ts
Create: src/lib/validations/__tests__/products.test.ts
Create: src/lib/validations/__tests__/coupons.test.ts
Create: src/lib/validations/__tests__/referrals.test.ts
Create: src/lib/validations/__tests__/store.test.ts
Create: src/lib/validations/__tests__/checkout.test.ts
Create: src/lib/validations/__tests__/upload.test.ts
Create: src/lib/validations/__tests__/buy-intents.test.ts
Create: src/lib/validations/__tests__/admin.test.ts

Modify: src/app/api/products/route.ts                — add validation to POST
Modify: src/app/api/products/[id]/route.ts            — add validation to PUT
Modify: src/app/api/checkout/route.ts                 — add validation to POST
Modify: src/app/api/coupons/route.ts                  — add validation to POST, remove manual checks
Modify: src/app/api/coupons/[id]/route.ts             — add validation to PUT
Modify: src/app/api/coupons/validate/route.ts         — add validation to POST
Modify: src/app/api/referrals/route.ts                — add validation to POST, remove manual checks
Modify: src/app/api/referrals/[id]/route.ts           — add validation to PUT, remove manual checks
Modify: src/app/api/store/route.ts                    — add validation to PUT
Modify: src/app/api/store/theme/route.ts              — replace validateTheme() with Zod
Modify: src/app/api/store/theme/generate/route.ts     — replace validateTheme() + manual check with Zod
Modify: src/app/api/store/generate/route.ts           — add validation to POST
Modify: src/app/api/upload/route.ts                   — add validation to POST, remove manual checks
Modify: src/app/api/buy-intents/route.ts              — add validation to POST, remove manual check
Modify: src/app/api/admin/coupons/route.ts            — add validation to POST, remove manual checks, add minAmountCents
Modify: src/app/api/admin/creators/[id]/route.ts      — add validation to PATCH

Delete: src/lib/theme.ts                              — validateTheme() replaced by Zod themeSchema (after all routes migrated)
```

---

## Chunk 1: Foundation (dependency + helpers + common schemas)

### Task 1: Add Zod dependency

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install zod**

Run: `pnpm add zod`

- [ ] **Step 2: Verify installation**

Run: `pnpm list zod`
Expected: `zod` listed as direct dependency

- [ ] **Step 3: Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "chore: add zod as direct dependency"
```

---

### Task 2: Create helpers and common schemas

**Files:**
- Create: `src/lib/validations/helpers.ts`
- Create: `src/lib/validations/common.ts`
- Test: `src/lib/validations/__tests__/helpers.test.ts`

- [ ] **Step 1: Write tests for validationError and parseBody**

```typescript
// src/lib/validations/__tests__/helpers.test.ts
import { describe, it, expect } from "vitest";
import { z } from "zod";
import { validationError, parseBody } from "@/lib/validations/helpers";
import { NextRequest } from "next/server";

describe("validationError", () => {
  it("returns 400 with structured error details", async () => {
    const schema = z.object({ title: z.string(), age: z.number() });
    const result = schema.safeParse({ title: 123, age: "not a number" });
    expect(result.success).toBe(false);
    if (result.success) return;

    const response = validationError(result.error);
    expect(response.status).toBe(400);

    const body = await response.json();
    expect(body.error).toBe("Validation failed");
    expect(body.details).toBeInstanceOf(Array);
    expect(body.details.length).toBeGreaterThan(0);
    expect(body.details[0]).toHaveProperty("field");
    expect(body.details[0]).toHaveProperty("message");
  });

  it("joins nested paths with dots", async () => {
    const schema = z.object({ theme: z.object({ color: z.string() }) });
    const result = schema.safeParse({ theme: { color: 123 } });
    if (result.success) return;

    const response = validationError(result.error);
    const body = await response.json();
    expect(body.details[0].field).toBe("theme.color");
  });
});

describe("parseBody", () => {
  it("returns parsed JSON for valid request body", async () => {
    const req = new NextRequest("http://localhost/api/test", {
      method: "POST",
      body: JSON.stringify({ title: "hello" }),
      headers: { "Content-Type": "application/json" },
    });
    const { data, error } = await parseBody(req);
    expect(error).toBeNull();
    expect(data).toEqual({ title: "hello" });
  });

  it("returns 400 response for invalid JSON", async () => {
    const req = new NextRequest("http://localhost/api/test", {
      method: "POST",
      body: "not json",
      headers: { "Content-Type": "application/json" },
    });
    const { data, error } = await parseBody(req);
    expect(data).toBeNull();
    expect(error).not.toBeNull();
    expect(error!.status).toBe(400);
    const body = await error!.json();
    expect(body.error).toBe("Invalid JSON");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm vitest run src/lib/validations/__tests__/helpers.test.ts`
Expected: FAIL — modules not found

- [ ] **Step 3: Implement helpers.ts**

```typescript
// src/lib/validations/helpers.ts
import { ZodError } from "zod";
import { NextRequest, NextResponse } from "next/server";

export function validationError(error: ZodError) {
  return NextResponse.json(
    {
      error: "Validation failed",
      details: error.errors.map((e) => ({
        field: e.path.join("."),
        message: e.message,
      })),
    },
    { status: 400 }
  );
}

export async function parseBody(
  req: NextRequest
): Promise<{ data: unknown; error: null } | { data: null; error: NextResponse }> {
  try {
    const data = await req.json();
    return { data, error: null };
  } catch {
    return {
      data: null,
      error: NextResponse.json({ error: "Invalid JSON" }, { status: 400 }),
    };
  }
}
```

- [ ] **Step 4: Implement common.ts**

```typescript
// src/lib/validations/common.ts
import { z } from "zod";

export const uuidSchema = z.string().uuid();
export const priceCentsSchema = z.number().int().min(0);
export const hexColorSchema = z.string().regex(/^#[0-9a-fA-F]{6}$/);
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `pnpm vitest run src/lib/validations/__tests__/helpers.test.ts`
Expected: PASS — all tests green

- [ ] **Step 6: Commit**

```bash
git add src/lib/validations/helpers.ts src/lib/validations/common.ts src/lib/validations/__tests__/helpers.test.ts
git commit -m "feat: add validation helpers (validationError, parseBody) and common schemas"
```

---

## Chunk 2: Domain schemas + tests

### Task 3: Products schemas

**Files:**
- Create: `src/lib/validations/products.ts`
- Test: `src/lib/validations/__tests__/products.test.ts`

- [ ] **Step 1: Write tests**

```typescript
// src/lib/validations/__tests__/products.test.ts
import { describe, it, expect } from "vitest";
import { productCreateSchema, productUpdateSchema } from "@/lib/validations/products";

describe("productCreateSchema", () => {
  const validProduct = {
    title: "My Ebook",
    priceCents: 999,
  };

  it("accepts valid product with required fields only", () => {
    expect(productCreateSchema.safeParse(validProduct).success).toBe(true);
  });

  it("accepts valid product with all optional fields", () => {
    const full = {
      ...validProduct,
      description: "A great ebook",
      category: "ebooks",
      status: "draft" as const,
      fileUrl: "https://example.com/file.pdf",
      coverImageUrl: "https://example.com/cover.jpg",
    };
    expect(productCreateSchema.safeParse(full).success).toBe(true);
  });

  it("rejects missing title", () => {
    const result = productCreateSchema.safeParse({ priceCents: 999 });
    expect(result.success).toBe(false);
  });

  it("rejects empty title", () => {
    const result = productCreateSchema.safeParse({ title: "", priceCents: 999 });
    expect(result.success).toBe(false);
  });

  it("rejects negative priceCents", () => {
    const result = productCreateSchema.safeParse({ title: "Test", priceCents: -1 });
    expect(result.success).toBe(false);
  });

  it("rejects non-integer priceCents", () => {
    const result = productCreateSchema.safeParse({ title: "Test", priceCents: 9.99 });
    expect(result.success).toBe(false);
  });

  it("rejects invalid status", () => {
    const result = productCreateSchema.safeParse({ ...validProduct, status: "archived" });
    expect(result.success).toBe(false);
  });

  it("rejects invalid fileUrl", () => {
    const result = productCreateSchema.safeParse({ ...validProduct, fileUrl: "not-a-url" });
    expect(result.success).toBe(false);
  });

  it("allows priceCents of 0 (free product)", () => {
    expect(productCreateSchema.safeParse({ title: "Free", priceCents: 0 }).success).toBe(true);
  });
});

describe("productUpdateSchema", () => {
  it("accepts partial updates", () => {
    expect(productUpdateSchema.safeParse({ title: "New Title" }).success).toBe(true);
  });

  it("accepts empty object (no-op update)", () => {
    expect(productUpdateSchema.safeParse({}).success).toBe(true);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm vitest run src/lib/validations/__tests__/products.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement products.ts**

```typescript
// src/lib/validations/products.ts
import { z } from "zod";
import { priceCentsSchema } from "./common";

export const productCreateSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(5000).optional(),
  priceCents: priceCentsSchema,
  category: z.string().min(1).optional(),
  status: z.enum(["draft", "published"]).optional(),
  fileUrl: z.string().url().optional(),
  coverImageUrl: z.string().url().optional(),
});

export const productUpdateSchema = productCreateSchema.partial();

export type ProductCreate = z.infer<typeof productCreateSchema>;
export type ProductUpdate = z.infer<typeof productUpdateSchema>;
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm vitest run src/lib/validations/__tests__/products.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/validations/products.ts src/lib/validations/__tests__/products.test.ts
git commit -m "feat: add product validation schemas with tests"
```

---

### Task 4: Coupons schemas

**Files:**
- Create: `src/lib/validations/coupons.ts`
- Test: `src/lib/validations/__tests__/coupons.test.ts`

- [ ] **Step 1: Write tests**

```typescript
// src/lib/validations/__tests__/coupons.test.ts
import { describe, it, expect } from "vitest";
import { couponCreateSchema, couponUpdateSchema, couponValidateSchema } from "@/lib/validations/coupons";

describe("couponCreateSchema", () => {
  const valid = { discountType: "percentage" as const, discountValue: 10 };

  it("accepts valid coupon with required fields", () => {
    expect(couponCreateSchema.safeParse(valid).success).toBe(true);
  });

  it("accepts all optional fields", () => {
    const full = {
      ...valid,
      code: "SAVE10",
      productId: "550e8400-e29b-41d4-a716-446655440000",
      minAmountCents: 1000,
      maxRedemptions: 50,
      expiresAt: "2026-12-31T23:59:59Z",
    };
    expect(couponCreateSchema.safeParse(full).success).toBe(true);
  });

  it("rejects percentage > 100", () => {
    const result = couponCreateSchema.safeParse({ discountType: "percentage", discountValue: 101 });
    expect(result.success).toBe(false);
  });

  it("allows fixed discount > 100", () => {
    expect(couponCreateSchema.safeParse({ discountType: "fixed", discountValue: 5000 }).success).toBe(true);
  });

  it("rejects non-positive discountValue", () => {
    expect(couponCreateSchema.safeParse({ discountType: "fixed", discountValue: 0 }).success).toBe(false);
  });

  it("rejects invalid discountType", () => {
    expect(couponCreateSchema.safeParse({ discountType: "bogus", discountValue: 10 }).success).toBe(false);
  });

  it("rejects non-ISO datetime for expiresAt", () => {
    const result = couponCreateSchema.safeParse({ ...valid, expiresAt: "next friday" });
    expect(result.success).toBe(false);
  });

  it("rejects invalid UUID for productId", () => {
    const result = couponCreateSchema.safeParse({ ...valid, productId: "not-a-uuid" });
    expect(result.success).toBe(false);
  });
});

describe("couponUpdateSchema", () => {
  it("accepts valid partial update", () => {
    expect(couponUpdateSchema.safeParse({ active: false }).success).toBe(true);
  });

  it("accepts nullable fields", () => {
    expect(couponUpdateSchema.safeParse({ maxRedemptions: null }).success).toBe(true);
  });

  it("rejects empty object", () => {
    expect(couponUpdateSchema.safeParse({}).success).toBe(false);
  });
});

describe("couponValidateSchema", () => {
  it("accepts valid code + productId", () => {
    expect(couponValidateSchema.safeParse({
      code: "SAVE10",
      productId: "550e8400-e29b-41d4-a716-446655440000",
    }).success).toBe(true);
  });

  it("rejects missing code", () => {
    expect(couponValidateSchema.safeParse({
      productId: "550e8400-e29b-41d4-a716-446655440000",
    }).success).toBe(false);
  });

  it("rejects missing productId", () => {
    expect(couponValidateSchema.safeParse({ code: "SAVE10" }).success).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm vitest run src/lib/validations/__tests__/coupons.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement coupons.ts**

```typescript
// src/lib/validations/coupons.ts
import { z } from "zod";
import { uuidSchema } from "./common";

const baseCouponSchema = z.object({
  code: z.string().min(1).max(50).optional(),
  discountType: z.enum(["percentage", "fixed"]),
  discountValue: z.number().int().positive(),
  productId: uuidSchema.optional(),
  minAmountCents: z.number().int().min(0).optional(),
  maxRedemptions: z.number().int().positive().optional(),
  expiresAt: z.string().datetime().optional(),
});

export const couponCreateSchema = baseCouponSchema.refine(
  (d) => !(d.discountType === "percentage" && (d.discountValue < 1 || d.discountValue > 100)),
  { message: "Percentage discount must be between 1 and 100", path: ["discountValue"] }
);

export const couponUpdateSchema = z.object({
  active: z.boolean().optional(),
  maxRedemptions: z.number().int().positive().nullable().optional(),
  expiresAt: z.string().datetime().nullable().optional(),
  minAmountCents: z.number().int().min(0).nullable().optional(),
}).refine(
  (obj) => Object.values(obj).some((v) => v !== undefined),
  { message: "At least one field is required" }
);

export const couponValidateSchema = z.object({
  code: z.string().min(1),
  productId: uuidSchema,
});

export type CouponCreate = z.infer<typeof couponCreateSchema>;
export type CouponUpdate = z.infer<typeof couponUpdateSchema>;
export type CouponValidate = z.infer<typeof couponValidateSchema>;
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm vitest run src/lib/validations/__tests__/coupons.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/validations/coupons.ts src/lib/validations/__tests__/coupons.test.ts
git commit -m "feat: add coupon validation schemas with tests"
```

---

### Task 5: Referrals schemas

**Files:**
- Create: `src/lib/validations/referrals.ts`
- Test: `src/lib/validations/__tests__/referrals.test.ts`

- [ ] **Step 1: Write tests**

```typescript
// src/lib/validations/__tests__/referrals.test.ts
import { describe, it, expect } from "vitest";
import { referralCreateSchema, referralUpdateSchema } from "@/lib/validations/referrals";

describe("referralCreateSchema", () => {
  const valid = { affiliateName: "John Doe", commissionPercent: 10 };

  it("accepts valid referral with required fields", () => {
    expect(referralCreateSchema.safeParse(valid).success).toBe(true);
  });

  it("accepts all optional fields", () => {
    const full = {
      ...valid,
      code: "JOHN10",
      affiliateEmail: "john@example.com",
      productId: "550e8400-e29b-41d4-a716-446655440000",
    };
    expect(referralCreateSchema.safeParse(full).success).toBe(true);
  });

  it("rejects commissionPercent < 1", () => {
    expect(referralCreateSchema.safeParse({ ...valid, commissionPercent: 0 }).success).toBe(false);
  });

  it("rejects commissionPercent > 100", () => {
    expect(referralCreateSchema.safeParse({ ...valid, commissionPercent: 101 }).success).toBe(false);
  });

  it("rejects invalid email", () => {
    expect(referralCreateSchema.safeParse({ ...valid, affiliateEmail: "not-email" }).success).toBe(false);
  });

  it("rejects empty affiliateName", () => {
    expect(referralCreateSchema.safeParse({ affiliateName: "", commissionPercent: 10 }).success).toBe(false);
  });
});

describe("referralUpdateSchema", () => {
  it("accepts partial update", () => {
    expect(referralUpdateSchema.safeParse({ active: false }).success).toBe(true);
  });

  it("accepts nullable affiliateEmail", () => {
    expect(referralUpdateSchema.safeParse({ affiliateEmail: null }).success).toBe(true);
  });

  it("rejects empty object", () => {
    expect(referralUpdateSchema.safeParse({}).success).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm vitest run src/lib/validations/__tests__/referrals.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement referrals.ts**

```typescript
// src/lib/validations/referrals.ts
import { z } from "zod";
import { uuidSchema } from "./common";

export const referralCreateSchema = z.object({
  code: z.string().min(1).max(50).optional(),
  affiliateName: z.string().min(1).max(200),
  affiliateEmail: z.string().email().optional(),
  productId: uuidSchema.optional(),
  commissionPercent: z.number().int().min(1).max(100),
});

export const referralUpdateSchema = z.object({
  affiliateName: z.string().min(1).max(200).optional(),
  affiliateEmail: z.string().email().nullable().optional(),
  commissionPercent: z.number().int().min(1).max(100).optional(),
  active: z.boolean().optional(),
  productId: uuidSchema.nullable().optional(),
}).refine(
  (obj) => Object.values(obj).some((v) => v !== undefined),
  { message: "At least one field is required" }
);

export type ReferralCreate = z.infer<typeof referralCreateSchema>;
export type ReferralUpdate = z.infer<typeof referralUpdateSchema>;
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm vitest run src/lib/validations/__tests__/referrals.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/validations/referrals.ts src/lib/validations/__tests__/referrals.test.ts
git commit -m "feat: add referral validation schemas with tests"
```

---

### Task 6: Store schemas (including theme)

**Files:**
- Create: `src/lib/validations/store.ts`
- Test: `src/lib/validations/__tests__/store.test.ts`

- [ ] **Step 1: Write tests**

```typescript
// src/lib/validations/__tests__/store.test.ts
import { describe, it, expect } from "vitest";
import {
  storeUpdateSchema,
  themeSchema,
  themeUpdateSchema,
  themeGenerateSchema,
  storeGenerateSchema,
} from "@/lib/validations/store";

describe("storeUpdateSchema", () => {
  it("accepts valid store name", () => {
    expect(storeUpdateSchema.safeParse({ storeName: "My Shop" }).success).toBe(true);
  });

  it("accepts empty object (no-op update)", () => {
    expect(storeUpdateSchema.safeParse({}).success).toBe(true);
  });

  it("rejects storeName over 100 chars", () => {
    expect(storeUpdateSchema.safeParse({ storeName: "x".repeat(101) }).success).toBe(false);
  });
});

describe("themeSchema", () => {
  const validTheme = {
    primaryColor: "#FF5733",
    secondaryColor: "#33FF57",
    backgroundColor: "#FFFFFF",
    textColor: "#000000",
    accentColor: "#5733FF",
    fontFamily: "sans" as const,
    heroStyle: "gradient" as const,
    layout: "grid" as const,
  };

  it("accepts valid theme", () => {
    expect(themeSchema.safeParse(validTheme).success).toBe(true);
  });

  it("rejects invalid hex color", () => {
    expect(themeSchema.safeParse({ ...validTheme, primaryColor: "red" }).success).toBe(false);
  });

  it("rejects invalid fontFamily", () => {
    expect(themeSchema.safeParse({ ...validTheme, fontFamily: "comic-sans" }).success).toBe(false);
  });

  it("rejects invalid heroStyle", () => {
    expect(themeSchema.safeParse({ ...validTheme, heroStyle: "flashy" }).success).toBe(false);
  });

  it("rejects invalid layout", () => {
    expect(themeSchema.safeParse({ ...validTheme, layout: "carousel" }).success).toBe(false);
  });

  it("rejects 3-digit hex color", () => {
    expect(themeSchema.safeParse({ ...validTheme, primaryColor: "#F00" }).success).toBe(false);
  });
});

describe("themeUpdateSchema", () => {
  it("accepts theme wrapped in object", () => {
    const validTheme = {
      primaryColor: "#FF5733",
      secondaryColor: "#33FF57",
      backgroundColor: "#FFFFFF",
      textColor: "#000000",
      accentColor: "#5733FF",
      fontFamily: "sans" as const,
      heroStyle: "gradient" as const,
      layout: "grid" as const,
    };
    expect(themeUpdateSchema.safeParse({ theme: validTheme }).success).toBe(true);
  });

  it("rejects missing theme key", () => {
    expect(themeUpdateSchema.safeParse({}).success).toBe(false);
  });
});

describe("themeGenerateSchema", () => {
  it("accepts valid prompt", () => {
    expect(themeGenerateSchema.safeParse({ prompt: "Make it blue" }).success).toBe(true);
  });

  it("rejects empty prompt", () => {
    expect(themeGenerateSchema.safeParse({ prompt: "" }).success).toBe(false);
  });
});

describe("storeGenerateSchema", () => {
  it("accepts valid description", () => {
    expect(storeGenerateSchema.safeParse({ description: "An art store" }).success).toBe(true);
  });

  it("rejects empty description", () => {
    expect(storeGenerateSchema.safeParse({ description: "" }).success).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm vitest run src/lib/validations/__tests__/store.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement store.ts**

```typescript
// src/lib/validations/store.ts
import { z } from "zod";
import { hexColorSchema } from "./common";

export const storeUpdateSchema = z.object({
  storeName: z.string().min(1).max(100).optional(),
  storeDescription: z.string().max(2000).optional(),
});

export const themeSchema = z.object({
  primaryColor: hexColorSchema,
  secondaryColor: hexColorSchema,
  backgroundColor: hexColorSchema,
  textColor: hexColorSchema,
  accentColor: hexColorSchema,
  fontFamily: z.enum(["sans", "serif", "mono"]),
  heroStyle: z.enum(["gradient", "solid", "minimal"]),
  layout: z.enum(["grid", "featured", "list"]),
});

export const themeUpdateSchema = z.object({
  theme: themeSchema,
});

export const themeGenerateSchema = z.object({
  prompt: z.string().min(1).max(1000),
});

export const storeGenerateSchema = z.object({
  description: z.string().min(1).max(2000),
});

export type StoreUpdate = z.infer<typeof storeUpdateSchema>;
export type ThemeData = z.infer<typeof themeSchema>;
export type ThemeGenerate = z.infer<typeof themeGenerateSchema>;
export type StoreGenerate = z.infer<typeof storeGenerateSchema>;
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm vitest run src/lib/validations/__tests__/store.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/validations/store.ts src/lib/validations/__tests__/store.test.ts
git commit -m "feat: add store/theme validation schemas with tests"
```

---

### Task 7: Checkout, upload, buy-intents schemas

**Files:**
- Create: `src/lib/validations/checkout.ts`
- Create: `src/lib/validations/upload.ts`
- Create: `src/lib/validations/buy-intents.ts`
- Test: `src/lib/validations/__tests__/checkout.test.ts`
- Test: `src/lib/validations/__tests__/upload.test.ts`
- Test: `src/lib/validations/__tests__/buy-intents.test.ts`

- [ ] **Step 1: Write tests for all three**

```typescript
// src/lib/validations/__tests__/checkout.test.ts
import { describe, it, expect } from "vitest";
import { checkoutCreateSchema } from "@/lib/validations/checkout";

describe("checkoutCreateSchema", () => {
  it("accepts valid checkout with only productId", () => {
    expect(checkoutCreateSchema.safeParse({
      productId: "550e8400-e29b-41d4-a716-446655440000",
    }).success).toBe(true);
  });

  it("accepts all optional fields", () => {
    expect(checkoutCreateSchema.safeParse({
      productId: "550e8400-e29b-41d4-a716-446655440000",
      couponCode: "SAVE10",
      referralCode: "REF123",
      source: "mcp",
    }).success).toBe(true);
  });

  it("rejects invalid productId", () => {
    expect(checkoutCreateSchema.safeParse({ productId: "not-uuid" }).success).toBe(false);
  });

  it("rejects missing productId", () => {
    expect(checkoutCreateSchema.safeParse({}).success).toBe(false);
  });

  it("rejects invalid source", () => {
    expect(checkoutCreateSchema.safeParse({
      productId: "550e8400-e29b-41d4-a716-446655440000",
      source: "invalid",
    }).success).toBe(false);
  });
});
```

```typescript
// src/lib/validations/__tests__/upload.test.ts
import { describe, it, expect } from "vitest";
import { uploadCreateSchema } from "@/lib/validations/upload";

describe("uploadCreateSchema", () => {
  it("accepts valid upload with required fields", () => {
    expect(uploadCreateSchema.safeParse({
      filename: "ebook.pdf",
      contentType: "application/pdf",
    }).success).toBe(true);
  });

  it("accepts optional purpose", () => {
    expect(uploadCreateSchema.safeParse({
      filename: "cover.jpg",
      contentType: "image/jpeg",
      purpose: "cover",
    }).success).toBe(true);
  });

  it("rejects missing filename", () => {
    expect(uploadCreateSchema.safeParse({ contentType: "application/pdf" }).success).toBe(false);
  });

  it("rejects empty filename", () => {
    expect(uploadCreateSchema.safeParse({ filename: "", contentType: "application/pdf" }).success).toBe(false);
  });

  it("rejects invalid purpose", () => {
    expect(uploadCreateSchema.safeParse({
      filename: "f.pdf",
      contentType: "application/pdf",
      purpose: "avatar",
    }).success).toBe(false);
  });
});
```

```typescript
// src/lib/validations/__tests__/buy-intents.test.ts
import { describe, it, expect } from "vitest";
import { buyIntentCreateSchema } from "@/lib/validations/buy-intents";

describe("buyIntentCreateSchema", () => {
  it("accepts valid UUID productId", () => {
    expect(buyIntentCreateSchema.safeParse({
      productId: "550e8400-e29b-41d4-a716-446655440000",
    }).success).toBe(true);
  });

  it("rejects missing productId", () => {
    expect(buyIntentCreateSchema.safeParse({}).success).toBe(false);
  });

  it("rejects non-UUID productId", () => {
    expect(buyIntentCreateSchema.safeParse({ productId: "abc123" }).success).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm vitest run src/lib/validations/__tests__/checkout.test.ts src/lib/validations/__tests__/upload.test.ts src/lib/validations/__tests__/buy-intents.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement all three schemas**

```typescript
// src/lib/validations/checkout.ts
import { z } from "zod";
import { uuidSchema } from "./common";

export const checkoutCreateSchema = z.object({
  productId: uuidSchema,
  couponCode: z.string().optional(),
  referralCode: z.string().optional(),
  source: z.enum(["web", "mcp", "api"]).optional(),
});

export type CheckoutCreate = z.infer<typeof checkoutCreateSchema>;
```

```typescript
// src/lib/validations/upload.ts
import { z } from "zod";

export const uploadCreateSchema = z.object({
  filename: z.string().min(1),
  contentType: z.string().min(1),
  purpose: z.enum(["file", "cover"]).optional(),
});

export type UploadCreate = z.infer<typeof uploadCreateSchema>;
```

```typescript
// src/lib/validations/buy-intents.ts
import { z } from "zod";
import { uuidSchema } from "./common";

export const buyIntentCreateSchema = z.object({
  productId: uuidSchema,
});

export type BuyIntentCreate = z.infer<typeof buyIntentCreateSchema>;
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm vitest run src/lib/validations/__tests__/checkout.test.ts src/lib/validations/__tests__/upload.test.ts src/lib/validations/__tests__/buy-intents.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/validations/checkout.ts src/lib/validations/upload.ts src/lib/validations/buy-intents.ts src/lib/validations/__tests__/checkout.test.ts src/lib/validations/__tests__/upload.test.ts src/lib/validations/__tests__/buy-intents.test.ts
git commit -m "feat: add checkout, upload, and buy-intents validation schemas with tests"
```

---

### Task 8: Admin schemas

**Files:**
- Create: `src/lib/validations/admin.ts`
- Test: `src/lib/validations/__tests__/admin.test.ts`

- [ ] **Step 1: Write tests**

```typescript
// src/lib/validations/__tests__/admin.test.ts
import { describe, it, expect } from "vitest";
import { adminCouponCreateSchema, adminCreatorUpdateSchema } from "@/lib/validations/admin";

describe("adminCouponCreateSchema", () => {
  const valid = {
    creatorId: "550e8400-e29b-41d4-a716-446655440000",
    discountType: "percentage" as const,
    discountValue: 15,
  };

  it("accepts valid admin coupon", () => {
    expect(adminCouponCreateSchema.safeParse(valid).success).toBe(true);
  });

  it("requires creatorId", () => {
    expect(adminCouponCreateSchema.safeParse({
      discountType: "percentage",
      discountValue: 15,
    }).success).toBe(false);
  });

  it("rejects percentage > 100", () => {
    expect(adminCouponCreateSchema.safeParse({ ...valid, discountValue: 101 }).success).toBe(false);
  });

  it("accepts minAmountCents", () => {
    expect(adminCouponCreateSchema.safeParse({ ...valid, minAmountCents: 500 }).success).toBe(true);
  });
});

describe("adminCreatorUpdateSchema", () => {
  it("accepts valid partial update", () => {
    expect(adminCreatorUpdateSchema.safeParse({ name: "New Name" }).success).toBe(true);
  });

  it("accepts commission override fields", () => {
    expect(adminCreatorUpdateSchema.safeParse({
      commissionOverridePercent: 3,
      commissionOverrideExpiresAt: "2026-12-31T23:59:59Z",
    }).success).toBe(true);
  });

  it("accepts nullable commission fields (to clear override)", () => {
    expect(adminCreatorUpdateSchema.safeParse({
      commissionOverridePercent: null,
      commissionOverrideExpiresAt: null,
    }).success).toBe(true);
  });

  it("rejects empty object", () => {
    expect(adminCreatorUpdateSchema.safeParse({}).success).toBe(false);
  });

  it("rejects invalid email", () => {
    expect(adminCreatorUpdateSchema.safeParse({ email: "not-email" }).success).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm vitest run src/lib/validations/__tests__/admin.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement admin.ts**

```typescript
// src/lib/validations/admin.ts
import { z } from "zod";
import { uuidSchema } from "./common";

export const adminCouponCreateSchema = z.object({
  creatorId: uuidSchema,
  code: z.string().min(1).max(50).optional(),
  discountType: z.enum(["percentage", "fixed"]),
  discountValue: z.number().int().positive(),
  productId: uuidSchema.optional(),
  minAmountCents: z.number().int().min(0).optional(),
  maxRedemptions: z.number().int().positive().optional(),
  expiresAt: z.string().datetime().optional(),
}).refine(
  (d) => !(d.discountType === "percentage" && (d.discountValue < 1 || d.discountValue > 100)),
  { message: "Percentage discount must be between 1 and 100", path: ["discountValue"] }
);

export const adminCreatorUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  storeName: z.string().min(1).max(100).optional(),
  storeDescription: z.string().max(2000).optional(),
  commissionOverridePercent: z.number().int().min(0).max(100).nullable().optional(),
  commissionOverrideExpiresAt: z.string().datetime().nullable().optional(),
}).refine(
  (obj) => Object.values(obj).some((v) => v !== undefined),
  { message: "At least one field is required" }
);

export type AdminCouponCreate = z.infer<typeof adminCouponCreateSchema>;
export type AdminCreatorUpdate = z.infer<typeof adminCreatorUpdateSchema>;
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm vitest run src/lib/validations/__tests__/admin.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/validations/admin.ts src/lib/validations/__tests__/admin.test.ts
git commit -m "feat: add admin validation schemas with tests"
```

---

## Chunk 3: Route integration — products, checkout, upload, buy-intents

These are the simpler routes with minimal existing manual validation to remove.

### Task 9: Integrate validation into products routes

**Files:**
- Modify: `src/app/api/products/route.ts`
- Modify: `src/app/api/products/[id]/route.ts`

- [ ] **Step 1: Update POST /api/products**

In `src/app/api/products/route.ts`, replace the body parsing in the POST handler. Change:

```typescript
const body = await req.json();
```

To:

```typescript
import { productCreateSchema } from "@/lib/validations/products";
import { validationError, parseBody } from "@/lib/validations/helpers";

// ... inside POST handler, after auth check:
const { data: body, error: parseError } = await parseBody(req);
if (parseError) return parseError;

const result = productCreateSchema.safeParse(body);
if (!result.success) return validationError(result.error);

const { title, description, priceCents, category, status, fileUrl, coverImageUrl } = result.data;
```

Then update the insert to use the destructured variables instead of `body.xxx`:

```typescript
const slug = title
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, "-")
  .replace(/(^-|-$)/g, "");

const [product] = await db
  .insert(products)
  .values({
    creatorId: creator.id,
    title,
    slug,
    description,
    priceCents,
    category,
    status: status ?? "published",
    fileUrl: fileUrl ?? null,
    coverImageUrl: coverImageUrl ?? null,
  })
  .returning();
```

- [ ] **Step 2: Update PUT /api/products/[id]**

In `src/app/api/products/[id]/route.ts`, replace:

```typescript
const body = await req.json();
```

With:

```typescript
import { productUpdateSchema } from "@/lib/validations/products";
import { validationError, parseBody } from "@/lib/validations/helpers";

// ... inside PUT handler, after auth + current product fetch:
const { data: body, error: parseError } = await parseBody(req);
if (parseError) return parseError;

const result = productUpdateSchema.safeParse(body);
if (!result.success) return validationError(result.error);
```

Then update file cleanup checks and destructuring to use `result.data`:

```typescript
// Clean up old R2 files if being replaced
const cleanups: Promise<void>[] = [];
if (result.data.fileUrl && current.fileUrl && result.data.fileUrl !== current.fileUrl) {
  cleanups.push(deleteObject(current.fileUrl).catch(() => {}));
}
if (result.data.coverImageUrl && current.coverImageUrl && result.data.coverImageUrl !== current.coverImageUrl) {
  cleanups.push(deleteObject(current.coverImageUrl).catch(() => {}));
}
if (cleanups.length > 0) {
  await Promise.all(cleanups);
}

const { title, description, priceCents, category, status, fileUrl, coverImageUrl } = result.data;
```

- [ ] **Step 3: Verify build passes**

Run: `pnpm build 2>&1 | tail -5`
Expected: Build succeeds

- [ ] **Step 4: Commit**

```bash
git add src/app/api/products/route.ts src/app/api/products/[id]/route.ts
git commit -m "feat: add Zod validation to products API routes"
```

---

### Task 10: Integrate validation into checkout route

**Files:**
- Modify: `src/app/api/checkout/route.ts`

- [ ] **Step 1: Update POST /api/checkout**

In `src/app/api/checkout/route.ts`, replace:

```typescript
const { productId, couponCode, referralCode, source } = await req.json();
```

With:

```typescript
import { checkoutCreateSchema } from "@/lib/validations/checkout";
import { validationError, parseBody } from "@/lib/validations/helpers";

// ... after rate limit check:
const { data: body, error: parseError } = await parseBody(req);
if (parseError) return parseError;

const result = checkoutCreateSchema.safeParse(body);
if (!result.success) return validationError(result.error);

const { productId, couponCode, referralCode, source } = result.data;
```

Rest of the handler stays unchanged — business logic (product exists, coupon valid, etc.) remains.

- [ ] **Step 2: Verify build passes**

Run: `pnpm build 2>&1 | tail -5`
Expected: Build succeeds

- [ ] **Step 3: Commit**

```bash
git add src/app/api/checkout/route.ts
git commit -m "feat: add Zod validation to checkout API route"
```

---

### Task 11: Integrate validation into upload route

**Files:**
- Modify: `src/app/api/upload/route.ts`

- [ ] **Step 1: Update POST /api/upload**

In `src/app/api/upload/route.ts`, replace:

```typescript
const { filename, contentType, purpose } = await req.json();

if (!filename || !contentType) {
  return NextResponse.json({ error: "filename and contentType are required" }, { status: 400 });
}

if (purpose && !["file", "cover"].includes(purpose)) {
  return NextResponse.json({ error: "Invalid purpose" }, { status: 400 });
}
```

With:

```typescript
import { uploadCreateSchema } from "@/lib/validations/upload";
import { validationError, parseBody } from "@/lib/validations/helpers";

// ... after rate limit check:
const { data: body, error: parseError } = await parseBody(req);
if (parseError) return parseError;

const result = uploadCreateSchema.safeParse(body);
if (!result.success) return validationError(result.error);

const { filename, contentType, purpose } = result.data;
```

- [ ] **Step 2: Verify build passes**

Run: `pnpm build 2>&1 | tail -5`
Expected: Build succeeds

- [ ] **Step 3: Commit**

```bash
git add src/app/api/upload/route.ts
git commit -m "feat: add Zod validation to upload API route"
```

---

### Task 12: Integrate validation into buy-intents route

**Files:**
- Modify: `src/app/api/buy-intents/route.ts`

- [ ] **Step 1: Update POST /api/buy-intents**

In `src/app/api/buy-intents/route.ts`, replace:

```typescript
const { productId } = await req.json();

if (!productId) {
  return NextResponse.json({ error: "productId required" }, { status: 400 });
}
```

With:

```typescript
import { buyIntentCreateSchema } from "@/lib/validations/buy-intents";
import { validationError, parseBody } from "@/lib/validations/helpers";

// ... after rate limit check:
const { data: body, error: parseError } = await parseBody(req);
if (parseError) return parseError;

const result = buyIntentCreateSchema.safeParse(body);
if (!result.success) return validationError(result.error);

const { productId } = result.data;
```

- [ ] **Step 2: Verify build passes**

Run: `pnpm build 2>&1 | tail -5`
Expected: Build succeeds

- [ ] **Step 3: Commit**

```bash
git add src/app/api/buy-intents/route.ts
git commit -m "feat: add Zod validation to buy-intents API route"
```

---

## Chunk 4: Route integration — coupons, referrals (remove manual validation)

These routes have significant manual validation to remove.

### Task 13: Integrate validation into coupons routes

**Files:**
- Modify: `src/app/api/coupons/route.ts`
- Modify: `src/app/api/coupons/[id]/route.ts`
- Modify: `src/app/api/coupons/validate/route.ts`

- [ ] **Step 1: Update POST /api/coupons**

In `src/app/api/coupons/route.ts`, replace lines 53-98 (body parse + all manual validation):

```typescript
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
if (!discountType || discountValue === undefined || discountValue === null) { ... }
if (typeof discountValue !== "number" || !Number.isInteger(discountValue) || discountValue <= 0) { ... }
if (!["percentage", "fixed"].includes(discountType)) { ... }
if (discountType === "percentage" && (discountValue < 1 || discountValue > 100)) { ... }
if (discountType === "fixed" && discountValue < 1) { ... }
```

With:

```typescript
import { couponCreateSchema } from "@/lib/validations/coupons";
import { validationError, parseBody } from "@/lib/validations/helpers";

// ... after creator check:
const { data: body, error: parseError } = await parseBody(req);
if (parseError) return parseError;

const result = couponCreateSchema.safeParse(body);
if (!result.success) return validationError(result.error);

const { code, discountType, discountValue, productId, minAmountCents, maxRedemptions, expiresAt } = result.data;
```

Keep the "product belongs to creator" DB check (lines 100-114) and the rest unchanged.

- [ ] **Step 2: Update PUT /api/coupons/[id]**

In `src/app/api/coupons/[id]/route.ts`, replace:

```typescript
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
```

With:

```typescript
import { couponUpdateSchema } from "@/lib/validations/coupons";
import { validationError, parseBody } from "@/lib/validations/helpers";

// ... after creator check:
const { data: body, error: parseError } = await parseBody(req);
if (parseError) return parseError;

const result = couponUpdateSchema.safeParse(body);
if (!result.success) return validationError(result.error);

const allowedFields: Record<string, unknown> = {};
if (result.data.active !== undefined) allowedFields.active = result.data.active;
if (result.data.maxRedemptions !== undefined) allowedFields.maxRedemptions = result.data.maxRedemptions;
if (result.data.expiresAt !== undefined) allowedFields.expiresAt = result.data.expiresAt ? new Date(result.data.expiresAt) : null;
if (result.data.minAmountCents !== undefined) allowedFields.minAmountCents = result.data.minAmountCents;
```

Note: the `.refine()` on `couponUpdateSchema` already ensures at least one field is present, so the empty-check is no longer needed.

- [ ] **Step 3: Update POST /api/coupons/validate**

In `src/app/api/coupons/validate/route.ts`, replace:

```typescript
const { code, productId } = await req.json();

if (!code || !productId) {
  return NextResponse.json(
    { valid: false, error: "Code and product ID required" },
    { status: 400 }
  );
}
```

With:

```typescript
import { couponValidateSchema } from "@/lib/validations/coupons";
import { validationError, parseBody } from "@/lib/validations/helpers";

// ... after rate limit check:
const { data: body, error: parseError } = await parseBody(req);
if (parseError) return parseError;

const result = couponValidateSchema.safeParse(body);
if (!result.success) return validationError(result.error);

const { code, productId } = result.data;
```

- [ ] **Step 4: Verify build passes**

Run: `pnpm build 2>&1 | tail -5`
Expected: Build succeeds

- [ ] **Step 5: Commit**

```bash
git add src/app/api/coupons/route.ts src/app/api/coupons/[id]/route.ts src/app/api/coupons/validate/route.ts
git commit -m "feat: add Zod validation to coupons API routes, remove manual checks"
```

---

### Task 14: Integrate validation into referrals routes

**Files:**
- Modify: `src/app/api/referrals/route.ts`
- Modify: `src/app/api/referrals/[id]/route.ts`

- [ ] **Step 1: Update POST /api/referrals**

In `src/app/api/referrals/route.ts`, replace lines 57-80 (body parse + manual validation):

```typescript
const body = await req.json();
const { code, affiliateName, affiliateEmail, productId, commissionPercent } = body;

// Validate required fields
if (!affiliateName || typeof affiliateName !== "string" || !affiliateName.trim()) { ... }
if (commissionPercent === undefined || ... ) { ... }
```

With:

```typescript
import { referralCreateSchema } from "@/lib/validations/referrals";
import { validationError, parseBody } from "@/lib/validations/helpers";

// ... after creator check:
const { data: body, error: parseError } = await parseBody(req);
if (parseError) return parseError;

const result = referralCreateSchema.safeParse(body);
if (!result.success) return validationError(result.error);

const { code, affiliateName, affiliateEmail, productId, commissionPercent } = result.data;
```

Keep the "product belongs to creator" DB check (lines 82-93) unchanged.

- [ ] **Step 2: Update PUT /api/referrals/[id]**

In `src/app/api/referrals/[id]/route.ts`, replace lines 28-68 (body parse + manual validation + allowedFields building):

```typescript
const body = await req.json();

const allowedFields: Record<string, unknown> = {};
if (body.affiliateName !== undefined) allowedFields.affiliateName = body.affiliateName.trim();
if (body.affiliateEmail !== undefined) allowedFields.affiliateEmail = body.affiliateEmail?.trim() || null;
if (body.commissionPercent !== undefined) {
  if (typeof body.commissionPercent !== "number" || ...) { ... }
  allowedFields.commissionPercent = body.commissionPercent;
}
// ... etc
```

With:

```typescript
import { referralUpdateSchema } from "@/lib/validations/referrals";
import { validationError, parseBody } from "@/lib/validations/helpers";

// ... after creator check:
const { data: body, error: parseError } = await parseBody(req);
if (parseError) return parseError;

const result = referralUpdateSchema.safeParse(body);
if (!result.success) return validationError(result.error);

const allowedFields: Record<string, unknown> = {};
if (result.data.affiliateName !== undefined) allowedFields.affiliateName = result.data.affiliateName.trim();
if (result.data.affiliateEmail !== undefined) allowedFields.affiliateEmail = result.data.affiliateEmail?.trim() || null;
if (result.data.commissionPercent !== undefined) allowedFields.commissionPercent = result.data.commissionPercent;
if (result.data.active !== undefined) allowedFields.active = result.data.active;
if (result.data.productId !== undefined) {
  const pid = result.data.productId || null;
  if (pid) {
    // DB check: product belongs to creator — keep this business logic
    const product = await db
      .select({ id: products.id })
      .from(products)
      .where(and(eq(products.id, pid), eq(products.creatorId, creator.id)))
      .then((rows) => rows[0]);

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }
  }
  allowedFields.productId = pid;
}
```

The `.refine()` ensures at least one field, so remove the `Object.keys(allowedFields).length === 0` check.

- [ ] **Step 3: Verify build passes**

Run: `pnpm build 2>&1 | tail -5`
Expected: Build succeeds

- [ ] **Step 4: Commit**

```bash
git add src/app/api/referrals/route.ts src/app/api/referrals/[id]/route.ts
git commit -m "feat: add Zod validation to referrals API routes, remove manual checks"
```

---

## Chunk 5: Route integration — store, admin, cleanup

### Task 15: Integrate validation into store routes

**Files:**
- Modify: `src/app/api/store/route.ts`
- Modify: `src/app/api/store/theme/route.ts`
- Modify: `src/app/api/store/theme/generate/route.ts`
- Modify: `src/app/api/store/generate/route.ts`

- [ ] **Step 1: Update PUT /api/store**

In `src/app/api/store/route.ts`, replace:

```typescript
const body = await req.json();
const [updated] = await db
  .update(creators)
  .set({
    storeName: body.storeName,
    storeDescription: body.storeDescription,
  })
```

With:

```typescript
import { storeUpdateSchema } from "@/lib/validations/store";
import { validationError, parseBody } from "@/lib/validations/helpers";

// ... after auth check:
const { data: body, error: parseError } = await parseBody(req);
if (parseError) return parseError;

const result = storeUpdateSchema.safeParse(body);
if (!result.success) return validationError(result.error);

const [updated] = await db
  .update(creators)
  .set({
    storeName: result.data.storeName,
    storeDescription: result.data.storeDescription,
  })
```

- [ ] **Step 2: Update PUT /api/store/theme**

In `src/app/api/store/theme/route.ts`, replace:

```typescript
import { validateTheme } from "@/lib/theme";

// ...
const body = await req.json();

if (!validateTheme(body.theme)) {
  return NextResponse.json({ error: "Invalid theme" }, { status: 400 });
}

const [updated] = await db
  .update(creators)
  .set({ storeTheme: body.theme })
```

With:

```typescript
import { themeUpdateSchema } from "@/lib/validations/store";
import { validationError, parseBody } from "@/lib/validations/helpers";

// ... after auth check:
const { data: body, error: parseError } = await parseBody(req);
if (parseError) return parseError;

const result = themeUpdateSchema.safeParse(body);
if (!result.success) return validationError(result.error);

const [updated] = await db
  .update(creators)
  .set({ storeTheme: result.data.theme })
```

Remove the `import { validateTheme } from "@/lib/theme"` line.

- [ ] **Step 3: Update POST /api/store/theme/generate**

In `src/app/api/store/theme/generate/route.ts`, replace:

```typescript
import { validateTheme } from "@/lib/theme";

// ...
const body = await req.json();
const { prompt } = body;

if (!prompt || typeof prompt !== "string" || prompt.trim().length === 0) {
  return NextResponse.json(
    { error: "prompt is required and must be a non-empty string" },
    { status: 400 }
  );
}

const theme = await generateTheme(prompt.trim());

if (!validateTheme(theme)) {
```

With:

```typescript
import { themeGenerateSchema, themeSchema } from "@/lib/validations/store";
import { validationError, parseBody } from "@/lib/validations/helpers";

// ... after rate limit check:
const { data: body, error: parseError } = await parseBody(req);
if (parseError) return parseError;

const result = themeGenerateSchema.safeParse(body);
if (!result.success) return validationError(result.error);

const theme = await generateTheme(result.data.prompt.trim());

if (!themeSchema.safeParse(theme).success) {
```

Remove the `import { validateTheme } from "@/lib/theme"` line.

- [ ] **Step 4: Update POST /api/store/generate**

In `src/app/api/store/generate/route.ts`, replace:

```typescript
const { description } = await req.json();
```

With:

```typescript
import { storeGenerateSchema } from "@/lib/validations/store";
import { validationError, parseBody } from "@/lib/validations/helpers";

// ... after rate limit check:
const { data: body, error: parseError } = await parseBody(req);
if (parseError) return parseError;

const result = storeGenerateSchema.safeParse(body);
if (!result.success) return validationError(result.error);

const { description } = result.data;
```

- [ ] **Step 5: Verify build passes**

Run: `pnpm build 2>&1 | tail -5`
Expected: Build succeeds

- [ ] **Step 6: Commit**

```bash
git add src/app/api/store/route.ts src/app/api/store/theme/route.ts src/app/api/store/theme/generate/route.ts src/app/api/store/generate/route.ts
git commit -m "feat: add Zod validation to store API routes, replace validateTheme()"
```

---

### Task 16: Integrate validation into admin routes

**Files:**
- Modify: `src/app/api/admin/coupons/route.ts`
- Modify: `src/app/api/admin/creators/[id]/route.ts`

- [ ] **Step 1: Update POST /api/admin/coupons**

In `src/app/api/admin/coupons/route.ts`, replace:

```typescript
const body = await req.json();
const { creatorId, code, discountType, discountValue, productId, maxRedemptions, expiresAt } = body;

if (!creatorId || !discountType || discountValue === undefined) {
  return NextResponse.json(
    { error: "creatorId, discountType, and discountValue are required" },
    { status: 400 }
  );
}
```

With:

```typescript
import { adminCouponCreateSchema } from "@/lib/validations/admin";
import { validationError, parseBody } from "@/lib/validations/helpers";

// ... after auth + scope check:
const { data: body, error: parseError } = await parseBody(req);
if (parseError) return parseError;

const result = adminCouponCreateSchema.safeParse(body);
if (!result.success) return validationError(result.error);

const { creatorId, code, discountType, discountValue, productId, minAmountCents, maxRedemptions, expiresAt } = result.data;
```

Also add `minAmountCents` to the insert `.values()`:

```typescript
.values({
  creatorId,
  code: finalCode,
  discountType,
  discountValue,
  productId: productId || null,
  minAmountCents: minAmountCents ?? null,
  maxRedemptions: maxRedemptions || null,
  expiresAt: expiresAt ? new Date(expiresAt) : null,
})
```

- [ ] **Step 2: Update PATCH /api/admin/creators/[id]**

In `src/app/api/admin/creators/[id]/route.ts`, replace:

```typescript
const body = await req.json();

const allowedFields: Record<string, unknown> = {};
if (body.name !== undefined) allowedFields.name = body.name;
if (body.email !== undefined) allowedFields.email = body.email;
// ... etc

if (Object.keys(allowedFields).length === 0) {
  return NextResponse.json(
    { error: "No valid fields to update" },
    { status: 400 }
  );
}
```

With:

```typescript
import { adminCreatorUpdateSchema } from "@/lib/validations/admin";
import { validationError, parseBody } from "@/lib/validations/helpers";

// ... after auth + scope check:
const { data: body, error: parseError } = await parseBody(req);
if (parseError) return parseError;

const result = adminCreatorUpdateSchema.safeParse(body);
if (!result.success) return validationError(result.error);

const allowedFields: Record<string, unknown> = {};
if (result.data.name !== undefined) allowedFields.name = result.data.name;
if (result.data.email !== undefined) allowedFields.email = result.data.email;
if (result.data.storeName !== undefined) allowedFields.storeName = result.data.storeName;
if (result.data.storeDescription !== undefined) allowedFields.storeDescription = result.data.storeDescription;
if (result.data.commissionOverridePercent !== undefined) allowedFields.commissionOverridePercent = result.data.commissionOverridePercent;
if (result.data.commissionOverrideExpiresAt !== undefined)
  allowedFields.commissionOverrideExpiresAt = result.data.commissionOverrideExpiresAt
    ? new Date(result.data.commissionOverrideExpiresAt)
    : null;
```

The `.refine()` ensures at least one field, so remove the `Object.keys().length === 0` check.

- [ ] **Step 3: Verify build passes**

Run: `pnpm build 2>&1 | tail -5`
Expected: Build succeeds

- [ ] **Step 4: Commit**

```bash
git add src/app/api/admin/coupons/route.ts src/app/api/admin/creators/[id]/route.ts
git commit -m "feat: add Zod validation to admin API routes, add minAmountCents to admin coupons"
```

---

### Task 17: Delete validateTheme() and run final checks

**Files:**
- Delete: `src/lib/theme.ts`

- [ ] **Step 1: Verify no remaining imports of validateTheme**

Run: `grep -r "validateTheme\|from.*lib/theme" src/ --include="*.ts" --include="*.tsx"`
Expected: No matches (all imports removed in Tasks 15)

If matches remain, fix them first.

- [ ] **Step 2: Delete src/lib/theme.ts**

```bash
rm src/lib/theme.ts
```

- [ ] **Step 3: Run all validation tests**

Run: `pnpm vitest run src/lib/validations/`
Expected: All tests pass

- [ ] **Step 4: Run full build**

Run: `pnpm build 2>&1 | tail -10`
Expected: Build succeeds with no errors

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "refactor: remove validateTheme() — replaced by Zod themeSchema"
```

---

### Task 18: Run full test suite and final verification

- [ ] **Step 1: Run all tests**

Run: `pnpm vitest run`
Expected: All tests pass (existing + new validation tests)

- [ ] **Step 2: Run build**

Run: `pnpm build`
Expected: Successful build

- [ ] **Step 3: Verify no TypeScript errors**

Run: `pnpm tsc --noEmit 2>&1 | tail -20`
Expected: No errors (or only pre-existing ones)
