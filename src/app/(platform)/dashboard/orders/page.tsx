export const dynamic = "force-dynamic";

import { auth } from "@/lib/auth";
import { db } from "@/db";
import { creators, orders, products } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function OrdersPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/api/auth/signin");

  const creator = await db
    .select()
    .from(creators)
    .where(eq(creators.userId, session.user.id))
    .then((rows) => rows[0]);

  if (!creator) redirect("/onboarding");

  const orderRows = await db
    .select({
      id: orders.id,
      buyerEmail: orders.buyerEmail,
      buyerName: orders.buyerName,
      productTitle: products.title,
      amountCents: orders.amountCents,
      platformFeeCents: orders.platformFeeCents,
      status: orders.status,
      createdAt: orders.createdAt,
    })
    .from(orders)
    .innerJoin(products, eq(orders.productId, products.id))
    .where(eq(orders.creatorId, creator.id))
    .orderBy(desc(orders.createdAt));

  return (
    <main className="max-w-5xl mx-auto px-4 py-16">
      <div className="flex justify-between items-center animate-fade-up">
        <div>
          <h1 className="text-3xl font-bold">Orders</h1>
          <p className="text-muted mt-1">
            {orderRows.length} {orderRows.length === 1 ? "order" : "orders"}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <a
            href="/api/orders/export?format=csv"
            className="border border-border px-4 py-2 rounded-full text-sm font-semibold hover:border-ink transition-colors"
          >
            Export CSV
          </a>
          <Link
            href="/dashboard"
            className="text-sm text-muted hover:text-ink transition-colors"
          >
            &larr; Dashboard
          </Link>
        </div>
      </div>

      {orderRows.length === 0 ? (
        <p className="text-muted mt-12 text-center">No orders yet.</p>
      ) : (
        <div className="mt-8 overflow-x-auto animate-fade-up stagger-2">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-border">
                <th className="py-3 pr-4 text-xs uppercase tracking-wider text-muted font-medium">Buyer</th>
                <th className="py-3 pr-4 text-xs uppercase tracking-wider text-muted font-medium">Product</th>
                <th className="py-3 pr-4 text-xs uppercase tracking-wider text-muted font-medium">Amount</th>
                <th className="py-3 pr-4 text-xs uppercase tracking-wider text-muted font-medium">Net</th>
                <th className="py-3 pr-4 text-xs uppercase tracking-wider text-muted font-medium">Status</th>
                <th className="py-3 text-xs uppercase tracking-wider text-muted font-medium">Date</th>
              </tr>
            </thead>
            <tbody>
              {orderRows.map((order) => (
                <tr
                  key={order.id}
                  className="border-b border-border hover:bg-paper/50 transition-colors"
                >
                  <td className="py-3 pr-4">
                    <p className="font-medium text-sm">{order.buyerEmail}</p>
                    {order.buyerName && (
                      <p className="text-xs text-muted">{order.buyerName}</p>
                    )}
                  </td>
                  <td className="py-3 pr-4 text-sm">{order.productTitle}</td>
                  <td className="py-3 pr-4 text-sm font-medium">
                    ${(order.amountCents / 100).toFixed(2)}
                  </td>
                  <td className="py-3 pr-4 text-sm">
                    ${((order.amountCents - order.platformFeeCents) / 100).toFixed(2)}
                  </td>
                  <td className="py-3 pr-4">
                    <StatusBadge status={order.status} />
                  </td>
                  <td className="py-3 text-sm text-muted">
                    {new Date(order.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}

type OrderStatus = (typeof import("@/db/schema").orderStatusEnum.enumValues)[number];

function StatusBadge({ status }: { status: OrderStatus }) {
  const styles: Record<OrderStatus, string> = {
    completed: "bg-green-50 text-green-700",
    refunded: "bg-red-50 text-red-700",
    pending: "bg-yellow-50 text-yellow-700",
  };

  return (
    <span
      className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium ${styles[status]}`}
    >
      {status}
    </span>
  );
}
