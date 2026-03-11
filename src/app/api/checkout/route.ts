import { NextRequest, NextResponse } from "next/server";
import { getStripe, calculatePlatformFee } from "@/lib/stripe";
import { applyDiscount } from "@/lib/coupon";
import { db } from "@/db";
import { products, creators, coupons } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";

export async function POST(req: NextRequest) {
  const { productId, couponCode, source } = await req.json();

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

  // Verify the Connect account can receive transfers
  const account = await getStripe().accounts.retrieve(creator.stripeConnectId);
  if (!account.charges_enabled) {
    return NextResponse.json(
      { error: "Creator has not completed payment setup yet" },
      { status: 400 }
    );
  }

  // Coupon validation (if provided)
  let finalPriceCents = product.priceCents;
  let couponId: string | null = null;

  if (couponCode) {
    const coupon = await db
      .select()
      .from(coupons)
      .where(
        and(
          eq(coupons.creatorId, product.creatorId),
          eq(coupons.code, couponCode.toUpperCase().trim())
        )
      )
      .then((rows) => rows[0]);

    if (!coupon || !coupon.active) {
      return NextResponse.json({ error: "Invalid coupon code" }, { status: 400 });
    }

    if (coupon.expiresAt && new Date() > coupon.expiresAt) {
      return NextResponse.json({ error: "Coupon has expired" }, { status: 400 });
    }

    if (coupon.productId && coupon.productId !== productId) {
      return NextResponse.json({ error: "Coupon not valid for this product" }, { status: 400 });
    }

    if (coupon.minAmountCents !== null && product.priceCents < coupon.minAmountCents) {
      return NextResponse.json({ error: "Order does not meet minimum amount" }, { status: 400 });
    }

    // Atomically increment redemption count (prevents race conditions)
    const updated = await db
      .update(coupons)
      .set({ redemptionCount: sql`${coupons.redemptionCount} + 1` })
      .where(
        and(
          eq(coupons.id, coupon.id),
          coupon.maxRedemptions !== null
            ? sql`${coupons.redemptionCount} < ${coupon.maxRedemptions}`
            : sql`true`
        )
      )
      .returning({ id: coupons.id });

    if (updated.length === 0) {
      return NextResponse.json({ error: "Coupon has reached its usage limit" }, { status: 400 });
    }

    finalPriceCents = applyDiscount(product.priceCents, coupon.discountType, coupon.discountValue);
    couponId = coupon.id;
  }

  const platformFee = calculatePlatformFee(finalPriceCents);

  try {
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
            unit_amount: finalPriceCents,
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
        source: source ?? "web",
        ...(couponId && { couponId }),
      },
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/${creator.slug}/${product.slug}`,
    });

    return NextResponse.json({ url: checkoutSession.url });
  } catch (err) {
    console.error("Checkout session creation failed:", err);
    const message = err instanceof Error ? err.message : "Payment service error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
