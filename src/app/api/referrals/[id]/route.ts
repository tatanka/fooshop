import { NextRequest, NextResponse } from "next/server";
import { authenticateCreator } from "@/lib/api-key";
import { db } from "@/db";
import { referrals, referralConversions, products } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { parseBody, validationError } from "@/lib/validations/helpers";
import { referralUpdateSchema } from "@/lib/validations/referrals";

interface Props {
  params: Promise<{ id: string }>;
}

export async function PUT(req: NextRequest, { params }: Props) {
  const authResult = await authenticateCreator(req, "referrals:write");
  if (authResult instanceof NextResponse) return authResult;
  const { creator } = authResult;

  const { id } = await params;
  const { data: body, error: parseError } = await parseBody(req);
  if (parseError) return parseError;
  const result = referralUpdateSchema.safeParse(body);
  if (!result.success) return validationError(result.error);

  const allowedFields: Record<string, unknown> = {};
  if (result.data.affiliateName !== undefined) allowedFields.affiliateName = result.data.affiliateName;
  if (result.data.affiliateEmail !== undefined) allowedFields.affiliateEmail = result.data.affiliateEmail?.trim() || null;
  if (result.data.commissionPercent !== undefined) allowedFields.commissionPercent = result.data.commissionPercent;
  if (result.data.active !== undefined) allowedFields.active = result.data.active;
  if (result.data.productId !== undefined) {
    const pid = result.data.productId;
    if (pid) {
      const product = await db
        .select({ id: products.id })
        .from(products)
        .where(and(eq(products.id, pid), eq(products.creatorId, creator.id)))
        .then((rows) => rows[0]);

      if (!product) {
        return NextResponse.json({ error: "Product not found" }, { status: 404 });
      }
    }
    allowedFields.productId = pid;
  }

  const updated = await db
    .update(referrals)
    .set(allowedFields)
    .where(and(eq(referrals.id, id), eq(referrals.creatorId, creator.id)))
    .returning();

  if (updated.length === 0) {
    return NextResponse.json({ error: "Referral not found" }, { status: 404 });
  }

  return NextResponse.json(updated[0]);
}

export async function DELETE(req: NextRequest, { params }: Props) {
  const authResult = await authenticateCreator(req, "referrals:write");
  if (authResult instanceof NextResponse) return authResult;
  const { creator } = authResult;

  const { id } = await params;

  // Check if referral has conversions
  const hasConversions = await db
    .select({ id: referralConversions.id })
    .from(referralConversions)
    .where(eq(referralConversions.referralId, id))
    .limit(1)
    .then((rows) => rows.length > 0);

  if (hasConversions) {
    // Deactivate instead of deleting
    const updated = await db
      .update(referrals)
      .set({ active: false })
      .where(and(eq(referrals.id, id), eq(referrals.creatorId, creator.id)))
      .returning();

    if (updated.length === 0) {
      return NextResponse.json({ error: "Referral not found" }, { status: 404 });
    }

    return NextResponse.json({
      ...updated[0],
      _note: "Referral deactivated (has conversion history)",
    });
  }

  const deleted = await db
    .delete(referrals)
    .where(and(eq(referrals.id, id), eq(referrals.creatorId, creator.id)))
    .returning();

  if (deleted.length === 0) {
    return NextResponse.json({ error: "Referral not found" }, { status: 404 });
  }

  return NextResponse.json({ deleted: true });
}
