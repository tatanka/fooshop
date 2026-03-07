#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const API_URL = process.env.FOOSHOP_API_URL || "https://fooshop.ai";

const server = new McpServer({
  name: "fooshop",
  version: "0.1.0",
});

server.tool(
  "search_products",
  "Search digital products on Fooshop marketplace. Returns products matching the query with title, description, price, and purchase link.",
  {
    query: z
      .string()
      .describe("Search query, e.g. 'notion template project management'"),
    category: z
      .string()
      .optional()
      .describe(
        "Filter by category: templates, ebooks, courses, presets, prompts, assets"
      ),
    maxPrice: z.number().optional().describe("Maximum price in cents"),
  },
  async ({ query, category, maxPrice }) => {
    const params = new URLSearchParams({ q: query });
    if (category) params.set("category", category);
    if (maxPrice) params.set("maxPrice", maxPrice.toString());

    const res = await fetch(`${API_URL}/api/products?${params}`);
    const products = await res.json();

    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            products.map((p: any) => ({
              title: p.title,
              description: p.description,
              price: `$${(Number(p.priceCents) / 100).toFixed(2)}`,
              category: p.category,
            })),
            null,
            2
          ),
        },
      ],
    };
  }
);

server.tool(
  "get_product",
  "Get detailed information about a specific product on Fooshop.",
  {
    slug: z.string().describe("Product slug"),
  },
  async ({ slug }) => {
    const res = await fetch(`${API_URL}/api/products/${slug}`);
    const product = await res.json();

    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(product, null, 2),
        },
      ],
    };
  }
);

server.tool(
  "get_store",
  "Get all products from a specific creator's store on Fooshop.",
  {
    slug: z.string().describe("Creator store slug"),
  },
  async ({ slug }) => {
    const res = await fetch(`${API_URL}/api/stores/${slug}`);
    const store = await res.json();

    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(store, null, 2),
        },
      ],
    };
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch(console.error);
