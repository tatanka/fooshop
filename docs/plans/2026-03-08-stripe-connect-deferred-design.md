# Stripe Connect Deferred Flow — Design

**Issue:** #2 [GEN-002] Connect Stripe con flusso differito e incentivato
**Date:** 2026-03-08

## Problem

Creators abandon the platform if forced to set up Stripe before publishing. Most creators on platforms like Gumroad never sell — requiring Stripe upfront loses them before they try.

## Solution

Decouple Stripe Connect from publishing. Creators publish and get a live store immediately. When a buyer clicks Buy on a product whose creator hasn't connected Stripe, a modal explains the product will be available soon and records a buy intent. The dashboard shows these missed sales as incentive to connect Stripe.

## Design

### 1. Database: `buy_intents` table

New table tracking purchase attempts on products without Stripe.

| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK, default random |
| productId | UUID | FK to products |
| creatorId | UUID | FK to creators |
| createdAt | timestamp | default now |

No buyer data stored (no email, no GDPR concerns). Used as a counter with time granularity.

### 2. API: `/api/buy-intents` endpoint

**POST** — Creates a buy intent record. Accepts `productId` in body. Looks up the creator from the product. No auth required (public endpoint, like a page view).

### 3. Product page: Buy Now button

The Buy Now button becomes a client component (`BuyButton`). Receives `hasStripe` boolean as prop from the server component.

- **hasStripe = true** → POST to `/api/checkout` → redirect to Stripe Checkout (wiring only, full checkout is issue #4)
- **hasStripe = false** → Open modal + POST to `/api/buy-intents`

### 4. Modal: "Product unavailable"

Simple Tailwind modal overlay on the product page:
- Title: "Questo prodotto sarà disponibile a breve"
- Message: "Il creator è stato avvisato!"
- Close button
- No email capture (YAGNI)

### 5. Dashboard: Connect Stripe (functional)

The existing non-functional button gets a click handler:
- Click → POST to `/api/stripe/connect` → redirect to returned Stripe onboarding URL
- After Stripe onboarding → redirect to `/dashboard?stripe=connected`
- Query param triggers success toast
- Button hidden when `stripeConnectId` is set (already implemented)

### 6. Dashboard: Incentive CTA

Below the Connect Stripe button:
- Query `buy_intents` count for the creator
- **N = 0**: Neutral CTA — "Collega Stripe per ricevere pagamenti"
- **N > 0**: Urgent CTA — "Stai perdendo vendite! N persone hanno provato ad acquistare i tuoi prodotti"
- Urgent style: stronger color, bolder copy

## Out of scope

- Full checkout flow (issue #4)
- Email capture on modal
- Notification system for creators
- File upload to R2 (issue #3)

## Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Buy intent storage | Dedicated table | Flexibility for analytics without over-engineering |
| Unavailable UX | Modal in-page | Less friction than redirect, buyer stays on page |
| Stripe callback | `/dashboard?stripe=connected` + toast | Simple, stripeConnectId already saved during POST |
| Email capture | Not now | YAGNI, adds GDPR complexity |
