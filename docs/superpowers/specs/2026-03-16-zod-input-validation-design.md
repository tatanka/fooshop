# Zod Input Validation for API Routes

**Issue:** #51 — [GEN-026] Input validation sistematica (Zod) su API routes
**Date:** 2026-03-16
**Status:** Approved

## Goal

Add Zod schema validation to all POST/PUT/PATCH API routes, replacing scattered manual checks with consistent, type-safe validation and structured 400 error responses.

## Decisions

- **Schemas as types:** Use `z.infer<typeof schema>` to derive TypeScript types from schemas — eliminates type drift.
- **Centralized schemas:** All schemas live in `src/lib/validations/` with one file per domain.
- **Direct safeParse:** Each route calls `schema.safeParse(body)` explicitly (no middleware wrapper).
- **Stricter date format:** `expiresAt` fields require ISO 8601 datetime strings (`z.string().datetime()`). This is a deliberate tightening from the current permissive `new Date(string)` parsing.

## Error Response Format

Validation errors return 400 with structured details:

```json
{
  "error": "Validation failed",
  "details": [
    { "field": "title", "message": "Required" },
    { "field": "priceCents", "message": "Expected number, received string" }
  ]
}
```

Compatible with existing `{ error: "..." }` pattern used by all routes.

## File Structure

```
src/lib/validations/
  helpers.ts          # validationError() helper
  common.ts           # shared: uuidSchema, priceCentsSchema, hexColorSchema
  products.ts         # productCreateSchema, productUpdateSchema
  coupons.ts          # couponCreateSchema, couponUpdateSchema, couponValidateSchema
  referrals.ts        # referralCreateSchema, referralUpdateSchema
  store.ts            # storeUpdateSchema, themeSchema, themeUpdateSchema, themeGenerateSchema, storeGenerateSchema
  checkout.ts         # checkoutCreateSchema
  upload.ts           # uploadCreateSchema
  buy-intents.ts      # buyIntentCreateSchema
  admin.ts            # adminCouponCreateSchema, adminCreatorUpdateSchema
```

### helpers.ts

```typescript
import { ZodError } from "zod";
import { NextResponse } from "next/server";

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
```

### common.ts

Shared building blocks composed into domain schemas:

```typescript
export const uuidSchema = z.string().uuid();
export const priceCentsSchema = z.number().int().min(0);
export const hexColorSchema = z.string().regex(/^#[0-9a-fA-F]{6}$/);
```

## All Schemas

### Products (`products.ts`)

Fields match actual route at `src/app/api/products/route.ts` (lines 115-122) and `src/app/api/products/[id]/route.ts` (line 84).

```typescript
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
```

### Coupons (`coupons.ts`)

Replaces duplicated manual validation in both regular and admin routes. Fields match `src/app/api/coupons/route.ts` (lines 54-62).

```typescript
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

// PUT /api/coupons/[id] — only allows specific fields
export const couponUpdateSchema = z.object({
  active: z.boolean().optional(),
  maxRedemptions: z.number().int().positive().nullable().optional(),
  expiresAt: z.string().datetime().nullable().optional(),
  minAmountCents: z.number().int().min(0).nullable().optional(),
}).refine(
  (obj) => Object.values(obj).some((v) => v !== undefined),
  { message: "At least one field is required" }
);

// POST /api/coupons/validate
export const couponValidateSchema = z.object({
  code: z.string().min(1),
  productId: uuidSchema,
});
```

### Referrals (`referrals.ts`)

Fields match `src/app/api/referrals/route.ts` (line 58).

```typescript
export const referralCreateSchema = z.object({
  code: z.string().min(1).max(50).optional(),
  affiliateName: z.string().min(1).max(200),
  affiliateEmail: z.string().email().optional(),
  productId: uuidSchema.optional(),
  commissionPercent: z.number().int().min(1).max(100),
});

// PUT /api/referrals/[id] — only allows specific fields
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
```

### Store (`store.ts`)

Fields match `src/app/api/store/route.ts` (lines 35-36) — no `slug` field.

```typescript
export const storeUpdateSchema = z.object({
  storeName: z.string().min(1).max(100).optional(),
  storeDescription: z.string().max(2000).optional(),
});

// Theme schema replaces validateTheme() in src/lib/theme.ts
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

// PUT /api/store/theme — wraps theme in object
export const themeUpdateSchema = z.object({
  theme: themeSchema,
});

// POST /api/store/theme/generate
export const themeGenerateSchema = z.object({
  prompt: z.string().min(1).max(1000),
});

// POST /api/store/generate
export const storeGenerateSchema = z.object({
  description: z.string().min(1).max(2000),
});
```

