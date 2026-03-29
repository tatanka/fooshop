import { Command } from "commander";
import chalk from "chalk";
import { readConfig, getBaseUrl } from "../lib/config.js";
import { api } from "../lib/api.js";

interface StoreInfo {
  slug: string;
  storeName: string;
  stripeConnectId: string | null;
}

export const configCommand = new Command("config")
  .description("Show current configuration")
  .action(async () => {
    const config = readConfig();
    const baseUrl = getBaseUrl();

    console.log(chalk.bold("\n  Configuration\n"));
    console.log(`  Email:    ${config?.email || chalk.gray("Not logged in")}`);
    console.log(`  API URL:  ${baseUrl}`);

    try {
      const store = await api.get<StoreInfo>("/api/store");
      console.log(
        `  Stripe:   ${store.stripeConnectId ? chalk.green("Connected") : chalk.yellow("Not connected")}`
      );
      console.log(`  Store:    ${baseUrl}/${store.slug}`);
    } catch {
      console.log(`  Store:    ${chalk.gray("Not set up yet. Run `fooshop init`")}`);
    }

    console.log();
  });
