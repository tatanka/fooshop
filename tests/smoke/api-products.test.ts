import { describe, it, expect } from "vitest";
import { BASE_URL, PRODUCT_SLUG, HAS_PRODUCT_SLUG } from "./env";

describe("API Products", () => {
  it("GET /api/products returns 200 with JSON array", async () => {
    const res = await fetch(`${BASE_URL}/api/products`);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("application/json");
    const data = await res.json();
    expect(Array.isArray(data)).toBe(true);
  });

  it("GET /api/products?category=ebook returns 200 with JSON array", async () => {
    const res = await fetch(`${BASE_URL}/api/products?category=ebook`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data)).toBe(true);
  });
});

describe.skipIf(!HAS_PRODUCT_SLUG)("API Product By Slug", () => {
  it(`GET /api/products/by-slug/${PRODUCT_SLUG} returns correct shape`, async () => {
    const res = await fetch(
      `${BASE_URL}/api/products/by-slug/${PRODUCT_SLUG}?source=smoke`
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveProperty("id");
    expect(data).toHaveProperty("title");
    expect(data).toHaveProperty("priceCents");
    expect(data).toHaveProperty("creatorSlug");
  });
});
