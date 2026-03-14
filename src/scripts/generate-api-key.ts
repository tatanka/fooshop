import "dotenv/config";
import { db } from "../db";
import { apiKeys } from "../db/schema";
import { generateApiKey } from "../lib/api-key";

const ADMIN_SCOPES = [
  "admin:read:creators",
  "admin:read:orders",
  "admin:read:products",
  "admin:read:analytics",
  "admin:write:creators",
  "admin:write:coupons",
];

async function main() {
  const name = process.argv[2] || "HubSpot CRM";

  const { key, prefix, hash } = generateApiKey();

  await db.insert(apiKeys).values({
    name,
    keyHash: hash,
    keyPrefix: prefix,
    scopes: ADMIN_SCOPES,
    creatorId: null,
  });

  console.log("API key created successfully!");
  console.log(`  Name:   ${name}`);
  console.log(`  Key:    ${key}`);
  console.log(`  Prefix: ${prefix}`);
  console.log(`  Scopes: ${ADMIN_SCOPES.join(", ")}`);
  console.log("");
  console.log("Save this key now - it cannot be retrieved later.");

  process.exit(0);
}

main().catch((err) => {
  console.error("Failed:", err);
  process.exit(1);
});
