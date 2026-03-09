import { db } from "@/db";
import { creators, products } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { BuyButton } from "@/components/buy-button";
import { r2PublicUrl } from "@/lib/r2-url";

interface Props {
  params: Promise<{ slug: string; productSlug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { productSlug } = await params;
  const product = await db
    .select()
    .from(products)
    .where(eq(products.slug, productSlug))
    .then((rows) => rows[0]);

  if (!product) return {};

  return {
    title: `${product.title} | Fooshop`,
    description: product.description,
    openGraph: {
      title: product.title,
      description: product.description,
      images: r2PublicUrl(product.coverImageUrl) ? [r2PublicUrl(product.coverImageUrl)!] : [],
    },
  };
}

export default async function ProductPage({ params }: Props) {
  const { slug, productSlug } = await params;

  const creator = await db
    .select()
    .from(creators)
    .where(eq(creators.slug, slug))
    .then((rows) => rows[0]);

  if (!creator) notFound();

  const product = await db
    .select()
    .from(products)
    .where(
      and(
        eq(products.slug, productSlug),
        eq(products.creatorId, creator.id),
        eq(products.status, "published")
      )
    )
    .then((rows) => rows[0]);

  if (!product) notFound();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.title,
    description: product.description,
    image: r2PublicUrl(product.coverImageUrl) ?? undefined,
    offers: {
      "@type": "Offer",
      price: (product.priceCents / 100).toFixed(2),
      priceCurrency: product.currency.toUpperCase(),
      availability: "https://schema.org/InStock",
      seller: {
        "@type": "Organization",
        name: creator.storeName,
      },
    },
  };

  return (
    <main className="max-w-2xl mx-auto px-4 py-12">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {r2PublicUrl(product.coverImageUrl) && (
        <img
          src={r2PublicUrl(product.coverImageUrl)!}
          alt={product.title}
          className="w-full rounded-lg mb-8"
        />
      )}
      <h1 className="text-4xl font-bold">{product.title}</h1>
      <p className="mt-4 text-lg text-gray-600">{product.description}</p>
      <div className="mt-8 flex items-center gap-4">
        <span className="text-3xl font-bold">
          ${(product.priceCents / 100).toFixed(2)}
        </span>
        <BuyButton
          productId={product.id}
          hasStripe={!!creator.stripeConnectId}
        />
      </div>
      <footer className="mt-16 text-sm text-gray-400">
        Sold by{" "}
        <a href={`/${slug}`} className="underline">
          {creator.storeName}
        </a>{" "}
        on Fooshop
      </footer>
    </main>
  );
}
