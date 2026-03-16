import { NextRequest, NextResponse } from "next/server";
import { validateApiKey, hasScope, insufficientScope } from "@/lib/api-key";
import { db } from "@/db";
import { creators } from "@/db/schema";
import { eq } from "drizzle-orm";
import { parseBody, validationError } from "@/lib/validations/helpers";
import { adminCreatorUpdateSchema } from "@/lib/validations/admin";

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

  const { data: body, error: parseError } = await parseBody(req);
  if (parseError) return parseError;
  const result = adminCreatorUpdateSchema.safeParse(body);
  if (!result.success) return validationError(result.error);

  const allowedFields: Record<string, unknown> = {};
  if (result.data.name !== undefined) allowedFields.name = result.data.name;
  if (result.data.email !== undefined) allowedFields.email = result.data.email;
  if (result.data.storeName !== undefined) allowedFields.storeName = result.data.storeName;
  if (result.data.storeDescription !== undefined)
    allowedFields.storeDescription = result.data.storeDescription;
  if (result.data.commissionOverridePercent !== undefined)
    allowedFields.commissionOverridePercent = result.data.commissionOverridePercent;
  if (result.data.commissionOverrideExpiresAt !== undefined)
    allowedFields.commissionOverrideExpiresAt = result.data.commissionOverrideExpiresAt
      ? new Date(result.data.commissionOverrideExpiresAt)
      : null;

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
