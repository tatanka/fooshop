import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { orders, creators, products } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

function escapeCsvField(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

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

  const header =
    "order_id,buyer_email,buyer_name,product_title,amount,platform_fee,net_revenue,currency,status,date";

  const csvRows = rows.map((r) => {
    const amount = (r.amountCents / 100).toFixed(2);
    const platformFee = (r.platformFeeCents / 100).toFixed(2);
    const netRevenue = ((r.amountCents - r.platformFeeCents) / 100).toFixed(2);

    return [
      escapeCsvField(r.orderId),
      escapeCsvField(r.buyerEmail),
      escapeCsvField(r.buyerName ?? ""),
      escapeCsvField(r.productTitle),
      amount,
      platformFee,
      netRevenue,
      r.currency,
      r.status,
      r.createdAt.toISOString(),
    ].join(",");
  });

  const csv = [header, ...csvRows].join("\n");
  const today = new Date().toISOString().slice(0, 10);

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="orders-${today}.csv"`,
    },
  });
}
