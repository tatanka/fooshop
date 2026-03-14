import { NextRequest, NextResponse } from "next/server";
import { validateApiKey, hasScope, insufficientScope } from "@/lib/api-key";
import { db } from "@/db";
import { orders, products, creators } from "@/db/schema";
import { eq, gte, desc } from "drizzle-orm";

const SCOPE = "admin:read:orders";

export async function GET(req: NextRequest) {
  const auth = await validateApiKey(req);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!hasScope(auth, SCOPE)) return insufficientScope(SCOPE);

  const since = req.nextUrl.searchParams.get("since");
  const limit = Math.min(
    parseInt(req.nextUrl.searchParams.get("limit") ?? "100", 10),
    500
  );

  const conditions = [];
  if (since) {
    conditions.push(gte(orders.createdAt, new Date(since)));
  }

  const rows = await db
    .select({
      id: orders.id,
      productId: orders.productId,
      productTitle: products.title,
      creatorId: orders.creatorId,
      creatorName: creators.name,
      creatorEmail: creators.email,
      buyerEmail: orders.buyerEmail,
      buyerName: orders.buyerName,
      amountCents: orders.amountCents,
      platformFeeCents: orders.platformFeeCents,
      status: orders.status,
      couponId: orders.couponId,
      createdAt: orders.createdAt,
    })
    .from(orders)
    .innerJoin(products, eq(orders.productId, products.id))
    .innerJoin(creators, eq(orders.creatorId, creators.id))
    .where(conditions.length > 0 ? conditions[0] : undefined)
    .orderBy(desc(orders.createdAt))
    .limit(limit);

  return NextResponse.json(rows);
}
