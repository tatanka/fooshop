import { Suspense } from "react";
import { db } from "@/db";
import { creators, products, DEFAULT_THEME } from "@/db/schema";
import type { StoreTheme } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { BuyButton } from "@/components/buy-button";
import { r2PublicUrl } from "@/lib/r2-url";
import { ReferralTracker } from "@/components/referral-tracker";
import { FooshopBadge } from "@/components/fooshop-badge";

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

  const theme: StoreTheme = { ...DEFAULT_THEME, ...creator.storeTheme };

  const fontClass =
    theme.fontFamily === "serif"
      ? "font-serif"
      : theme.fontFamily === "mono"
        ? "font-mono"
        : "font-sans";

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
    <div
      className={`min-h-screen ${fontClass}`}
      style={{
        backgroundColor: theme.backgroundColor,
        color: theme.textColor,
      }}
    >
      <main className="max-w-2xl mx-auto px-4 py-12">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />

        <Suspense fallback={null}>
          <ReferralTracker />
        </Suspense>

        {/* Store header */}
        <a
          href={`/${slug}`}
          className="inline-block text-lg font-semibold mb-8 hover:opacity-80 transition-opacity"
          style={{ color: theme.primaryColor }}
        >
          &larr; {creator.storeName}
        </a>

        {r2PublicUrl(product.coverImageUrl) && (
          <img
            src={r2PublicUrl(product.coverImageUrl)!}
            alt={product.title}
            className="w-full max-h-[500px] object-cover rounded-lg mb-8"
          />
        )}

        <h1 className="text-4xl font-bold">{product.title}</h1>
        <p className="mt-4 text-lg opacity-70">{product.description}</p>

        <div className="mt-8">
          <BuyButton
            productId={product.id}
            hasStripe={!!creator.stripeConnectId}
            primaryColor={theme.primaryColor}
            priceCents={product.priceCents}
            currency={product.currency}
          />
        </div>

        <FooshopBadge slug={slug} />

        <footer className="mt-16 text-sm opacity-50">
          <p>
            Sold by{" "}
            <a href={`/${slug}`} className="underline">
              {creator.storeName}
            </a>{" "}
            on{" "}
            <a
              href={`/?ref=product-footer&store=${encodeURIComponent(slug)}`}
              className="underline hover:opacity-70"
              target="_blank"
              rel="noopener noreferrer"
            >
              Fooshop
            </a>
          </p>
          <p className="mt-2">
            <a href="/legal/terms" className="underline hover:opacity-70">Terms</a>
            {" · "}
            <a href="/legal/privacy" className="underline hover:opacity-70">Privacy</a>
          </p>
        </footer>
      </main>
    </div>
  );
}
