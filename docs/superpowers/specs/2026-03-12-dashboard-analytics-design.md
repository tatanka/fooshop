# Dashboard Analytics Design

**Issue:** #26 — [GEN-013] Dashboard analytics: revenue nel tempo, top prodotti, conversion rate
**Date:** 2026-03-12
**Status:** Approved

## Problem

The creator dashboard shows only 3 static numbers (product count, order count, total revenue) and a recent orders table. Creators lack visibility into trends, product performance, traffic sources, and conversion metrics. Without analytics, serious creators migrate to more mature platforms.

## Solution

Enhance the existing `/dashboard` page with interactive analytics: time-series revenue chart, KPI cards with period comparisons, top products ranking, traffic source breakdown, conversion funnel (page views → buy intents → orders), and coupon performance metrics.

## Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Location | Enhance existing `/dashboard` | Dashboard is the first thing creators see — it should be impactful. No nav overhead. |
| Time periods | Preset tabs: 7d, 30d, 90d, All | Covers 95% of use cases without date picker complexity. |
| Chart library | Recharts | Most popular React charting lib, declarative API, built on D3. |
| Data freshness | API routes with aggregation queries | Real-time, clean separation, can add caching later. |
| Scope | 5 analytics sections | Revenue over time, top products, conversion funnel, traffic sources, coupon performance. |

## Dashboard Layout

Top-to-bottom, single page:

1. **Period selector** — tab toggle (7d / 30d / 90d / All), controls all widgets
2. **KPI cards** (4-column grid) — Revenue, Orders, Conversion Rate, Page Views — each with % change vs previous equivalent period
3. **Revenue over time** — Recharts AreaChart, full width, daily granularity for 7d/30d, weekly for 90d/All
4. **Top Products + Traffic Sources** — 2-column grid
   - Top Products: ranked list (top 5) with title, sales count, revenue
   - Traffic Sources: horizontal bar chart showing web/MCP/API breakdown with percentages
5. **Conversion Funnel + Coupon Performance** — 2-column grid
   - Conversion Funnel: stepped bars (page views → buy intents → orders) with drop-off percentages
   - Coupon Performance: list with code, discount type, redemptions, revenue generated, active/expired status
6. **Recent Orders** — table (last 5) with "View all →" link to `/dashboard/orders`

## API Design

### `GET /api/analytics`

Single endpoint returning all dashboard data. Authenticated, scoped to the requesting creator.

**Query parameters:**
- `period` — `7d` | `30d` | `90d` | `all` (default: `30d`)

**Response shape:**

```typescript
interface AnalyticsResponse {
  kpis: {
    revenue: number;          // cents, creator's net (after platform fee)
    orders: number;
    conversionRate: number;   // percentage (0-100)
    pageViews: number;
    changes: {
      revenue: number | null;        // % change vs previous period, null for "all"
      orders: number | null;
      conversionRate: number | null;
      pageViews: number | null;
    };
  };
  revenueOverTime: Array<{
    date: string;             // ISO date (YYYY-MM-DD) or week start
    revenue: number;          // cents
  }>;
  topProducts: Array<{
    id: string;
    title: string;
    sales: number;
    revenue: number;          // cents
  }>;
  trafficSources: Array<{
    source: string;           // "web" | "mcp" | "api"
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
    discountType: string;     // "percentage" | "fixed"
    discountValue: number;
    redemptions: number;
    revenue: number;          // cents, total revenue from orders using this coupon
    active: boolean;
  }>;
}
```

### Global Rule: Revenue = Net Revenue

All revenue figures throughout the API (KPIs, revenue over time, top products, coupon performance) represent the **creator's net revenue**: `amountCents - platformFeeCents`. All revenue queries filter `status = 'completed'` only.

**Note:** The existing dashboard does NOT filter by `status = 'completed'`. This change makes analytics more accurate — pending/refunded orders should not count as revenue.

### Page Views Join Strategy

The `page_views` table has no `creatorId` column. To scope page views to a creator:
- **Product page views** (`productId IS NOT NULL`): join `page_views` → `products` on `productId`, filter `products.creatorId = ?`
- **Store page views** (`storeSlug IS NOT NULL`): join `page_views` → `creators` on `storeSlug = creators.slug`, filter `creators.id = ?`
- **Traffic sources & KPI page views**: union both (product views + store views), deduplicated by `page_views.id`
- **Conversion funnel page views**: product page views only (`productId IS NOT NULL`), since store-level visits don't have a direct buy path

### Query Strategy

