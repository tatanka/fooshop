# [GEN-017] Referral Link per i Creator con Commissione Affiliate

**Issue:** #30
**Date:** 2026-03-13
**Status:** Approved

## Overview

Creators can generate referral codes and assign them to affiliates (fans, promoters). When a sale comes through a referral link, the system tracks the conversion and calculates the commission owed. Commissions are tracking-only — the creator handles payouts off-platform. This creates a viral growth channel at zero cost for the creator.

## Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Affiliate model | Lightweight codes (creator-managed) | No affiliate accounts, no payout infrastructure. Creator generates codes, assigns to people, pays off-platform. Upgradable later. |
| Commission handling | Tracking only | No Stripe flow changes. System calculates and displays commissions. Creator pays affiliates off-platform. |
| Scope | Store-wide + per-product | Same pattern as coupons (nullable productId). Creator chooses. |
| Commission config | Per-code | Each referral code has its own commission percentage. Maximum flexibility. |
| Click tracking | Yes | Track clicks + conversions for conversion rate analytics. |
| Referral vs coupon | Separate system | Referrals track attribution, coupons give discounts. Different concepts, separate tables. Cumulable on the same order. |

## Data Model

### Table: `referrals`

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | PK, default random |
| creatorId | UUID | FK → creators, not null |
| code | varchar(20) | Unique per creator |
| affiliateName | varchar(100) | Not null |
| affiliateEmail | varchar(255) | Nullable, for creator reference |
| productId | UUID | Nullable FK → products. Null = store-wide |
| commissionPercent | integer | e.g. 10 = 10%, not null |
| clickCount | integer | Default 0, atomic increment |
| active | boolean | Default true |
| createdAt | timestamp | Default now |

**Constraints:**
- Unique on `(creatorId, code)`
- `commissionPercent` between 1 and 100

### Table: `referral_conversions`

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | PK, default random |
| referralId | UUID | FK → referrals, not null |
| orderId | UUID | FK → orders, unique (one conversion per order) |
| commissionCents | integer | Calculated commission in cents |
| createdAt | timestamp | Default now |

## Checkout Flow Integration

### 1. Referral Code Capture

- When a user visits `fooshop.ai/store?ref=CODE` or `fooshop.ai/store/product?ref=CODE`, the code is saved in `sessionStorage`
- The `BuyButton` component reads the ref code and sends it to `/api/checkout` alongside `productId` and `couponCode`

### 2. Validation at Checkout

- Verify code exists, is active, belongs to the creator of the product being purchased
- If per-product, verify productId matches
- Does NOT alter the price — Stripe flow remains identical

### 3. Stripe Metadata

- `referralId` added to Checkout Session metadata (same pattern as `couponId`)
- Referral and coupon are independent and cumulative

### 4. Webhook — Conversion Creation

In the `checkout.session.completed` handler, if `referralId` is present in metadata:

```
commissionCents = Math.round(amountCents * commissionPercent / 100)
```

Commission is calculated on the amount actually paid (post-coupon). The `referral_conversions` record is created atomically alongside the order.

### 5. Click Tracking

- Endpoint: `GET /api/referrals/track?code=CODE`
- Called by frontend when page loads with `?ref=CODE` in URL
- Atomic increment on `referrals.clickCount` (same pattern as coupon redemptionCount)

## API Endpoints

### Authenticated (creator-only)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/referrals` | List creator's referrals with aggregate stats (clicks, conversions, total commission) |
| POST | `/api/referrals` | Create new referral code |
| PUT | `/api/referrals/[id]` | Update referral (name, email, commission, active, productId) |
| DELETE | `/api/referrals/[id]` | Delete if no conversions, otherwise deactivate |

### Public

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/referrals/track?code=CODE` | Increment click count |

### Request/Response Examples

**POST /api/referrals:**
```json
{
  "code": "MARIO10",
  "affiliateName": "Mario Rossi",
  "affiliateEmail": "mario@example.com",
  "productId": null,
  "commissionPercent": 10
}
```

**GET /api/referrals response:**
```json
[
  {
    "id": "uuid",
    "code": "MARIO10",
    "affiliateName": "Mario Rossi",
    "affiliateEmail": "mario@example.com",
    "productId": null,
    "commissionPercent": 10,
    "clickCount": 150,
    "active": true,
    "createdAt": "2026-03-13T...",
    "conversions": 12,
    "totalCommissionCents": 12000
  }
]
```

## Dashboard UI

### New section: `/dashboard/referrals`

**List page:**
- Table columns: Code, Affiliate, Product (or "All"), Commission %, Clicks, Conversions, Conv. Rate, Total Commission, Status
- "New referral" button
- Copyable referral link for each row (e.g. `fooshop.ai/store?ref=CODE`)

**New referral form (`/dashboard/referrals/new`):**
- Affiliate name (required)
- Affiliate email (optional)
- Code (auto-generated with manual override)
- Product (dropdown: "All products" + list of published products)
- Commission % (numeric input)

### Orders page modification

- If an order has a referral, display affiliate name and commission owed in the order list/detail

## End-to-End Flow

```
1. Creator creates referral code "MARIO10" (10%, store-wide)
2. Mario shares link: fooshop.ai/mario-store?ref=MARIO10
3. User clicks link → clickCount +1, ref=MARIO10 saved in sessionStorage
4. User browses, adds coupon "SAVE5" ($5 off), buys $100 product
5. Checkout: productId + couponCode=SAVE5 + referralCode=MARIO10 sent to /api/checkout
6. Stripe Checkout created with metadata: { productId, creatorId, couponId, referralId }
7. User pays $95 (after coupon)
8. Webhook fires:
   - Creates order (amountCents=9500, platformFeeCents=475)
   - Creates referral_conversion (commissionCents = round(9500 * 10 / 100) = 950)
9. Creator dashboard shows: "MARIO10: 150 clicks, 12 sales, 8% CR, $120.00 commission owed"
```

## Implementation Notes

- Follow existing coupon system patterns for CRUD, validation, and checkout integration
- Atomic increment for clickCount (SQL `+ 1`, same as coupon redemptionCount)
- Idempotency: unique constraint on `referral_conversions.orderId` prevents double-counting
- Code generation: reuse `generateCouponCode()` from `src/lib/coupon.ts` or similar
- Commission validation: 1-100 range, integer only
- Referral + coupon are independent — both can apply to the same order
