import { NextRequest, NextResponse } from "next/server";
import { authenticateCreator } from "@/lib/api-key";
import { db } from "@/db";
import { creators } from "@/db/schema";
import { eq } from "drizzle-orm";
import { parseBody, validationError } from "@/lib/validations/helpers";
import { themeUpdateSchema } from "@/lib/validations/store";

export async function PUT(req: NextRequest) {
  const result = await authenticateCreator(req, "store:write");
  if (result instanceof NextResponse) return result;
  const { creator } = result;

  const { data: body, error: parseError } = await parseBody(req);
  if (parseError) return parseError;
  const validated = themeUpdateSchema.safeParse(body);
  if (!validated.success) return validationError(validated.error);

  const [updated] = await db
    .update(creators)
    .set({ storeTheme: validated.data.theme })
    .where(eq(creators.id, creator.id))
    .returning();

  if (!updated) {
    return NextResponse.json({ error: "Creator not found" }, { status: 404 });
  }

  return NextResponse.json({ theme: updated.storeTheme });
}
