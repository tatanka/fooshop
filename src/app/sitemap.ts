export const dynamic = "force-dynamic";

import { db } from "@/db";
import { products, creators } from "@/db/schema";
import { eq } from "drizzle-orm";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://fooshop.ai";

export default async function sitemap() {
  const allProducts = await db
    .select({
      productSlug: products.slug,
      creatorSlug: creators.slug,
      updatedAt: products.createdAt,
    })
    .from(products)
    .innerJoin(creators, eq(products.creatorId, creators.id))
    .where(eq(products.status, "published"));

  const allCreators = await db.select().from(creators);

  return [
    { url: BASE_URL, lastModified: new Date() },
    { url: `${BASE_URL}/explore`, lastModified: new Date() },
    ...allCreators.map((c) => ({
      url: `${BASE_URL}/${c.slug}`,
      lastModified: c.createdAt,
    })),
    ...allProducts.map((p) => ({
      url: `${BASE_URL}/${p.creatorSlug}/${p.productSlug}`,
      lastModified: p.updatedAt,
    })),
  ];
}
