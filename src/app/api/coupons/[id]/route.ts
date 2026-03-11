import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { creators, coupons } from "@/db/schema";
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

  // Only allow updating specific fields
  const allowedFields: Record<string, unknown> = {};
  if (body.active !== undefined) allowedFields.active = body.active;
  if (body.maxRedemptions !== undefined) allowedFields.maxRedemptions = body.maxRedemptions || null;
  if (body.expiresAt !== undefined) allowedFields.expiresAt = body.expiresAt ? new Date(body.expiresAt) : null;
  if (body.minAmountCents !== undefined) allowedFields.minAmountCents = body.minAmountCents || null;

  if (Object.keys(allowedFields).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  const updated = await db
    .update(coupons)
    .set(allowedFields)
    .where(and(eq(coupons.id, id), eq(coupons.creatorId, creator.id)))
    .returning();

  if (updated.length === 0) {
    return NextResponse.json({ error: "Coupon not found" }, { status: 404 });
  }

  return NextResponse.json(updated[0]);
}
