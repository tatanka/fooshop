import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { loadConfig, apiGet, apiPatch, parseDuration, findCreator } from "../creators-admin";

describe("loadConfig", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("uses env vars when set", () => {
    process.env.FOOSHOP_BASE_URL = "https://example.com";
    process.env.FOOSHOP_API_KEY = "fsk_test123";

    const config = loadConfig();
    expect(config.baseUrl).toBe("https://example.com");
    expect(config.apiKey).toBe("fsk_test123");
  });

  it("env vars override config file", () => {
    process.env.FOOSHOP_BASE_URL = "https://override.com";
    process.env.FOOSHOP_API_KEY = "fsk_override";

    const config = loadConfig();
    expect(config.baseUrl).toBe("https://override.com");
    expect(config.apiKey).toBe("fsk_override");
  });
});

describe("parseDuration", () => {
  it("returns null for permanent", () => {
    expect(parseDuration("permanent")).toBeNull();
  });

  it("returns a future date for 3months", () => {
    const result = parseDuration("3months");
    expect(result).toBeInstanceOf(Date);
    expect(result!.getTime()).toBeGreaterThan(Date.now());
  });

  it("returns a future date for 6months", () => {
    const result = parseDuration("6months");
    expect(result).toBeInstanceOf(Date);
  });

  it("returns a future date for 12months", () => {
    const result = parseDuration("12months");
    expect(result).toBeInstanceOf(Date);
  });

  it("throws for invalid duration", () => {
    expect(() => parseDuration("2weeks")).toThrow();
  });
});

describe("apiGet", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("calls fetch with correct URL and auth header", async () => {
    const mockResponse = { ok: true, status: 200, json: () => Promise.resolve([]) };
    (fetch as any).mockResolvedValue(mockResponse);

    const config = { baseUrl: "https://example.com", apiKey: "fsk_test" };
    await apiGet(config, "/api/admin/creators?q=alice");

    expect(fetch).toHaveBeenCalledWith(
      "https://example.com/api/admin/creators?q=alice",
      expect.objectContaining({
        headers: { Authorization: "Bearer fsk_test" },
      })
    );
  });

  it("throws on 401", async () => {
    const mockResponse = { ok: false, status: 401, json: () => Promise.resolve({ error: "Unauthorized" }) };
    (fetch as any).mockResolvedValue(mockResponse);

    const config = { baseUrl: "https://example.com", apiKey: "fsk_bad" };
    await expect(apiGet(config, "/api/admin/creators")).rejects.toThrow("Invalid API key");
  });
});

describe("apiPatch", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("sends PATCH with correct method, headers, and body", async () => {
    const mockResponse = { ok: true, status: 200, json: () => Promise.resolve({ id: "1" }) };
    (fetch as any).mockResolvedValue(mockResponse);

    const config = { baseUrl: "https://example.com", apiKey: "fsk_test" };
    await apiPatch(config, "/api/admin/creators/uuid-1", { commissionOverridePercent: 0 });

    expect(fetch).toHaveBeenCalledWith(
      "https://example.com/api/admin/creators/uuid-1",
      expect.objectContaining({
        method: "PATCH",
        headers: {
          Authorization: "Bearer fsk_test",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ commissionOverridePercent: 0 }),
      })
    );
  });

  it("throws on 403", async () => {
    const mockResponse = { ok: false, status: 403, json: () => Promise.resolve({ required: "admin:write:creators" }) };
    (fetch as any).mockResolvedValue(mockResponse);

    const config = { baseUrl: "https://example.com", apiKey: "fsk_test" };
    await expect(apiPatch(config, "/api/admin/creators/uuid-1", {})).rejects.toThrow("Insufficient permissions");
  });
});

describe("findCreator", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns exact match on email", async () => {
    const creators = [
      { id: "1", email: "alice@test.com", slug: "alice", name: "Alice" },
      { id: "2", email: "alice2@test.com", slug: "alice2", name: "Alice Two" },
    ];
    const mockResponse = { ok: true, status: 200, json: () => Promise.resolve(creators) };
    (fetch as any).mockResolvedValue(mockResponse);

    const config = { baseUrl: "https://example.com", apiKey: "fsk_test" };
    const result = await findCreator(config, "alice@test.com");
    expect(result.id).toBe("1");
  });

  it("returns exact match on slug", async () => {
    const creators = [
      { id: "1", email: "alice@test.com", slug: "alice", name: "Alice" },
    ];
    const mockResponse = { ok: true, status: 200, json: () => Promise.resolve(creators) };
    (fetch as any).mockResolvedValue(mockResponse);

    const config = { baseUrl: "https://example.com", apiKey: "fsk_test" };
    const result = await findCreator(config, "alice");
    expect(result.id).toBe("1");
  });
});
