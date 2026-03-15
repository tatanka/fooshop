import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/db", () => ({
  db: {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
  },
}));

vi.mock("@/lib/api-key", () => ({
  validateApiKey: vi.fn(),
  hasScope: vi.fn().mockReturnValue(true),
  insufficientScope: vi.fn(),
}));

import { GET } from "../route";
import { validateApiKey } from "@/lib/api-key";
import { db } from "@/db";
import { NextRequest } from "next/server";

function makeRequest(url: string) {
  return new NextRequest(new URL(url, "http://localhost:3000"));
}

describe("GET /api/admin/creators", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (validateApiKey as any).mockResolvedValue({
      type: "api_key",
      keyId: "k1",
      scopes: ["admin:*"],
      creatorId: null,
    });
  });

  it("returns all creators when no query params", async () => {
    const mockRows = [{ id: "1", name: "Alice", email: "alice@test.com" }];
    (db.select as any).mockReturnValue({
      from: vi.fn().mockResolvedValue(mockRows),
    });

    const res = await GET(makeRequest("/api/admin/creators"));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual(mockRows);
  });

  it("filters by ?q= param using ILIKE", async () => {
    const mockRows = [{ id: "1", name: "Alice" }];
    const mockWhere = vi.fn().mockResolvedValue(mockRows);
    const mockFrom = vi.fn().mockReturnValue({ where: mockWhere });
    (db.select as any).mockReturnValue({ from: mockFrom });

    const res = await GET(makeRequest("/api/admin/creators?q=alice"));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(mockWhere).toHaveBeenCalled();
    expect(body).toEqual(mockRows);
  });

  it("filters by ?overrides=active", async () => {
    const mockRows = [{ id: "1", name: "Bob", commissionOverridePercent: 0 }];
    const mockWhere = vi.fn().mockResolvedValue(mockRows);
    const mockFrom = vi.fn().mockReturnValue({ where: mockWhere });
    (db.select as any).mockReturnValue({ from: mockFrom });

    const res = await GET(makeRequest("/api/admin/creators?overrides=active"));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(mockWhere).toHaveBeenCalled();
    expect(body).toEqual(mockRows);
  });

  it("returns 401 when not authenticated", async () => {
    (validateApiKey as any).mockResolvedValue(null);

    const res = await GET(makeRequest("/api/admin/creators"));
    expect(res.status).toBe(401);
  });
});
