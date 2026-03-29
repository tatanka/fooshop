import { Command } from "commander";
import { api } from "../lib/api.js";
import { getBaseUrl } from "../lib/config.js";
import { openBrowser } from "../lib/open.js";
import { successMsg } from "../lib/format.js";

interface StoreInfo {
  slug: string;
}

export const openCommand = new Command("open")
  .description("Open your store in the browser")
  .action(async () => {
    const store = await api.get<StoreInfo>("/api/store");
    const url = `${getBaseUrl()}/${store.slug}`;
    await openBrowser(url);
    successMsg(`Opening ${url}`);
  });
