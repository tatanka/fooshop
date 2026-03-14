import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { creators, referrals, referralConversions } from "@/db/schema";
import { eq, and } from "drizzle-orm";

interface Props {
  params: Promise<{ id: string }>;
}

export async function PUT(req: NextRequest, { params }: Props) {
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

  const { id } = await params;
  const body = await req.json();

  const allowedFields: Record<string, unknown> = {};
  if (body.affiliateName !== undefined) allowedFields.affiliateName = body.affiliateName.trim();
  if (body.affiliateEmail !== undefined) allowedFields.affiliateEmail = body.affiliateEmail?.trim() || null;
  if (body.commissionPercent !== undefined) {
    if (
      typeof body.commissionPercent !== "number" ||
      !Number.isInteger(body.commissionPercent) ||
      body.commissionPercent < 1 ||
      body.commissionPercent > 100
    ) {
      return NextResponse.json(
        { error: "Commission must be an integer between 1 and 100" },
        { status: 400 }
      );
    }
    allowedFields.commissionPercent = body.commissionPercent;
  }
  if (body.active !== undefined) allowedFields.active = body.active;
  if (body.productId !== undefined) allowedFields.productId = body.productId || null;

  if (Object.keys(allowedFields).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
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
