import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { coupons, products } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { applyDiscount } from "@/lib/coupon";
import { rateLimit } from "@/lib/rate-limit";
import { parseBody, validationError } from "@/lib/validations/helpers";
import { couponValidateSchema } from "@/lib/validations/coupons";

export async function POST(req: NextRequest) {
  const rateLimitResult = await rateLimit(req, {
    endpoint: "coupons-validate",
    limit: 20,
    windowMs: 60_000,
    keyStrategy: "ip",
  });
  if (rateLimitResult) return rateLimitResult;

  const { data: body, error: parseError } = await parseBody(req);
  if (parseError) return parseError;
  const result = couponValidateSchema.safeParse(body);
  if (!result.success) return validationError(result.error);

  const { code, productId } = result.data;

  // Fetch the product to get the creator ID and price
  const product = await db
    .select()
    .from(products)
    .where(eq(products.id, productId))
    .then((rows) => rows[0]);

  if (!product) {
    return NextResponse.json(
      { valid: false, error: "Product not found" },
      { status: 404 }
    );
  }

  // Look up coupon by code + creator
  const coupon = await db
    .select()
    .from(coupons)
    .where(
      and(
        eq(coupons.creatorId, product.creatorId),
        eq(coupons.code, code.toUpperCase().trim())
      )
    )
    .then((rows) => rows[0]);

  if (!coupon) {
    return NextResponse.json({ valid: false, error: "Invalid code" });
  }

  // Check active
  if (!coupon.active) {
    return NextResponse.json({ valid: false, error: "Code is no longer active" });
  }

  // Check expiration
  if (coupon.expiresAt && new Date() > coupon.expiresAt) {
    return NextResponse.json({ valid: false, error: "Code has expired" });
  }

  // Check max redemptions
  if (coupon.maxRedemptions !== null && coupon.redemptionCount >= coupon.maxRedemptions) {
    return NextResponse.json({ valid: false, error: "Code has reached its usage limit" });
  }

  // Check product restriction
  if (coupon.productId && coupon.productId !== productId) {
    return NextResponse.json({ valid: false, error: "Code is not valid for this product" });
  }

  // Check minimum amount
  if (coupon.minAmountCents !== null && product.priceCents < coupon.minAmountCents) {
    return NextResponse.json({
      valid: false,
      error: `Minimum order amount: $${(coupon.minAmountCents / 100).toFixed(2)}`,
    });
  }

  const discountedPriceCents = applyDiscount(
    product.priceCents,
    coupon.discountType,
    coupon.discountValue
  );

  return NextResponse.json({
    valid: true,
    discountType: coupon.discountType,
    discountValue: coupon.discountValue,
    originalPriceCents: product.priceCents,
    discountedPriceCents,
  });
}
