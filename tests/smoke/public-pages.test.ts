import { describe, it, expect } from "vitest";
import {
  BASE_URL,
  STORE_SLUG,
  PRODUCT_SLUG,
  HAS_STORE_SLUG,
  HAS_PRODUCT_SLUG,
} from "./env";

describe("Public Pages", () => {
  it("GET / returns 200", async () => {
    const res = await fetch(`${BASE_URL}/`);
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain("</html>");
  });

  it("GET /explore returns 200", async () => {
    const res = await fetch(`${BASE_URL}/explore`);
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain("</html>");
  });
});

describe.skipIf(!HAS_STORE_SLUG)("Store Page", () => {
  it(`GET /${STORE_SLUG} returns 200`, async () => {
    const res = await fetch(`${BASE_URL}/${STORE_SLUG}`);
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain("</html>");
  });
});

describe.skipIf(!HAS_STORE_SLUG || !HAS_PRODUCT_SLUG)("Product Page", () => {
  it(`GET /${STORE_SLUG}/${PRODUCT_SLUG} returns 200`, async () => {
    const res = await fetch(`${BASE_URL}/${STORE_SLUG}/${PRODUCT_SLUG}`);
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain("</html>");
  });
});
