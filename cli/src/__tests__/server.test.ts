import { describe, it, expect, afterEach } from "vitest";
import { startCallbackServer } from "../lib/server.js";
import http from "http";

let cleanup: (() => void) | undefined;

afterEach(() => {
  cleanup?.();
  cleanup = undefined;
});

function httpGet(url: string): Promise<{ status: number; body: string }> {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let body = "";
      res.on("data", (chunk) => (body += chunk));
      res.on("end", () => resolve({ status: res.statusCode!, body }));
    }).on("error", reject);
  });
}

describe("startCallbackServer", () => {
  it("picks a random available port", async () => {
    const { port, promise, close } = await startCallbackServer();
    cleanup = close;
    expect(port).toBeGreaterThan(0);
    expect(port).toBeLessThan(65536);
    close();
  });

  it("resolves with key and email on successful callback", async () => {
    const { port, promise, close } = await startCallbackServer();
    cleanup = close;

    const res = await httpGet(`http://127.0.0.1:${port}/callback?key=fsk_test123&email=test@example.com`);
    expect(res.status).toBe(200);
    expect(res.body).toContain("Authentication complete");

    const result = await promise;
    expect(result).toEqual({ key: "fsk_test123", email: "test@example.com" });
  });

  it("returns 400 when key param is missing", async () => {
    const { port, promise, close } = await startCallbackServer();
    cleanup = close;

    const res = await httpGet(`http://127.0.0.1:${port}/callback?email=test@example.com`);
    expect(res.status).toBe(400);
    close();
  });

  it("resolves with error on denied callback", async () => {
    const { port, promise, close } = await startCallbackServer();
    cleanup = close;

    const res = await httpGet(`http://127.0.0.1:${port}/callback?error=denied`);
    expect(res.status).toBe(200);

    const result = await promise;
    expect(result).toEqual({ error: "denied" });
  });

  it("only binds to 127.0.0.1", async () => {
    const { port, close } = await startCallbackServer();
    cleanup = close;

    const res = await httpGet(`http://127.0.0.1:${port}/callback?key=fsk_x&email=a@b.com`);
    expect(res.status).toBe(200);
  });
});
