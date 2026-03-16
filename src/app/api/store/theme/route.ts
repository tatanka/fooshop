import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { creators } from "@/db/schema";
import { eq } from "drizzle-orm";
import { parseBody, validationError } from "@/lib/validations/helpers";
import { themeUpdateSchema } from "@/lib/validations/store";

export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: body, error: parseError } = await parseBody(req);
  if (parseError) return parseError;
  const result = themeUpdateSchema.safeParse(body);
  if (!result.success) return validationError(result.error);

  const [updated] = await db
    .update(creators)
    .set({ storeTheme: result.data.theme })
    .where(eq(creators.userId, session.user.id))
    .returning();

  if (!updated) {
    return NextResponse.json({ error: "Creator not found" }, { status: 404 });
  }

  return NextResponse.json({ theme: updated.storeTheme });
}
