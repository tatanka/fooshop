import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { creators, coupons, products } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { generateCouponCode } from "@/lib/coupon";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const creator = await db
    .select()
    .from(creators)
    .where(eq(creators.userId, session.user.id))
    .then((rows) => rows[0]);

  if (!creator) {
    return NextResponse.json({ error: "Creator not found" }, { status: 404 });
  }

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
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const creator = await db
    .select()
    .from(creators)
    .where(eq(creators.userId, session.user.id))
    .then((rows) => rows[0]);

  if (!creator) {
    return NextResponse.json({ error: "Creator not found" }, { status: 404 });
  }

  const body = await req.json();
  const {
    code,
    discountType,
    discountValue,
    productId,
    minAmountCents,
    maxRedemptions,
    expiresAt,
  } = body;

  // Validate required fields
  if (!discountType || !discountValue) {
    return NextResponse.json(
      { error: "Discount type and value are required" },
      { status: 400 }
    );
  }

  if (!["percentage", "fixed"].includes(discountType)) {
    return NextResponse.json(
      { error: "Discount type must be 'percentage' or 'fixed'" },
      { status: 400 }
    );
  }

  if (discountType === "percentage" && (discountValue < 1 || discountValue > 100)) {
    return NextResponse.json(
      { error: "Percentage must be between 1 and 100" },
      { status: 400 }
    );
  }

  if (discountType === "fixed" && discountValue < 1) {
    return NextResponse.json(
      { error: "Fixed discount must be at least 1 cent" },
      { status: 400 }
    );
  }

  // Validate product belongs to creator (if provided)
  if (productId) {
    const product = await db
      .select({ id: products.id })
      .from(products)
      .where(eq(products.id, productId))
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
