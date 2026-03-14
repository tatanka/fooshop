# [GEN-019] Stripe Refund Webhook Design

**Issue:** #44
**Date:** 2026-03-14
**Status:** Approved

## Problem

When a refund occurs on Stripe, Fooshop's order stays "completed" and download tokens remain active — data becomes inconsistent, and buyers retain access to files they were refunded for.

## Solution

Handle `charge.refunded` in the existing Stripe webhook. Update order status to "refunded" and expire associated download tokens.

## Design

### Event: `charge.refunded`

Added as a new case in `src/app/api/stripe/webhook/route.ts`, following the existing `checkout.session.completed` pattern.

**Flow:**

1. Extract `payment_intent` from charge object (handle string, expanded object, or null)
   - `typeof charge.payment_intent === 'string' ? charge.payment_intent : charge.payment_intent?.id`
   - If null → return 200 (not a PaymentIntent-based charge)
2. Look up order by `stripePaymentIntentId`
3. Guard: if order not found or already "refunded" → return 200 (idempotent no-op)
4. DB transaction:
   - Update order status to `"refunded"`
   - Set `expiresAt = now()` on all download tokens for that order
5. Return 200

**Business decision:** Any `charge.refunded` event (partial or full) marks the order as fully refunded and revokes download access. This is intentional for launch — partial refund differentiation can be added later if needed.

### Idempotency

- If order already has status `"refunded"`, skip silently (return 200)
- Stripe retries on 5xx, so DB errors naturally get retried

### Token Invalidation Strategy

Set `expiresAt = new Date()` rather than deleting the token row. This:
- Works with the existing download route (`expiresAt > now` check → returns 410)
- Preserves audit trail
- Requires no schema changes

### Error Handling

| Scenario | Response | Reason |
|----------|----------|--------|
| Order not found | 200 + log warning | Don't retry for missing data |
| Already refunded | 200 | Idempotent |
| DB error | 500 | Stripe will retry |

### Files Changed

- `src/app/api/stripe/webhook/route.ts` — add `charge.refunded` case

### Prerequisites

- Add `charge.refunded` to the Stripe webhook endpoint event list in the Stripe Dashboard (or via API)

### Assumptions

- Fooshop uses Stripe Connect destination charges. The `charge.refunded` event fires on the **platform** account for refunds initiated from the platform dashboard. Refunds initiated from a connected account's dashboard may not trigger this event on the platform.

### Known Limitations

- **Partial refunds treated as full:** Any refund revokes access (see business decision above)
- **Coupon redemption count not decremented:** A refunded order's coupon use still counts toward `maxRedemptions` — could cause a coupon to appear exhausted prematurely
- **Race condition:** If `charge.refunded` arrives before `checkout.session.completed` (e.g., Stripe Radar), the refund is a no-op and the order is created as "completed". Requires manual reconciliation in this rare edge case.
- **Download route has no order-status check:** Token expiry is the sole access gate. A defense-in-depth order status check could be added later.

### Out of Scope

- Refund email notification to buyer
- Coupon redemption count reversal
- Referral conversion reversal
- `refundedAt` timestamp on orders table
