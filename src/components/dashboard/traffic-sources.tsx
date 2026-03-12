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
