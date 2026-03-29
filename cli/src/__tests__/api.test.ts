import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

// Mock global fetch
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

// Mock process.exit
const mockExit = vi.spyOn(process, "exit").mockImplementation(() => {
  throw new Error("process.exit called");
});

// Mock console
const mockConsoleError = vi.spyOn(console, "error").mockImplementation(() => {});

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "fooshop-test-"));
  vi.stubEnv("FOOSHOP_CONFIG_DIR", tmpDir);
  vi.stubEnv("FOOSHOP_BASE_URL", "https://test.fooshop.ai");
  vi.stubEnv("FOOSHOP_API_KEY", "fsk_testkey123");
  mockFetch.mockReset();
  mockExit.mockClear();
  mockConsoleError.mockClear();
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
  vi.unstubAllEnvs();
});

describe("api", () => {
  it("sends GET with auth header", async () => {
    const { api } = await import("../lib/api.js");
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ data: "test" }),
    });

    const result = await api.get("/api/products");

    expect(mockFetch).toHaveBeenCalledWith(
      "https://test.fooshop.ai/api/products",
      expect.objectContaining({
        method: "GET",
        headers: expect.objectContaining({
          Authorization: "Bearer fsk_testkey123",
        }),
      })
    );
    expect(result).toEqual({ data: "test" });
  });

  it("sends POST with body", async () => {
    const { api } = await import("../lib/api.js");
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ id: "123" }),
    });

    const result = await api.post("/api/products", { title: "Test" });

    expect(mockFetch).toHaveBeenCalledWith(
      "https://test.fooshop.ai/api/products",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "Content-Type": "application/json",
          Authorization: "Bearer fsk_testkey123",
        }),
        body: JSON.stringify({ title: "Test" }),
      })
    );
    expect(result).toEqual({ id: "123" });
  });

  it("exits with error on 4xx/5xx response", async () => {
    const { api } = await import("../lib/api.js");
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 403,
      json: () => Promise.resolve({ error: "Insufficient scope" }),
    });

    await expect(api.get("/api/products")).rejects.toThrow("process.exit called");
    expect(mockConsoleError).toHaveBeenCalled();
  });

  it("exits when no API key configured", async () => {
    vi.stubEnv("FOOSHOP_API_KEY", "");
    vi.resetModules();

    const { api } = await import("../lib/api.js");
    await expect(api.get("/api/products")).rejects.toThrow("process.exit called");
  });
});
