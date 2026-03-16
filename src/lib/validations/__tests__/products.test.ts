import { describe, it, expect } from "vitest";
import { productCreateSchema, productUpdateSchema } from "../products";

describe("productCreateSchema", () => {
  it("accepts valid product with required fields only", () => {
    const result = productCreateSchema.safeParse({
      title: "My Product",
      priceCents: 999,
    });
    expect(result.success).toBe(true);
  });

  it("accepts all optional fields", () => {
    const result = productCreateSchema.safeParse({
      title: "My Product",
      description: "A description",
      priceCents: 999,
      category: "templates",
      status: "published",
      fileUrl: "https://example.com/file.pdf",
      coverImageUrl: "https://example.com/cover.jpg",
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing title", () => {
    const result = productCreateSchema.safeParse({
      priceCents: 999,
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty title", () => {
    const result = productCreateSchema.safeParse({
      title: "",
      priceCents: 999,
    });
    expect(result.success).toBe(false);
  });

  it("rejects negative priceCents", () => {
    const result = productCreateSchema.safeParse({
      title: "My Product",
      priceCents: -1,
    });
    expect(result.success).toBe(false);
  });

  it("rejects non-integer priceCents", () => {
    const result = productCreateSchema.safeParse({
      title: "My Product",
      priceCents: 9.99,
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid status", () => {
    const result = productCreateSchema.safeParse({
      title: "My Product",
      priceCents: 999,
      status: "active",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid fileUrl", () => {
    const result = productCreateSchema.safeParse({
      title: "My Product",
      priceCents: 999,
      fileUrl: "not-a-url",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid category", () => {
    const result = productCreateSchema.safeParse({
      title: "My Product",
      priceCents: 999,
      category: "invalid-category",
    });
    expect(result.success).toBe(false);
  });

  it("allows priceCents of 0", () => {
    const result = productCreateSchema.safeParse({
      title: "My Product",
      priceCents: 0,
    });
    expect(result.success).toBe(true);
  });
});

describe("productUpdateSchema", () => {
  it("accepts partial updates", () => {
    const result = productUpdateSchema.safeParse({
      title: "Updated Title",
    });
    expect(result.success).toBe(true);
  });

  it("accepts empty object", () => {
    const result = productUpdateSchema.safeParse({});
    expect(result.success).toBe(true);
  });
});
