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

describe("fooshop orders list", () => {
  it("displays orders in a table", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          orders: [
            {
              id: "1",
              createdAt: "2026-03-15T10:00:00Z",
              productTitle: "React Kit",
              amountCents: 2900,
              platformFeeCents: 232,
              currency: "usd",
              buyerEmail: "buyer@test.com",
              status: "completed",
            },
          ],
        }),
    });

    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const { ordersCommand } = await import("../commands/orders.js");
    await ordersCommand.parseAsync(["list"], { from: "user" });

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("React Kit"));
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("buyer@test.com"));
    consoleSpy.mockRestore();
  });

  it("passes period filter", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ orders: [] }),
    });

    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const { ordersCommand } = await import("../commands/orders.js");
    await ordersCommand.parseAsync(["list", "--last", "7d"], { from: "user" });

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("period=7d"),
      expect.anything()
    );
    consoleSpy.mockRestore();
  });
});
