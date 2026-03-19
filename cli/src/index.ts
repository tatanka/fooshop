#!/usr/bin/env node

import { Command } from "commander";
import { loginCommand } from "./commands/login.js";

const program = new Command();

program
  .name("fooshop")
  .description("Fooshop CLI — commerce from your terminal")
  .version("0.1.0");

program.addCommand(loginCommand);

program.parse();
