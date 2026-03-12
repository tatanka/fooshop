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
