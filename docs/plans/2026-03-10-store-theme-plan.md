# Store Page AI Theme — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Apply the AI-generated store theme (colors, layout, typography, hero style) to the public store page so each store looks visually distinct.

**Architecture:** Expand the `StoreTheme` type to include a full color palette, font family, hero style, and layout variant. Apply theme via CSS custom properties on a wrapper div. Extract layout variants (grid, featured, list) and hero styles (gradient, solid, minimal) as separate components within the store page file.

**Tech Stack:** Next.js 15 (App Router), TypeScript, Tailwind CSS v4, Drizzle ORM, Anthropic SDK

---

### Task 1: Expand StoreTheme type in schema

**Files:**
- Modify: `src/db/schema.ts:117-120`

**Step 1: Update the StoreTheme type**

Replace the current `$type` on `storeTheme`:

```typescript
storeTheme: jsonb("store_theme").$type<{
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
  textColor: string;
  accentColor: string;
  fontFamily: "sans" | "serif" | "mono";
  heroStyle: "gradient" | "solid" | "minimal";
  layout: "grid" | "featured" | "list";
}>(),
```

**Step 2: Verify build**

Run: `pnpm build`
Expected: Build succeeds (no DB migration needed — JSONB is schemaless)

**Step 3: Commit**

```bash
git add src/db/schema.ts
git commit -m "feat(schema): expand StoreTheme type with full palette and layout options"
```

---

### Task 2: Update AI prompt to generate full theme

**Files:**
- Modify: `src/lib/ai.ts:12-26` (GeneratedStore interface)
- Modify: `src/lib/ai.ts:39-60` (prompt template)

**Step 1: Update GeneratedStore interface**

Replace the `theme` property in the `GeneratedStore` interface:

```typescript
interface GeneratedStore {
  storeName: string;
  storeDescription: string;
  suggestedProducts: {
    title: string;
    description: string;
    suggestedPriceCents: number;
    category: string;
    tags: string[];
  }[];
  theme: {
    primaryColor: string;
    secondaryColor: string;
    backgroundColor: string;
    textColor: string;
    accentColor: string;
    fontFamily: "sans" | "serif" | "mono";
    heroStyle: "gradient" | "solid" | "minimal";
    layout: "grid" | "featured" | "list";
  };
}
```

**Step 2: Update the Claude prompt**

Replace the `"theme"` section in the JSON template inside the prompt string:

```
"theme": {
    "primaryColor": "#hex — primary brand color for buttons and CTAs",
    "secondaryColor": "#hex — complementary color for badges and tags",
    "backgroundColor": "#hex — page background (light, not white)",
    "textColor": "#hex — main body text (dark, readable on backgroundColor)",
    "accentColor": "#hex — links, hover states, borders",
    "fontFamily": "one of: sans, serif, mono — pick what fits the brand",
    "heroStyle": "one of: gradient, solid, minimal — pick what fits the vibe",
    "layout": "one of: grid, featured, list — pick based on product type"
  }
```

Add this line after the "Generate 2-4 suggested products" instruction:
```
Choose theme colors that form a cohesive palette. The backgroundColor should be a subtle tint (not pure white). Pick fontFamily, heroStyle, and layout that match the creator's niche.
```

**Step 3: Update onboarding form interface**

Modify `src/app/(platform)/onboarding/onboarding-form.tsx` — find the `GeneratedStore` interface (lines ~10-20) and update the `theme` property to match the same expanded shape.

**Step 4: Verify build**

Run: `pnpm build`
Expected: Build succeeds

**Step 5: Commit**

```bash
git add src/lib/ai.ts src/app/(platform)/onboarding/onboarding-form.tsx
git commit -m "feat(ai): expand theme prompt to generate full color palette and layout"
```

---

### Task 3: Implement themed store page with CSS variables

**Files:**
- Modify: `src/app/[slug]/page.tsx` (full rewrite of the render section)

