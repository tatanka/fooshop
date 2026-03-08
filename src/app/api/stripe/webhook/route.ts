import { NextRequest, NextResponse } from "next/server";
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

    const [order] = await db.insert(orders).values({
      productId,
      creatorId,
      buyerEmail: session.customer_details?.email ?? "unknown",
      buyerName: session.customer_details?.name,
      amountCents: session.amount_total!,
      platformFeeCents: calculatePlatformFee(session.amount_total!),
      stripePaymentIntentId: session.payment_intent as string,
      status: "completed",
    }).returning();

    await db.insert(downloadTokens).values({
      orderId: order.id,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24h
    });
  }

  return NextResponse.json({ received: true });
}
