# Error Tracking in Production — Design Spec

**Issue:** #50 [GEN-025]
**Date:** 2026-03-16
**Status:** Approved

## Problem

All server-side errors go to `console.error` and are lost in Render's log stream. If checkout or the Stripe webhook breaks, nobody knows until a creator complains. Upload, store generation, and download have no error handling at all — unhandled throws return generic 500s with no visibility.

## Solution

Integrate Sentry via `@sentry/nextjs` (v9+, compatible with Next.js 16) with two layers:

1. **Automatic instrumentation** — the SDK wraps all API route handlers and React error boundaries, capturing unhandled errors with stack traces and source maps.
2. **Manual enrichment on 6 critical paths** — explicit `Sentry.captureException` calls with business-context tags and metadata, enabling targeted alert rules.

## Architecture

### SDK Configuration

`@sentry/nextjs` requires config files at the project root, plus an instrumentation hook under `src/`:

| File | Purpose |
|------|---------|
| `sentry.client.config.ts` | Client-side Sentry init (browser errors) |
| `sentry.server.config.ts` | Server-side Sentry init (API routes, SSR) |
| `sentry.edge.config.ts` | Edge runtime init (middleware — included for completeness, middleware is simple today) |
| `src/instrumentation.ts` | Next.js instrumentation hook — imports server/edge configs |

`next.config.ts` is wrapped with `withSentryConfig` to enable source map uploads at build time and automatic API route wrapping. Key options:

- `hideSourceMaps: true` — prevents serving `.map` files publicly in production
- `silent: true` — suppresses upload logs in CI

**Local development:** When `SENTRY_DSN` is unset, the SDK gracefully no-ops. No DSN needed for local dev.

### Environment Variables

| Variable | Purpose | Required |
|----------|---------|----------|
| `SENTRY_DSN` | Project DSN from Sentry dashboard | Yes (prod + staging) |
| `SENTRY_AUTH_TOKEN` | Auth token for source map uploads | Yes (build time only) |

Both added to `.env.example` for documentation. In Render, set as environment variables on the web service.

### Error Boundaries

`src/app/error.tsx` and `src/app/global-error.tsx` currently only `console.error`. Updated to also call `Sentry.captureException(error)` so client-side rendering errors are tracked.

### User Context

All authenticated routes call `Sentry.setUser({ id: session.user.id })` after the auth check. This associates errors with specific users in the Sentry dashboard, making it easier to debug user-reported issues.

### Manual Instrumentation

Six API routes get explicit Sentry capture with business context:

#### 1. Stripe Webhook (`src/app/api/stripe/webhook/route.ts`)

Existing catch blocks enriched. Each event type uses its own context:

**checkout.session.completed — processing failure:**
```typescript
Sentry.captureException(error, {
  tags: { flow: "webhook", "webhook.event": "checkout.session.completed" },
  extra: { sessionId: session.id, paymentIntentId: session.payment_intent },
});
```

**checkout.session.completed — email send failure:**
```typescript
Sentry.captureException(emailError, {
  tags: { flow: "webhook", "webhook.event": "checkout.session.completed", step: "email" },
  extra: { orderId: order.id },
});
```

**charge.refunded — processing failure:**
```typescript
Sentry.captureException(error, {
  tags: { flow: "webhook", "webhook.event": "charge.refunded" },
  extra: { chargeId: charge.id, orderId: order.id, paymentIntentId },
});
```

#### 2. Checkout (`src/app/api/checkout/route.ts`)

Existing catch block enriched:

```typescript
Sentry.captureException(err, {
  tags: { flow: "checkout" },
  extra: { productId, creatorId: creator.id, couponId },
});
```

Coupon rollback failure captured separately in the `.catch()` callback:

```typescript
.catch((rollbackErr) => {
  console.error("Failed to rollback coupon redemption:", rollbackErr);
  Sentry.captureException(rollbackErr, {
    tags: { flow: "checkout", step: "coupon-rollback" },
    extra: { couponId },
  });
})
```

#### 3. Stripe Connect (`src/app/api/stripe/connect/route.ts`)

Existing catch block enriched. A failure here blocks creator onboarding (revenue-blocking):

```typescript
Sentry.captureException(err, {
  tags: { flow: "stripe-connect" },
  extra: { creatorId: creator.id },
});
```

#### 4. Upload (`src/app/api/upload/route.ts`)

Currently has no try/catch. Wrap the presigned URL generation in try/catch:

