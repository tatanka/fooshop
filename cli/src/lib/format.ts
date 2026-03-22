import chalk from "chalk";
import ora, { type Ora } from "ora";
import Table from "cli-table3";

export function spinner(text: string): Ora {
  return ora(text).start();
}

export function successMsg(text: string): void {
  console.log(chalk.green(`✓ ${text}`));
}

export function errorMsg(text: string): void {
  console.error(chalk.red(`✗ ${text}`));
}

export function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export function buildTable(headers: string[], rows: string[][]): string {
  const table = new Table({
    head: headers.map((h) => chalk.cyan(h)),
    style: { head: [], border: [] },
  });
  for (const row of rows) {
    table.push(row);
  }
  return table.toString();
}
