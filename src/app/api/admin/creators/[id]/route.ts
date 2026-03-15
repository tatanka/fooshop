import { NextRequest, NextResponse } from "next/server";
import { validateApiKey, hasScope, insufficientScope } from "@/lib/api-key";
import { db } from "@/db";
import { creators } from "@/db/schema";
import { eq } from "drizzle-orm";

const SCOPE = "admin:write:creators";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await validateApiKey(req);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!hasScope(auth, "admin:read:creators")) {
    return insufficientScope("admin:read:creators");
  }

  const { id } = await params;
  const [creator] = await db
    .select()
    .from(creators)
    .where(eq(creators.id, id));

  if (!creator) {
    return NextResponse.json({ error: "Creator not found" }, { status: 404 });
  }

  return NextResponse.json(creator);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await validateApiKey(req);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!hasScope(auth, SCOPE)) return insufficientScope(SCOPE);

  const { id } = await params;
  const body = await req.json();

  const allowedFields: Record<string, unknown> = {};
  if (body.name !== undefined) allowedFields.name = body.name;
  if (body.email !== undefined) allowedFields.email = body.email;
  if (body.storeName !== undefined) allowedFields.storeName = body.storeName;
  if (body.storeDescription !== undefined)
    allowedFields.storeDescription = body.storeDescription;
  if (body.commissionOverridePercent !== undefined)
    allowedFields.commissionOverridePercent = body.commissionOverridePercent;
  if (body.commissionOverrideExpiresAt !== undefined)
    allowedFields.commissionOverrideExpiresAt = body.commissionOverrideExpiresAt;

  if (Object.keys(allowedFields).length === 0) {
    return NextResponse.json(
      { error: "No valid fields to update" },
      { status: 400 }
    );
  }

  const [updated] = await db
    .update(creators)
    .set(allowedFields)
    .where(eq(creators.id, id))
    .returning();

  if (!updated) {
    return NextResponse.json({ error: "Creator not found" }, { status: 404 });
  }

  return NextResponse.json(updated);
}
