export const dynamic = "force-dynamic";

import { db } from "@/db";
import { products, creators } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Explore Digital Products | Fooshop",
  description:
    "Discover digital products from creators worldwide. Templates, presets, LUTs, prompts, and more.",
};

import { CATEGORIES, categoryLabel } from "@/lib/categories";

// Exclude "other" from explore page navigation
const EXPLORE_CATEGORIES = CATEGORIES.filter((c) => c !== "other");

export default async function ExplorePage() {
  const results = await db
    .select({
      product: products,
      creatorSlug: creators.slug,
      creatorName: creators.storeName,
    })
    .from(products)
    .innerJoin(creators, eq(products.creatorId, creators.id))
    .where(eq(products.status, "published"))
    .orderBy(desc(products.createdAt))
    .limit(50);

  return (
    <main className="max-w-6xl mx-auto px-4 py-12">
      <h1 className="text-4xl font-bold">Explore</h1>
      <p className="mt-2 text-gray-600">
        Digital products from creators worldwide
      </p>

      <nav className="mt-8 flex gap-2 flex-wrap">
        <a
          href="/explore"
          className="px-4 py-2 rounded-full border hover:bg-gray-100"
        >
          All
        </a>
        {EXPLORE_CATEGORIES.map((cat) => (
          <a
            key={cat}
            href={`/explore?category=${cat}`}
            className="px-4 py-2 rounded-full border hover:bg-gray-100"
          >
            {categoryLabel(cat)}
          </a>
        ))}
      </nav>

      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {results.map(({ product, creatorSlug, creatorName }) => (
          <a
            key={product.id}
            href={`/${creatorSlug}/${product.slug}`}
            className="block border rounded-lg p-6 hover:shadow-lg transition-shadow"
          >
            {product.coverImageUrl && (
              <img
                src={product.coverImageUrl}
                alt={product.title}
                className="w-full rounded mb-4"
              />
            )}
            <h2 className="text-lg font-semibold">{product.title}</h2>
            <p className="text-sm text-gray-500 mt-1">by {creatorName}</p>
            <p className="text-gray-500 mt-2 line-clamp-2 text-sm">
              {product.description}
            </p>
            <p className="mt-3 text-xl font-bold">
              ${(product.priceCents / 100).toFixed(2)}
            </p>
          </a>
        ))}
      </div>

      {results.length === 0 && (
        <p className="mt-12 text-center text-gray-400">
          No products yet. Be the first to sell!
        </p>
      )}
    </main>
  );
}
