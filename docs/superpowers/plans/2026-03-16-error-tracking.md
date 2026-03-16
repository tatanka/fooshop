# Error Tracking Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Integrate Sentry into the Fooshop Next.js 16 monolith for production error tracking with manual enrichment on 6 critical API routes.

**Architecture:** `@sentry/nextjs` SDK provides automatic error capture on all routes and React error boundaries. 6 critical routes (webhook, checkout, stripe-connect, upload, store-generate, download) get manual `Sentry.captureException` calls with business-context tags. Alert rules are configured in Sentry dashboard, not code.

**Tech Stack:** `@sentry/nextjs` ^9.x, Next.js 16 App Router, TypeScript

**Spec:** `docs/superpowers/specs/2026-03-16-error-tracking-design.md`

---

## Chunk 1: SDK Foundation

### Task 1: Install @sentry/nextjs and create config files

**Files:**
- Modify: `package.json`
- Create: `sentry.client.config.ts` (project root)
- Create: `sentry.server.config.ts` (project root)
- Create: `sentry.edge.config.ts` (project root)
- Create: `src/instrumentation.ts`
- Modify: `next.config.ts`
- Modify: `.env.example`

- [ ] **Step 1: Install the package**

Run: `pnpm add @sentry/nextjs`

- [ ] **Step 2: Create `sentry.client.config.ts`**

```typescript
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  sendDefaultPii: true,
});
```

- [ ] **Step 3: Create `sentry.server.config.ts`**

```typescript
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  sendDefaultPii: true,
});
```

- [ ] **Step 4: Create `sentry.edge.config.ts`**

```typescript
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  sendDefaultPii: true,
});
```

- [ ] **Step 5: Create `src/instrumentation.ts`**

This is the Next.js instrumentation hook that registers Sentry for server and edge runtimes.

```typescript
import * as Sentry from "@sentry/nextjs";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("../sentry.server.config");
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("../sentry.edge.config");
  }
}

export const onRequestError = Sentry.captureRequestError;
```

- [ ] **Step 6: Wrap `next.config.ts` with `withSentryConfig`**

Replace the entire file:

```typescript
import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  /* config options here */
};

export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: !process.env.CI,
});
```

- [ ] **Step 7: Update `.env.example`**

Add at the end of the file:

```
# Sentry
SENTRY_DSN=
NEXT_PUBLIC_SENTRY_DSN=
SENTRY_AUTH_TOKEN=
SENTRY_ORG=
SENTRY_PROJECT=
```

- [ ] **Step 8: Build to verify SDK setup**

Run: `pnpm build`
Expected: Build succeeds. Sentry may warn about missing DSN (expected — DSN is not set locally).

- [ ] **Step 9: Commit**

```bash
git add package.json pnpm-lock.yaml sentry.client.config.ts sentry.server.config.ts sentry.edge.config.ts src/instrumentation.ts next.config.ts .env.example
git commit -m "feat: add Sentry SDK foundation for error tracking (#50)

Install @sentry/nextjs, create client/server/edge init configs,
add Next.js instrumentation hook, wrap next.config with withSentryConfig."
```

---

## Chunk 2: Error Boundaries

### Task 2: Update React error boundaries

**Files:**
- Modify: `src/app/error.tsx:13-15`
- Modify: `src/app/global-error.tsx:12-14`

- [ ] **Step 1: Update `src/app/error.tsx`**

Add `import * as Sentry from "@sentry/nextjs";` at the top (after the existing imports).

Add `Sentry.captureException(error)` in the `useEffect`, keeping the existing `console.error`:

```typescript
useEffect(() => {
  Sentry.captureException(error);
  console.error(error);
}, [error]);
```

- [ ] **Step 2: Update `src/app/global-error.tsx`**

Add `import * as Sentry from "@sentry/nextjs";` at the top (after the existing imports).

Add `Sentry.captureException(error)` in the `useEffect`, keeping the existing `console.error`:

```typescript
useEffect(() => {
  Sentry.captureException(error);
  console.error(error);
}, [error]);
```

- [ ] **Step 3: Build to verify**

Run: `pnpm build`
Expected: Build succeeds.

- [ ] **Step 4: Commit**

```bash
git add src/app/error.tsx src/app/global-error.tsx
git commit -m "feat: report error boundary errors to Sentry (#50)

Add Sentry.captureException alongside existing console.error in both
error.tsx and global-error.tsx. Sentry is additive — console.error
stays for Render log visibility."
```

---

## Chunk 3: Manual Instrumentation — Payment Routes

### Task 3: Instrument Stripe webhook

**Files:**
- Modify: `src/app/api/stripe/webhook/route.ts`

Add `import * as Sentry from "@sentry/nextjs";` at the top.

