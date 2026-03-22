import { Command } from "commander";
import { input, confirm } from "@inquirer/prompts";
import { api } from "../lib/api.js";
import { spinner, successMsg, formatPrice } from "../lib/format.js";
import { getBaseUrl } from "../lib/config.js";
import { openBrowser } from "../lib/open.js";

interface GeneratedStore {
  storeName: string;
  storeDescription: string;
  slug: string;
  suggestedProducts: {
    title: string;
    description: string;
    suggestedPriceCents: number;
    category: string;
  }[];
  theme: Record<string, unknown>;
}

export const initCommand = new Command("init")
  .description("Create a new store with AI")
  .action(async () => {
    const description = await input({
      message: "What are you selling?",
    });

    const s = spinner("Generating your store...");

    let store: GeneratedStore;
    try {
      store = await api.post<GeneratedStore>("/api/store/generate", {
        description,
      });
      s.succeed("Store generated!");
    } catch {
      s.fail("Failed to generate store");
      return;
    }

    console.log();
    console.log(`  Store:    ${store.storeName}`);
    console.log(`  About:    ${store.storeDescription}`);
    console.log(`  URL:      ${getBaseUrl()}/${store.slug}`);

    if (store.suggestedProducts.length > 0) {
      console.log();
      console.log("  Suggested products:");
      for (const p of store.suggestedProducts) {
        console.log(`    - ${p.title} (${formatPrice(p.suggestedPriceCents)}) [${p.category}]`);
      }
    }

    console.log();

    const connectStripe = await confirm({
      message: "Connect Stripe for payments?",
      default: true,
    });

    if (connectStripe) {
      await openBrowser(`${getBaseUrl()}/dashboard/settings`);
      console.log("Complete Stripe setup in your browser.");
    } else {
      console.log("You can connect Stripe later with `fooshop config`.");
    }

    console.log();
    successMsg(`Your store is live → ${getBaseUrl()}/${store.slug}`);
  });
