import { NextRequest, NextResponse } from "next/server";
import { validateApiKey, hasScope, insufficientScope } from "@/lib/api-key";
import { db } from "@/db";
import { coupons, creators, products } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { generateCouponCode } from "@/lib/coupon";
import { parseBody, validationError } from "@/lib/validations/helpers";
import { adminCouponCreateSchema } from "@/lib/validations/admin";

const READ_SCOPE = "admin:read:orders";
const WRITE_SCOPE = "admin:write:coupons";

export async function GET(req: NextRequest) {
  const auth = await validateApiKey(req);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!hasScope(auth, READ_SCOPE)) return insufficientScope(READ_SCOPE);

  const rows = await db
    .select({
      coupon: coupons,
      creatorName: creators.name,
    })
    .from(coupons)
    .innerJoin(creators, eq(coupons.creatorId, creators.id));

  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const auth = await validateApiKey(req);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!hasScope(auth, WRITE_SCOPE)) return insufficientScope(WRITE_SCOPE);

  const { data: body, error: parseError } = await parseBody(req);
  if (parseError) return parseError;
  const result = adminCouponCreateSchema.safeParse(body);
  if (!result.success) return validationError(result.error);

  const { creatorId, code, discountType, discountValue, productId, minAmountCents, maxRedemptions, expiresAt } = result.data;

  // Verify creator exists
  const [creator] = await db
    .select({ id: creators.id })
    .from(creators)
    .where(eq(creators.id, creatorId));

  if (!creator) {
    return NextResponse.json({ error: "Creator not found" }, { status: 404 });
  }

  // Verify product belongs to creator (if provided)
  if (productId) {
    const [product] = await db
      .select({ id: products.id })
      .from(products)
      .where(and(eq(products.id, productId), eq(products.creatorId, creatorId)));

    if (!product) {
      return NextResponse.json({ error: "Product not found for this creator" }, { status: 404 });
    }
  }

  const finalCode = (code || generateCouponCode()).toUpperCase().trim();

  try {
    const [coupon] = await db
      .insert(coupons)
      .values({
        creatorId,
        code: finalCode,
        discountType,
        discountValue,
        productId: productId || null,
        minAmountCents: minAmountCents ?? null,
        maxRedemptions: maxRedemptions || null,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
      })
      .returning();

    return NextResponse.json(coupon, { status: 201 });
  } catch (err) {
    if (err instanceof Error && err.message.includes("unique")) {
      return NextResponse.json(
        { error: "A coupon with this code already exists for this creator" },
        { status: 409 }
      );
    }
    throw err;
  }
}
