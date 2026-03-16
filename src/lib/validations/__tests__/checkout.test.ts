import { describe, it, expect } from "vitest";
import { checkoutCreateSchema } from "../checkout";

const validUuid = "550e8400-e29b-41d4-a716-446655440000";

describe("checkoutCreateSchema", () => {
  it("accepts valid checkout with required productId", () => {
    const result = checkoutCreateSchema.safeParse({
      productId: validUuid,
    });
    expect(result.success).toBe(true);
  });

  it("accepts all optional fields", () => {
    const result = checkoutCreateSchema.safeParse({
      productId: validUuid,
      couponCode: "SAVE10",
      referralCode: "REF123",
      source: "web",
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing productId", () => {
    const result = checkoutCreateSchema.safeParse({
      couponCode: "SAVE10",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid productId", () => {
    const result = checkoutCreateSchema.safeParse({
      productId: "not-a-uuid",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid source", () => {
    const result = checkoutCreateSchema.safeParse({
      productId: validUuid,
      source: "mobile",
    });
    expect(result.success).toBe(false);
  });
});
