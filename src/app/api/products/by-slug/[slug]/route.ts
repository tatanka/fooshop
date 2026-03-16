import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { products, creators, pageViews } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { rateLimit } from "@/lib/rate-limit";

interface Context {
  params: Promise<{ slug: string }>;
}

export async function GET(req: NextRequest, context: Context) {
  const rateLimitResult = await rateLimit(req, {
    endpoint: "products-by-slug",
    limit: 60,
    windowMs: 60_000,
    keyStrategy: "ip",
  });
  if (rateLimitResult) return rateLimitResult;

  const { slug } = await context.params;
  const source = new URL(req.url).searchParams.get("source") ?? "web";

  const result = await db
    .select({
      product: products,
      creatorSlug: creators.slug,
      creatorName: creators.storeName,
    })
    .from(products)
    .innerJoin(creators, eq(products.creatorId, creators.id))
    .where(and(eq(products.slug, slug), eq(products.status, "published")))
    .then((rows) => rows[0]);

  if (!result) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }

  await db.insert(pageViews).values({
    productId: result.product.id,
    source,
  });

  return NextResponse.json({
    ...result.product,
    creatorSlug: result.creatorSlug,
    creatorName: result.creatorName,
    url: `${process.env.NEXT_PUBLIC_APP_URL}/${result.creatorSlug}/${result.product.slug}`,
  });
}
