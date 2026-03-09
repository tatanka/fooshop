# Export Buyer Data (CSV + API) Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Let creators export all their buyer/order data as CSV via an API endpoint, with a new `/dashboard/orders` page showing the full orders table and an export button.

**Architecture:** One new API route (`/api/orders/export`) that queries orders joined with products and returns CSV. One new dashboard page (`/dashboard/orders`) as a server component showing all orders in a table with a download link. A "View all orders" link added to the main dashboard.

**Tech Stack:** Next.js App Router, Drizzle ORM, Auth.js, Tailwind CSS

---

### Task 1: CSV Export API Endpoint

**Files:**
- Create: `src/app/api/orders/export/route.ts`

**Step 1: Create the export route**

```typescript
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { orders, creators, products } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const creator = await db
    .select()
    .from(creators)
    .where(eq(creators.userId, session.user.id))
    .then((rows) => rows[0]);

  if (!creator) {
    return NextResponse.json({ error: "Creator not found" }, { status: 404 });
  }

  const rows = await db
    .select({
      orderId: orders.id,
      buyerEmail: orders.buyerEmail,
      buyerName: orders.buyerName,
      productTitle: products.title,
      amountCents: orders.amountCents,
      platformFeeCents: orders.platformFeeCents,
      currency: products.currency,
      status: orders.status,
      createdAt: orders.createdAt,
    })
    .from(orders)
    .innerJoin(products, eq(orders.productId, products.id))
    .where(eq(orders.creatorId, creator.id))
    .orderBy(desc(orders.createdAt));

  const header = "order_id,buyer_email,buyer_name,product_title,amount,platform_fee,net_revenue,currency,status,date";

  const csvRows = rows.map((r) => {
    const amount = (r.amountCents / 100).toFixed(2);
    const fee = (r.platformFeeCents / 100).toFixed(2);
    const net = ((r.amountCents - r.platformFeeCents) / 100).toFixed(2);
    const date = r.createdAt.toISOString();
    // Escape fields that might contain commas or quotes
    const escapeCsv = (val: string | null) => {
      if (val === null) return "";
      if (val.includes(",") || val.includes('"') || val.includes("\n")) {
        return `"${val.replace(/"/g, '""')}"`;
      }
      return val;
    };
    return [
      r.orderId,
      escapeCsv(r.buyerEmail),
      escapeCsv(r.buyerName),
      escapeCsv(r.productTitle),
      amount,
      fee,
      net,
      r.currency,
      r.status,
      date,
    ].join(",");
  });

  const csv = [header, ...csvRows].join("\n");
  const today = new Date().toISOString().split("T")[0];

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="orders-${today}.csv"`,
    },
  });
}
```

**Step 2: Verify build passes**

Run: `pnpm build`
Expected: Build succeeds with new `/api/orders/export` route listed.

**Step 3: Commit**

```bash
git add src/app/api/orders/export/route.ts
git commit -m "feat: add CSV export API endpoint for orders"
```

---

### Task 2: Dashboard Orders Page

**Files:**
- Create: `src/app/(platform)/dashboard/orders/page.tsx`

**Step 1: Create the orders page**

```tsx
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

  const allOrders = await db
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
            {allOrders.length} order{allOrders.length !== 1 ? "s" : ""} total
          </p>
        </div>
        <div className="flex gap-4 items-center">
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

      {allOrders.length === 0 ? (
        <div className="mt-12 text-center text-gray-500">
          <p>No orders yet.</p>
        </div>
      ) : (
        <div className="mt-8 border rounded-lg overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-gray-50 text-sm text-gray-500">
              <tr>
                <th className="px-4 py-3 font-medium">Buyer</th>
                <th className="px-4 py-3 font-medium">Product</th>
                <th className="px-4 py-3 font-medium text-right">Amount</th>
                <th className="px-4 py-3 font-medium text-right">Net</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {allOrders.map((order) => (
                <tr key={order.id}>
                  <td className="px-4 py-3">
                    <p className="font-medium">{order.buyerEmail}</p>
                    {order.buyerName && (
                      <p className="text-sm text-gray-500">{order.buyerName}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm">{order.productTitle}</td>
                  <td className="px-4 py-3 text-sm text-right font-medium">
                    ${(order.amountCents / 100).toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-sm text-right text-gray-600">
                    ${((order.amountCents - order.platformFeeCents) / 100).toFixed(2)}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-xs px-2 py-1 rounded-full font-medium ${
                        order.status === "completed"
                          ? "bg-green-100 text-green-700"
                          : order.status === "refunded"
                            ? "bg-red-100 text-red-700"
                            : "bg-yellow-100 text-yellow-700"
                      }`}
                    >
                      {order.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
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
```

**Step 2: Verify build passes**

Run: `pnpm build`
Expected: Build succeeds with `/dashboard/orders` route listed.

**Step 3: Commit**

```bash
git add src/app/\(platform\)/dashboard/orders/page.tsx
git commit -m "feat: add dashboard orders page with full orders table"
```

---

### Task 3: Link Dashboard to Orders Page

**Files:**
- Modify: `src/app/(platform)/dashboard/page.tsx:122-141` (Recent Orders section)

**Step 1: Add "View all orders" link to the Recent Orders section**

In the dashboard page, find the "Recent Orders" heading and add a link next to it. Also add an "Orders" button in the action buttons area.

Replace the `<h2>` line:
```tsx
<h2 className="text-xl font-semibold">Recent Orders</h2>
```

With:
```tsx
<div className="flex justify-between items-center">
  <h2 className="text-xl font-semibold">Recent Orders</h2>
  <Link href="/dashboard/orders" className="text-sm underline text-gray-500">
    View all orders
  </Link>
</div>
```

Add the `Link` import at the top of the file:
```typescript
import Link from "next/link";
```

**Step 2: Verify build passes**

Run: `pnpm build`
Expected: Build succeeds.

**Step 3: Commit**

```bash
git add src/app/\(platform\)/dashboard/page.tsx
git commit -m "feat: add link from dashboard to orders page"
```

---

### Task 4: Final Build Verification

**Step 1: Run full build**

Run: `pnpm build`
Expected: Build succeeds with all routes listed including `/api/orders/export` and `/dashboard/orders`.

**Step 2: Verify no type errors**

Run: `pnpm tsc --noEmit` (if available) or confirm build output has no type errors.
