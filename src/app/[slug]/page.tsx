import { db } from "@/db";
import { creators, products } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { r2PublicUrl } from "@/lib/r2-url";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const creator = await db
    .select()
    .from(creators)
    .where(eq(creators.slug, slug))
    .then((rows) => rows[0]);

  if (!creator) return {};

  return {
    title: `${creator.storeName} | Fooshop`,
    description: creator.storeDescription,
  };
}

export default async function StorePage({ params }: Props) {
  const { slug } = await params;
  const creator = await db
    .select()
    .from(creators)
    .where(eq(creators.slug, slug))
    .then((rows) => rows[0]);

  if (!creator) notFound();

  const storeProducts = await db
    .select()
    .from(products)
    .where(
      and(eq(products.creatorId, creator.id), eq(products.status, "published"))
    );

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: creator.storeName,
    description: creator.storeDescription,
    url: `${process.env.NEXT_PUBLIC_APP_URL}/${slug}`,
  };

  return (
    <main className="max-w-4xl mx-auto px-4 py-12">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <header className="mb-12">
        <h1 className="text-4xl font-bold">{creator.storeName}</h1>
        <p className="mt-4 text-lg text-gray-600">
          {creator.storeDescription}
        </p>
      </header>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {storeProducts.map((product) => (
          <a
            key={product.id}
            href={`/${slug}/${product.slug}`}
            className="block border rounded-lg p-6 hover:shadow-lg transition-shadow"
          >
            {r2PublicUrl(product.coverImageUrl) && (
              <img
                src={r2PublicUrl(product.coverImageUrl)!}
                alt={product.title}
                className="w-full rounded mb-4"
              />
            )}
            <h2 className="text-xl font-semibold">{product.title}</h2>
            <p className="text-gray-500 mt-2 line-clamp-2">
              {product.description}
            </p>
            <p className="mt-4 text-2xl font-bold">
              ${(product.priceCents / 100).toFixed(2)}
            </p>
          </a>
        ))}
      </div>
      {storeProducts.length === 0 && (
        <p className="text-center text-gray-400">No products yet.</p>
      )}
      <footer className="mt-16 text-center text-sm text-gray-400">
        Powered by Fooshop
      </footer>
    </main>
  );
}