### Checkout (`checkout.ts`)

Fields match `src/app/api/checkout/route.ts` (line 18).

```typescript
export const checkoutCreateSchema = z.object({
  productId: uuidSchema,
  couponCode: z.string().optional(),
  referralCode: z.string().optional(),
  source: z.enum(["web", "mcp", "api"]).optional(),
});
```

### Upload (`upload.ts`)

Fields match `src/app/api/upload/route.ts` (line 25) — note lowercase `filename`.

```typescript
export const uploadCreateSchema = z.object({
  filename: z.string().min(1),
  contentType: z.string().min(1),
  purpose: z.enum(["file", "cover"]).optional(),
});
```

### Buy Intents (`buy-intents.ts`)

Fields match `src/app/api/buy-intents/route.ts` (line 16).

```typescript
export const buyIntentCreateSchema = z.object({
  productId: uuidSchema,
});
```

### Admin (`admin.ts`)

```typescript
// POST /api/admin/coupons — like couponCreateSchema but requires creatorId
export const adminCouponCreateSchema = z.object({
  creatorId: uuidSchema,
  code: z.string().min(1).max(50).optional(),
  discountType: z.enum(["percentage", "fixed"]),
  discountValue: z.number().int().positive(),
  productId: uuidSchema.optional(),
  minAmountCents: z.number().int().min(0).optional(), // NOTE: also add to admin route handler (currently missing)
  maxRedemptions: z.number().int().positive().optional(),
  expiresAt: z.string().datetime().optional(),
}).refine(
  (d) => !(d.discountType === "percentage" && (d.discountValue < 1 || d.discountValue > 100)),
  { message: "Percentage discount must be between 1 and 100", path: ["discountValue"] }
);

// PATCH /api/admin/creators/[id]
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
```

## Route Integration Pattern

Each route adds JSON parsing safety and Zod validation after `await req.json()`:

```typescript
let body: unknown;
try {
  body = await req.json();
} catch {
  return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
}
const result = productCreateSchema.safeParse(body);
if (!result.success) return validationError(result.error);
const { title, priceCents } = result.data; // fully typed
```

### What changes per route

- Import the schema + `validationError`
- Wrap `req.json()` in try-catch for malformed JSON
- Add safeParse + early return
- Destructure from `result.data` instead of raw `body`
- Remove manual validation checks now handled by Zod

### What stays unchanged

- Auth checks (before validation)
- Business logic validation that queries the DB (e.g., "does this product exist?", "is coupon expired?")
- Existing error format for non-validation errors

### validateTheme() replacement

The manual `validateTheme()` in `src/lib/theme.ts` is replaced by `themeSchema` in `validations/store.ts`. Routes that used `validateTheme()` (`/api/store/theme` and `/api/store/theme/generate`) will use the Zod schema instead. The `validateTheme()` function can be removed after migration.

## Routes to Update

| Route | Method | Schema |
|-------|--------|--------|
| `/api/products` | POST | productCreateSchema |
| `/api/products/[id]` | PUT | productUpdateSchema |
| `/api/checkout` | POST | checkoutCreateSchema |
| `/api/coupons` | POST | couponCreateSchema |
| `/api/coupons/[id]` | PUT | couponUpdateSchema |
| `/api/coupons/validate` | POST | couponValidateSchema |
| `/api/referrals` | POST | referralCreateSchema |
| `/api/referrals/[id]` | PUT | referralUpdateSchema |
| `/api/store` | PUT | storeUpdateSchema |
| `/api/store/theme` | PUT | themeUpdateSchema |
| `/api/store/theme/generate` | POST | themeGenerateSchema |
| `/api/store/generate` | POST | storeGenerateSchema |
| `/api/upload` | POST | uploadCreateSchema |
| `/api/buy-intents` | POST | buyIntentCreateSchema |
| `/api/admin/coupons` | POST | adminCouponCreateSchema |
| `/api/admin/creators/[id]` | PATCH | adminCreatorUpdateSchema |
| `/api/stripe/connect` | POST | (no body — no schema needed) |

## Dependencies

- Add `zod` as a direct dependency (`pnpm add zod`)

## Out of Scope

- GET endpoint query parameter validation (including `/api/referrals/track` which takes a `code` query param)
- Response schema validation
- OpenAPI/Swagger generation from schemas
- Client-side form validation sharing schemas
