# Email transazionali post-acquisto — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Send a purchase confirmation email with a 72h download link after every successful checkout.

**Architecture:** Mailtrap SDK sends email from the Stripe webhook handler, after the DB transaction creates the order. A separate download token (72h, source "email") is created for the email. React Email renders the HTML + plain text template.

**Tech Stack:** Mailtrap Node.js SDK, React Email (@react-email/components), Drizzle ORM

---

### Task 1: Install dependencies

**Files:**
- Modify: `package.json`

**Step 1: Install mailtrap and react-email**

Run: `pnpm add mailtrap @react-email/components`

**Step 2: Verify installation**

Run: `pnpm list mailtrap @react-email/components`
Expected: Both packages listed with versions

**Step 3: Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "chore: add mailtrap and react-email dependencies (#24)"
```

---

### Task 2: Add `source` column to download_tokens schema

**Files:**
- Modify: `src/db/schema.ts:188-199`

The `download_tokens` table needs a `source` column to distinguish between web tokens (success page, 24h) and email tokens (72h). This also fixes the success page query which will break once there are two tokens per order.

**Step 1: Add source column to downloadTokens table**

In `src/db/schema.ts`, add a `source` text column with default `"web"` to the `downloadTokens` table:

```typescript
export const downloadTokens = pgTable("download_tokens", {
  id: uuid("id").primaryKey().defaultRandom(),
  orderId: uuid("order_id")
    .notNull()
    .references(() => orders.id),
  token: uuid("token").notNull().unique().$defaultFn(() => crypto.randomUUID()),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  downloadCount: integer("download_count").notNull().default(0),
  source: text("source").notNull().default("web"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});
```

**Step 2: Push schema to database**

Run: `pnpm drizzle-kit push`
Expected: Schema changes applied (new column `source` with default `"web"`)

**Step 3: Fix success page query to filter by source**

In `src/app/(platform)/checkout/success/page.tsx`, update the query to filter by `source = "web"` so it only picks up the 24h web token, not the 72h email token:

```typescript
  const result = await db
    .select({
      productTitle: products.title,
      amountCents: orders.amountCents,
      currency: products.currency,
      token: downloadTokens.token,
    })
    .from(orders)
    .innerJoin(products, eq(orders.productId, products.id))
    .innerJoin(downloadTokens, eq(downloadTokens.orderId, orders.id))
    .where(
      and(
        eq(orders.stripePaymentIntentId, session.payment_intent as string),
        eq(downloadTokens.source, "web")
      )
    )
    .then((rows) => rows[0]);
```

Add `and` to the import from `drizzle-orm`:

```typescript
import { eq, and } from "drizzle-orm";
```

**Step 4: Verify build**

Run: `pnpm build`
Expected: Build succeeds with no errors

**Step 5: Commit**

```bash
git add src/db/schema.ts src/app/\(platform\)/checkout/success/page.tsx
git commit -m "feat: add source column to download_tokens, filter web tokens in success page (#24)"
```

---

### Task 3: Create email client

**Files:**
- Create: `src/lib/email.ts`

**Step 1: Create email client module**

Create `src/lib/email.ts` with the Mailtrap client and the `sendPurchaseConfirmation` function:

```typescript
import { MailtrapClient } from "mailtrap";
import { render } from "@react-email/components";
import PurchaseConfirmation from "@/emails/purchase-confirmation";

const mailtrap = new MailtrapClient({
  token: process.env.MAILTRAP_API_TOKEN!,
});

export interface PurchaseEmailData {
  buyerEmail: string;
  buyerName: string | null;
  productName: string;
  amountCents: number;
  currency: string;
  storeName: string;
  creatorEmail: string;
  orderId: string;
  downloadUrl: string;
  purchaseDate: Date;
}

export async function sendPurchaseConfirmation(data: PurchaseEmailData) {
  const component = PurchaseConfirmation(data);
  const [html, text] = await Promise.all([
    render(component),
    render(component, { plainText: true }),
  ]);

  await mailtrap.send({
    from: {
      name: "Fooshop",
      email: process.env.EMAIL_FROM || "noreply@fooshop.ai",
    },
    to: [{ email: data.buyerEmail }],
    subject: `Il tuo acquisto: ${data.productName}`,
    html,
    text,
    category: "purchase-confirmation",
  });
}
```

**Step 2: Verify it compiles (will fail until Task 4 creates the template)**

This file depends on the email template created in Task 4. Proceed to Task 4 before building.

---

### Task 4: Create email template

**Files:**
- Create: `src/emails/purchase-confirmation.tsx`

**Step 1: Create emails directory and template**

Create `src/emails/purchase-confirmation.tsx`:

```tsx
import {
  Html,
  Head,
  Preview,
  Body,
  Container,
  Section,
  Heading,
  Text,
  Button,
  Hr,
} from "@react-email/components";
import type { PurchaseEmailData } from "@/lib/email";

function formatPrice(cents: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(cents / 100);
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
}

export default function PurchaseConfirmation({
  buyerName,
  productName,
  amountCents,
  currency,
  storeName,
  creatorEmail,
  orderId,
  downloadUrl,
  purchaseDate,
}: PurchaseEmailData) {
  const shortOrderId = orderId.slice(0, 8).toUpperCase();

  return (
    <Html lang="en">
      <Head />
      <Preview>Your purchase: {productName}</Preview>
      <Body style={body}>
        <Container style={container}>
          <Section style={section}>
            <Heading style={heading}>Purchase confirmed</Heading>

            <Text style={text}>
              {buyerName ? `Hi ${buyerName},` : "Hi,"} your purchase is complete.
            </Text>

            <Section style={detailsBox}>
              <Text style={detailRow}>
                <strong>Product:</strong> {productName}
              </Text>
              <Text style={detailRow}>
                <strong>Amount:</strong> {formatPrice(amountCents, currency)}
              </Text>
              <Text style={detailRow}>
                <strong>Store:</strong> {storeName}
              </Text>
              <Text style={detailRow}>
                <strong>Order:</strong> #{shortOrderId}
              </Text>
              <Text style={detailRow}>
                <strong>Date:</strong> {formatDate(purchaseDate)}
              </Text>
            </Section>

            <Section style={buttonSection}>
              <Button href={downloadUrl} style={button}>
                Download your file
              </Button>
            </Section>

            <Text style={expiry}>
              This link expires in 72 hours.
            </Text>

            <Hr style={hr} />

            <Text style={footer}>
              Need help? Contact the seller at {creatorEmail}
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

PurchaseConfirmation.PreviewProps = {
  buyerEmail: "buyer@example.com",
  buyerName: "John",
  productName: "Ultimate Design Kit",
  amountCents: 2900,
  currency: "usd",
  storeName: "Creative Studio",
  creatorEmail: "creator@example.com",
  orderId: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  downloadUrl: "https://fooshop.ai/api/download/abc123",
  purchaseDate: new Date("2026-03-11"),
} satisfies PurchaseEmailData;

// --- Styles ---

const body = {
  backgroundColor: "#f4f4f5",
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
};

const container = {
  maxWidth: "560px",
  margin: "0 auto",
  padding: "20px 0",
};

const section = {
  backgroundColor: "#ffffff",
  borderRadius: "8px",
  padding: "32px",
};

const heading = {
  fontSize: "22px",
  fontWeight: "700" as const,
  color: "#18181b",
  margin: "0 0 16px",
};

const text = {
  fontSize: "15px",
  lineHeight: "24px",
  color: "#3f3f46",
  margin: "0 0 16px",
};

const detailsBox = {
  backgroundColor: "#fafafa",
  borderRadius: "6px",
  padding: "16px",
  margin: "0 0 24px",
};

const detailRow = {
  fontSize: "14px",
  lineHeight: "20px",
  color: "#3f3f46",
  margin: "0 0 4px",
};

const buttonSection = {
  textAlign: "center" as const,
  margin: "0 0 16px",
};

const button = {
  backgroundColor: "#18181b",
  color: "#ffffff",
  fontSize: "15px",
  fontWeight: "600" as const,
  textDecoration: "none",
  textAlign: "center" as const,
  display: "inline-block",
  padding: "12px 24px",
  borderRadius: "6px",
};

const expiry = {
  fontSize: "13px",
  color: "#71717a",
  textAlign: "center" as const,
  margin: "0 0 24px",
};

const hr = {
  borderColor: "#e4e4e7",
  margin: "0 0 16px",
};

const footer = {
  fontSize: "13px",
  color: "#a1a1aa",
  margin: "0",
};
```

**Step 2: Verify build**

Run: `pnpm build`
Expected: Build succeeds

**Step 3: Commit**

```bash
git add src/lib/email.ts src/emails/purchase-confirmation.tsx
git commit -m "feat: add email client and purchase confirmation template (#24)"
```

---

### Task 5: Update webhook to create email token and send email

**Files:**
- Modify: `src/app/api/stripe/webhook/route.ts`

This is the core integration. After the existing DB transaction (which creates the order + 24h web token), we:
1. Create a second download token with 72h expiry and `source: "email"`
2. Fetch product + creator data needed for the email
3. Send the email (non-blocking — if it fails, we log but don't fail the webhook)

**Step 1: Update webhook imports**

At top of `src/app/api/stripe/webhook/route.ts`, add:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getStripe, calculatePlatformFee } from "@/lib/stripe";
import { db } from "@/db";
import { orders, downloadTokens, products, creators } from "@/db/schema";
import { sendPurchaseConfirmation } from "@/lib/email";
```

**Step 2: Update the checkout.session.completed handler**

After the existing `try { await db.transaction(...) }` block (line 59), and before the catch, restructure so we capture the order from the transaction and then send the email after:

```typescript
    try {
      // Existing transaction — capture order
      const [order] = await db.transaction(async (tx) => {
        const [order] = await tx.insert(orders).values({
          productId,
          creatorId,
          buyerEmail: session.customer_details?.email ?? "unknown",
          buyerName: session.customer_details?.name,
          amountCents: session.amount_total!,
          platformFeeCents: calculatePlatformFee(session.amount_total!),
          stripePaymentIntentId: session.payment_intent as string,
          status: "completed",
        }).returning();

        await tx.insert(downloadTokens).values({
          orderId: order.id,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
          source: "web",
        });

        return [order];
      });

      // Create 72h email token + send email (outside transaction, non-blocking)
      try {
        const [emailToken] = await db.insert(downloadTokens).values({
          orderId: order.id,
          expiresAt: new Date(Date.now() + 72 * 60 * 60 * 1000),
          source: "email",
        }).returning();

        const product = await db
          .select({
            title: products.title,
            currency: products.currency,
          })
          .from(products)
          .where(eq(products.id, productId))
          .then((rows) => rows[0]);

        const creator = await db
          .select({
            storeName: creators.storeName,
            email: creators.email,
          })
          .from(creators)
          .where(eq(creators.id, creatorId))
          .then((rows) => rows[0]);

        if (product && creator) {
          const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://fooshop.ai";

          await sendPurchaseConfirmation({
            buyerEmail: order.buyerEmail,
            buyerName: order.buyerName,
            productName: product.title,
            amountCents: order.amountCents,
            currency: product.currency,
            storeName: creator.storeName || "Fooshop Store",
            creatorEmail: creator.email,
            orderId: order.id,
            downloadUrl: `${appUrl}/api/download/${emailToken.token}`,
            purchaseDate: order.createdAt,
          });
        }
      } catch (emailError) {
        // Email failure must not break the webhook — order is already saved
        console.error("Webhook: failed to send purchase email", {
          orderId: order.id,
          error: emailError,
        });
      }
    } catch (error) {
      console.error("Webhook: failed to process checkout.session.completed", {
        sessionId: session.id,
        error,
      });
      return NextResponse.json({ error: "Processing failed" }, { status: 500 });
    }
```

**Step 3: Verify build**

Run: `pnpm build`
Expected: Build succeeds

**Step 4: Commit**

```bash
git add src/app/api/stripe/webhook/route.ts
git commit -m "feat: send purchase confirmation email from webhook (#24)"
```

---

### Task 6: Update .env.example and verify

**Files:**
- Modify: `.env.example`

**Step 1: Add email env vars to .env.example**

Append to `.env.example`:

```
# Email (Mailtrap)
MAILTRAP_API_TOKEN=
EMAIL_FROM=noreply@fooshop.ai
```

**Step 2: Final build verification**

Run: `pnpm build`
Expected: Build succeeds with no errors

**Step 3: Commit**

```bash
git add .env.example
git commit -m "chore: add Mailtrap env vars to .env.example (#24)"
```

---

### Summary

| Task | What | Files |
|------|------|-------|
| 1 | Install dependencies | `package.json` |
| 2 | Add `source` column + fix success page | `schema.ts`, `success/page.tsx` |
| 3 | Email client | `src/lib/email.ts` |
| 4 | Email template | `src/emails/purchase-confirmation.tsx` |
| 5 | Webhook integration | `webhook/route.ts` |
| 6 | Env vars + final build | `.env.example` |
