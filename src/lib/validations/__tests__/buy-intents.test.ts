import { describe, it, expect } from "vitest";
import { buyIntentCreateSchema } from "../buy-intents";

const validUuid = "550e8400-e29b-41d4-a716-446655440000";

describe("buyIntentCreateSchema", () => {
  it("accepts valid productId", () => {
    const result = buyIntentCreateSchema.safeParse({
      productId: validUuid,
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing productId", () => {
    const result = buyIntentCreateSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("rejects invalid productId", () => {
    const result = buyIntentCreateSchema.safeParse({
      productId: "not-a-uuid",
    });
    expect(result.success).toBe(false);
  });
});
