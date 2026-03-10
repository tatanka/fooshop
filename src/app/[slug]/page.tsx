import { db } from "@/db";
import { creators, products } from "@/db/schema";
import type { StoreTheme } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { r2PublicUrl } from "@/lib/r2-url";

const DEFAULT_THEME: StoreTheme = {
  primaryColor: "#2563eb",
  secondaryColor: "#7c3aed",
  backgroundColor: "#ffffff",
  textColor: "#1f2937",
  accentColor: "#3b82f6",
  fontFamily: "sans",
  heroStyle: "minimal",
  layout: "grid",
};

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ themePreview?: string }>;
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

function StoreHero({
  storeName,
  storeDescription,
  theme,
}: {
  storeName: string;
  storeDescription: string;
  theme: StoreTheme;
}) {
  if (theme.heroStyle === "gradient") {
    return (
      <header
        className="mb-12 rounded-2xl px-8 py-12 text-white"
        style={{
          background: `linear-gradient(135deg, ${theme.primaryColor}, ${theme.secondaryColor})`,
        }}
      >
        <h1 className="text-4xl font-bold">{storeName}</h1>
        <p className="mt-4 text-lg opacity-90">{storeDescription}</p>
      </header>
    );
  }

  if (theme.heroStyle === "solid") {
    return (
      <header
        className="mb-12 rounded-2xl px-8 py-12 text-white"
        style={{ backgroundColor: theme.primaryColor }}
      >
        <h1 className="text-4xl font-bold">{storeName}</h1>
        <p className="mt-4 text-lg opacity-90">{storeDescription}</p>
      </header>
    );
  }

  // minimal
  return (
    <header className="mb-12">
      <h1 className="text-4xl font-bold" style={{ color: theme.primaryColor }}>
        {storeName}
      </h1>
      <p className="mt-4 text-lg opacity-70">{storeDescription}</p>
    </header>
  );
}

function ProductCard({
  product,
  slug,
  theme,
}: {
  product: typeof products.$inferSelect;
  slug: string;
  theme: StoreTheme;
}) {
  return (
    <a
      href={`/${slug}/${product.slug}`}
      className="block rounded-lg p-6 transition-shadow hover:shadow-lg"
      style={{ borderColor: theme.accentColor, borderWidth: "1px" }}
    >
      {r2PublicUrl(product.coverImageUrl) && (
        <img
          src={r2PublicUrl(product.coverImageUrl)!}
          alt={product.title}
          className="w-full rounded mb-4"
        />
      )}
      <h2 className="text-xl font-semibold">{product.title}</h2>
      <p className="mt-2 line-clamp-2 opacity-60">{product.description}</p>
      <p
        className="mt-4 text-2xl font-bold"
        style={{ color: theme.primaryColor }}
      >
        ${(product.priceCents / 100).toFixed(2)}
      </p>
    </a>
  );
}

function ProductLayout({
  products: productList,
  slug,
  theme,
  layout,
}: {
  products: (typeof products.$inferSelect)[];
  slug: string;
  theme: StoreTheme;
  layout: StoreTheme["layout"];
}) {
  if (layout === "featured" && productList.length > 0) {
    const [featured, ...rest] = productList;
    return (
      <div>
        {/* Featured product — full width */}
        <a
          href={`/${slug}/${featured.slug}`}
          className="block rounded-2xl p-8 mb-8 transition-shadow hover:shadow-xl"
          style={{
            borderColor: theme.accentColor,
            borderWidth: "1px",
            background: `linear-gradient(135deg, color-mix(in srgb, ${theme.primaryColor} 10%, transparent), color-mix(in srgb, ${theme.secondaryColor} 10%, transparent))`,
          }}
        >
          <div className="flex flex-col md:flex-row gap-6">
            {r2PublicUrl(featured.coverImageUrl) && (
              <img
                src={r2PublicUrl(featured.coverImageUrl)!}
                alt={featured.title}
                className="w-full md:w-1/2 rounded-lg"
              />
            )}
            <div className="flex flex-col justify-center">
              <span
                className="text-xs font-semibold uppercase tracking-wider mb-2"
                style={{ color: theme.secondaryColor }}
              >
                Featured
              </span>
              <h2 className="text-2xl font-bold">{featured.title}</h2>
              <p className="mt-2 opacity-70">{featured.description}</p>
              <p
                className="mt-4 text-3xl font-bold"
                style={{ color: theme.primaryColor }}
              >
                ${(featured.priceCents / 100).toFixed(2)}
              </p>
            </div>
          </div>
        </a>
        {/* Remaining products in grid */}
        {rest.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {rest.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                slug={slug}
                theme={theme}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  if (layout === "list") {
    return (
      <div className="flex flex-col gap-4">
        {productList.map((product) => (
          <a
            key={product.id}
            href={`/${slug}/${product.slug}`}
            className="flex gap-6 rounded-lg p-6 transition-shadow hover:shadow-lg"
            style={{ borderColor: theme.accentColor, borderWidth: "1px" }}
          >
            {r2PublicUrl(product.coverImageUrl) && (
              <img
                src={r2PublicUrl(product.coverImageUrl)!}
                alt={product.title}
                className="w-32 h-32 object-cover rounded-lg shrink-0"
              />
            )}
            <div className="flex flex-col justify-center">
              <h2 className="text-xl font-semibold">{product.title}</h2>
              <p className="mt-2 opacity-60">{product.description}</p>
              <p
                className="mt-3 text-2xl font-bold"
                style={{ color: theme.primaryColor }}
              >
                ${(product.priceCents / 100).toFixed(2)}
              </p>
            </div>
          </a>
        ))}
      </div>
    );
  }

  // Default: grid
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {productList.map((product) => (
        <ProductCard
          key={product.id}
          product={product}
          slug={slug}
          theme={theme}
        />
      ))}
    </div>
  );
}

export default async function StorePage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { themePreview } = await searchParams;
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

  let theme: StoreTheme = { ...DEFAULT_THEME, ...creator.storeTheme };

  if (themePreview) {
    try {
      const previewTheme = JSON.parse(
        Buffer.from(themePreview, "base64").toString("utf-8")
      );
      theme = { ...DEFAULT_THEME, ...previewTheme };
    } catch {
      // Invalid preview param — ignore, use DB theme
    }
  }

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: creator.storeName,
    description: creator.storeDescription,
    url: `${process.env.NEXT_PUBLIC_APP_URL}/${slug}`,
  };

  const fontClass =
    theme.fontFamily === "serif"
      ? "font-serif"
      : theme.fontFamily === "mono"
        ? "font-mono"
        : "font-sans";

  return (
    <div
      className={`min-h-screen ${fontClass}`}
      style={{
        backgroundColor: theme.backgroundColor,
        color: theme.textColor,
      }}
    >
      <main className="max-w-5xl mx-auto px-4 py-12">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />

        <StoreHero
          storeName={creator.storeName ?? ""}
          storeDescription={creator.storeDescription ?? ""}
          theme={theme}
        />

        <ProductLayout
          products={storeProducts}
          slug={slug}
          theme={theme}
          layout={theme.layout}
        />

        {storeProducts.length === 0 && (
          <p className="text-center opacity-50">No products yet.</p>
        )}

        <footer className="mt-16 text-center text-sm opacity-40">
          Powered by Fooshop
        </footer>
      </main>
    </div>
  );
}
