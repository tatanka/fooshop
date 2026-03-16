import { describe, it, expect } from "vitest";
import { z } from "zod";
import { validationError, parseBody } from "@/lib/validations/helpers";
import { NextRequest } from "next/server";

describe("validationError", () => {
  it("returns 400 with structured error details", async () => {
    const schema = z.object({ title: z.string(), age: z.number() });
    const result = schema.safeParse({ title: 123, age: "not a number" });
    expect(result.success).toBe(false);
    if (result.success) return;

    const response = validationError(result.error);
    expect(response.status).toBe(400);

    const body = await response.json();
    expect(body.error).toBe("Validation failed");
    expect(body.details).toBeInstanceOf(Array);
    expect(body.details.length).toBeGreaterThan(0);
    expect(body.details[0]).toHaveProperty("field");
    expect(body.details[0]).toHaveProperty("message");
  });

  it("joins nested paths with dots", async () => {
    const schema = z.object({ theme: z.object({ color: z.string() }) });
    const result = schema.safeParse({ theme: { color: 123 } });
    if (result.success) return;

    const response = validationError(result.error);
    const body = await response.json();
    expect(body.details[0].field).toBe("theme.color");
  });
});

describe("parseBody", () => {
  it("returns parsed JSON for valid request body", async () => {
    const req = new NextRequest("http://localhost/api/test", {
      method: "POST",
      body: JSON.stringify({ title: "hello" }),
      headers: { "Content-Type": "application/json" },
    });
    const { data, error } = await parseBody(req);
    expect(error).toBeNull();
    expect(data).toEqual({ title: "hello" });
  });

  it("returns 400 response for invalid JSON", async () => {
    const req = new NextRequest("http://localhost/api/test", {
      method: "POST",
      body: "not json",
      headers: { "Content-Type": "application/json" },
    });
    const { data, error } = await parseBody(req);
    expect(data).toBeNull();
    expect(error).not.toBeNull();
    expect(error!.status).toBe(400);
    const body = await error!.json();
    expect(body.error).toBe("Invalid JSON");
  });
});
