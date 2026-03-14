"use client";

interface FunnelData {
  pageViews: number;
  buyIntents: number;
  orders: number;
}

export function ConversionFunnel({ funnel }: { funnel: FunnelData }) {
  const maxVal = Math.max(funnel.pageViews, funnel.buyIntents, funnel.orders, 1);

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
