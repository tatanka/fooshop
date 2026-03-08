import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getStripe, calculatePlatformFee } from "@/lib/stripe";
import { db } from "@/db";
import { orders, downloadTokens } from "@/db/schema";

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
      await db.transaction(async (tx) => {
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
        });
      });
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
