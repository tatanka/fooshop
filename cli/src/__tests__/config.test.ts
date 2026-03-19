import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { readConfig, writeConfig, getApiKey, getBaseUrl } from "../lib/config.js";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

// Use a temp dir to avoid touching real ~/.fooshop
let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "fooshop-test-"));
  vi.stubEnv("FOOSHOP_CONFIG_DIR", tmpDir);
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
  vi.unstubAllEnvs();
});

describe("readConfig", () => {
  it("returns null when config file does not exist", () => {
    expect(readConfig()).toBeNull();
  });

  it("reads existing config file", () => {
    const config = { apiKey: "fsk_test123", baseUrl: "https://fooshop.ai", email: "test@example.com" };
    fs.writeFileSync(path.join(tmpDir, "config.json"), JSON.stringify(config));
    expect(readConfig()).toEqual(config);
  });

  it("returns null for malformed JSON", () => {
    fs.writeFileSync(path.join(tmpDir, "config.json"), "not json");
    expect(readConfig()).toBeNull();
  });
});

describe("writeConfig", () => {
  it("creates directory and writes config", () => {
    const nestedDir = path.join(tmpDir, "nested");
    vi.stubEnv("FOOSHOP_CONFIG_DIR", nestedDir);
    writeConfig({ apiKey: "fsk_abc", baseUrl: "https://fooshop.ai", email: "a@b.com" });
    const content = JSON.parse(fs.readFileSync(path.join(nestedDir, "config.json"), "utf-8"));
    expect(content.apiKey).toBe("fsk_abc");
  });
});

describe("getApiKey", () => {
  it("returns env var over config file", () => {
    vi.stubEnv("FOOSHOP_API_KEY", "fsk_from_env");
    const config = { apiKey: "fsk_from_file", baseUrl: "https://fooshop.ai", email: "t@t.com" };
    fs.writeFileSync(path.join(tmpDir, "config.json"), JSON.stringify(config));
    expect(getApiKey()).toBe("fsk_from_env");
  });

  it("returns config file value when env not set", () => {
    const config = { apiKey: "fsk_from_file", baseUrl: "https://fooshop.ai", email: "t@t.com" };
    fs.writeFileSync(path.join(tmpDir, "config.json"), JSON.stringify(config));
    expect(getApiKey()).toBe("fsk_from_file");
  });

  it("returns null when nothing is set", () => {
    expect(getApiKey()).toBeNull();
  });
});

describe("getBaseUrl", () => {
  it("returns env var over config file", () => {
    vi.stubEnv("FOOSHOP_BASE_URL", "https://staging.fooshop.ai");
    expect(getBaseUrl()).toBe("https://staging.fooshop.ai");
  });

  it("returns config value when env not set", () => {
    const config = { apiKey: "fsk_x", baseUrl: "https://custom.fooshop.ai", email: "t@t.com" };
    fs.writeFileSync(path.join(tmpDir, "config.json"), JSON.stringify(config));
    expect(getBaseUrl()).toBe("https://custom.fooshop.ai");
  });

  it("returns default when nothing is set", () => {
    expect(getBaseUrl()).toBe("https://fooshop.ai");
  });
});
