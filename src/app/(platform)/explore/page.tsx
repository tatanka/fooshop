export const dynamic = "force-dynamic";

import { db } from "@/db";
import { products, creators } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import type { Metadata } from "next";
import { CATEGORIES, categoryLabel } from "@/lib/categories";
import { r2PublicUrl } from "@/lib/r2-url";

export const metadata: Metadata = {
  title: "Explore Digital Products | Fooshop",
  description:
    "Discover digital products from creators worldwide. Templates, presets, LUTs, prompts, and more.",
};

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
    <main className="max-w-6xl mx-auto px-4 py-16">
      {/* Header */}
      <div className="animate-fade-up">
        <h1 className="text-4xl md:text-5xl font-bold">Explore</h1>
        <p className="mt-3 text-lg text-muted">
          Curated digital products from independent creators.
        </p>
      </div>

      {/* Category filters */}
      <nav className="mt-10 flex gap-2 flex-wrap animate-fade-up stagger-2">
        <a
          href="/explore"
          className="px-4 py-1.5 rounded-full text-sm font-medium bg-ink text-white"
        >
          All
        </a>
        {EXPLORE_CATEGORIES.map((cat) => (
          <a
            key={cat}
            href={`/explore?category=${cat}`}
            className="px-4 py-1.5 rounded-full text-sm font-medium border border-border text-muted hover:text-ink hover:border-ink transition-colors"
          >
            {categoryLabel(cat)}
          </a>
        ))}
      </nav>

      {/* Product grid — magazine layout */}
      <div className="mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {results.map(({ product, creatorSlug, creatorName }, i) => {
          const isFeatured = i === 0;
          return (
            <a
              key={product.id}
              href={`/${creatorSlug}/${product.slug}`}
              className={`group block border border-border rounded-xl overflow-hidden hover:-translate-y-1 hover:shadow-lg transition-all duration-200 animate-fade-up stagger-${Math.min(i + 1, 6)} ${
                isFeatured ? "md:row-span-2" : ""
              }`}
            >
              {r2PublicUrl(product.coverImageUrl) && (
                <img
                  src={r2PublicUrl(product.coverImageUrl)!}
                  alt={product.title}
                  className={`w-full object-cover ${
                    isFeatured ? "aspect-[3/4]" : "aspect-[4/3]"
                  }`}
                />
              )}
              <div className="p-5">
                <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold group-hover:text-accent transition-colors">
                  {product.title}
                </h2>
                <p className="text-sm text-muted mt-1">by {creatorName}</p>
                <p className="mt-3 text-base font-semibold">
                  ${(product.priceCents / 100).toFixed(2)}
                </p>
              </div>
            </a>
          );
        })}
      </div>

      {results.length === 0 && (
        <p className="mt-16 text-center text-muted">
          No products yet. Be the first to sell!
        </p>
      )}
    </main>
  );
}
