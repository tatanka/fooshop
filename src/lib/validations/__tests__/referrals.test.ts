import { describe, it, expect } from "vitest";
import { referralCreateSchema, referralUpdateSchema } from "../referrals";

const validUuid = "550e8400-e29b-41d4-a716-446655440000";

describe("referralCreateSchema", () => {
  it("accepts valid referral with required fields", () => {
    const result = referralCreateSchema.safeParse({
      affiliateName: "John Doe",
      commissionPercent: 10,
    });
    expect(result.success).toBe(true);
  });

  it("accepts all optional fields", () => {
    const result = referralCreateSchema.safeParse({
      code: "JOHN10",
      affiliateName: "John Doe",
      affiliateEmail: "john@example.com",
      productId: validUuid,
      commissionPercent: 15,
    });
    expect(result.success).toBe(true);
  });

  it("rejects commissionPercent < 1", () => {
    const result = referralCreateSchema.safeParse({
      affiliateName: "John Doe",
      commissionPercent: 0,
    });
    expect(result.success).toBe(false);
  });

  it("rejects commissionPercent > 100", () => {
    const result = referralCreateSchema.safeParse({
      affiliateName: "John Doe",
      commissionPercent: 101,
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid email", () => {
    const result = referralCreateSchema.safeParse({
      affiliateName: "John Doe",
      affiliateEmail: "not-an-email",
      commissionPercent: 10,
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty affiliateName", () => {
    const result = referralCreateSchema.safeParse({
      affiliateName: "",
      commissionPercent: 10,
    });
    expect(result.success).toBe(false);
  });
});

describe("referralUpdateSchema", () => {
  it("accepts partial update", () => {
    const result = referralUpdateSchema.safeParse({
      affiliateName: "Jane Doe",
    });
    expect(result.success).toBe(true);
  });

  it("accepts nullable email", () => {
    const result = referralUpdateSchema.safeParse({
      affiliateEmail: null,
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty object", () => {
    const result = referralUpdateSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});
