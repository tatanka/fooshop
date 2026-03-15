import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { homedir } from "os";

// ─── Types ──────────────────────────────────────────────────────────────────

type Config = { baseUrl: string; apiKey: string };

type Creator = {
  id: string;
  email: string;
  name: string;
  slug: string;
  storeName: string | null;
  stripeConnectId: string | null;
  commissionOverridePercent: number | null;
  commissionOverrideExpiresAt: string | null;
  createdAt: string;
  productCount: number;
  orderCount: number;
  revenueCents: number;
};

// ─── Config ─────────────────────────────────────────────────────────────────

export function loadConfig(): Config {
  const baseUrl = process.env.FOOSHOP_BASE_URL;
  const apiKey = process.env.FOOSHOP_API_KEY;

  if (baseUrl && apiKey) {
    return { baseUrl: baseUrl.replace(/\/$/, ""), apiKey };
  }

  const configPath = join(homedir(), ".fooshop", "config.json");
  if (existsSync(configPath)) {
    const file = JSON.parse(readFileSync(configPath, "utf-8"));
    const merged = {
      baseUrl: (baseUrl ?? file.baseUrl ?? "").replace(/\/$/, ""),
      apiKey: apiKey ?? file.apiKey ?? "",
    };
    if (!merged.baseUrl || !merged.apiKey) {
      console.error("Missing configuration: baseUrl and apiKey must both be set.");
      console.error("Update ~/.fooshop/config.json or set FOOSHOP_BASE_URL and FOOSHOP_API_KEY.");
      process.exit(1);
    }
    return merged;
  }

  console.error("Missing configuration. Create ~/.fooshop/config.json:");
  console.error(JSON.stringify({ baseUrl: "https://fooshop-staging.onrender.com", apiKey: "fsk_..." }, null, 2));
  console.error("\nOr set FOOSHOP_BASE_URL and FOOSHOP_API_KEY environment variables.");
  process.exit(1);
}

// ─── HTTP helpers ───────────────────────────────────────────────────────────

async function handleResponse(res: Response): Promise<unknown> {
  if (res.ok) return res.json();
  const body = await res.json().catch(() => ({}));
  if (res.status === 401) throw new Error("Invalid API key");
  if (res.status === 403) throw new Error(`Insufficient permissions (requires ${(body as any).required ?? "admin scope"})`);
  if (res.status === 404) throw new Error("Not found");
  throw new Error(`Server error (${res.status})`);
}

export async function apiGet(config: Config, path: string): Promise<unknown> {
  const res = await fetch(`${config.baseUrl}${path}`, {
    headers: { Authorization: `Bearer ${config.apiKey}` },
  }).catch(() => {
    throw new Error(`Could not connect to ${config.baseUrl}`);
  });
  return handleResponse(res);
}

