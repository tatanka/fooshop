import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

vi.mock("ora", () => {
  const spinner = {
    start: vi.fn().mockReturnThis(),
    succeed: vi.fn().mockReturnThis(),
    stop: vi.fn().mockReturnThis(),
  };
  return { default: vi.fn(() => spinner) };
});

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "fooshop-test-"));
  vi.stubEnv("FOOSHOP_CONFIG_DIR", tmpDir);
  vi.stubEnv("FOOSHOP_BASE_URL", "https://test.fooshop.ai");
  vi.stubEnv("FOOSHOP_API_KEY", "fsk_testkey123");
  mockFetch.mockReset();
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("fooshop analytics", () => {
  it("displays KPIs and tables", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          kpis: {
            revenue: 15000,
            orders: 5,
            conversionRate: 3.2,
            pageViews: 156,
            changes: {
              revenue: 25,
              orders: 10,
              conversionRate: -1.5,
              pageViews: 30,
            },
          },
          topProducts: [
            { id: "1", title: "React Kit", sales: 3, revenue: 8700 },
          ],
          trafficSources: [
            { source: "web", count: 100, percentage: 64.1 },
            { source: "api", count: 56, percentage: 35.9 },
          ],
          revenueOverTime: [],
          conversionFunnel: { pageViews: 156, buyIntents: 20, orders: 5 },
          couponPerformance: [],
        }),
    });

    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const { analyticsCommand } = await import("../commands/analytics.js");
    await analyticsCommand.parseAsync([], { from: "user" });

    const output = consoleSpy.mock.calls.map((c) => c[0]).join("\n");
    expect(output).toContain("$150.00");
    expect(output).toContain("React Kit");
    consoleSpy.mockRestore();
  });
});
