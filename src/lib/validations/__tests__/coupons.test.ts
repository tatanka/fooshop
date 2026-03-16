import { describe, it, expect } from "vitest";
import { couponCreateSchema, couponUpdateSchema, couponValidateSchema } from "../coupons";

const validUuid = "550e8400-e29b-41d4-a716-446655440000";

describe("couponCreateSchema", () => {
  it("accepts valid coupon with required fields", () => {
    const result = couponCreateSchema.safeParse({
      discountType: "percentage",
      discountValue: 20,
    });
    expect(result.success).toBe(true);
  });

  it("accepts all optional fields", () => {
    const result = couponCreateSchema.safeParse({
      code: "SAVE20",
      discountType: "fixed",
      discountValue: 500,
      productId: validUuid,
      minAmountCents: 1000,
      maxRedemptions: 100,
      expiresAt: "2026-12-31T23:59:59.000Z",
    });
    expect(result.success).toBe(true);
  });

  it("rejects percentage discount > 100", () => {
    const result = couponCreateSchema.safeParse({
      discountType: "percentage",
      discountValue: 101,
    });
    expect(result.success).toBe(false);
  });

  it("allows fixed discount > 100", () => {
    const result = couponCreateSchema.safeParse({
      discountType: "fixed",
      discountValue: 999,
    });
    expect(result.success).toBe(true);
  });

  it("rejects non-positive discountValue", () => {
    const result = couponCreateSchema.safeParse({
      discountType: "percentage",
      discountValue: 0,
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid discountType", () => {
    const result = couponCreateSchema.safeParse({
      discountType: "flat",
      discountValue: 10,
    });
    expect(result.success).toBe(false);
  });

  it("rejects non-ISO datetime in expiresAt", () => {
    const result = couponCreateSchema.safeParse({
      discountType: "fixed",
      discountValue: 100,
      expiresAt: "2026-12-31",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid UUID in productId", () => {
    const result = couponCreateSchema.safeParse({
      discountType: "fixed",
      discountValue: 100,
      productId: "not-a-uuid",
    });
    expect(result.success).toBe(false);
  });
});

describe("couponUpdateSchema", () => {
  it("accepts partial update", () => {
    const result = couponUpdateSchema.safeParse({
      active: false,
    });
    expect(result.success).toBe(true);
  });

  it("accepts nullable fields", () => {
    const result = couponUpdateSchema.safeParse({
      maxRedemptions: null,
      expiresAt: null,
      minAmountCents: null,
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty object", () => {
    const result = couponUpdateSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});

describe("couponValidateSchema", () => {
  it("accepts valid code and productId", () => {
    const result = couponValidateSchema.safeParse({
      code: "SAVE20",
      productId: validUuid,
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing code", () => {
    const result = couponValidateSchema.safeParse({
      productId: validUuid,
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing productId", () => {
    const result = couponValidateSchema.safeParse({
      code: "SAVE20",
    });
    expect(result.success).toBe(false);
  });
});
