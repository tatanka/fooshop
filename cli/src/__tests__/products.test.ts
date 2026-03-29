import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

vi.mock("@inquirer/prompts", () => ({
  input: vi.fn(),
  select: vi.fn(),
  confirm: vi.fn(),
}));

vi.mock("ora", () => {
  const spinner = {
    start: vi.fn().mockReturnThis(),
    succeed: vi.fn().mockReturnThis(),
    fail: vi.fn().mockReturnThis(),
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

describe("fooshop products list", () => {
  it("displays products in a table", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve([
          {
            id: "1",
            title: "React Kit",
            slug: "react-kit",
            priceCents: 2900,
            status: "published",
            creatorSlug: "my-store",
          },
        ]),
    });

    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const { productsCommand } = await import("../commands/products.js");
    await productsCommand.parseAsync(["list"], { from: "user" });

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("React Kit"));
    consoleSpy.mockRestore();
  });

  it("shows empty message when no products", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve([]),
    });

    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const { productsCommand } = await import("../commands/products.js");
    await productsCommand.parseAsync(["list"], { from: "user" });

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("No products yet")
    );
    consoleSpy.mockRestore();
  });
});

describe("fooshop products delete", () => {
  it("deletes a product after confirmation", async () => {
    const { confirm } = await import("@inquirer/prompts");
    (confirm as ReturnType<typeof vi.fn>).mockResolvedValueOnce(true);

    // First call: GET products list to find by slug
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve([
          { id: "1", title: "React Kit", slug: "react-kit", priceCents: 2900, status: "published" },
        ]),
    });
    // Second call: DELETE
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ ok: true }),
    });

    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const { productsCommand } = await import("../commands/products.js");
    await productsCommand.parseAsync(["delete", "react-kit"], { from: "user" });

    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("deleted"));
    consoleSpy.mockRestore();
  });
});
