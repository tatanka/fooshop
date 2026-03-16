# Error Tracking in Production — Design Spec

**Issue:** #50 [GEN-025]
**Date:** 2026-03-16
**Status:** Approved

## Problem

All server-side errors go to `console.error` and are lost in Render's log stream. If checkout or the Stripe webhook breaks, nobody knows until a creator complains. Upload and AI store generation have no error handling at all — unhandled throws return generic 500s with no visibility.

## Solution

Integrate Sentry via `@sentry/nextjs` with two layers:

1. **Automatic instrumentation** — the SDK wraps all API route handlers and React error boundaries, capturing unhandled errors with stack traces and source maps.
2. **Manual enrichment on 4 critical paths** — explicit `Sentry.captureException` calls with business-context tags and metadata, enabling targeted alert rules.

## Architecture

### SDK Configuration

`@sentry/nextjs` requires 4 config files at the project root:

| File | Purpose |
|------|---------|
| `sentry.client.config.ts` | Client-side Sentry init (browser errors) |
| `sentry.server.config.ts` | Server-side Sentry init (API routes, SSR) |
| `sentry.edge.config.ts` | Edge runtime init (middleware) |
| `instrumentation.ts` | Next.js instrumentation hook — imports server config |

`next.config.ts` is wrapped with `withSentryConfig` to enable source map uploads at build time and automatic API route wrapping.

### Environment Variables

| Variable | Purpose | Required |
|----------|---------|----------|
| `SENTRY_DSN` | Project DSN from Sentry dashboard | Yes (prod + staging) |
| `SENTRY_AUTH_TOKEN` | Auth token for source map uploads | Yes (build time only) |

Both added to `.env.example` for documentation. In Render, set as environment variables on the web service.

### Error Boundaries

`src/app/error.tsx` and `src/app/global-error.tsx` currently only `console.error`. Updated to also call `Sentry.captureException(error)` so client-side rendering errors are tracked.

### Manual Instrumentation

Four API routes get explicit Sentry capture with business context:

#### Stripe Webhook (`src/app/api/stripe/webhook/route.ts`)

Existing catch blocks enriched:

```typescript
Sentry.captureException(error, {
  tags: { flow: "webhook", "webhook.event": event.type },
  extra: { sessionId: session.id, paymentIntentId: session.payment_intent },
});
```

Covers: `checkout.session.completed` processing failure, `charge.refunded` processing failure, email send failure.

#### Checkout (`src/app/api/checkout/route.ts`)

Existing catch block enriched:

```typescript
Sentry.captureException(err, {
  tags: { flow: "checkout" },
  extra: { productId, creatorId: creator.id, couponId },
});
```

Also captures coupon rollback failure separately.

#### Upload (`src/app/api/upload/route.ts`)

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

#### Store Generate (`src/app/api/store/generate/route.ts`)

Currently has no try/catch. Wrap AI generation + DB write:

```typescript
try {
  const generated = await generateStore(description);
  // ... slug generation + DB upsert ...
  return NextResponse.json({ ...generated, slug });
} catch (error) {
  Sentry.captureException(error, {
    tags: { flow: "store-generate" },
    extra: { userId: session.user.id },
  });
  return NextResponse.json({ error: "Store generation failed" }, { status: 500 });
}
```

### Alerting

Configured in Sentry's dashboard (not in code):

- **Immediate email:** Any error with tag `flow:webhook` or `flow:checkout`
- **Default digest:** All other errors (Sentry's standard grouping + daily digest)

This can be extended to Slack later without code changes.

## Files Changed

| File | Change Type | Description |
|------|-------------|-------------|
| `package.json` | Modify | Add `@sentry/nextjs` dependency |
| `next.config.ts` | Modify | Wrap with `withSentryConfig` |
| `instrumentation.ts` | Create | Next.js instrumentation hook for Sentry server init |
| `sentry.client.config.ts` | Create | Client-side Sentry initialization |
| `sentry.server.config.ts` | Create | Server-side Sentry initialization |
| `sentry.edge.config.ts` | Create | Edge runtime Sentry initialization |
| `src/app/error.tsx` | Modify | Add `Sentry.captureException` |
| `src/app/global-error.tsx` | Modify | Add `Sentry.captureException` |
| `src/app/api/stripe/webhook/route.ts` | Modify | Add Sentry capture in existing catch blocks |
| `src/app/api/checkout/route.ts` | Modify | Add Sentry capture in existing catch block |
| `src/app/api/upload/route.ts` | Modify | Add try/catch + Sentry capture |
| `src/app/api/store/generate/route.ts` | Modify | Add try/catch + Sentry capture |
| `.env.example` | Modify | Add `SENTRY_DSN`, `SENTRY_AUTH_TOKEN` |

## Decisions

- **Sentry over LogSnag/Axiom:** Purpose-built for error tracking, best Next.js SDK, generous free tier (5K errors/mo).
- **Keep `console.error`:** Sentry captures are additive. Render logs remain useful for debugging without Sentry access.
- **No performance tracing:** Can be enabled later via `tracesSampleRate` config. Out of scope for base monitoring.
- **Email-only alerts:** Simplest path. Slack can be added from Sentry dashboard later.
- **No custom error utility/wrapper:** Direct `Sentry.captureException` calls in catch blocks. A helper would add abstraction for only 4 call sites.
