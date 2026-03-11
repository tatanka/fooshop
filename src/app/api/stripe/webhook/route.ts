import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getStripe, calculatePlatformFee } from "@/lib/stripe";
import { db } from "@/db";
import { orders, downloadTokens, products, creators } from "@/db/schema";
import { sendPurchaseConfirmation } from "@/lib/email";

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature")!;

  let event;
  try {
    event = getStripe().webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const { productId, creatorId } = session.metadata!;

    if (!session.payment_intent) {
      console.error("Webhook: checkout.session.completed missing payment_intent", { sessionId: session.id });
      return NextResponse.json({ received: true });
    }

    // Idempotency: skip if already processed
    const existing = await db
      .select({ id: orders.id })
      .from(orders)
      .where(eq(orders.stripePaymentIntentId, session.payment_intent as string))
      .then((rows) => rows[0]);

    if (existing) {
      return NextResponse.json({ received: true });
    }

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
  }

  return NextResponse.json({ received: true });
}
