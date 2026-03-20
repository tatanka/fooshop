import { Command } from "commander";
import { readConfig, writeConfig, getBaseUrl } from "../lib/config.js";
import { startCallbackServer } from "../lib/server.js";
import { openBrowser } from "../lib/open.js";

const TIMEOUT_MS = 120_000;

export const loginCommand = new Command("login")
  .description("Authenticate with Fooshop via browser")
  .allowExcessArguments(true)
  .action(async () => {
    const existing = readConfig();
    if (existing?.apiKey) {
      console.log(`Currently logged in as ${existing.email}`);
      console.log("Running login again will replace the existing API key.\n");
    }

    const { port, promise, close } = await startCallbackServer();
    const baseUrl = getBaseUrl();
    const authUrl = `${baseUrl}/cli-auth?port=${port}`;

    console.log("Opening browser for authentication...");
    await openBrowser(authUrl);
    console.log("Waiting for authentication...\n");

    const timeout = setTimeout(() => {
      close();
      console.error("\nAuthentication timed out after 2 minutes.");
      console.error("Please try again with: fooshop login");
      process.exit(1);
    }, TIMEOUT_MS);

    const result = await promise;
    clearTimeout(timeout);
    close();

    if ("error" in result) {
      console.error(`\nAuthentication denied: ${result.error}`);
      process.exit(1);
    }

    writeConfig({
      apiKey: result.key,
      baseUrl,
      email: result.email,
    });

    console.log(`✓ Logged in as ${result.email}`);
  });
