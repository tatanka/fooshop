import { NextRequest, NextResponse } from "next/server";
import { validateApiKey, hasScope, insufficientScope } from "@/lib/api-key";
import { db } from "@/db";
import { creators } from "@/db/schema";
import { sql, ilike, or, and, isNotNull, isNull, gt, SQL } from "drizzle-orm";

const SCOPE = "admin:read:creators";

export async function GET(req: NextRequest) {
  const auth = await validateApiKey(req);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!hasScope(auth, SCOPE)) return insufficientScope(SCOPE);

  const q = req.nextUrl.searchParams.get("q")?.trim();
  const overrides = req.nextUrl.searchParams.get("overrides");

  const conditions: SQL[] = [];

  if (q) {
    conditions.push(
      or(
        ilike(creators.name, `%${q}%`),
        ilike(creators.email, `%${q}%`),
        ilike(creators.slug, `%${q}%`)
      )!
    );
  }

  if (overrides === "active") {
    conditions.push(isNotNull(creators.commissionOverridePercent));
    conditions.push(
      or(
        isNull(creators.commissionOverrideExpiresAt),
        gt(creators.commissionOverrideExpiresAt, sql`NOW()`)
      )!
    );
  }

  const query = db
    .select({
      id: creators.id,
      userId: creators.userId,
      email: creators.email,
      name: creators.name,
      slug: creators.slug,
      storeName: creators.storeName,
      stripeConnectId: creators.stripeConnectId,
      commissionOverridePercent: creators.commissionOverridePercent,
      commissionOverrideExpiresAt: creators.commissionOverrideExpiresAt,
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

  const rows = conditions.length > 0
    ? await query.where(and(...conditions))
    : await query;

  return NextResponse.json(rows);
}
