import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { orders, products } from "@/db/schema";
import { eq, desc, gte, and } from "drizzle-orm";
import { authenticateCreator } from "@/lib/api-key";

export async function GET(req: NextRequest) {
  const result = await authenticateCreator(req, "orders:read");
  if (result instanceof NextResponse) return result;
  const { creator } = result;

  const period = req.nextUrl.searchParams.get("period") || "all";

  const conditions = [eq(orders.creatorId, creator.id)];

  if (period !== "all") {
    const days = parseInt(period);
    if (!isNaN(days)) {
      const since = new Date();
      since.setDate(since.getDate() - days);
      conditions.push(gte(orders.createdAt, since));
    }
  }

  const rows = await db
    .select({
      id: orders.id,
      createdAt: orders.createdAt,
      productTitle: products.title,
      amountCents: orders.amountCents,
      platformFeeCents: orders.platformFeeCents,
      currency: products.currency,
      buyerEmail: orders.buyerEmail,
      status: orders.status,
    })
    .from(orders)
    .innerJoin(products, eq(orders.productId, products.id))
    .where(and(...conditions))
    .orderBy(desc(orders.createdAt));

  return NextResponse.json({ orders: rows });
}
