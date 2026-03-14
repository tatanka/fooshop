import { NextRequest, NextResponse } from "next/server";
import { validateApiKey, hasScope, insufficientScope } from "@/lib/api-key";
import { db } from "@/db";
import { creators } from "@/db/schema";
import { sql } from "drizzle-orm";

const SCOPE = "admin:read:creators";

export async function GET(req: NextRequest) {
  const auth = await validateApiKey(req);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!hasScope(auth, SCOPE)) return insufficientScope(SCOPE);

  const rows = await db
    .select({
      id: creators.id,
      userId: creators.userId,
      email: creators.email,
      name: creators.name,
      slug: creators.slug,
      storeName: creators.storeName,
      stripeConnectId: creators.stripeConnectId,
      createdAt: creators.createdAt,
      productCount: sql<number>`(
        select count(*) from products where products.creator_id = creators.id
      )`,
      orderCount: sql<number>`(
        select count(*) from orders where orders.creator_id = creators.id and orders.status = 'completed'
      )`,
      revenueCents: sql<number>`(
        select coalesce(sum(orders.amount_cents), 0) from orders where orders.creator_id = creators.id and orders.status = 'completed'
      )`,
    })
    .from(creators);

  return NextResponse.json(rows);
}