```typescript
try {
  const key = `products/${session.user.id}/${randomUUID()}/${safeName}`;
  const uploadUrl = await getUploadUrl(key, contentType);
  return NextResponse.json({ uploadUrl, key, maxSizeBytes: maxBytes });
} catch (error) {
  Sentry.captureException(error, {
    tags: { flow: "upload" },
    extra: { userId: session.user.id, filename: safeName, purpose },
  });
  return NextResponse.json({ error: "Upload failed" }, { status: 500 });
}
```

#### 5. Store Generate (`src/app/api/store/generate/route.ts`)

Currently has no try/catch. Wrap the entire block from `generateStore()` through DB upsert and response:

```typescript
try {
  const generated = await generateStore(description);

  const slug = generated.storeName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

  await db.insert(creators).values({ /* ... */ }).onConflictDoUpdate({ /* ... */ });

  return NextResponse.json({ ...generated, slug });
} catch (error) {
  Sentry.captureException(error, {
    tags: { flow: "store-generate" },
    extra: { userId: session.user.id },
  });
  return NextResponse.json({ error: "Store generation failed" }, { status: 500 });
}
```

#### 6. Download (`src/app/api/download/[token]/route.ts`)

Currently has no try/catch. The `Promise.all` (download count increment + presigned URL generation) can fail if R2 is down. Wrap:

```typescript
try {
  const [, presignedUrl] = await Promise.all([
    db.update(downloadTokens).set({ /* ... */ }).where(/* ... */),
    getDownloadUrl(result.fileUrl),
  ]);
  return NextResponse.redirect(presignedUrl);
} catch (error) {
  Sentry.captureException(error, {
    tags: { flow: "download" },
    extra: { tokenId: result.tokenId, fileUrl: result.fileUrl },
  });
  return NextResponse.json({ error: "Download failed" }, { status: 500 });
}
```

### Alerting

Configured in Sentry's dashboard (not in code):

- **Immediate email:** Any error with tag `flow:webhook`, `flow:checkout`, or `flow:stripe-connect`
- **Default digest:** All other errors (Sentry's standard grouping + daily digest)

This can be extended to Slack later without code changes.

## Files Changed

| File | Change Type | Description |
|------|-------------|-------------|
| `package.json` | Modify | Add `@sentry/nextjs` ^9.x |
| `next.config.ts` | Modify | Wrap with `withSentryConfig` (hideSourceMaps, silent) |
| `src/instrumentation.ts` | Create | Next.js instrumentation hook for Sentry server/edge init |
| `sentry.client.config.ts` | Create | Client-side Sentry initialization |
| `sentry.server.config.ts` | Create | Server-side Sentry initialization |
| `sentry.edge.config.ts` | Create | Edge runtime Sentry initialization |
| `src/app/error.tsx` | Modify | Add `Sentry.captureException` |
| `src/app/global-error.tsx` | Modify | Add `Sentry.captureException` |
| `src/app/api/stripe/webhook/route.ts` | Modify | Add Sentry capture in 3 catch blocks |
| `src/app/api/checkout/route.ts` | Modify | Add Sentry capture in catch + coupon rollback |
| `src/app/api/stripe/connect/route.ts` | Modify | Add Sentry capture in existing catch block |
| `src/app/api/upload/route.ts` | Modify | Add try/catch + Sentry capture |
| `src/app/api/store/generate/route.ts` | Modify | Add try/catch + Sentry capture |
| `src/app/api/download/[token]/route.ts` | Modify | Add try/catch + Sentry capture |
| `.env.example` | Modify | Add `SENTRY_DSN`, `SENTRY_AUTH_TOKEN` |

## Decisions

- **Sentry over LogSnag/Axiom:** Purpose-built for error tracking, best Next.js SDK, generous free tier (5K errors/mo).
- **`@sentry/nextjs` v9+:** Required for Next.js 16 compatibility.
- **Keep `console.error`:** Sentry captures are additive. Render logs remain useful for debugging without Sentry access.
- **No performance tracing:** Can be enabled later via `tracesSampleRate` config. Out of scope for base monitoring.
- **Email-only alerts:** Simplest path. Slack can be added from Sentry dashboard later.
- **No custom error utility/wrapper:** Direct `Sentry.captureException` calls in catch blocks. A helper would add abstraction for only 6 call sites.
- **`hideSourceMaps: true`:** Prevents serving `.map` files to clients in production (security).
- **6 routes, not 4:** Added Stripe Connect (revenue-blocking) and Download (post-purchase critical path) beyond the original 4.
