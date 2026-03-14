import { NextRequest, NextResponse } from "next/server";
import { validateApiKey, hasScope, insufficientScope } from "@/lib/api-key";
import { db } from "@/db";
import { products, creators } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

const SCOPE = "admin:read:products";

export async function GET(req: NextRequest) {
  const auth = await validateApiKey(req);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!hasScope(auth, SCOPE)) return insufficientScope(SCOPE);

  const limit = Math.min(
    parseInt(req.nextUrl.searchParams.get("limit") ?? "100", 10),
    500
  );

  const rows = await db
    .select({
      id: products.id,
      creatorId: products.creatorId,
      creatorName: creators.name,
      title: products.title,
      slug: products.slug,
      description: products.description,
      priceCents: products.priceCents,
      currency: products.currency,
      category: products.category,
      status: products.status,
      createdAt: products.createdAt,
    })
    .from(products)
    .innerJoin(creators, eq(products.creatorId, creators.id))
    .orderBy(desc(products.createdAt))
    .limit(limit);

  return NextResponse.json(rows);
}
