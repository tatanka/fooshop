import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { buyIntents, products } from "@/db/schema";
import { eq } from "drizzle-orm";
import { rateLimit } from "@/lib/rate-limit";
import { parseBody, validationError } from "@/lib/validations/helpers";
import { buyIntentCreateSchema } from "@/lib/validations/buy-intents";

export async function POST(req: NextRequest) {
  const rateLimitResult = await rateLimit(req, {
    endpoint: "buy-intents",
    limit: 30,
    windowMs: 60_000,
    keyStrategy: "ip",
  });
  if (rateLimitResult) return rateLimitResult;

  const { data: body, error: parseError } = await parseBody(req);
  if (parseError) return parseError;
  const result = buyIntentCreateSchema.safeParse(body);
  if (!result.success) return validationError(result.error);
  const { productId } = result.data;

  const product = await db
    .select({ id: products.id, creatorId: products.creatorId })
    .from(products)
    .where(eq(products.id, productId))
    .then((rows) => rows[0]);

  if (!product) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }

  await db.insert(buyIntents).values({
    productId: product.id,
    creatorId: product.creatorId,
  });

  return NextResponse.json({ ok: true });
}