- [ ] **Step 1: Enrich checkout.session.completed processing catch (line 145-150)**

Add Sentry capture before the existing `console.error`:

```typescript
} catch (error) {
  Sentry.captureException(error, {
    tags: { flow: "webhook", "webhook.event": "checkout.session.completed" },
    extra: { sessionId: session.id, paymentIntentId: session.payment_intent },
  });
  console.error("Webhook: failed to process checkout.session.completed", {
    sessionId: session.id,
    error,
  });
  return NextResponse.json({ error: "Processing failed" }, { status: 500 });
}
```

- [ ] **Step 2: Enrich email send catch (line 138-143)**

Add Sentry capture before the existing `console.error`:

```typescript
} catch (emailError) {
  Sentry.captureException(emailError, {
    tags: { flow: "webhook", "webhook.event": "checkout.session.completed", step: "email" },
    extra: { orderId: order.id },
  });
  console.error("Webhook: failed to send purchase email", {
    orderId: order.id,
    error: emailError,
  });
}
```

- [ ] **Step 3: Enrich charge.refunded processing catch (line 200-206)**

Add Sentry capture before the existing `console.error`:

```typescript
} catch (error) {
  Sentry.captureException(error, {
    tags: { flow: "webhook", "webhook.event": "charge.refunded" },
    extra: { chargeId: charge.id, orderId: order.id, paymentIntentId },
  });
  console.error("Webhook: failed to process charge.refunded", {
    chargeId: charge.id,
    orderId: order.id,
    error,
  });
  return NextResponse.json({ error: "Processing failed" }, { status: 500 });
}
```

- [ ] **Step 4: Build to verify**

Run: `pnpm build`
Expected: Build succeeds.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/stripe/webhook/route.ts
git commit -m "feat: add Sentry capture to Stripe webhook route (#50)

