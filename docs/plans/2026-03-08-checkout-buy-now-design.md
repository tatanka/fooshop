# Design: Checkout Buy Now + Digital Delivery

**Issue:** #4 — [GEN-004] Checkout: Buy Now collegato a Stripe Checkout
**Date:** 2026-03-08

## Context

The checkout flow (BuyButton → /api/checkout → Stripe → webhook → order) already exists. This issue polishes it and adds digital file delivery via token-based download URLs.

## Changes

### 1. BuyButton error feedback

Show user-visible error when `/api/checkout` fails. Display server error messages (e.g. "Creator not set up for payments").

### 2. Download tokens

New `downloadTokens` table:
- `id` (UUID, PK)
- `orderId` (UUID, FK → orders)
- `token` (UUID, unique, indexed)
- `expiresAt` (timestamp, 24h from creation)
- `downloadCount` (integer, default 0)
- `createdAt` (timestamp)

The Stripe webhook creates the token alongside the order.

### 3. Download route — `/api/download/[token]`

- Validate token exists and not expired
- Increment download count
- Look up order → product → fileUrl (R2 key)
- Generate presigned R2 URL (1h expiry)
- Redirect to presigned URL

### 4. Enhanced success page

- Read `session_id` from query params
- Fetch Stripe session to get product metadata
- Look up order by `stripePaymentIntentId` → get download token
- Display: product name, amount paid, "Download" button pointing to `/api/download/[token]`

## Data flow

```
Buy Now → /api/checkout → Stripe Checkout → redirect to success page
                                           ↓
                             Webhook: create order + download token
                                           ↓
Success page: fetch session → show details + download button
                                           ↓
/api/download/[token] → validate → presigned R2 URL → redirect → file
```

## Out of scope

- Email delivery (future issue)
- Download count limits
- Refund handling
