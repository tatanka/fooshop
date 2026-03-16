import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { creators, products, pageViews } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { rateLimit } from "@/lib/rate-limit";

interface Context {
  params: Promise<{ slug: string }>;
}

export async function GET(req: NextRequest, context: Context) {
  const rateLimitResult = await rateLimit(req, {
    endpoint: "stores",
    limit: 60,
    windowMs: 60_000,
    keyStrategy: "ip",
  });
  if (rateLimitResult) return rateLimitResult;

  const { slug } = await context.params;
  const source = new URL(req.url).searchParams.get("source") ?? "web";

  const creator = await db
    .select()
    .from(creators)
    .where(eq(creators.slug, slug))
    .then((rows) => rows[0]);

  if (!creator) {
    return NextResponse.json({ error: "Store not found" }, { status: 404 });
  }

  const storeProducts = await db
    .select()
    .from(products)
    .where(
      and(eq(products.creatorId, creator.id), eq(products.status, "published"))
    );

  await db.insert(pageViews).values({
    storeSlug: slug,
    source,
  });

  return NextResponse.json({
    name: creator.storeName,
    description: creator.storeDescription,
    slug: creator.slug,
    url: `${process.env.NEXT_PUBLIC_APP_URL}/${creator.slug}`,
    products: storeProducts.map((p) => ({
      id: p.id,
      title: p.title,
      slug: p.slug,
      description: p.description,
      priceCents: p.priceCents,
      currency: p.currency,
      category: p.category,
      url: `${process.env.NEXT_PUBLIC_APP_URL}/${creator.slug}/${p.slug}`,
    })),
  });
}
