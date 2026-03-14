# Stripe Refund Webhook Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Handle `charge.refunded` Stripe webhook events to mark orders as "refunded" and revoke download access.

**Architecture:** Add a new event case to the existing webhook handler at `src/app/api/stripe/webhook/route.ts`. Uses a DB transaction to atomically update order status and expire download tokens.

**Tech Stack:** Next.js API route, Drizzle ORM, Stripe SDK, PostgreSQL

**Spec:** `docs/superpowers/specs/2026-03-14-stripe-refund-webhook-design.md`

---

## Chunk 1: Implementation

### Task 1: Add `charge.refunded` handler to webhook

**Files:**
- Modify: `src/app/api/stripe/webhook/route.ts:146` (before the final `return`)

**Context:** The existing webhook handler is at `src/app/api/stripe/webhook/route.ts`. It handles `checkout.session.completed` (lines 23-145) then returns `{ received: true }` on line 148. The new `charge.refunded` case goes between line 146 and the final return.

**Imports needed:** None — the existing `eq` import is sufficient.

- [ ] **Step 1: Add `charge.refunded` event handler**

Insert the following block after line 146 (after the closing `}` of the `checkout.session.completed` block) and before the final `return NextResponse.json({ received: true })`:

```typescript
  if (event.type === "charge.refunded") {
    const charge = event.data.object;

    // Extract payment_intent ID (can be string, expanded object, or null)
    const paymentIntentId =
      typeof charge.payment_intent === "string"
        ? charge.payment_intent
        : charge.payment_intent?.id;

    if (!paymentIntentId) {
      console.warn("Webhook: charge.refunded missing payment_intent", { chargeId: charge.id });
      return NextResponse.json({ received: true });
    }

    // Look up order by payment intent
    const order = await db
      .select({ id: orders.id, status: orders.status })
      .from(orders)
      .where(eq(orders.stripePaymentIntentId, paymentIntentId))
      .then((rows) => rows[0]);

    if (!order) {
      console.warn("Webhook: charge.refunded order not found", { paymentIntentId });
      return NextResponse.json({ received: true });
    }

    // Idempotency: skip if already refunded
    if (order.status === "refunded") {
      return NextResponse.json({ received: true });
    }

    try {
      await db.transaction(async (tx) => {
        // Update order status to refunded
        await tx
          .update(orders)
          .set({ status: "refunded" })
          .where(eq(orders.id, order.id));

        // Expire all download tokens for this order
        await tx
          .update(downloadTokens)
          .set({ expiresAt: new Date() })
          .where(eq(downloadTokens.orderId, order.id));
      });
    } catch (error) {
      console.error("Webhook: failed to process charge.refunded", {
        chargeId: charge.id,
        orderId: order.id,
        error,
      });
      return NextResponse.json({ error: "Processing failed" }, { status: 500 });
    }
  }
```

- [ ] **Step 2: Verify build passes**

Run: `pnpm build`
Expected: Build succeeds with no TypeScript errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/stripe/webhook/route.ts
git commit -m "feat: handle charge.refunded webhook event (#44)

Update order status to 'refunded' and expire download tokens
when Stripe fires a charge.refunded event."
```
