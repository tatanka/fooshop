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

  const fetchData = useCallback(async (p: Period, signal?: AbortSignal) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/analytics?period=${p}`, { signal });
      if (!res.ok) throw new Error("Failed to load analytics");
      const json = await res.json();
      setData(json);
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return;
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    fetchData(period, controller.signal);
    return () => controller.abort();
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
