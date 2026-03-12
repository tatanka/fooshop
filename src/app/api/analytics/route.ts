// src/app/api/analytics/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import {
  orders,
  creators,
  products,
  pageViews,
  buyIntents,
  coupons,
} from "@/db/schema";
import { eq, sql, and, gte, lt, isNotNull } from "drizzle-orm";

type Period = "7d" | "30d" | "90d" | "all";

function parsePeriod(value: string | null): Period {
  if (value === "7d" || value === "30d" || value === "90d" || value === "all")
    return value;
  return "30d";
}

function periodToDays(period: Period): number | null {
  switch (period) {
    case "7d": return 7;
    case "30d": return 30;
    case "90d": return 90;
    case "all": return null;
  }
}

function dateRange(days: number | null): { start: Date | null; end: Date } {
  const end = new Date();
  if (days === null) return { start: null, end };
  const start = new Date();
  start.setDate(start.getDate() - days);
  start.setHours(0, 0, 0, 0);
  return { start, end };
}

function previousRange(days: number): { start: Date; end: Date } {
  const end = new Date();
  end.setDate(end.getDate() - days);
  end.setHours(0, 0, 0, 0);
  const start = new Date(end);
  start.setDate(start.getDate() - days);
  return { start, end };
}

export async function GET(request: NextRequest) {
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

  const period = parsePeriod(request.nextUrl.searchParams.get("period"));
  const days = periodToDays(period);
  const { start } = dateRange(days);

  const creatorId = creator.id;
  const creatorSlug = creator.slug;

  // -- 1. KPIs (current + previous period) -------------------------------

  async function queryOrderKpis(rangeStart: Date | null, rangeEnd: Date | null) {
    const conditions = [
      eq(orders.creatorId, creatorId),
      eq(orders.status, "completed"),
    ];
    if (rangeStart) conditions.push(gte(orders.createdAt, rangeStart));
    if (rangeEnd) conditions.push(lt(orders.createdAt, rangeEnd));

    const [result] = await db
      .select({
        revenue: sql<number>`coalesce(sum(${orders.amountCents} - ${orders.platformFeeCents}), 0)`,
        orderCount: sql<number>`count(*)`,
      })
      .from(orders)
      .where(and(...conditions));

    return {
      revenue: Number(result.revenue),
      orders: Number(result.orderCount),
    };
  }

  async function queryPageViewCount(rangeStart: Date | null, rangeEnd: Date | null) {
    const productConditions = [
      isNotNull(pageViews.productId),
      eq(products.creatorId, creatorId),
    ];
    if (rangeStart) productConditions.push(gte(pageViews.createdAt, rangeStart));
    if (rangeEnd) productConditions.push(lt(pageViews.createdAt, rangeEnd));

    const storeConditions = [
      isNotNull(pageViews.storeSlug),
      eq(creators.slug, creatorSlug),
    ];
    if (rangeStart) storeConditions.push(gte(pageViews.createdAt, rangeStart));
    if (rangeEnd) storeConditions.push(lt(pageViews.createdAt, rangeEnd));

    const [[productViews], [storeViews]] = await Promise.all([
      db
        .select({ count: sql<number>`count(*)` })
        .from(pageViews)
        .innerJoin(products, eq(pageViews.productId, products.id))
        .where(and(...productConditions)),
      db
        .select({ count: sql<number>`count(*)` })
        .from(pageViews)
        .innerJoin(creators, eq(pageViews.storeSlug, creators.slug))
        .where(and(...storeConditions)),
    ]);

    const productOnly = Number(productViews.count);
    return { total: productOnly + Number(storeViews.count), productOnly };
  }

  // -- 2. Revenue over time -----------------------------------------------

  async function queryRevenueOverTime() {
    const useWeekly = period === "90d" || period === "all";
    const dateTrunc = useWeekly ? "week" : "day";

    const conditions = [
      eq(orders.creatorId, creatorId),
      eq(orders.status, "completed"),
    ];
    if (start) conditions.push(gte(orders.createdAt, start));

    const rows = await db
      .select({
        date: sql<string>`date_trunc(${sql.raw(`'${dateTrunc}'`)}, ${orders.createdAt})::date::text`,
        revenue: sql<number>`sum(${orders.amountCents} - ${orders.platformFeeCents})`,
      })
      .from(orders)
      .where(and(...conditions))
      .groupBy(sql`date_trunc(${sql.raw(`'${dateTrunc}'`)}, ${orders.createdAt})`)
      .orderBy(sql`date_trunc(${sql.raw(`'${dateTrunc}'`)}, ${orders.createdAt})`);

    return rows.map((r) => ({ date: r.date, revenue: Number(r.revenue) }));
  }

  // -- 3. Top products ----------------------------------------------------

  async function queryTopProducts() {
    const conditions = [
      eq(orders.creatorId, creatorId),
      eq(orders.status, "completed"),
    ];
    if (start) conditions.push(gte(orders.createdAt, start));

    return db
      .select({
        id: products.id,
        title: products.title,
        sales: sql<number>`count(*)`,
        revenue: sql<number>`sum(${orders.amountCents} - ${orders.platformFeeCents})`,
      })
      .from(orders)
      .innerJoin(products, eq(orders.productId, products.id))
      .where(and(...conditions))
      .groupBy(products.id, products.title)
      .orderBy(sql`sum(${orders.amountCents} - ${orders.platformFeeCents}) desc`)
      .limit(5)
      .then((rows) =>
        rows.map((r) => ({
          id: r.id,
          title: r.title,
          sales: Number(r.sales),
          revenue: Number(r.revenue),
        }))
      );
  }

  // -- 4. Traffic sources -------------------------------------------------

  async function queryTrafficSources() {
    const productConditions = [
      isNotNull(pageViews.productId),
      eq(products.creatorId, creatorId),
    ];
    if (start) productConditions.push(gte(pageViews.createdAt, start));

    const storeConditions = [
      isNotNull(pageViews.storeSlug),
      eq(creators.slug, creatorSlug),
    ];
    if (start) storeConditions.push(gte(pageViews.createdAt, start));

    const [productBySource, storeBySource] = await Promise.all([
      db
        .select({
          source: pageViews.source,
          count: sql<number>`count(*)`,
        })
        .from(pageViews)
        .innerJoin(products, eq(pageViews.productId, products.id))
        .where(and(...productConditions))
        .groupBy(pageViews.source),
      db
        .select({
          source: pageViews.source,
          count: sql<number>`count(*)`,
        })
        .from(pageViews)
        .innerJoin(creators, eq(pageViews.storeSlug, creators.slug))
        .where(and(...storeConditions))
        .groupBy(pageViews.source),
    ]);

    const merged = new Map<string, number>();
    for (const row of [...productBySource, ...storeBySource]) {
      merged.set(row.source, (merged.get(row.source) ?? 0) + Number(row.count));
    }

    const total = Array.from(merged.values()).reduce((a, b) => a + b, 0);
    return Array.from(merged.entries())
      .map(([source, count]) => ({
        source,
        count,
        percentage: total > 0 ? Math.round((count / total) * 1000) / 10 : 0,
      }))
      .sort((a, b) => b.count - a.count);
  }

  // -- 5. Buy intent count ------------------------------------------------

  async function queryBuyIntentCount() {
    const conditions = [eq(buyIntents.creatorId, creatorId)];
    if (start) conditions.push(gte(buyIntents.createdAt, start));
    const [result] = await db
      .select({ count: sql<number>`count(*)` })
      .from(buyIntents)
      .where(and(...conditions));
    return Number(result.count);
  }

  // -- 6. Coupon performance -----------------------------------------------

  async function queryCouponPerformance() {
    const conditions = [
      eq(orders.creatorId, creatorId),
      eq(orders.status, "completed"),
      isNotNull(orders.couponId),
    ];
    if (start) conditions.push(gte(orders.createdAt, start));

    const rows = await db
      .select({
        id: coupons.id,
        code: coupons.code,
        discountType: coupons.discountType,
        discountValue: coupons.discountValue,
        redemptions: sql<number>`count(*)`,
        revenue: sql<number>`sum(${orders.amountCents} - ${orders.platformFeeCents})`,
        active: coupons.active,
      })
      .from(orders)
      .innerJoin(coupons, eq(orders.couponId, coupons.id))
      .where(and(...conditions))
      .groupBy(
        coupons.id,
        coupons.code,
        coupons.discountType,
        coupons.discountValue,
        coupons.active
      );

    return rows.map((r) => ({
      id: r.id,
      code: r.code,
      discountType: r.discountType,
      discountValue: r.discountValue,
      redemptions: Number(r.redemptions),
      revenue: Number(r.revenue),
      active: r.active,
    }));
  }

  // -- Execute all in parallel ---------------------------------------------

  const currentKpis = queryOrderKpis(start, null);
  const currentPageViews = queryPageViewCount(start, null);

  let previousKpis: Promise<{ revenue: number; orders: number }>;
  let previousPageViews: Promise<{ total: number; productOnly: number }>;

  if (days !== null) {
    const prev = previousRange(days);
    previousKpis = queryOrderKpis(prev.start, prev.end);
    previousPageViews = queryPageViewCount(prev.start, prev.end);
  } else {
    previousKpis = Promise.resolve({ revenue: 0, orders: 0 });
    previousPageViews = Promise.resolve({ total: 0, productOnly: 0 });
  }

  const [
    curKpis,
    curPV,
    prevKpis,
    prevPV,
    revenueOverTime,
    topProducts,
    trafficSources,
    couponPerformance,
    buyIntentCount,
  ] = await Promise.all([
    currentKpis,
    currentPageViews,
    previousKpis,
    previousPageViews,
    queryRevenueOverTime(),
    queryTopProducts(),
    queryTrafficSources(),
    queryCouponPerformance(),
    queryBuyIntentCount(),
  ]);

  const conversionFunnel = {
    pageViews: curPV.productOnly,
    buyIntents: buyIntentCount,
    orders: curKpis.orders,
  };

  const conversionRate = curPV.productOnly > 0
    ? Math.round((curKpis.orders / curPV.productOnly) * 1000) / 10
    : 0;
  const prevConversionRate = prevPV.productOnly > 0
    ? Math.round((prevKpis.orders / prevPV.productOnly) * 1000) / 10
    : 0;

  function pctChange(current: number, previous: number): number | null {
    if (days === null) return null;
    if (previous === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 1000) / 10;
  }

  return NextResponse.json({
    kpis: {
      revenue: curKpis.revenue,
      orders: curKpis.orders,
      conversionRate,
      pageViews: curPV.total,
      changes: {
        revenue: pctChange(curKpis.revenue, prevKpis.revenue),
        orders: pctChange(curKpis.orders, prevKpis.orders),
        conversionRate: pctChange(conversionRate, prevConversionRate),
        pageViews: pctChange(curPV.total, prevPV.total),
      },
    },
    revenueOverTime,
    topProducts,
    trafficSources,
    conversionFunnel,
    couponPerformance,
  });
}
