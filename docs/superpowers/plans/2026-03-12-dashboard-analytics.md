# Dashboard Analytics Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enhance the creator dashboard with interactive analytics: revenue chart, KPI cards with period comparisons, top products, traffic sources, conversion funnel, and coupon performance.

**Architecture:** Single API endpoint (`GET /api/analytics?period=30d`) runs 6 parallel aggregation queries scoped to the authenticated creator. A client component (`DashboardAnalytics`) fetches data and renders Recharts-based visualizations. The existing server-component dashboard page embeds this client component.

**Tech Stack:** Next.js 15 App Router, Drizzle ORM (PostgreSQL), Recharts, Tailwind CSS, Auth.js

**Spec:** `docs/superpowers/specs/2026-03-12-dashboard-analytics-design.md`

---

## File Structure

| Action | Path | Responsibility |
|--------|------|---------------|
| Create | `src/app/api/analytics/route.ts` | API endpoint: auth, period parsing, 6 parallel queries, JSON response |
| Create | `src/components/dashboard/period-selector.tsx` | Tab toggle for time period (7d/30d/90d/all) |
| Create | `src/components/dashboard/kpi-cards.tsx` | 4-card grid with value + % change badge |
| Create | `src/components/dashboard/revenue-chart.tsx` | Recharts AreaChart with gradient fill |
| Create | `src/components/dashboard/top-products.tsx` | Ranked list (top 5 by revenue) |
| Create | `src/components/dashboard/traffic-sources.tsx` | Horizontal bar chart by source |
| Create | `src/components/dashboard/conversion-funnel.tsx` | Stepped bars: views → intents → orders |
| Create | `src/components/dashboard/coupon-performance.tsx` | Coupon list with metrics |
| Create | `src/components/dashboard/dashboard-analytics.tsx` | Client component orchestrator: fetches data, renders all analytics widgets |
| Modify | `src/app/(platform)/dashboard/page.tsx` | Replace static stat cards with `DashboardAnalytics` component |

---

## Chunk 1: API Endpoint + Dependency Setup

### Task 1: Install Recharts

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install recharts**

```bash
cd /Users/ematomax/Documents/fooshop/.worktrees/feat/issue-26-dashboard-analytics
pnpm add recharts
```

- [ ] **Step 2: Verify installation**

```bash
pnpm list recharts
```

Expected: `recharts 2.x.x`

