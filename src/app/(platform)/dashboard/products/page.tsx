export const dynamic = "force-dynamic";

import { auth } from "@/lib/auth";
import { db } from "@/db";
import { creators, products } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { redirect } from "next/navigation";
import { r2PublicUrl } from "@/lib/r2-url";

export default async function ProductsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/api/auth/signin");

  const creator = await db
    .select()
    .from(creators)
    .where(eq(creators.userId, session.user.id))
    .then((rows) => rows[0]);

  if (!creator) redirect("/onboarding");

  const creatorProducts = await db
    .select()
    .from(products)
    .where(eq(products.creatorId, creator.id))
    .orderBy(desc(products.createdAt));

  return (
    <main className="max-w-5xl mx-auto px-4 py-16">
      <div className="flex justify-between items-center animate-fade-up">
        <h1 className="text-3xl font-bold">Products</h1>
        <a
          href="/dashboard/products/new"
          className="bg-accent text-white px-6 py-2.5 rounded-full font-semibold text-sm hover:opacity-85 transition-opacity"
        >
          + New Product
        </a>
      </div>

      {creatorProducts.length === 0 ? (
        <p className="mt-16 text-center text-muted">
          No products yet. Create your first one!
        </p>
      ) : (
        <div className="mt-8 border border-border rounded-xl divide-y divide-border overflow-hidden">
          {creatorProducts.map((product, i) => (
            <a
              key={product.id}
              href={`/dashboard/products/${product.id}/edit`}
              className={`flex items-center gap-4 px-5 py-4 hover:bg-paper/50 transition-colors animate-fade-up stagger-${Math.min(i + 1, 6)}`}
            >
              {r2PublicUrl(product.coverImageUrl) ? (
                <img
                  src={r2PublicUrl(product.coverImageUrl)!}
                  alt=""
                  className="w-10 h-10 rounded-md object-cover shrink-0"
                />
              ) : (
                <div className="w-10 h-10 rounded-md bg-border shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{product.title}</p>
                <p className="text-sm text-muted">
                  ${(product.priceCents / 100).toFixed(2)}
                </p>
              </div>
              <span
                className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                  product.status === "published"
                    ? "bg-ink text-white"
                    : "bg-border text-muted"
                }`}
              >
                {product.status}
              </span>
            </a>
          ))}
        </div>
      )}

      <a
        href="/dashboard"
        className="mt-8 inline-block text-sm text-muted hover:text-ink transition-colors"
      >
        &larr; Back to dashboard
      </a>
    </main>
  );
}
