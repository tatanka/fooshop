import { describe, it, expect } from "vitest";
import { BASE_URL } from "./env";

describe("Auth", () => {
  it("GET /api/auth/providers returns google provider", async () => {
    const res = await fetch(`${BASE_URL}/api/auth/providers`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveProperty("google");
    expect(data.google).toHaveProperty("id", "google");
  });

  it("GET /api/auth/csrf returns csrfToken", async () => {
    const res = await fetch(`${BASE_URL}/api/auth/csrf`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveProperty("csrfToken");
    expect(typeof data.csrfToken).toBe("string");
    expect(data.csrfToken.length).toBeGreaterThan(0);
  });

  it("GET /dashboard redirects to sign-in when unauthenticated", async () => {
    const res = await fetch(`${BASE_URL}/dashboard`, { redirect: "manual" });
    expect(res.status).toBe(307);
    const location = res.headers.get("location") || "";
    expect(location).toContain("/api/auth/signin");
  });
});
