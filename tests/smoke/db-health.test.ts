import { describe, it, expect } from "vitest";
import { BASE_URL, STORE_SLUG, HAS_STORE_SLUG } from "./env";

describe("DB Health", () => {
  it("GET /api/products succeeds (proves DB connection)", async () => {
    const res = await fetch(`${BASE_URL}/api/products`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data)).toBe(true);
  });
});

describe.skipIf(!HAS_STORE_SLUG)("DB Health — Store", () => {
  it(`GET /api/stores/${STORE_SLUG} returns store object`, async () => {
    const res = await fetch(
      `${BASE_URL}/api/stores/${STORE_SLUG}?source=smoke`
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveProperty("name");
    expect(data).toHaveProperty("slug", STORE_SLUG);
    expect(data).toHaveProperty("products");
    expect(Array.isArray(data.products)).toBe(true);
  });
});
