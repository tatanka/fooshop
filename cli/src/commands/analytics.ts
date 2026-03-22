import { Command } from "commander";
import chalk from "chalk";
import { api } from "../lib/api.js";
import { formatPrice, buildTable } from "../lib/format.js";

interface AnalyticsResponse {
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
  topProducts: { id: string; title: string; sales: number; revenue: number }[];
  trafficSources: { source: string; count: number; percentage: number }[];
  revenueOverTime: { date: string; revenue: number }[];
  conversionFunnel: { pageViews: number; buyIntents: number; orders: number };
  couponPerformance: unknown[];
}

function formatChange(value: number | null): string {
  if (value === null) return chalk.gray("—");
  const sign = value >= 0 ? "+" : "";
  const color = value >= 0 ? chalk.green : chalk.red;
  return color(`${sign}${value.toFixed(1)}%`);
}

export const analyticsCommand = new Command("analytics")
  .description("View store analytics")
  .option("--period <period>", "Time period (7d, 30d, 90d, all)", "30d")
  .action(async (opts) => {
    const json = analyticsCommand.parent?.opts().json;
    const data = await api.get<AnalyticsResponse>(
      `/api/analytics?period=${opts.period}`
    );

    if (json) {
      console.log(JSON.stringify(data, null, 2));
      return;
    }

    const { kpis } = data;

    console.log(chalk.bold("\n  Dashboard\n"));
    console.log(
      `  Revenue:      ${formatPrice(kpis.revenue)}  ${formatChange(kpis.changes.revenue)}`
    );
    console.log(
      `  Orders:       ${kpis.orders}  ${formatChange(kpis.changes.orders)}`
    );
    console.log(
      `  Conversion:   ${kpis.conversionRate.toFixed(1)}%  ${formatChange(kpis.changes.conversionRate)}`
    );
    console.log(
      `  Page views:   ${kpis.pageViews}  ${formatChange(kpis.changes.pageViews)}`
    );

    if (data.topProducts.length > 0) {
      console.log(chalk.bold("\n  Top Products\n"));
      const rows = data.topProducts.slice(0, 5).map((p) => [
        p.title,
        String(p.sales),
        formatPrice(p.revenue),
      ]);
      console.log(buildTable(["Product", "Sales", "Revenue"], rows));
    }

    if (data.trafficSources.length > 0) {
      console.log(chalk.bold("\n  Traffic Sources\n"));
      const rows = data.trafficSources.map((s) => [
        s.source,
        String(s.count),
        `${s.percentage.toFixed(1)}%`,
      ]);
      console.log(buildTable(["Source", "Views", "Share"], rows));
    }
  });
