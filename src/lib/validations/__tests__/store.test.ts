import { describe, it, expect } from "vitest";
import {
  storeUpdateSchema,
  themeSchema,
  themeUpdateSchema,
  themeGenerateSchema,
  storeGenerateSchema,
} from "../store";

const validTheme = {
  primaryColor: "#1a2b3c",
  secondaryColor: "#ffffff",
  backgroundColor: "#000000",
  textColor: "#333333",
  accentColor: "#ff6600",
  fontFamily: "sans",
  heroStyle: "gradient",
  layout: "grid",
};

describe("storeUpdateSchema", () => {
  it("accepts valid store name", () => {
    const result = storeUpdateSchema.safeParse({ storeName: "My Store" });
    expect(result.success).toBe(true);
  });

  it("accepts empty object", () => {
    const result = storeUpdateSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it("rejects storeName longer than 100 chars", () => {
    const result = storeUpdateSchema.safeParse({
      storeName: "a".repeat(101),
    });
    expect(result.success).toBe(false);
  });
});

describe("themeSchema", () => {
  it("accepts valid theme", () => {
    const result = themeSchema.safeParse(validTheme);
    expect(result.success).toBe(true);
  });

  it("rejects invalid hex color", () => {
    const result = themeSchema.safeParse({
      ...validTheme,
      primaryColor: "red",
    });
    expect(result.success).toBe(false);
  });

  it("rejects 3-digit hex color", () => {
    const result = themeSchema.safeParse({
      ...validTheme,
      primaryColor: "#fff",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid fontFamily", () => {
    const result = themeSchema.safeParse({
      ...validTheme,
      fontFamily: "cursive",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid heroStyle", () => {
    const result = themeSchema.safeParse({
      ...validTheme,
      heroStyle: "image",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid layout", () => {
    const result = themeSchema.safeParse({
      ...validTheme,
      layout: "masonry",
    });
    expect(result.success).toBe(false);
  });
});

describe("themeUpdateSchema", () => {
  it("accepts valid theme wrapped in theme key", () => {
    const result = themeUpdateSchema.safeParse({ theme: validTheme });
    expect(result.success).toBe(true);
  });

  it("rejects missing theme key", () => {
    const result = themeUpdateSchema.safeParse(validTheme);
    expect(result.success).toBe(false);
  });
});

describe("themeGenerateSchema", () => {
  it("accepts valid prompt", () => {
    const result = themeGenerateSchema.safeParse({ prompt: "Make it dark and modern" });
    expect(result.success).toBe(true);
  });

  it("rejects empty prompt", () => {
    const result = themeGenerateSchema.safeParse({ prompt: "" });
    expect(result.success).toBe(false);
  });
});

describe("storeGenerateSchema", () => {
  it("accepts valid description", () => {
    const result = storeGenerateSchema.safeParse({ description: "A store for digital art" });
    expect(result.success).toBe(true);
  });

  it("rejects empty description", () => {
    const result = storeGenerateSchema.safeParse({ description: "" });
    expect(result.success).toBe(false);
  });
});
