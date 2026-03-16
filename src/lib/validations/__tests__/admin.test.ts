import { describe, it, expect } from "vitest";
import { adminCouponCreateSchema, adminCreatorUpdateSchema } from "../admin";

const validUuid = "550e8400-e29b-41d4-a716-446655440000";

describe("adminCouponCreateSchema", () => {
  it("accepts valid coupon with required fields", () => {
    const result = adminCouponCreateSchema.safeParse({
      creatorId: validUuid,
      discountType: "percentage",
      discountValue: 20,
    });
    expect(result.success).toBe(true);
  });

  it("requires creatorId", () => {
    const result = adminCouponCreateSchema.safeParse({
      discountType: "percentage",
      discountValue: 20,
    });
    expect(result.success).toBe(false);
  });

  it("rejects percentage discount > 100", () => {
    const result = adminCouponCreateSchema.safeParse({
      creatorId: validUuid,
      discountType: "percentage",
      discountValue: 101,
    });
    expect(result.success).toBe(false);
  });

  it("accepts minAmountCents of 0", () => {
    const result = adminCouponCreateSchema.safeParse({
      creatorId: validUuid,
      discountType: "fixed",
      discountValue: 500,
      minAmountCents: 0,
    });
    expect(result.success).toBe(true);
  });

  it("accepts fixed discount > 100", () => {
    const result = adminCouponCreateSchema.safeParse({
      creatorId: validUuid,
      discountType: "fixed",
      discountValue: 9999,
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid creatorId", () => {
    const result = adminCouponCreateSchema.safeParse({
      creatorId: "not-a-uuid",
      discountType: "fixed",
      discountValue: 100,
    });
    expect(result.success).toBe(false);
  });
});

describe("adminCreatorUpdateSchema", () => {
  it("accepts partial update with name", () => {
    const result = adminCreatorUpdateSchema.safeParse({
      name: "Jane Creator",
    });
    expect(result.success).toBe(true);
  });

  it("accepts commission override fields", () => {
    const result = adminCreatorUpdateSchema.safeParse({
      commissionOverridePercent: 10,
      commissionOverrideExpiresAt: "2026-12-31T23:59:59.000Z",
    });
    expect(result.success).toBe(true);
  });

  it("accepts nullable commission override", () => {
    const result = adminCreatorUpdateSchema.safeParse({
      commissionOverridePercent: null,
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty object", () => {
    const result = adminCreatorUpdateSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("rejects invalid email", () => {
    const result = adminCreatorUpdateSchema.safeParse({
      email: "not-an-email",
    });
    expect(result.success).toBe(false);
  });

  it("rejects commissionOverridePercent > 100", () => {
    const result = adminCreatorUpdateSchema.safeParse({
      commissionOverridePercent: 101,
    });
    expect(result.success).toBe(false);
  });

  it("rejects commissionOverridePercent < 0", () => {
    const result = adminCreatorUpdateSchema.safeParse({
      commissionOverridePercent: -1,
    });
    expect(result.success).toBe(false);
  });
});
