#!/usr/bin/env node

import { Command } from "commander";
import { loginCommand } from "./commands/login.js";
import { initCommand } from "./commands/init.js";
import { productsCommand } from "./commands/products.js";
import { ordersCommand } from "./commands/orders.js";
import { analyticsCommand } from "./commands/analytics.js";
import { configCommand } from "./commands/config-cmd.js";
import { openCommand } from "./commands/open.js";

const program = new Command();

program
  .name("fooshop")
  .description("Fooshop CLI — commerce from your terminal")
  .version("0.1.0")
  .option("--json", "Output raw JSON (where supported)");

program.addCommand(loginCommand);
program.addCommand(initCommand);
program.addCommand(productsCommand);
program.addCommand(ordersCommand);
program.addCommand(analyticsCommand);
program.addCommand(configCommand);
program.addCommand(openCommand);

program.parse();
