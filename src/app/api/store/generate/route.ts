import * as Sentry from "@sentry/nextjs";
import { NextRequest, NextResponse } from "next/server";
import { authenticateCreator } from "@/lib/api-key";
import { rateLimit } from "@/lib/rate-limit";
import { generateStore } from "@/lib/ai";
import { db } from "@/db";
import { creators } from "@/db/schema";
import { parseBody, validationError } from "@/lib/validations/helpers";
import { storeGenerateSchema } from "@/lib/validations/store";

export async function POST(req: NextRequest) {
  const result = await authenticateCreator(req, "store:write");
  if (result instanceof NextResponse) return result;
  const { creator, userId } = result;

  if (userId) Sentry.setUser({ id: userId });

  const rateLimitResult = await rateLimit(req, {
    endpoint: "store-generate",
    limit: 5,
    windowMs: 60_000,
    keyStrategy: userId ? "both" : "ip",
    ...(userId && { userId }),
  });
  if (rateLimitResult) return rateLimitResult;

  const { data: body, error: parseError } = await parseBody(req);
  if (parseError) return parseError;
  const validated = storeGenerateSchema.safeParse(body);
  if (!validated.success) return validationError(validated.error);

  try {
    const { description } = validated.data;
    const generated = await generateStore(description);

    const slug = generated.storeName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

    await db
      .insert(creators)
      .values({
        userId: creator.userId,
        email: creator.email,
        name: creator.name ?? creator.email,
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
  } catch (error) {
    Sentry.captureException(error, {
      tags: { flow: "store-generate" },
      extra: { userId: creator.userId },
    });
    console.error("Store generation failed:", error);
    return NextResponse.json({ error: "Store generation failed" }, { status: 500 });
  }
}
