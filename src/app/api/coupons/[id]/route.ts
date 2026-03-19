import { NextRequest, NextResponse } from "next/server";
import { authenticateCreator } from "@/lib/api-key";
import { db } from "@/db";
import { coupons } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { parseBody, validationError } from "@/lib/validations/helpers";
import { couponUpdateSchema } from "@/lib/validations/coupons";

interface Props {
  params: Promise<{ id: string }>;
}

export async function PUT(req: NextRequest, { params }: Props) {
  const authResult = await authenticateCreator(req, "coupons:write");
  if (authResult instanceof NextResponse) return authResult;
  const { creator } = authResult;

  const { id } = await params;
  const { data: body, error: parseError } = await parseBody(req);
  if (parseError) return parseError;
  const result = couponUpdateSchema.safeParse(body);
  if (!result.success) return validationError(result.error);

  // Only allow updating specific fields
  const allowedFields: Record<string, unknown> = {};
  if (result.data.active !== undefined) allowedFields.active = result.data.active;
  if (result.data.maxRedemptions !== undefined) allowedFields.maxRedemptions = result.data.maxRedemptions;
  if (result.data.expiresAt !== undefined) allowedFields.expiresAt = result.data.expiresAt ? new Date(result.data.expiresAt) : null;
  if (result.data.minAmountCents !== undefined) allowedFields.minAmountCents = result.data.minAmountCents;

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
