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
    <main className="max-w-4xl mx-auto px-4 py-12">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Orders</h1>
          <p className="text-gray-600 mt-1">
            {orderRows.length} {orderRows.length === 1 ? "order" : "orders"}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <a
            href="/api/orders/export?format=csv"
            className="bg-black text-white px-4 py-2 rounded-lg font-semibold hover:bg-gray-800 transition-colors text-sm"
          >
            Export CSV
          </a>
          <Link
            href="/dashboard"
            className="text-sm underline text-gray-500"
          >
            Back to dashboard
          </Link>
        </div>
      </div>

      {orderRows.length === 0 ? (
        <p className="text-gray-500 mt-8">No orders yet.</p>
      ) : (
        <div className="mt-8 overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b text-sm text-gray-500">
                <th className="py-3 pr-4 font-medium">Buyer</th>
                <th className="py-3 pr-4 font-medium">Product</th>
                <th className="py-3 pr-4 font-medium">Amount</th>
                <th className="py-3 pr-4 font-medium">Net</th>
                <th className="py-3 pr-4 font-medium">Status</th>
                <th className="py-3 font-medium">Date</th>
              </tr>
            </thead>
            <tbody>
              {orderRows.map((order) => (
                <tr key={order.id} className="border-b">
                  <td className="py-3 pr-4">
                    <p className="font-medium">{order.buyerEmail}</p>
                    {order.buyerName && (
                      <p className="text-sm text-gray-500">{order.buyerName}</p>
                    )}
                  </td>
                  <td className="py-3 pr-4">{order.productTitle}</td>
                  <td className="py-3 pr-4">
                    ${(order.amountCents / 100).toFixed(2)}
                  </td>
                  <td className="py-3 pr-4">
                    ${((order.amountCents - order.platformFeeCents) / 100).toFixed(2)}
                  </td>
                  <td className="py-3 pr-4">
                    <StatusBadge status={order.status} />
                  </td>
                  <td className="py-3">
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

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    completed: "bg-green-100 text-green-800",
    refunded: "bg-red-100 text-red-800",
    pending: "bg-yellow-100 text-yellow-800",
  };

  return (
    <span
      className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${styles[status] ?? "bg-gray-100 text-gray-800"}`}
    >
      {status}
    </span>
  );
}
