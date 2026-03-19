import { NextRequest, NextResponse } from "next/server";
import { authenticateCreator } from "@/lib/api-key";
import { db } from "@/db";
import { coupons, products } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { generateCouponCode } from "@/lib/coupon";
import { parseBody, validationError } from "@/lib/validations/helpers";
import { couponCreateSchema } from "@/lib/validations/coupons";

export async function GET(req: NextRequest) {
  const authResult = await authenticateCreator(req, "coupons:read");
  if (authResult instanceof NextResponse) return authResult;
  const { creator } = authResult;

  const rows = await db
    .select({
      coupon: coupons,
      productTitle: products.title,
    })
    .from(coupons)
    .leftJoin(products, eq(coupons.productId, products.id))
    .where(eq(coupons.creatorId, creator.id))
    .orderBy(desc(coupons.createdAt));

  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const authResult = await authenticateCreator(req, "coupons:write");
  if (authResult instanceof NextResponse) return authResult;
  const { creator } = authResult;

  const { data: body, error: parseError } = await parseBody(req);
  if (parseError) return parseError;
  const result = couponCreateSchema.safeParse(body);
  if (!result.success) return validationError(result.error);

  const {
    code,
    discountType,
    discountValue,
    productId,
    minAmountCents,
    maxRedemptions,
    expiresAt,
  } = result.data;

  // Validate product belongs to creator (if provided)
  if (productId) {
    const product = await db
      .select({ id: products.id })
      .from(products)
      .where(and(eq(products.id, productId), eq(products.creatorId, creator.id)))
      .then((rows) => rows[0]);

    if (!product) {
      return NextResponse.json(
        { error: "Product not found" },
        { status: 404 }
      );
    }
  }

  const finalCode = (code || generateCouponCode()).toUpperCase().trim();

  try {
    const [coupon] = await db
      .insert(coupons)
      .values({
        creatorId: creator.id,
        code: finalCode,
        discountType,
        discountValue,
        productId: productId || null,
        minAmountCents: minAmountCents || null,
        maxRedemptions: maxRedemptions || null,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
      })
      .returning();

    return NextResponse.json(coupon, { status: 201 });
  } catch (err) {
    // Handle unique constraint violation (duplicate code for this creator)
    if (err instanceof Error && err.message.includes("unique")) {
      return NextResponse.json(
        { error: "A coupon with this code already exists" },
        { status: 409 }
      );
    }
    throw err;
  }
}