All 6 data sections are fetched in parallel via `Promise.all`:

1. **KPIs** — Two time windows (current period + previous equivalent). Revenue: `SUM(amountCents - platformFeeCents)` on completed orders. Orders: `COUNT(*)`. Page views: total (product + store views via joins above). Conversion: completed orders / product page views × 100. Changes: `(current - previous) / previous × 100`. For "All" period, `changes` values are `null`.

2. **Revenue over time** — `GROUP BY DATE(createdAt)` on completed orders. Daily buckets for 7d/30d, weekly buckets for 90d/All. Returns array sorted by date ascending.

3. **Top products** — Join orders with products, `GROUP BY productId`, `SUM(amountCents - platformFeeCents)` as revenue, `COUNT(*)` as sales. `ORDER BY revenue DESC LIMIT 5`. Only completed orders.

4. **Traffic sources** — All creator page views (product + store), `GROUP BY source`. Includes web, mcp, api sources. Percentages computed in the query.

5. **Conversion funnel** — Three parallel counts: product page views only (`productId IS NOT NULL`, joined to products for creator filter), buy_intents (filtered by `creatorId`), and completed orders (filtered by `creatorId`). All filtered by period.

6. **Coupon performance** — Join orders with coupons, `GROUP BY couponId`. Sum net revenue per coupon. Include coupon metadata (code, discount type/value, active status). Only completed orders.

### Auth & Security

- Uses standard `auth()` → session → creator lookup pattern
- All queries filter by `creatorId` — no cross-creator data access
- Returns 401 if not authenticated, 404 if no creator profile

## Frontend Architecture

### Components

All in `src/components/dashboard/`:

| Component | Props | Chart Type |
|-----------|-------|------------|
| `PeriodSelector` | `period`, `onChange` | Tabs (no chart) |
| `KpiCards` | `kpis` | Value + % change badge |
| `RevenueChart` | `data` | Recharts `AreaChart` with gradient fill |
| `TopProducts` | `products` | Ranked list |
| `TrafficSources` | `sources` | Horizontal bars (Recharts `BarChart`) |
| `ConversionFunnel` | `funnel` | Stepped horizontal bars |
| `CouponPerformance` | `coupons` | List with metrics |

### Data Flow

1. Dashboard page remains a server component. The analytics section is a client component (`"use client"`) embedded within it.
2. Period stored in URL search params (`?period=30d`) for shareability
3. `useEffect` fetches `/api/analytics?period=X` on mount and period change
4. Loading state shows skeleton/shimmer for each chart section
5. Error state shows inline error message with retry button
6. **Empty states per widget:** Revenue chart shows "No sales yet" with a flat line. Top products shows "No sales yet — publish a product to get started." Traffic sources shows "No visits recorded yet." Conversion funnel shows zeros. Coupon performance shows "No coupons created yet" with link to create one.

### Period Comparison Logic

For "% change vs previous period":
- 7d: compare to the 7 days before that (day -14 to day -7)
- 30d: compare to the 30 days before that (day -60 to day -30)
- 90d: compare to the 90 days before that (day -180 to day -90)
- All: no comparison shown (changes are `null`)

### Responsive Behavior

- Desktop: 4-column KPI grid, 2-column chart rows
- Tablet: 2-column KPI grid, 2-column chart rows
- Mobile: 1-column everything, charts stack vertically

## Data Sources

| Section | Tables | Key Fields |
|---------|--------|------------|
| Revenue/Orders KPIs | `orders` | `amountCents`, `platformFeeCents`, `createdAt`, `status` |
| Page Views KPI | `page_views` | `createdAt`, `storeSlug` or `productId` |
| Conversion Rate | `page_views` + `orders` | Ratio of orders to product page views |
| Revenue over time | `orders` | `amountCents`, `platformFeeCents`, `createdAt` |
| Top products | `orders` + `products` | Join on `productId`, group by product |
| Traffic sources | `page_views` | `source` field (web/mcp/api) |
| Conversion funnel | `page_views` + `buy_intents` + `orders` | Count each, filter by period |
| Coupon performance | `orders` + `coupons` | Join on `couponId`, group by coupon |

## Dependencies

- **New:** `recharts` (npm package)
- **Existing:** Drizzle ORM, Auth.js, Tailwind CSS

## Out of Scope

- Custom date range picker (can be added later)
- Export analytics as CSV/PDF
- Real-time updates (WebSocket)
- Per-product detail analytics page
- Goal setting / benchmarks
- Email reports / scheduled digests