This is the main task. The page must:
1. Read `creator.storeTheme` and apply CSS variables on a wrapper div
2. Fall back to current hardcoded design if `storeTheme` is null
3. Render the correct hero style (gradient/solid/minimal)
4. Render the correct layout (grid/featured/list)

**Step 1: Define default theme and CSS variable wrapper**

At the top of the file (after imports), add:

```typescript
const DEFAULT_THEME = {
  primaryColor: "#2563eb",
  secondaryColor: "#7c3aed",
  backgroundColor: "#ffffff",
  textColor: "#1f2937",
  accentColor: "#3b82f6",
  fontFamily: "sans" as const,
  heroStyle: "minimal" as const,
  layout: "grid" as const,
};

type StoreTheme = typeof DEFAULT_THEME;
```

**Step 2: Rewrite the StorePage component**

Replace the entire `return (...)` block in `StorePage`. The new structure:

```tsx
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

  const theme: StoreTheme = { ...DEFAULT_THEME, ...creator.storeTheme };

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
      style={
        {
          "--store-primary": theme.primaryColor,
          "--store-secondary": theme.secondaryColor,
          "--store-bg": theme.backgroundColor,
          "--store-text": theme.textColor,
          "--store-accent": theme.accentColor,
        } as React.CSSProperties
      }
    >
      <main
        className="max-w-5xl mx-auto px-4 py-12"
        style={{ backgroundColor: theme.backgroundColor, color: theme.textColor }}
      >
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
```

**Step 3: Implement StoreHero component (same file)**

Add before `StorePage`:

```tsx
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
```

**Step 4: Implement ProductLayout component (same file)**

Add before `StorePage`:

```tsx
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
      <p className="mt-4 text-2xl font-bold" style={{ color: theme.primaryColor }}>
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
  layout: string;
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
            background: `linear-gradient(135deg, ${theme.primaryColor}10, ${theme.secondaryColor}10)`,
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
              <ProductCard key={product.id} product={product} slug={slug} theme={theme} />
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
        <ProductCard key={product.id} product={product} slug={slug} theme={theme} />
      ))}
    </div>
  );
}
```

**Step 5: Verify build**

Run: `pnpm build`
Expected: Build succeeds with no type errors

**Step 6: Commit**

```bash
git add src/app/[slug]/page.tsx
git commit -m "feat(store): apply AI theme with CSS variables, 3 layouts, and hero styles"
```

---

### Task 4: Update seed script with full theme data

**Files:**
- Modify: `src/scripts/seed.ts`

**Step 1: Check if seed script has hardcoded theme data**

Search for `storeTheme` or `store_theme` in `src/scripts/seed.ts`. If the seed inserts creators with theme data, update it to use the full schema. If not, add a sample theme to seeded creators.

Add to each seeded creator's `storeTheme` field:

```typescript
storeTheme: {
  primaryColor: "#6366f1",
  secondaryColor: "#ec4899",
  backgroundColor: "#faf5ff",
  textColor: "#1e1b2d",
  accentColor: "#8b5cf6",
  fontFamily: "sans",
  heroStyle: "gradient",
  layout: "grid",
},
```

Use different theme values per seeded creator so all layouts/hero styles are represented during development.

**Step 2: Verify build**

Run: `pnpm build`
Expected: Build succeeds

**Step 3: Commit**

```bash
git add src/scripts/seed.ts
git commit -m "feat(seed): add full theme data to seeded creators"
```

---

### Task 5: Final verification

**Step 1: Full build**

Run: `pnpm build`
Expected: Clean build, no warnings, no type errors

**Step 2: Visual check (if dev server available)**

Run: `pnpm dev`
Navigate to a seeded store page (e.g., `localhost:3000/<seeded-slug>`) and verify:
- Hero renders correctly for the configured heroStyle
- Layout matches the configured layout
- Colors from the theme are applied (background, text, buttons, accents)
- Font family is applied
- Fallback works: a creator with null storeTheme shows the default design

**Step 3: Final commit (if any tweaks needed)**

Only if visual check reveals issues that need fixing.
