import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import http from "http";

// Mock the open module before any imports that use it
vi.mock("open", () => ({
  default: vi.fn().mockResolvedValue(undefined),
}));

import { readConfig } from "../lib/config.js";
import open from "open";

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "fooshop-test-"));
  vi.stubEnv("FOOSHOP_CONFIG_DIR", tmpDir);
  vi.stubEnv("FOOSHOP_BASE_URL", "https://test.fooshop.ai");
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("login command", () => {
  it("opens browser, receives callback, saves config", async () => {
    // Import login command (uses mocked open)
    const { loginCommand } = await import("../commands/login.js");

    // Capture the URL that open() is called with so we can extract the port
    let capturedUrl = "";
    vi.mocked(open).mockImplementation(async (url: string) => {
      capturedUrl = url;
      // Simulate the browser callback after a short delay
      const parsedUrl = new URL(url);
      const port = parsedUrl.searchParams.get("port");
      setTimeout(() => {
        http.get(`http://127.0.0.1:${port}/callback?key=fsk_testkey123&email=test@example.com`);
      }, 50);
      return undefined as any;
    });

    // Run the login action directly
    await loginCommand.parseAsync(["login"], { from: "user" });

    // Verify browser was opened with correct URL
    expect(open).toHaveBeenCalledOnce();
    expect(capturedUrl).toContain("https://test.fooshop.ai/cli-auth?port=");

    // Verify config was saved
    const config = readConfig();
    expect(config).not.toBeNull();
    expect(config!.apiKey).toBe("fsk_testkey123");
    expect(config!.email).toBe("test@example.com");
    expect(config!.baseUrl).toBe("https://test.fooshop.ai");
  });

  it("exits with error on denied callback", async () => {
    const { loginCommand } = await import("../commands/login.js");

    const mockExit = vi.spyOn(process, "exit").mockImplementation(() => { throw new Error("exit"); });

    vi.mocked(open).mockImplementation(async (url: string) => {
      const parsedUrl = new URL(url);
      const port = parsedUrl.searchParams.get("port");
      setTimeout(() => {
        http.get(`http://127.0.0.1:${port}/callback?error=denied`);
      }, 50);
      return undefined as any;
    });

    await expect(loginCommand.parseAsync(["login"], { from: "user" })).rejects.toThrow("exit");
    expect(mockExit).toHaveBeenCalledWith(1);

    // Config should NOT be saved
    expect(readConfig()).toBeNull();
    mockExit.mockRestore();
  });
});