- [ ] **Step 3: Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "chore: add recharts dependency (#26)"
```

---

### Task 2: Analytics API Endpoint

**Files:**
- Create: `src/app/api/analytics/route.ts`

**Reference:** Auth pattern from `src/app/api/orders/export/route.ts` — `auth()` → session check → creator lookup → query.

**Reference:** Schema at `src/db/schema.ts` — tables: `orders` (lines 196-214), `pageViews` (lines 230-238), `buyIntents` (lines 240-251), `products` (lines 151-173), `coupons` (lines 175-194), `creators` (lines 133-149).

**Key constraints:**
- `pageViews` has NO `creatorId` — must join through `products.creatorId` (for product views) or `creators.slug` (for store views via `storeSlug`)
- All revenue = `amountCents - platformFeeCents` (net to creator)
- All order queries filter `status = 'completed'`
- Period "all" returns `null` for `changes`

- [ ] **Step 1: Create the API route file**

```typescript
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

  // ── 1. KPIs (current + previous period) ──────────────────────────────

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
    // Product page views (join through products)
    const productConditions = [
      isNotNull(pageViews.productId),
      eq(products.creatorId, creatorId),
    ];
    if (rangeStart) productConditions.push(gte(pageViews.createdAt, rangeStart));
    if (rangeEnd) productConditions.push(lt(pageViews.createdAt, rangeEnd));

    const [productViews] = await db
      .select({ count: sql<number>`count(*)` })
      .from(pageViews)
      .innerJoin(products, eq(pageViews.productId, products.id))
      .where(and(...productConditions));

    // Store page views (join through creators)
    const storeConditions = [
      isNotNull(pageViews.storeSlug),
      eq(creators.slug, creatorSlug),
    ];
    if (rangeStart) storeConditions.push(gte(pageViews.createdAt, rangeStart));
    if (rangeEnd) storeConditions.push(lt(pageViews.createdAt, rangeEnd));

    const [storeViews] = await db
      .select({ count: sql<number>`count(*)` })
      .from(pageViews)
      .innerJoin(creators, eq(pageViews.storeSlug, creators.slug))
      .where(and(...storeConditions));

    return Number(productViews.count) + Number(storeViews.count);
  }

  async function queryProductPageViewCount(rangeStart: Date | null, rangeEnd: Date | null) {
    const conditions = [
      isNotNull(pageViews.productId),
      eq(products.creatorId, creatorId),
    ];
    if (rangeStart) conditions.push(gte(pageViews.createdAt, rangeStart));
    if (rangeEnd) conditions.push(lt(pageViews.createdAt, rangeEnd));

    const [result] = await db
      .select({ count: sql<number>`count(*)` })
      .from(pageViews)
      .innerJoin(products, eq(pageViews.productId, products.id))
      .where(and(...conditions));

    return Number(result.count);
  }

  // ── 2. Revenue over time ─────────────────────────────────────────────

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

  // ── 3. Top products ──────────────────────────────────────────────────

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

  // ── 4. Traffic sources ───────────────────────────────────────────────

  async function queryTrafficSources() {
    // Product page views by source
    const productConditions = [
      isNotNull(pageViews.productId),
      eq(products.creatorId, creatorId),
    ];
    if (start) productConditions.push(gte(pageViews.createdAt, start));

    const productBySource = await db
      .select({
        source: pageViews.source,
        count: sql<number>`count(*)`,
      })
      .from(pageViews)
      .innerJoin(products, eq(pageViews.productId, products.id))
      .where(and(...productConditions))
      .groupBy(pageViews.source);

    // Store page views by source
    const storeConditions = [
      isNotNull(pageViews.storeSlug),
      eq(creators.slug, creatorSlug),
    ];
    if (start) storeConditions.push(gte(pageViews.createdAt, start));

    const storeBySource = await db
      .select({
        source: pageViews.source,
        count: sql<number>`count(*)`,
      })
      .from(pageViews)
      .innerJoin(creators, eq(pageViews.storeSlug, creators.slug))
      .where(and(...storeConditions))
      .groupBy(pageViews.source);

    // Merge counts by source
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

  // ── 5. Conversion funnel ─────────────────────────────────────────────

  async function queryConversionFunnel() {
    const pvCount = await queryProductPageViewCount(start, null);

    const biConditions = [eq(buyIntents.creatorId, creatorId)];
    if (start) biConditions.push(gte(buyIntents.createdAt, start));
    const [bi] = await db
      .select({ count: sql<number>`count(*)` })
      .from(buyIntents)
      .where(and(...biConditions));

    const oConditions = [
      eq(orders.creatorId, creatorId),
      eq(orders.status, "completed"),
    ];
    if (start) oConditions.push(gte(orders.createdAt, start));
    const [o] = await db
      .select({ count: sql<number>`count(*)` })
      .from(orders)
      .where(and(...oConditions));

    return {
      pageViews: pvCount,
      buyIntents: Number(bi.count),
      orders: Number(o.count),
    };
  }

  // ── 6. Coupon performance ────────────────────────────────────────────

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

  // ── Execute all in parallel ──────────────────────────────────────────

  const currentKpis = queryOrderKpis(start, null);
  const currentPageViews = queryPageViewCount(start, null);
  const currentProductPageViews = queryProductPageViewCount(start, null);

  let previousKpis: Promise<{ revenue: number; orders: number }>;
  let previousPageViews: Promise<number>;
  let previousProductPageViews: Promise<number>;

  if (days !== null) {
    const prev = previousRange(days);
    previousKpis = queryOrderKpis(prev.start, prev.end);
    previousPageViews = queryPageViewCount(prev.start, prev.end);
    previousProductPageViews = queryProductPageViewCount(prev.start, prev.end);
  } else {
    previousKpis = Promise.resolve({ revenue: 0, orders: 0 });
    previousPageViews = Promise.resolve(0);
    previousProductPageViews = Promise.resolve(0);
  }

  const [
    curKpis,
    curPV,
    curPPV,
    prevKpis,
    prevPV,
    prevPPV,
    revenueOverTime,
    topProducts,
    trafficSources,
    conversionFunnel,
    couponPerformance,
  ] = await Promise.all([
    currentKpis,
    currentPageViews,
    currentProductPageViews,
    previousKpis,
    previousPageViews,
    previousProductPageViews,
    queryRevenueOverTime(),
    queryTopProducts(),
    queryTrafficSources(),
    queryConversionFunnel(),
    queryCouponPerformance(),
  ]);

  const conversionRate = curPPV > 0
    ? Math.round((curKpis.orders / curPPV) * 1000) / 10
    : 0;
  const prevConversionRate = prevPPV > 0
    ? Math.round((prevKpis.orders / prevPPV) * 1000) / 10
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
      pageViews: curPV,
      changes: {
        revenue: pctChange(curKpis.revenue, prevKpis.revenue),
        orders: pctChange(curKpis.orders, prevKpis.orders),
        conversionRate: pctChange(conversionRate, prevConversionRate),
        pageViews: pctChange(curPV, prevPV),
      },
    },
    revenueOverTime,
    topProducts,
    trafficSources,
    conversionFunnel,
    couponPerformance,
  });
}
```

- [ ] **Step 2: Build to verify no TypeScript errors**

```bash
cd /Users/ematomax/Documents/fooshop/.worktrees/feat/issue-26-dashboard-analytics
pnpm build 2>&1 | tail -20
```

Expected: Build succeeds, route appears as `ƒ /api/analytics`

- [ ] **Step 3: Commit**

```bash
git add src/app/api/analytics/route.ts
git commit -m "feat: add analytics API endpoint with 6 parallel queries (#26)

