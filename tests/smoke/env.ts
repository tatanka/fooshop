export const BASE_URL = (
  process.env.SMOKE_TEST_URL || "http://localhost:3000"
).replace(/\/+$/, "");

export const STORE_SLUG = process.env.SMOKE_TEST_STORE_SLUG || "";
export const PRODUCT_SLUG = process.env.SMOKE_TEST_PRODUCT_SLUG || "";

export const HAS_STORE_SLUG = STORE_SLUG.length > 0;
export const HAS_PRODUCT_SLUG = PRODUCT_SLUG.length > 0;

if (!HAS_STORE_SLUG) {
  console.warn(
    "⚠ SMOKE_TEST_STORE_SLUG not set — store/product page tests will be skipped"
  );
}
if (!HAS_PRODUCT_SLUG) {
  console.warn(
    "⚠ SMOKE_TEST_PRODUCT_SLUG not set — product-specific tests will be skipped"
  );
}
