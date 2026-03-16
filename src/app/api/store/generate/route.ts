import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { generateStore } from "@/lib/ai";
import { db } from "@/db";
import { creators } from "@/db/schema";
import { eq } from "drizzle-orm";
import { parseBody, validationError } from "@/lib/validations/helpers";
import { storeGenerateSchema } from "@/lib/validations/store";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rateLimitResult = await rateLimit(req, {
    endpoint: "store-generate",
    limit: 5,
    windowMs: 60_000,
    keyStrategy: "both",
    userId: session.user.id,
  });
  if (rateLimitResult) return rateLimitResult;

  const { data: body, error: parseError } = await parseBody(req);
  if (parseError) return parseError;
  const result = storeGenerateSchema.safeParse(body);
  if (!result.success) return validationError(result.error);

  const { description } = result.data;
  const generated = await generateStore(description);

  const slug = generated.storeName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

  await db
    .insert(creators)
    .values({
      userId: session.user.id,
      email: session.user.email!,
      name: session.user.name ?? session.user.email!,
      storeName: generated.storeName,
      storeDescription: generated.storeDescription,
      storeTheme: generated.theme,
      slug,
    })
    .onConflictDoUpdate({
      target: creators.userId,
      set: {
        storeName: generated.storeName,
        storeDescription: generated.storeDescription,
        storeTheme: generated.theme,
        slug,
      },
    });

  return NextResponse.json({ ...generated, slug });
}
