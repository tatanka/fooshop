import { describe, it, expect } from "vitest";
import { uploadCreateSchema } from "../upload";

describe("uploadCreateSchema", () => {
  it("accepts valid upload with required fields", () => {
    const result = uploadCreateSchema.safeParse({
      filename: "document.pdf",
      contentType: "application/pdf",
    });
    expect(result.success).toBe(true);
  });

  it("accepts all optional fields", () => {
    const result = uploadCreateSchema.safeParse({
      filename: "cover.jpg",
      contentType: "image/jpeg",
      purpose: "cover",
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing filename", () => {
    const result = uploadCreateSchema.safeParse({
      contentType: "application/pdf",
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing contentType", () => {
    const result = uploadCreateSchema.safeParse({
      filename: "document.pdf",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid purpose", () => {
    const result = uploadCreateSchema.safeParse({
      filename: "document.pdf",
      contentType: "application/pdf",
      purpose: "thumbnail",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty filename", () => {
    const result = uploadCreateSchema.safeParse({
      filename: "",
      contentType: "application/pdf",
    });
    expect(result.success).toBe(false);
  });
});
