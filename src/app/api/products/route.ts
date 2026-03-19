import { NextRequest, NextResponse } from "next/server";
import { authenticateCreator } from "@/lib/api-key";
import { db } from "@/db";
import { products, creators, pageViews } from "@/db/schema";
import { eq, and, or, ilike, lte, desc } from "drizzle-orm";
import { rateLimit } from "@/lib/rate-limit";
import { parseBody, validationError } from "@/lib/validations/helpers";
import { productCreateSchema } from "@/lib/validations/products";

export async function GET(req: NextRequest) {
  const rateLimitResult = await rateLimit(req, {
    endpoint: "products",
    limit: 60,
    windowMs: 60_000,
    keyStrategy: "ip",
  });
  if (rateLimitResult) return rateLimitResult;

  // If ?mine=true, return authenticated creator's products
  if (req.nextUrl.searchParams.get("mine") === "true") {
    const result = await authenticateCreator(req, "products:read");
    if (result instanceof NextResponse) return result;
    const { creator } = result;

    const myProducts = await db
      .select({ product: products, creatorSlug: creators.slug })
      .from(products)
      .innerJoin(creators, eq(products.creatorId, creators.id))
      .where(eq(products.creatorId, creator.id))
      .orderBy(desc(products.createdAt));

    return NextResponse.json(myProducts);
  }

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
  const result = await authenticateCreator(req, "products:write");
  if (result instanceof NextResponse) return result;
  const { creator } = result;

  const { data: body, error: parseError } = await parseBody(req);
  if (parseError) return parseError;
  const schemaResult = productCreateSchema.safeParse(body);
  if (!schemaResult.success) return validationError(schemaResult.error);

  const { title, description, priceCents, category, status, fileUrl, coverImageUrl } = schemaResult.data;

  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

  const [product] = await db
    .insert(products)
    .values({
      creatorId: creator.id,
      title,
      slug,
      description: description ?? "",
      priceCents,
      category: category ?? null,
      status: status ?? "published",
      fileUrl: fileUrl ?? null,
      coverImageUrl: coverImageUrl ?? null,
    })
    .returning();

  return NextResponse.json(product, { status: 201 });
}
