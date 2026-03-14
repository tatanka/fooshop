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

1. Extract `payment_intent` from charge event object
2. Look up order by `stripePaymentIntentId`
3. Guard: if order not found or already "refunded" → return 200 (idempotent no-op)
4. DB transaction:
   - Update order status to `"refunded"`
   - Set `expiresAt = now()` on all download tokens for that order
5. Return 200

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

### Out of Scope

- Refund email notification to buyer
- Coupon redemption count reversal
- Referral conversion reversal
- Partial refund handling (any refund treated as full)