export async function apiPatch(config: Config, path: string, body: Record<string, unknown>): Promise<unknown> {
  const res = await fetch(`${config.baseUrl}${path}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  }).catch(() => {
    throw new Error(`Could not connect to ${config.baseUrl}`);
  });
  return handleResponse(res);
}

// ─── Helpers ────────────────────────────────────────────────────────────────

export function parseDuration(duration: string): Date | null {
  const months: Record<string, number> = {
    "3months": 3,
    "6months": 6,
    "12months": 12,
  };
  if (duration === "permanent") return null;
  const m = months[duration];
  if (!m) throw new Error(`Invalid duration: ${duration}. Use: 3months, 6months, 12months, permanent`);
  const date = new Date();
  date.setMonth(date.getMonth() + m);
  return date;
}

function formatOverride(c: Creator): string {
  if (c.commissionOverridePercent === null) return "none";
  if (c.commissionOverrideExpiresAt === null) return `${c.commissionOverridePercent}% until permanent`;
  const expires = new Date(c.commissionOverrideExpiresAt);
  if (expires <= new Date()) return "none (expired)";
  return `${c.commissionOverridePercent}% until ${expires.toLocaleDateString()}`;
}

function formatCreator(c: Creator): string {
  return [
    `  Name:       ${c.name}`,
    `  Email:      ${c.email}`,
    `  Slug:       ${c.slug}`,
    `  Store:      ${c.storeName ?? "(no store name)"}`,
    `  Stripe:     ${c.stripeConnectId ?? "(not connected)"}`,
    `  Override:   ${formatOverride(c)}`,
    `  Created:    ${new Date(c.createdAt).toLocaleDateString()}`,
  ].join("\n");
}

export async function findCreator(config: Config, query: string): Promise<Creator> {
  const results = (await apiGet(config, `/api/admin/creators?q=${encodeURIComponent(query)}`)) as Creator[];
  const match = results.find((c) => c.email === query || c.slug === query);
  if (!match) throw new Error(`Creator not found: ${query}`);
  return match;
}

// ─── Commands ───────────────────────────────────────────────────────────────

async function cmdSearch(config: Config, query: string) {
  const results = (await apiGet(config, `/api/admin/creators?q=${encodeURIComponent(query)}`)) as Creator[];

  if (results.length === 0) {
    console.log("No creators found.");
    return;
  }

  console.log(`Found ${results.length} creator(s):\n`);
  for (const c of results) {
    console.log(`- ${c.name} (${c.email}) — slug: ${c.slug}`);
  }
}

async function cmdInfo(config: Config, query: string) {
  const c = await findCreator(config, query);

  console.log(`Creator: ${c.name}\n`);
  console.log(formatCreator(c));
  console.log(`  Products:   ${c.productCount}`);
  console.log(`  Orders:     ${c.orderCount}`);
}

async function cmdSetCommission(config: Config, query: string, percentStr: string, duration: string) {
  const percent = parseInt(percentStr, 10);
  if (isNaN(percent) || percent < 0 || percent > 100) {
    throw new Error("Percent must be an integer between 0 and 100.");
  }

  const expiresAt = parseDuration(duration);
  const c = await findCreator(config, query);

  await apiPatch(config, `/api/admin/creators/${c.id}`, {
    commissionOverridePercent: percent,
    commissionOverrideExpiresAt: expiresAt?.toISOString() ?? null,
  });

  const expiryLabel = expiresAt ? expiresAt.toLocaleDateString() : "permanent";
  console.log(`Set ${percent}% commission for ${c.name} (${c.email}), expires: ${expiryLabel}`);
}

async function cmdRemoveCommission(config: Config, query: string) {
  const c = await findCreator(config, query);

  await apiPatch(config, `/api/admin/creators/${c.id}`, {
    commissionOverridePercent: null,
    commissionOverrideExpiresAt: null,
  });

  console.log(`Removed commission override for ${c.name} (${c.email}). Back to default 5%.`);
}

async function cmdListOverrides(config: Config) {
  const results = (await apiGet(config, "/api/admin/creators?overrides=active")) as Creator[];

  if (results.length === 0) {
    console.log("No active commission overrides.");
    return;
  }

  console.log(`${results.length} active override(s):\n`);
  for (const c of results) {
    const expiry = c.commissionOverrideExpiresAt
      ? new Date(c.commissionOverrideExpiresAt).toLocaleDateString()
      : "permanent";
    console.log(`- ${c.name} (${c.email}): ${c.commissionOverridePercent}% until ${expiry}`);
  }
}

// ─── Main ───────────────────────────────────────────────────────────────────

function main() {
  const [command, ...args] = process.argv.slice(2);

  if (!command || !["search", "info", "set-commission", "remove-commission", "list-overrides"].includes(command)) {
    console.log("Usage:");
    console.log("  creators-admin search <query>");
    console.log("  creators-admin info <email-or-slug>");
    console.log("  creators-admin set-commission <email-or-slug> <percent> <duration>");
    console.log("  creators-admin remove-commission <email-or-slug>");
    console.log("  creators-admin list-overrides");
    console.log("\nDurations: 3months, 6months, 12months, permanent");
    process.exit(command ? 1 : 0);
  }

  const config = loadConfig();

  const commands: Record<string, () => Promise<void>> = {
    search: () => cmdSearch(config, args[0]),
    info: () => cmdInfo(config, args[0]),
    "set-commission": () => cmdSetCommission(config, args[0], args[1], args[2]),
    "remove-commission": () => cmdRemoveCommission(config, args[0]),
    "list-overrides": () => cmdListOverrides(config),
  };

  commands[command]()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("Error:", err.message);
      process.exit(1);
    });
}

const isMainModule = process.argv[1]?.endsWith("creators-admin.ts") || process.argv[1]?.endsWith("creators-admin.js");
if (isMainModule) {
  main();
}
