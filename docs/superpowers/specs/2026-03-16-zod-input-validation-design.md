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
  common.ts           # shared: uuidSchema, priceCentsSchema, slugSchema
  products.ts         # productCreateSchema, productUpdateSchema
  coupons.ts          # couponCreateSchema, couponUpdateSchema, couponValidateSchema
  referrals.ts        # referralCreateSchema, referralUpdateSchema
  store.ts            # storeUpdateSchema, themeUpdateSchema, themeGenerateSchema, storeGenerateSchema
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
export const slugSchema = z.string().regex(/^[a-z0-9-]+$/);
```

## Key Schemas

### Products

```typescript
export const productCreateSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(5000).optional(),
  priceCents: priceCentsSchema,
  category: z.string().min(1).optional(),
  status: z.enum(["draft", "published"]).optional(),
  fileKey: z.string().optional(),
  fileName: z.string().optional(),
  fileSize: z.number().int().positive().optional(),
  thumbnailUrl: z.string().url().optional(),
  metadata_json: z.record(z.unknown()).optional(),
});

export const productUpdateSchema = productCreateSchema.partial();
```

### Coupons

Replaces duplicated manual validation in both regular and admin routes:

```typescript
export const couponCreateSchema = z.object({
  code: z.string().min(1).max(50),
  discountType: z.enum(["percentage", "fixed"]),
  discountValue: z.number().int().positive(),
  maxUses: z.number().int().positive().optional(),
  expiresAt: z.string().datetime().optional(),
  productId: uuidSchema.optional(),
}).refine(
  (d) => !(d.discountType === "percentage" && (d.discountValue < 1 || d.discountValue > 100)),
  { message: "Percentage discount must be between 1 and 100", path: ["discountValue"] }
);
```

### Checkout

```typescript
export const checkoutCreateSchema = z.object({
  productId: uuidSchema,
  couponCode: z.string().optional(),
  referralCode: z.string().optional(),
});
```

### Store

```typescript
export const storeUpdateSchema = z.object({
  storeName: z.string().min(1).max(100).optional(),
  storeDescription: z.string().max(2000).optional(),
  slug: slugSchema.optional(),
});
```

### Upload

```typescript
export const uploadCreateSchema = z.object({
  fileName: z.string().min(1),
  contentType: z.string().min(1),
  fileSize: z.number().int().positive().max(500 * 1024 * 1024),
});
```

### Remaining schemas

Referrals, buy-intents, admin, theme, and store/generate schemas follow the same patterns. Exact fields will be determined by reading each route during implementation.

## Route Integration Pattern

Each route follows 3 lines after `await req.json()`:

```typescript
const body = await req.json();
const result = productCreateSchema.safeParse(body);
if (!result.success) return validationError(result.error);
const { title, priceCents } = result.data; // fully typed
```

### What changes per route

- Import the schema + `validationError`
- Add safeParse + early return
- Destructure from `result.data` instead of raw `body`
- Remove manual validation checks now handled by Zod

### What stays unchanged

- Auth checks (before validation)
- Business logic validation that queries the DB (e.g., "does this product exist?", "is coupon expired?")
- Existing error format for non-validation errors

### validateTheme() replacement

The manual `validateTheme()` in `src/lib/theme.ts` is replaced by a Zod schema in `validations/store.ts`. The theme route uses the Zod schema instead.

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

- GET endpoint query parameter validation
- Response schema validation
- OpenAPI/Swagger generation from schemas
- Client-side form validation sharing schemas