Enrich 3 existing catch blocks with Sentry.captureException and
business context tags (flow:webhook, webhook.event, step)."
```

### Task 4: Instrument checkout route

**Files:**
- Modify: `src/app/api/checkout/route.ts`

Add `import * as Sentry from "@sentry/nextjs";` at the top.

- [ ] **Step 1: Replace the entire catch block (lines 172-186)**

This is a single replacement because the coupon rollback `.catch()` is nested inside the main catch. Replace the full block:

```typescript
  } catch (err) {
    // Rollback redemption count if Stripe session creation fails
    if (couponId) {
      await db
        .update(coupons)
        .set({ redemptionCount: sql`${coupons.redemptionCount} - 1` })
        .where(eq(coupons.id, couponId))
        .catch((rollbackErr) => {
          console.error("Failed to rollback coupon redemption:", rollbackErr);
          Sentry.captureException(rollbackErr, {
            tags: { flow: "checkout", step: "coupon-rollback" },
            extra: { couponId },
          });
        });
    }
    Sentry.captureException(err, {
      tags: { flow: "checkout" },
      extra: { productId, creatorId: creator.id, couponId },
    });
    console.error("Checkout session creation failed:", err);
    const message = err instanceof Error ? err.message : "Payment service error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
```

- [ ] **Step 3: Build to verify**

Run: `pnpm build`
Expected: Build succeeds.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/checkout/route.ts
git commit -m "feat: add Sentry capture to checkout route (#50)

Capture Stripe session creation errors and coupon rollback failures
with flow:checkout tags and product/creator context."
```

### Task 5: Instrument Stripe Connect route

**Files:**
- Modify: `src/app/api/stripe/connect/route.ts`

Add `import * as Sentry from "@sentry/nextjs";` at the top.

- [ ] **Step 1: Add Sentry.setUser after auth check (after line 12)**

```typescript
Sentry.setUser({ id: session.user.id });
```

- [ ] **Step 2: Enrich existing catch block (line 52-55)**

Add Sentry capture before the existing `console.error`:

```typescript
} catch (err) {
  Sentry.captureException(err, {
    tags: { flow: "stripe-connect" },
    extra: { creatorId: creator.id },
  });
  console.error("Stripe Connect error:", err);
  const message = err instanceof Error ? err.message : "Stripe error";
  return NextResponse.json({ error: message }, { status: 500 });
}
```

- [ ] **Step 3: Build to verify**

Run: `pnpm build`
Expected: Build succeeds.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/stripe/connect/route.ts
git commit -m "feat: add Sentry capture to Stripe Connect route (#50)

Capture onboarding errors with flow:stripe-connect tag and creator context.
Set Sentry user for authenticated error association."
```

---

## Chunk 4: Manual Instrumentation — Creator & Buyer Routes

### Task 6: Instrument upload route

**Files:**
- Modify: `src/app/api/upload/route.ts`

Add `import * as Sentry from "@sentry/nextjs";` at the top.

- [ ] **Step 1: Add Sentry.setUser after auth check (after line 16)**

```typescript
Sentry.setUser({ id: session.user.id });
```

- [ ] **Step 2: Wrap presigned URL generation in try/catch (lines 37-40)**

Replace lines 37-40:

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
  console.error("Upload presigned URL generation failed:", error);
  return NextResponse.json({ error: "Upload failed" }, { status: 500 });
}
```

- [ ] **Step 3: Build to verify**

Run: `pnpm build`
Expected: Build succeeds.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/upload/route.ts
git commit -m "feat: add Sentry capture to upload route (#50)

Add try/catch around presigned URL generation with flow:upload tag.
Set Sentry user for authenticated error association."
```

### Task 7: Instrument store generate route

**Files:**
- Modify: `src/app/api/store/generate/route.ts`

Add `import * as Sentry from "@sentry/nextjs";` at the top.

- [ ] **Step 1: Add Sentry.setUser after auth check (after line 15)**

```typescript
Sentry.setUser({ id: session.user.id });
```

- [ ] **Step 2: Wrap generateStore + DB upsert in try/catch (lines 32-60)**

Replace lines 32-60:

```typescript
try {
  const { description } = result.data;
  const generated = await generateStore(description);

  const slug = generated.storeName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

  await db
    .insert(creators)
    .values({
      userId: session.user.id,
      email: session.user.email!,
      name: session.user.name ?? session.user.email!,
      storeName: generated.storeName,
      storeDescription: generated.storeDescription,
      storeTheme: generated.theme,
      slug,
    })
    .onConflictDoUpdate({
      target: creators.userId,
      set: {
        storeName: generated.storeName,
        storeDescription: generated.storeDescription,
        storeTheme: generated.theme,
        slug,
      },
    });

  return NextResponse.json({ ...generated, slug });
} catch (error) {
  Sentry.captureException(error, {
    tags: { flow: "store-generate" },
    extra: { userId: session.user.id },
  });
  console.error("Store generation failed:", error);
  return NextResponse.json({ error: "Store generation failed" }, { status: 500 });
}
```

Note: The `const { description } = result.data;` line moves inside the try block since it was previously on line 31 just before the code being wrapped.

- [ ] **Step 3: Build to verify**

Run: `pnpm build`
Expected: Build succeeds.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/store/generate/route.ts
git commit -m "feat: add Sentry capture to store generate route (#50)

Add try/catch around AI generation + DB upsert with flow:store-generate tag.
Set Sentry user for authenticated error association."
```

### Task 8: Instrument download route

**Files:**
- Modify: `src/app/api/download/[token]/route.ts`

Add `import * as Sentry from "@sentry/nextjs";` at the top.

- [ ] **Step 1: Wrap Promise.all in try/catch (lines 38-46)**

Replace lines 38-46:

```typescript
try {
  const [, presignedUrl] = await Promise.all([
    db
      .update(downloadTokens)
      .set({ downloadCount: sql`${downloadTokens.downloadCount} + 1` })
      .where(eq(downloadTokens.id, result.tokenId)),
    getDownloadUrl(result.fileUrl),
  ]);

  return NextResponse.redirect(presignedUrl);
} catch (error) {
  Sentry.captureException(error, {
    tags: { flow: "download" },
    extra: { tokenId: result.tokenId, fileUrl: result.fileUrl },
  });
  console.error("Download failed:", error);
  return NextResponse.json({ error: "Download failed" }, { status: 500 });
}
```

- [ ] **Step 2: Build to verify**

Run: `pnpm build`
Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/download/[token]/route.ts
git commit -m "feat: add Sentry capture to download route (#50)

Add try/catch around presigned URL generation + download count
update with flow:download tag."
```

---

## Chunk 5: Final Verification

### Task 9: Full build and final commit

- [ ] **Step 1: Full build**

Run: `pnpm build`
Expected: Build succeeds with no errors.

- [ ] **Step 2: Verify all Sentry imports are present**

Run: `grep -r "from \"@sentry/nextjs\"" src/ sentry.*.config.ts`
Expected: 12 files — 3 config files (sentry.client/server/edge.config.ts) + instrumentation.ts + error.tsx + global-error.tsx + 6 API routes (webhook, checkout, connect, upload, store generate, download).

- [ ] **Step 3: Verify all flow tags are present**

Run: `grep -r "flow:" src/app/api/`
Expected: 6 unique flows — webhook, checkout, stripe-connect, upload, store-generate, download.

- [ ] **Step 4: Verify no files left unstaged**

Run: `git status`
Expected: Clean working tree (all changes committed in previous tasks).
