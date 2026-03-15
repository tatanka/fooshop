import "dotenv/config";
import { db } from "../db";
import { creators, products, orders } from "../db/schema";
import { eq, or, ilike, isNotNull, count } from "drizzle-orm";
import { isOverrideActive } from "../lib/commission";

type Creator = typeof creators.$inferSelect;

// ─── Helpers ────────────────────────────────────────────────────────────────

function parseDuration(duration: string): Date | null {
  const months: Record<string, number> = {
    "3months": 3,
    "6months": 6,
    "12months": 12,
  };
  if (duration === "permanent") return null;
  const m = months[duration];
  if (!m) {
    console.error(`Invalid duration: ${duration}. Use: 3months, 6months, 12months, permanent`);
    process.exit(1);
  }
  const date = new Date();
  date.setMonth(date.getMonth() + m);
  return date;
}

function formatCreator(c: Creator): string {
  const override = isOverrideActive(c.commissionOverridePercent, c.commissionOverrideExpiresAt)
    ? `${c.commissionOverridePercent}% until ${c.commissionOverrideExpiresAt?.toLocaleDateString() ?? "permanent"}`
    : "none";
  return [
    `  Name:       ${c.name}`,
    `  Email:      ${c.email}`,
    `  Slug:       ${c.slug}`,
    `  Store:      ${c.storeName ?? "(no store name)"}`,
    `  Stripe:     ${c.stripeConnectId ?? "(not connected)"}`,
    `  Override:   ${override}`,
    `  Created:    ${c.createdAt.toLocaleDateString()}`,
  ].join("\n");
}

async function findCreator(query: string): Promise<Creator> {
  const result = await db
    .select()
    .from(creators)
    .where(
      or(
        eq(creators.email, query),
        eq(creators.slug, query)
      )
    )
    .then((rows) => rows[0]);

  if (!result) {
    console.error(`Creator not found: ${query}`);
    process.exit(1);
  }
  return result;
}

// ─── Commands ───────────────────────────────────────────────────────────────

async function cmdSearch(query: string) {
  const results = await db
    .select()
    .from(creators)
    .where(
      or(
        ilike(creators.name, `%${query}%`),
        ilike(creators.email, `%${query}%`),
        ilike(creators.slug, `%${query}%`)
      )
    );

  if (results.length === 0) {
    console.log("No creators found.");
    return;
  }

  console.log(`Found ${results.length} creator(s):\n`);
  for (const c of results) {
    console.log(`- ${c.name} (${c.email}) — slug: ${c.slug}`);
  }
}

async function cmdInfo(query: string) {
  const c = await findCreator(query);

  const [productCount] = await db
    .select({ value: count() })
    .from(products)
    .where(eq(products.creatorId, c.id));

  const [orderCount] = await db
    .select({ value: count() })
    .from(orders)
    .where(eq(orders.creatorId, c.id));

  console.log(`Creator: ${c.name}\n`);
  console.log(formatCreator(c));
  console.log(`  Products:   ${productCount.value}`);
  console.log(`  Orders:     ${orderCount.value}`);
}

async function cmdSetCommission(query: string, percentStr: string, duration: string) {
  const percent = parseInt(percentStr, 10);
  if (isNaN(percent) || percent < 0 || percent > 100) {
    console.error("Percent must be an integer between 0 and 100.");
    process.exit(1);
  }

  const expiresAt = parseDuration(duration);
  const c = await findCreator(query);

  await db
    .update(creators)
    .set({
      commissionOverridePercent: percent,
      commissionOverrideExpiresAt: expiresAt,
    })
    .where(eq(creators.id, c.id));

  const expiryLabel = expiresAt ? expiresAt.toLocaleDateString() : "permanent";
  console.log(`Set ${percent}% commission for ${c.name} (${c.email}), expires: ${expiryLabel}`);
}

async function cmdRemoveCommission(query: string) {
  const c = await findCreator(query);

  await db
    .update(creators)
    .set({
      commissionOverridePercent: null,
      commissionOverrideExpiresAt: null,
    })
    .where(eq(creators.id, c.id));

  console.log(`Removed commission override for ${c.name} (${c.email}). Back to default 5%.`);
}

async function cmdListOverrides() {
  const results = await db
    .select()
    .from(creators)
    .where(isNotNull(creators.commissionOverridePercent));

  const active = results.filter((c) => isOverrideActive(c.commissionOverridePercent, c.commissionOverrideExpiresAt));

  if (active.length === 0) {
    console.log("No active commission overrides.");
    return;
  }

  console.log(`${active.length} active override(s):\n`);
  for (const c of active) {
    const expiry = c.commissionOverrideExpiresAt?.toLocaleDateString() ?? "permanent";
    console.log(`- ${c.name} (${c.email}): ${c.commissionOverridePercent}% until ${expiry}`);
  }
}

// ─── Main ───────────────────────────────────────────────────────────────────

const [command, ...args] = process.argv.slice(2);

const commands: Record<string, () => Promise<void>> = {
  search: () => cmdSearch(args[0]),
  info: () => cmdInfo(args[0]),
  "set-commission": () => cmdSetCommission(args[0], args[1], args[2]),
  "remove-commission": () => cmdRemoveCommission(args[0]),
  "list-overrides": () => cmdListOverrides(),
};

if (!command || !commands[command]) {
  console.log("Usage:");
  console.log("  creators-admin search <query>");
  console.log("  creators-admin info <email-or-slug>");
  console.log("  creators-admin set-commission <email-or-slug> <percent> <duration>");
  console.log("  creators-admin remove-commission <email-or-slug>");
  console.log("  creators-admin list-overrides");
  console.log("\nDurations: 3months, 6months, 12months, permanent");
  process.exit(command ? 1 : 0);
}

commands[command]()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Error:", err);
    process.exit(1);
  });
