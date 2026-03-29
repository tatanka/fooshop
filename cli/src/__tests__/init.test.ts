import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

vi.mock("@inquirer/prompts", () => ({
  input: vi.fn(),
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

vi.mock("open", () => ({
  default: vi.fn().mockResolvedValue(undefined),
}));

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

describe("fooshop init", () => {
  it("generates a store from description", async () => {
    const { input, confirm } = await import("@inquirer/prompts");
    (input as ReturnType<typeof vi.fn>).mockResolvedValueOnce("Selling React templates");
    (confirm as ReturnType<typeof vi.fn>).mockResolvedValueOnce(false);

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          storeName: "React Templates Pro",
          storeDescription: "Premium React templates",
          slug: "react-templates-pro",
          suggestedProducts: [],
          theme: {},
        }),
    });

    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const { initCommand } = await import("../commands/init.js");
    await initCommand.parseAsync([], { from: "user" });

    expect(mockFetch).toHaveBeenCalledWith(
      "https://test.fooshop.ai/api/store/generate",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ description: "Selling React templates" }),
      })
    );
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("react-templates-pro")
    );
    consoleSpy.mockRestore();
  });
});
