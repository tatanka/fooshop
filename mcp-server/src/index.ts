#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const API_URL = process.env.FOOSHOP_API_URL || "https://fooshop.ai";

const server = new McpServer({
  name: "fooshop",
  version: "0.2.0",
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Product = Record<string, any>;

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
        "Filter by category: templates, presets, luts, prompts, guides, courses, assets"
      ),
    maxPrice: z
      .number()
      .optional()
      .describe("Maximum price in USD (e.g. 29.99)"),
  },
  async ({ query, category, maxPrice }) => {
    const params = new URLSearchParams({ q: query, source: "mcp" });
    if (category) params.set("category", category);
    if (maxPrice !== undefined)
      params.set("maxPrice", Math.round(maxPrice * 100).toString());

    const res = await fetch(`${API_URL}/api/products?${params}`);
    if (!res.ok) {
      return {
        content: [
          { type: "text" as const, text: "Search failed. Please try again." },
        ],
      };
    }
    const products: Product[] = await res.json();

    if (products.length === 0) {
      return {
        content: [
          {
            type: "text" as const,
            text: "No products found matching your query.",
          },
        ],
      };
    }

    const formatted = products.map((p) => ({
      id: p.id,
      title: p.title,
      description: p.description,
      price: `$${(Number(p.priceCents) / 100).toFixed(2)}`,
      category: p.category,
      slug: p.slug,
      url: `${API_URL}/${p.creatorSlug}/${p.slug}`,
    }));

    return {
      content: [
        { type: "text" as const, text: JSON.stringify(formatted, null, 2) },
      ],
    };
  }
);

server.tool(
  "get_product",
  "Get detailed information about a specific product on Fooshop, including price, description, and purchase link.",
  {
    slug: z.string().describe("Product slug (from search results)"),
  },
  async ({ slug }) => {
    const res = await fetch(`${API_URL}/api/products/by-slug/${slug}?source=mcp`);
    if (!res.ok) {
      return {
        content: [{ type: "text" as const, text: "Product not found." }],
      };
    }
    const product: Product = await res.json();

    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(
            {
              id: product.id,
              title: product.title,
              description: product.description,
              price: `$${(Number(product.priceCents) / 100).toFixed(2)}`,
              category: product.category,
              creator: product.creatorName,
              url: product.url,
            },
            null,
            2
          ),
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
    const res = await fetch(`${API_URL}/api/stores/${slug}?source=mcp`);
    if (!res.ok) {
      return {
        content: [{ type: "text" as const, text: "Store not found." }],
      };
    }
    const store: Product = await res.json();

    return {
      content: [
        { type: "text" as const, text: JSON.stringify(store, null, 2) },
      ],
    };
  }
);

server.tool(
  "get_checkout_url",
  "Get a Stripe checkout URL to purchase a product. Share this link with the user to complete their purchase.",
  {
    productId: z
      .string()
      .describe("Product ID (UUID from search or product details)"),
  },
  async ({ productId }) => {
    const res = await fetch(`${API_URL}/api/checkout`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId, source: "mcp" }),
    });

    if (!res.ok) {
      const error = await res
        .json()
        .catch(() => ({ error: "Checkout failed" }));
      return {
        content: [
          {
            type: "text" as const,
            text: `Cannot create checkout: ${error.error}`,
          },
        ],
      };
    }

    const { url } = await res.json();
    return {
      content: [
        {
          type: "text" as const,
          text: `Checkout URL: ${url}\n\nShare this link with the user to complete the purchase.`,
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