Single GET /api/analytics?period=30d endpoint returning KPIs with period
comparison, revenue over time, top products, traffic sources, conversion
funnel, and coupon performance. All queries scoped to authenticated creator."
```

---

## Chunk 2: Dashboard UI Components

### Task 3: PeriodSelector Component

**Files:**
- Create: `src/components/dashboard/period-selector.tsx`

- [ ] **Step 1: Create the component**

```tsx
// src/components/dashboard/period-selector.tsx
"use client";

const PERIODS = [
  { value: "7d", label: "7d" },
  { value: "30d", label: "30d" },
  { value: "90d", label: "90d" },
  { value: "all", label: "All" },
] as const;

export type Period = (typeof PERIODS)[number]["value"];

export function PeriodSelector({
  value,
  onChange,
}: {
  value: Period;
  onChange: (period: Period) => void;
}) {
  return (
    <div className="flex gap-1 bg-surface border border-border rounded-lg p-1">
      {PERIODS.map((p) => (
        <button
          key={p.value}
          onClick={() => onChange(p.value)}
          className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
            value === p.value
              ? "bg-accent text-white"
              : "text-muted hover:text-ink"
          }`}
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/dashboard/period-selector.tsx
git commit -m "feat: add PeriodSelector component (#26)"
```

---

### Task 4: KpiCards Component

**Files:**
- Create: `src/components/dashboard/kpi-cards.tsx`

- [ ] **Step 1: Create the component**

```tsx
// src/components/dashboard/kpi-cards.tsx
"use client";

interface KpiData {
  revenue: number;
  orders: number;
  conversionRate: number;
  pageViews: number;
  changes: {
    revenue: number | null;
    orders: number | null;
    conversionRate: number | null;
    pageViews: number | null;
  };
}

function formatCurrency(cents: number): string {
  return `$${(cents / 100).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatChange(value: number | null): { text: string; color: string } | null {
  if (value === null) return null;
  const sign = value > 0 ? "+" : "";
  const color = value > 0 ? "text-green-600" : value < 0 ? "text-red-500" : "text-muted";
  return { text: `${sign}${value}%`, color };
}

export function KpiCards({ kpis }: { kpis: KpiData }) {
  const cards = [
    { label: "Revenue", value: formatCurrency(kpis.revenue), change: kpis.changes.revenue },
    { label: "Orders", value: kpis.orders.toLocaleString(), change: kpis.changes.orders },
    { label: "Conversion Rate", value: `${kpis.conversionRate}%`, change: kpis.changes.conversionRate },
    { label: "Page Views", value: kpis.pageViews.toLocaleString(), change: kpis.changes.pageViews },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => {
        const change = formatChange(card.change);
        return (
          <div
            key={card.label}
            className="bg-surface border border-border rounded-xl p-5"
          >
            <p className="text-sm text-muted">{card.label}</p>
            <p className="text-2xl font-bold mt-1">{card.value}</p>
            {change && (
              <p className={`text-xs mt-1 ${change.color}`}>
                {change.text} vs prev
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/dashboard/kpi-cards.tsx
git commit -m "feat: add KpiCards component with period comparison (#26)"
```

---

### Task 5: RevenueChart Component

**Files:**
- Create: `src/components/dashboard/revenue-chart.tsx`

**Reference:** Recharts docs — `AreaChart`, `Area`, `XAxis`, `YAxis`, `Tooltip`, `ResponsiveContainer`

- [ ] **Step 1: Create the component**

```tsx
// src/components/dashboard/revenue-chart.tsx
"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface DataPoint {
  date: string;
  revenue: number;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatCurrency(cents: number): string {
  return `$${(cents / 100).toFixed(0)}`;
}

export function RevenueChart({ data }: { data: DataPoint[] }) {
  if (data.length === 0) {
    return (
      <div className="bg-surface border border-border rounded-xl p-6">
        <h3 className="text-sm font-semibold mb-4">Revenue Over Time</h3>
        <div className="flex items-center justify-center h-48 text-muted text-sm">
          No sales yet
        </div>
      </div>
    );
  }

  return (
    <div className="bg-surface border border-border rounded-xl p-6">
      <h3 className="text-sm font-semibold mb-4">Revenue Over Time</h3>
      <ResponsiveContainer width="100%" height={240}>
        <AreaChart data={data}>
          <defs>
            <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.3} />
              <stop offset="100%" stopColor="var(--accent)" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="date"
            tickFormatter={formatDate}
            axisLine={false}
            tickLine={false}
            tick={{ fill: "var(--muted)", fontSize: 12 }}
          />
          <YAxis
            tickFormatter={formatCurrency}
            axisLine={false}
            tickLine={false}
            tick={{ fill: "var(--muted)", fontSize: 12 }}
            width={60}
          />
          <Tooltip
            formatter={(value: number) => [formatCurrency(value), "Revenue"]}
            labelFormatter={formatDate}
            contentStyle={{
              backgroundColor: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: "8px",
              fontSize: "13px",
            }}
          />
          <Area
            type="monotone"
            dataKey="revenue"
            stroke="var(--accent)"
            strokeWidth={2}
            fill="url(#revenueGradient)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/dashboard/revenue-chart.tsx
git commit -m "feat: add RevenueChart component with Recharts AreaChart (#26)"
```

---

### Task 6: TopProducts Component

**Files:**
- Create: `src/components/dashboard/top-products.tsx`

- [ ] **Step 1: Create the component**

```tsx
// src/components/dashboard/top-products.tsx
"use client";

interface Product {
  id: string;
  title: string;
  sales: number;
  revenue: number;
}

export function TopProducts({ products }: { products: Product[] }) {
  if (products.length === 0) {
    return (
      <div className="bg-surface border border-border rounded-xl p-6">
        <h3 className="text-sm font-semibold mb-4">Top Products</h3>
        <p className="text-muted text-sm">
          No sales yet — publish a product to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-surface border border-border rounded-xl p-6">
      <h3 className="text-sm font-semibold mb-4">Top Products</h3>
      <div className="space-y-4">
        {products.map((product) => (
          <div key={product.id} className="flex justify-between items-center">
            <div>
              <p className="text-sm font-medium">{product.title}</p>
              <p className="text-xs text-muted">
                {product.sales} {product.sales === 1 ? "sale" : "sales"}
              </p>
            </div>
            <p className="text-sm font-semibold">
              ${(product.revenue / 100).toFixed(2)}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/dashboard/top-products.tsx
git commit -m "feat: add TopProducts component (#26)"
```

---

### Task 7: TrafficSources Component

**Files:**
- Create: `src/components/dashboard/traffic-sources.tsx`

- [ ] **Step 1: Create the component**

```tsx
// src/components/dashboard/traffic-sources.tsx
"use client";

interface SourceData {
  source: string;
  count: number;
  percentage: number;
}

const SOURCE_LABELS: Record<string, string> = {
  web: "Web",
  mcp: "MCP (AI Agents)",
  api: "API",
};

const SOURCE_COLORS: Record<string, string> = {
  web: "bg-accent",
  mcp: "bg-purple-500",
  api: "bg-green-500",
};

export function TrafficSources({ sources }: { sources: SourceData[] }) {
  if (sources.length === 0) {
    return (
      <div className="bg-surface border border-border rounded-xl p-6">
        <h3 className="text-sm font-semibold mb-4">Traffic Sources</h3>
        <p className="text-muted text-sm">No visits recorded yet.</p>
      </div>
    );
  }

  return (
    <div className="bg-surface border border-border rounded-xl p-6">
      <h3 className="text-sm font-semibold mb-4">Traffic Sources</h3>
      <div className="space-y-4">
        {sources.map((s) => (
          <div key={s.source}>
            <div className="flex justify-between text-xs mb-1">
              <span>{SOURCE_LABELS[s.source] ?? s.source}</span>
              <span className="text-muted">
                {s.count.toLocaleString()} ({s.percentage}%)
              </span>
            </div>
            <div className="h-2 bg-border rounded-full">
              <div
                className={`h-full rounded-full ${SOURCE_COLORS[s.source] ?? "bg-accent"}`}
                style={{ width: `${Math.max(s.percentage, 2)}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/dashboard/traffic-sources.tsx
git commit -m "feat: add TrafficSources component (#26)"
```

---

### Task 8: ConversionFunnel Component

**Files:**
- Create: `src/components/dashboard/conversion-funnel.tsx`

- [ ] **Step 1: Create the component**

```tsx
// src/components/dashboard/conversion-funnel.tsx
"use client";

interface FunnelData {
  pageViews: number;
  buyIntents: number;
  orders: number;
}

export function ConversionFunnel({ funnel }: { funnel: FunnelData }) {
  const maxVal = Math.max(funnel.pageViews, 1);

  const steps = [
    {
      label: "Page Views",
      value: funnel.pageViews,
      pct: null as string | null,
    },
    {
      label: "Buy Intent (clicked Buy)",
      value: funnel.buyIntents,
      pct:
        funnel.pageViews > 0
          ? `${((funnel.buyIntents / funnel.pageViews) * 100).toFixed(1)}%`
          : "0%",
    },
    {
      label: "Completed Orders",
      value: funnel.orders,
      pct:
        funnel.pageViews > 0
          ? `${((funnel.orders / funnel.pageViews) * 100).toFixed(1)}%`
          : "0%",
    },
  ];

  return (
    <div className="bg-surface border border-border rounded-xl p-6">
      <h3 className="text-sm font-semibold mb-4">Conversion Funnel</h3>
      <div className="space-y-3">
        {steps.map((step, i) => (
          <div key={step.label}>
            <div className="flex justify-between text-xs mb-1">
              <span>{step.label}</span>
              <span className="text-muted">
                {step.value.toLocaleString()}
                {step.pct && ` (${step.pct})`}
              </span>
            </div>
            <div
              className="h-7 bg-accent rounded-md"
              style={{
                width: `${Math.max((step.value / maxVal) * 100, 4)}%`,
                opacity: 1 - i * 0.25,
              }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/dashboard/conversion-funnel.tsx
git commit -m "feat: add ConversionFunnel component (#26)"
```

---

### Task 9: CouponPerformance Component

**Files:**
- Create: `src/components/dashboard/coupon-performance.tsx`

- [ ] **Step 1: Create the component**

```tsx
// src/components/dashboard/coupon-performance.tsx
"use client";

import Link from "next/link";

interface CouponData {
  id: string;
  code: string;
  discountType: string;
  discountValue: number;
  redemptions: number;
  revenue: number;
  active: boolean;
}

function formatDiscount(type: string, value: number): string {
  if (type === "percentage") return `${value}% off`;
  return `$${(value / 100).toFixed(2)} off`;
}

export function CouponPerformance({ coupons }: { coupons: CouponData[] }) {
  if (coupons.length === 0) {
    return (
      <div className="bg-surface border border-border rounded-xl p-6">
        <h3 className="text-sm font-semibold mb-4">Coupon Performance</h3>
        <p className="text-muted text-sm">
          No coupons created yet.{" "}
          <Link
            href="/dashboard/coupons/new"
            className="text-accent hover:underline"
          >
            Create one
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className="bg-surface border border-border rounded-xl p-6">
      <h3 className="text-sm font-semibold mb-4">Coupon Performance</h3>
      <div className="space-y-3">
        {coupons.map((coupon) => (
          <div
            key={coupon.id}
            className="flex justify-between items-center p-3 bg-paper/50 rounded-lg"
          >
            <div>
              <p
                className={`text-sm font-medium ${
                  !coupon.active ? "line-through opacity-50" : ""
                }`}
              >
                {coupon.code}
              </p>
              <p className="text-xs text-muted">
                {formatDiscount(coupon.discountType, coupon.discountValue)} ·{" "}
                {coupon.redemptions}{" "}
                {coupon.redemptions === 1 ? "redemption" : "redemptions"}
              </p>
            </div>
            <div className="text-right">
              <p
                className={`text-sm font-semibold ${
                  !coupon.active ? "opacity-50" : ""
                }`}
              >
                ${(coupon.revenue / 100).toFixed(2)}
              </p>
              <p className="text-xs text-muted">
                {coupon.active ? "revenue" : "expired"}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/dashboard/coupon-performance.tsx
git commit -m "feat: add CouponPerformance component (#26)"
```

---

## Chunk 3: Dashboard Integration

### Task 10: DashboardAnalytics Orchestrator Component

**Files:**
- Create: `src/components/dashboard/dashboard-analytics.tsx`

This client component ties everything together: manages period state via URL params, fetches from `/api/analytics`, and renders all widgets.

- [ ] **Step 1: Create the orchestrator component**

```tsx
// src/components/dashboard/dashboard-analytics.tsx
"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { PeriodSelector, type Period } from "./period-selector";
import { KpiCards } from "./kpi-cards";
import { RevenueChart } from "./revenue-chart";
import { TopProducts } from "./top-products";
import { TrafficSources } from "./traffic-sources";
import { ConversionFunnel } from "./conversion-funnel";
import { CouponPerformance } from "./coupon-performance";

interface AnalyticsData {
  kpis: {
    revenue: number;
    orders: number;
    conversionRate: number;
    pageViews: number;
    changes: {
      revenue: number | null;
      orders: number | null;
      conversionRate: number | null;
      pageViews: number | null;
    };
  };
  revenueOverTime: Array<{ date: string; revenue: number }>;
  topProducts: Array<{
    id: string;
    title: string;
    sales: number;
    revenue: number;
  }>;
  trafficSources: Array<{
    source: string;
    count: number;
    percentage: number;
  }>;
  conversionFunnel: {
    pageViews: number;
    buyIntents: number;
    orders: number;
  };
  couponPerformance: Array<{
    id: string;
    code: string;
    discountType: string;
    discountValue: number;
    redemptions: number;
    revenue: number;
    active: boolean;
  }>;
}

function SkeletonCard() {
  return (
    <div className="bg-surface border border-border rounded-xl p-5 animate-pulse">
      <div className="h-3 w-20 bg-border rounded mb-3" />
      <div className="h-7 w-28 bg-border rounded" />
    </div>
  );
}

function SkeletonChart({ height = "h-64" }: { height?: string }) {
  return (
    <div
      className={`bg-surface border border-border rounded-xl p-6 animate-pulse ${height}`}
    >
      <div className="h-3 w-32 bg-border rounded mb-4" />
      <div className="h-full bg-border/30 rounded" />
    </div>
  );
}

export function DashboardAnalytics() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const periodParam = searchParams.get("period");
  const period: Period =
    periodParam === "7d" || periodParam === "30d" || periodParam === "90d" || periodParam === "all"
      ? periodParam
      : "30d";

  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async (p: Period) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/analytics?period=${p}`);
      if (!res.ok) throw new Error("Failed to load analytics");
      const json = await res.json();
      setData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(period);
  }, [period, fetchData]);

  const handlePeriodChange = (newPeriod: Period) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("period", newPeriod);
    router.replace(`?${params.toString()}`, { scroll: false });
  };

  return (
    <div className="space-y-6">
      {/* Period selector */}
      <div className="flex justify-end">
        <PeriodSelector value={period} onChange={handlePeriodChange} />
      </div>

      {/* Error state */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex justify-between items-center">
          <p className="text-red-700 text-sm">{error}</p>
          <button
            onClick={() => fetchData(period)}
            className="text-red-700 text-sm font-medium underline"
          >
            Retry
          </button>
        </div>
      )}

      {/* Loading skeleton */}
      {loading && !data && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
          <SkeletonChart />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <SkeletonChart height="h-48" />
            <SkeletonChart height="h-48" />
          </div>
        </>
      )}

      {/* Loaded data */}
      {data && (
        <>
          <KpiCards kpis={data.kpis} />
          <RevenueChart data={data.revenueOverTime} />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <TopProducts products={data.topProducts} />
            <TrafficSources sources={data.trafficSources} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <ConversionFunnel funnel={data.conversionFunnel} />
            <CouponPerformance coupons={data.couponPerformance} />
          </div>
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/dashboard/dashboard-analytics.tsx
git commit -m "feat: add DashboardAnalytics orchestrator component (#26)"
```

---

### Task 11: Integrate Analytics into Dashboard Page

**Files:**
- Modify: `src/app/(platform)/dashboard/page.tsx`

Replace the static 3-card stats + quick action grid with the new `DashboardAnalytics` client component. Keep: header, Stripe CTA, recent orders, StripeToast.

- [ ] **Step 1: Update the dashboard page**

Replace the existing page content. The key changes:
1. Remove the `stats` and `orderStats` queries (analytics API handles this now)
2. Remove the `statCards` array and its rendering
3. Remove the "Quick actions" section (products/orders/coupons links — these are in the nav)
4. Add `<Suspense>` wrapper around `<DashboardAnalytics />`
5. Keep: header (store name, edit/view links), StripeToast, StripeCTA, recent orders table

Updated file:

```tsx
// src/app/(platform)/dashboard/page.tsx
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
```

- [ ] **Step 2: Build to verify everything compiles**

```bash
cd /Users/ematomax/Documents/fooshop/.worktrees/feat/issue-26-dashboard-analytics
pnpm build 2>&1 | tail -20
```

Expected: Build succeeds with `/dashboard` as dynamic route

- [ ] **Step 3: Commit**

```bash
git add src/app/\(platform\)/dashboard/page.tsx
git commit -m "feat: integrate analytics widgets into dashboard page (#26)

Replace static stat cards with interactive DashboardAnalytics component.
Keeps header, Stripe CTA, and recent orders. Analytics data now served
via /api/analytics endpoint with period selection."
```

---

### Task 12: Manual Verification

- [ ] **Step 1: Start dev server and verify**

```bash
cd /Users/ematomax/Documents/fooshop/.worktrees/feat/issue-26-dashboard-analytics
pnpm dev
```

Open http://localhost:3000/dashboard and verify:
1. Period selector tabs work (7d/30d/90d/All)
2. URL updates with `?period=` param
3. KPI cards show with % changes
4. Revenue chart renders (or "No sales yet" empty state)
5. Top products, traffic sources, conversion funnel, coupon performance display
6. Loading skeletons appear while fetching
7. Responsive layout works on mobile viewport

- [ ] **Step 2: Final build check**

```bash
pnpm build
```

Expected: Clean build with no errors.

- [ ] **Step 3: Commit any fixes if needed, then stop dev server**
