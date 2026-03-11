export const dynamic = "force-dynamic";

import { auth } from "@/lib/auth";
import { db } from "@/db";
import { creators, products, orders } from "@/db/schema";
import { eq, sql, desc } from "drizzle-orm";
import { redirect } from "next/navigation";
import Link from "next/link";
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

  const stripeCheckPromise = creator.stripeConnectId
    ? import("@/lib/stripe")
        .then(({ getStripe }) => getStripe().accounts.retrieve(creator.stripeConnectId!))
        .then((account) => !!account.charges_enabled)
        .catch(() => false)
    : Promise.resolve(false);

  const [stripeReady, [stats], [orderStats], recentOrders] = await Promise.all([
    stripeCheckPromise,
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

  const statCards = [
    { label: "Products", value: Number(stats.totalProducts) },
    { label: "Orders", value: Number(orderStats.totalOrders) },
    {
      label: "Revenue",
      value: `$${(Number(orderStats.totalRevenue) / 100).toFixed(2)}`,
    },
  ];

  return (
    <main className="max-w-5xl mx-auto px-4 py-16">
      <StripeToast />

      {/* Header */}
      <div className="flex justify-between items-start animate-fade-up">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold">Dashboard</h1>
          <p className="text-muted mt-1">{creator.storeName}</p>
        </div>
        <div className="flex gap-4 text-sm">
          <Link
            href="/dashboard/store"
            className="text-muted hover:text-ink transition-colors"
          >
            Edit store
          </Link>
          <Link
            href={`/${creator.slug}`}
            className="text-accent font-medium hover:opacity-80 transition-opacity"
          >
            View store &rarr;
          </Link>
        </div>
      </div>

      {/* Stat cards */}
      <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-6">
        {statCards.map((stat, i) => (
          <div
            key={stat.label}
            className={`bg-surface border border-border rounded-xl p-6 animate-fade-up stagger-${i + 1}`}
          >
            <p className="text-sm text-muted">{stat.label}</p>
            <p className="text-3xl font-bold mt-1">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Stripe CTA */}
      {!stripeReady && (
        <div className="mt-8 animate-fade-up stagger-4">
          <StripeCTA creatorId={creator.id} />
        </div>
      )}

      {/* Quick actions */}
      <div className="mt-8 flex flex-wrap gap-3 animate-fade-up stagger-4">
        <Link
          href="/dashboard/products"
          className="bg-accent text-white px-6 py-3 rounded-full font-semibold hover:opacity-85 transition-opacity"
        >
          Manage Products
        </Link>
        <Link
          href="/dashboard/orders"
          className="border border-border px-6 py-3 rounded-full font-semibold hover:border-ink transition-colors"
        >
          View Orders
        </Link>
        {stripeReady && (
          <span className="text-sm text-green-700 font-medium flex items-center gap-1 px-3">
            Stripe connected
          </span>
        )}
      </div>

      {/* Recent orders */}
      {recentOrders.length > 0 && (
        <div className="mt-14 animate-fade-up stagger-5">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold">Recent Orders</h2>
            <Link
              href="/dashboard/orders"
              className="text-sm text-muted hover:text-ink transition-colors"
            >
              View all &rarr;
            </Link>
          </div>
          <div className="mt-4 border border-border rounded-xl divide-y divide-border overflow-hidden">
            {recentOrders.map((order) => (
              <div
                key={order.id}
                className="px-5 py-4 flex justify-between items-center hover:bg-paper/50 transition-colors"
              >
                <div>
                  <p className="font-medium text-sm">{order.buyerEmail}</p>
                  <p className="text-xs text-muted mt-0.5">
                    {new Date(order.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <p className="font-semibold">
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
