import { Command } from "commander";
import { api } from "../lib/api.js";
import { formatPrice, buildTable } from "../lib/format.js";

interface Order {
  id: string;
  createdAt: string;
  productTitle: string;
  amountCents: number;
  platformFeeCents: number;
  currency: string;
  buyerEmail: string;
  status: string;
}

interface OrdersResponse {
  orders: Order[];
}

export const ordersCommand = new Command("orders").description(
  "Manage your orders"
);

ordersCommand
  .command("list")
  .description("List your orders")
  .option("--last <period>", "Filter by period (7d, 30d, 90d)")
  .action(async (opts) => {
    const json = ordersCommand.parent?.opts().json;
    const period = opts.last;
    const query = period ? `?period=${period}` : "";
    const data = await api.get<OrdersResponse>(`/api/orders${query}`);

    if (json) {
      console.log(JSON.stringify(data.orders, null, 2));
      return;
    }

    if (data.orders.length === 0) {
      console.log("No orders yet.");
      return;
    }

    const rows = data.orders.map((o) => [
      new Date(o.createdAt).toLocaleDateString(),
      o.productTitle,
      formatPrice(o.amountCents),
      o.buyerEmail,
    ]);

    console.log(buildTable(["Date", "Product", "Amount", "Buyer"], rows));
  });
