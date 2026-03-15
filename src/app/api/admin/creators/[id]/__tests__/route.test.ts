import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/db", () => ({
  db: {},
}));

vi.mock("@/lib/api-key", () => ({
  validateApiKey: vi.fn(),
  hasScope: vi.fn().mockReturnValue(true),
  insufficientScope: vi.fn(),
}));

import { PATCH } from "../route";
import { validateApiKey } from "@/lib/api-key";
import { db } from "@/db";
import { NextRequest } from "next/server";

function makePatchRequest(body: Record<string, unknown>) {
  return new NextRequest(new URL("http://localhost:3000/api/admin/creators/uuid-1"), {
    method: "PATCH",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

const mockParams = Promise.resolve({ id: "uuid-1" });

describe("PATCH /api/admin/creators/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (validateApiKey as any).mockResolvedValue({
      type: "api_key",
      keyId: "k1",
      scopes: ["admin:*"],
      creatorId: null,
    });
  });

  it("accepts commissionOverridePercent field", async () => {
    const updated = { id: "uuid-1", commissionOverridePercent: 0 };
    (db as any).update = vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([updated]),
        }),
      }),
    });

    const res = await PATCH(
      makePatchRequest({ commissionOverridePercent: 0 }),
      { params: mockParams }
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.commissionOverridePercent).toBe(0);
  });

  it("accepts commissionOverrideExpiresAt field", async () => {
    const expires = "2026-09-15T00:00:00.000Z";
    const updated = { id: "uuid-1", commissionOverrideExpiresAt: expires };
    (db as any).update = vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([updated]),
        }),
      }),
    });

    const res = await PATCH(
      makePatchRequest({ commissionOverrideExpiresAt: expires }),
      { params: mockParams }
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.commissionOverrideExpiresAt).toBe(expires);
  });

  it("accepts null values to remove override", async () => {
    const updated = { id: "uuid-1", commissionOverridePercent: null, commissionOverrideExpiresAt: null };
    (db as any).update = vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([updated]),
        }),
      }),
    });

    const res = await PATCH(
      makePatchRequest({ commissionOverridePercent: null, commissionOverrideExpiresAt: null }),
      { params: mockParams }
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.commissionOverridePercent).toBeNull();
  });

  it("returns 401 when not authenticated", async () => {
    (validateApiKey as any).mockResolvedValue(null);

    const res = await PATCH(
      makePatchRequest({ commissionOverridePercent: 0 }),
      { params: mockParams }
    );
    expect(res.status).toBe(401);
  });
});
