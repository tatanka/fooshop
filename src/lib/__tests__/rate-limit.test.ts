import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { InMemoryStore, rateLimit, getClientIp, _resetStoreForTesting } from "@/lib/rate-limit";
import { NextRequest } from "next/server";

describe("InMemoryStore", () => {
  let store: InMemoryStore;

  beforeEach(() => {
    store = new InMemoryStore();
  });

  it("increments counter for new key", async () => {
    const result = await store.increment("test-key", 60_000);
    expect(result.count).toBe(1);
    expect(result.resetAt).toBeGreaterThan(Date.now());
  });

  it("increments counter for existing key within window", async () => {
    await store.increment("test-key", 60_000);
    const result = await store.increment("test-key", 60_000);
    expect(result.count).toBe(2);
  });

  it("resets counter after window expires", async () => {
    vi.useFakeTimers();
    await store.increment("test-key", 1_000);
    vi.advanceTimersByTime(1_100);
    const result = await store.increment("test-key", 1_000);
    expect(result.count).toBe(1);
    vi.useRealTimers();
  });

  it("tracks keys independently", async () => {
    await store.increment("key-a", 60_000);
    await store.increment("key-a", 60_000);
    const result = await store.increment("key-b", 60_000);
    expect(result.count).toBe(1);
  });

  it("cleans up expired entries", async () => {
    vi.useFakeTimers();
    await store.increment("expired-key", 1_000);
    vi.advanceTimersByTime(1_100);
    store.cleanup();
    const result = await store.increment("expired-key", 1_000);
    expect(result.count).toBe(1);
    vi.useRealTimers();
  });
});

describe("getClientIp", () => {
  it("extracts IP from x-forwarded-for (first value)", () => {
    const req = new NextRequest("http://localhost/api/test", {
      headers: { "x-forwarded-for": "1.2.3.4, 5.6.7.8" },
    });
    expect(getClientIp(req)).toBe("1.2.3.4");
  });

  it("falls back to x-real-ip", () => {
    const req = new NextRequest("http://localhost/api/test", {
      headers: { "x-real-ip": "9.8.7.6" },
    });
    expect(getClientIp(req)).toBe("9.8.7.6");
  });

  it("returns 'unknown' when no IP headers", () => {
    const req = new NextRequest("http://localhost/api/test");
    expect(getClientIp(req)).toBe("unknown");
  });
});

describe("rateLimit", () => {
  beforeEach(() => {
    _resetStoreForTesting();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns null when under limit", async () => {
    const req = new NextRequest("http://localhost/api/test", {
      headers: { "x-forwarded-for": "1.2.3.4" },
    });
    const result = await rateLimit(req, {
      endpoint: "test",
      limit: 5,
      windowMs: 60_000,
      keyStrategy: "ip",
    });
    expect(result).toBeNull();
  });

  it("returns 429 response when limit exceeded", async () => {
    const req = new NextRequest("http://localhost/api/test", {
      headers: { "x-forwarded-for": "1.2.3.4" },
    });
    const config = {
      endpoint: "test",
      limit: 2,
      windowMs: 60_000,
      keyStrategy: "ip" as const,
    };

    await rateLimit(req, config);
    await rateLimit(req, config);
    const result = await rateLimit(req, config);

    expect(result).not.toBeNull();
    expect(result!.status).toBe(429);

    const body = await result!.json();
    expect(body.error).toBe("Too many requests. Please try again later.");
  });

  it("includes rate limit headers on 429", async () => {
    const req = new NextRequest("http://localhost/api/test", {
      headers: { "x-forwarded-for": "1.2.3.4" },
    });
    const config = {
      endpoint: "test",
      limit: 1,
      windowMs: 60_000,
      keyStrategy: "ip" as const,
    };

    await rateLimit(req, config);
    const result = await rateLimit(req, config);

    expect(result!.headers.get("Retry-After")).toBeTruthy();
    expect(result!.headers.get("X-RateLimit-Limit")).toBe("1");
    expect(result!.headers.get("X-RateLimit-Remaining")).toBe("0");
    expect(result!.headers.get("X-RateLimit-Reset")).toBeTruthy();
  });

  it("limits by userId when keyStrategy is 'user'", async () => {
    const req = new NextRequest("http://localhost/api/test", {
      headers: { "x-forwarded-for": "1.2.3.4" },
    });
    const config = {
      endpoint: "test",
      limit: 1,
      windowMs: 60_000,
      keyStrategy: "user" as const,
      userId: "user-123",
    };

    await rateLimit(req, config);
    const result = await rateLimit(req, config);
    expect(result).not.toBeNull();
    expect(result!.status).toBe(429);
  });

  it("'both' strategy triggers 429 via user limit across different IPs", async () => {
    const req1 = new NextRequest("http://localhost/api/test", {
      headers: { "x-forwarded-for": "1.1.1.1" },
    });
    const req2 = new NextRequest("http://localhost/api/test", {
      headers: { "x-forwarded-for": "2.2.2.2" },
    });
    const config = {
      endpoint: "both-user",
      limit: 1,
      windowMs: 60_000,
      keyStrategy: "both" as const,
      userId: "user-456",
    };

    await rateLimit(req1, config);
    const result = await rateLimit(req2, config);
    expect(result).not.toBeNull();
    expect(result!.status).toBe(429);
  });

  it("'both' strategy triggers 429 via IP limit across different users", async () => {
    const req = new NextRequest("http://localhost/api/test", {
      headers: { "x-forwarded-for": "3.3.3.3" },
    });

    await rateLimit(req, {
      endpoint: "both-ip",
      limit: 1,
      windowMs: 60_000,
      keyStrategy: "both" as const,
      userId: "user-aaa",
    });
    const result = await rateLimit(req, {
      endpoint: "both-ip",
      limit: 1,
      windowMs: 60_000,
      keyStrategy: "both" as const,
      userId: "user-bbb",
    });
    expect(result).not.toBeNull();
    expect(result!.status).toBe(429);
  });

  it("different users have independent counters", async () => {
    const req = new NextRequest("http://localhost/api/test", {
      headers: { "x-forwarded-for": "4.4.4.4" },
    });
    const baseConfig = {
      endpoint: "user-isolation",
      limit: 1,
      windowMs: 60_000,
      keyStrategy: "user" as const,
    };

    await rateLimit(req, { ...baseConfig, userId: "user-x" });
    const result = await rateLimit(req, { ...baseConfig, userId: "user-y" });
    expect(result).toBeNull();
  });

  it("resets after window expires", async () => {
    const req = new NextRequest("http://localhost/api/test", {
      headers: { "x-forwarded-for": "1.2.3.4" },
    });
    const config = {
      endpoint: "test",
      limit: 1,
      windowMs: 60_000,
      keyStrategy: "ip" as const,
    };

    await rateLimit(req, config);
    vi.advanceTimersByTime(61_000);
    const result = await rateLimit(req, config);
    expect(result).toBeNull();
  });
});
