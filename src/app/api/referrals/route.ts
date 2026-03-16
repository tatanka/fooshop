import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { creators, referrals, referralConversions, products } from "@/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { generateReferralCode } from "@/lib/referral";
import { parseBody, validationError } from "@/lib/validations/helpers";
import { referralCreateSchema } from "@/lib/validations/referrals";

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
      referral: referrals,
      productTitle: products.title,
      conversions: sql<number>`count(${referralConversions.id})::int`,
      totalCommissionCents: sql<number>`coalesce(sum(${referralConversions.commissionCents}), 0)::int`,
    })
    .from(referrals)
    .leftJoin(products, eq(referrals.productId, products.id))
    .leftJoin(referralConversions, eq(referrals.id, referralConversions.referralId))
    .where(eq(referrals.creatorId, creator.id))
    .groupBy(referrals.id, products.title)
    .orderBy(desc(referrals.createdAt));

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

  const { data: body, error: parseError } = await parseBody(req);
  if (parseError) return parseError;
  const result = referralCreateSchema.safeParse(body);
  if (!result.success) return validationError(result.error);

  const { code, affiliateName, affiliateEmail, productId, commissionPercent } = result.data;

  // Validate product belongs to creator (if provided)
  if (productId) {
    const product = await db
      .select({ id: products.id })
      .from(products)
      .where(and(eq(products.id, productId), eq(products.creatorId, creator.id)))
      .then((rows) => rows[0]);

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }
  }

  const finalCode = (code || generateReferralCode()).toUpperCase().trim();

  try {
    const [referral] = await db
      .insert(referrals)
      .values({
        creatorId: creator.id,
        code: finalCode,
        affiliateName: affiliateName.trim(),
        affiliateEmail: affiliateEmail?.trim() || null,
        productId: productId || null,
        commissionPercent,
      })
      .returning();

    return NextResponse.json(referral, { status: 201 });
  } catch (err) {
    if (err instanceof Error && err.message.includes("unique")) {
      return NextResponse.json(
        { error: "A referral with this code already exists" },
        { status: 409 }
      );
    }
    throw err;
  }
}
