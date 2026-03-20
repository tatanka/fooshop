import * as fs from "fs";
import * as path from "path";
import * as os from "os";

export interface FooshopConfig {
  apiKey: string;
  baseUrl: string;
  email: string;
}

const DEFAULT_BASE_URL = "https://fooshop.ai";

function getConfigDir(): string {
  return process.env.FOOSHOP_CONFIG_DIR || path.join(os.homedir(), ".fooshop");
}

function getConfigPath(): string {
  return path.join(getConfigDir(), "config.json");
}

export function readConfig(): FooshopConfig | null {
  try {
    const raw = fs.readFileSync(getConfigPath(), "utf-8");
    return JSON.parse(raw) as FooshopConfig;
  } catch {
    return null;
  }
}

export function writeConfig(config: FooshopConfig): void {
  const dir = getConfigDir();
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(getConfigPath(), JSON.stringify(config, null, 2) + "\n", {
    mode: 0o600,
  });
}

export function getApiKey(): string | null {
  return process.env.FOOSHOP_API_KEY || readConfig()?.apiKey || null;
}

export function getBaseUrl(): string {
  return process.env.FOOSHOP_BASE_URL || readConfig()?.baseUrl || DEFAULT_BASE_URL;
}
