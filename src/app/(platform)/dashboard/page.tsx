export const dynamic = "force-dynamic";

import { Suspense } from "react";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { creators, orders } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { redirect } from "next/navigation";
import Link from "next/link";
import { StripeCTA } from "@/components/stripe-cta";
import { StripeToast } from "@/components/stripe-toast";
import { DashboardAnalytics } from "@/components/dashboard/dashboard-analytics";

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
        .then(({ getStripe }) =>
          getStripe().accounts.retrieve(creator.stripeConnectId!)
        )
        .then((account) => !!account.charges_enabled)
        .catch(() => false)
    : Promise.resolve(false);

  const [stripeReady, recentOrders] = await Promise.all([
    stripeCheckPromise,
    db
      .select()
      .from(orders)
      .where(eq(orders.creatorId, creator.id))
      .orderBy(desc(orders.createdAt))
      .limit(5),
  ]);

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

      {/* Stripe CTA */}
      {!stripeReady && (
        <div className="mt-8 animate-fade-up stagger-4">
          <StripeCTA creatorId={creator.id} />
        </div>
      )}

      {/* Analytics */}
      <div className="mt-10">
        <Suspense fallback={null}>
          <DashboardAnalytics />
        </Suspense>
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
