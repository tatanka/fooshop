export const dynamic = "force-dynamic";

import { auth } from "@/lib/auth";
import { db } from "@/db";
import { creators, products } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { redirect } from "next/navigation";

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
    <main className="max-w-4xl mx-auto px-4 py-12">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Products</h1>
        <a
          href="/dashboard/products/new"
          className="bg-black text-white px-6 py-3 rounded-lg font-semibold hover:bg-gray-800 transition-colors"
        >
          New Product
        </a>
      </div>

      {creatorProducts.length === 0 ? (
        <p className="mt-12 text-center text-gray-400">
          No products yet. Create your first one!
        </p>
      ) : (
        <div className="mt-8 border rounded-lg divide-y">
          {creatorProducts.map((product) => (
            <div key={product.id} className="p-4 flex justify-between items-center">
              <div>
                <p className="font-medium">{product.title}</p>
                <p className="text-sm text-gray-500">
                  ${(product.priceCents / 100).toFixed(2)} &middot;{" "}
                  <span
                    className={
                      product.status === "published"
                        ? "text-green-600"
                        : "text-yellow-600"
                    }
                  >
                    {product.status}
                  </span>
                </p>
              </div>
              <div className="flex gap-2">
                <a
                  href={`/dashboard/products/${product.id}/edit`}
                  className="text-sm border px-3 py-1.5 rounded hover:bg-gray-50"
                >
                  Edit
                </a>
              </div>
            </div>
          ))}
        </div>
      )}

      <a href="/dashboard" className="mt-8 inline-block text-sm underline text-gray-500">
        Back to dashboard
      </a>
    </main>
  );
}
