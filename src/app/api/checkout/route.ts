import { NextRequest, NextResponse } from "next/server";
import { getStripe, calculatePlatformFee } from "@/lib/stripe";
import { db } from "@/db";
import { products, creators } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST(req: NextRequest) {
  const { productId } = await req.json();

  const product = await db
    .select()
    .from(products)
    .where(eq(products.id, productId))
    .then((rows) => rows[0]);

  if (!product || product.status !== "published") {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }

  const creator = await db
    .select()
    .from(creators)
    .where(eq(creators.id, product.creatorId))
    .then((rows) => rows[0]);

  if (!creator?.stripeConnectId) {
    return NextResponse.json(
      { error: "Creator not set up for payments" },
      { status: 400 }
    );
  }

  const platformFee = calculatePlatformFee(product.priceCents);

  const checkoutSession = await getStripe().checkout.sessions.create({
    mode: "payment",
    line_items: [
      {
        price_data: {
          currency: product.currency,
          product_data: {
            name: product.title,
            description: product.description,
          },
          unit_amount: product.priceCents,
        },
        quantity: 1,
      },
    ],
    payment_intent_data: {
      application_fee_amount: platformFee,
      transfer_data: {
        destination: creator.stripeConnectId,
      },
    },
    metadata: {
      productId: product.id,
      creatorId: creator.id,
    },
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/${creator.slug}/${product.slug}`,
  });

  return NextResponse.json({ url: checkoutSession.url });
}
