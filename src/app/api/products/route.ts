import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { products, creators, pageViews } from "@/db/schema";
import { eq, and, or, ilike, lte } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category");
  const q = searchParams.get("q");
  const maxPrice = searchParams.get("maxPrice");
  const source = searchParams.get("source") ?? "web";

  const conditions = [eq(products.status, "published")];

  if (category) {
    conditions.push(eq(products.category, category));
  }
  if (q) {
    conditions.push(
      or(
        ilike(products.title, `%${q}%`),
        ilike(products.description, `%${q}%`)
      )!
    );
  }
  if (maxPrice) {
    conditions.push(lte(products.priceCents, parseInt(maxPrice, 10)));
  }

  const results = await db
    .select({
      product: products,
      creatorSlug: creators.slug,
    })
    .from(products)
    .innerJoin(creators, eq(products.creatorId, creators.id))
    .where(and(...conditions))
    .limit(50);

  if (q) {
    await db.insert(pageViews).values({ source });
  }

  return NextResponse.json(
    results.map(({ product, creatorSlug }) => ({
      ...product,
      creatorSlug,
    }))
  );
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const creator = await db
    .select()
    .from(creators)
    .where(eq(creators.userId, session.user.id))
    .then((rows) => rows[0]);

  if (!creator) {
    return NextResponse.json({ error: "Creator not found" }, { status: 404 });
  }

  const slug = body.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

  const [product] = await db
    .insert(products)
    .values({
      creatorId: creator.id,
      title: body.title,
      slug,
      description: body.description,
      priceCents: body.priceCents,
      category: body.category,
      status: body.status ?? "published",
      fileUrl: body.fileUrl ?? null,
      coverImageUrl: body.coverImageUrl ?? null,
    })
    .returning();

  return NextResponse.json(product, { status: 201 });
}
