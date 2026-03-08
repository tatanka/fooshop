export const dynamic = "force-dynamic";

import { auth } from "@/lib/auth";
import { db } from "@/db";
import { creators, products, orders } from "@/db/schema";
import { eq, sql, desc } from "drizzle-orm";
import { redirect } from "next/navigation";
import { StripeCTA } from "@/components/stripe-cta";
import { StripeToast } from "@/components/stripe-toast";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/api/auth/signin");

  const creator = await db
    .select()
    .from(creators)
    .where(eq(creators.userId, session.user.id))
    .then((rows) => rows[0]);

  if (!creator) redirect("/onboarding");

  const [[stats], [orderStats], recentOrders] = await Promise.all([
    db
      .select({
        totalProducts: sql<number>`count(distinct ${products.id})`,
      })
      .from(products)
      .where(eq(products.creatorId, creator.id)),
    db
      .select({
        totalOrders: sql<number>`count(*)`,
        totalRevenue: sql<number>`coalesce(sum(${orders.amountCents} - ${orders.platformFeeCents}), 0)`,
      })
      .from(orders)
      .where(eq(orders.creatorId, creator.id)),
    db
      .select()
      .from(orders)
      .where(eq(orders.creatorId, creator.id))
      .orderBy(desc(orders.createdAt))
      .limit(5),
  ]);

  return (
    <main className="max-w-4xl mx-auto px-4 py-12">
      <StripeToast />
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-gray-600 mt-1">{creator.storeName}</p>
        </div>
        <div className="flex gap-4">
          <a
            href="/dashboard/store"
            className="text-sm underline text-gray-500"
          >
            Edit store
          </a>
          <a
            href={`/${creator.slug}`}
            className="text-sm underline text-gray-500"
          >
            View store
          </a>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="border rounded-lg p-6">
          <p className="text-sm text-gray-500">Products</p>
          <p className="text-3xl font-bold mt-1">
            {Number(stats.totalProducts)}
          </p>
        </div>
        <div className="border rounded-lg p-6">
          <p className="text-sm text-gray-500">Total Sales</p>
          <p className="text-3xl font-bold mt-1">
            {Number(orderStats.totalOrders)}
          </p>
        </div>
        <div className="border rounded-lg p-6">
          <p className="text-sm text-gray-500">Revenue</p>
          <p className="text-3xl font-bold mt-1">
            ${(Number(orderStats.totalRevenue) / 100).toFixed(2)}
          </p>
        </div>
      </div>

      <div className="mt-8 flex gap-4">
        <a
          href="/dashboard/products"
          className="bg-black text-white px-6 py-3 rounded-lg font-semibold hover:bg-gray-800 transition-colors"
        >
          Manage Products
        </a>
        {creator.stripeConnectId && (
          <span className="text-sm text-green-600 font-medium flex items-center gap-1">
            Stripe connected
          </span>
        )}
      </div>

      {!creator.stripeConnectId && (
        <div className="mt-6">
          <StripeCTA creatorId={creator.id} />
        </div>
      )}

      {recentOrders.length > 0 && (
        <div className="mt-12">
          <h2 className="text-xl font-semibold">Recent Orders</h2>
          <div className="mt-4 border rounded-lg divide-y">
            {recentOrders.map((order) => (
              <div key={order.id} className="p-4 flex justify-between">
                <div>
                  <p className="font-medium">{order.buyerEmail}</p>
                  <p className="text-sm text-gray-500">
                    {new Date(order.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <p className="font-bold">
                  ${(order.amountCents / 100).toFixed(2)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </main>
  );
}
