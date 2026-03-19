#!/usr/bin/env node

import { Command } from "commander";

const program = new Command();

program
  .name("fooshop")
  .description("Fooshop CLI — commerce from your terminal")
  .version("0.1.0");

// Commands will be registered here
// program.addCommand(loginCommand);

program.parse();
