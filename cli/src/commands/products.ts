import { Command } from "commander";
import { input, select, confirm } from "@inquirer/prompts";
import * as fs from "fs";
import * as path from "path";
import { api } from "../lib/api.js";
import { spinner, successMsg, formatPrice, buildTable } from "../lib/format.js";
import { getBaseUrl } from "../lib/config.js";

interface Product {
  id: string;
  title: string;
  slug: string;
  description: string;
  priceCents: number;
  category: string;
  status: string;
  fileUrl?: string;
  coverImageUrl?: string;
  creatorSlug?: string;
}

interface UploadResponse {
  uploadUrl: string;
  key: string;
}

const CATEGORIES = [
  "templates",
  "presets",
  "luts",
  "prompts",
  "guides",
  "courses",
  "assets",
  "other",
];

async function uploadFile(
  filePath: string,
  purpose: "product" | "cover"
): Promise<string> {
  const filename = path.basename(filePath);
  const ext = path.extname(filename).slice(1);
  const contentTypeMap: Record<string, string> = {
    zip: "application/zip",
    pdf: "application/pdf",
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    webp: "image/webp",
    gif: "image/gif",
  };
  const contentType = contentTypeMap[ext] || "application/octet-stream";

  const { uploadUrl, key } = await api.post<UploadResponse>("/api/upload", {
    filename,
    contentType,
    purpose,
  });

  const fileBuffer = fs.readFileSync(filePath);
  const res = await fetch(uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": contentType },
    body: fileBuffer,
  });

  if (!res.ok) {
    console.error("File upload failed.");
    process.exit(1);
  }

  return key;
}

export const productsCommand = new Command("products")
  .description("Manage your products");

// --- products list ---
productsCommand
  .command("list")
  .description("List your products")
  .action(async () => {
    const json = productsCommand.parent?.opts().json;
    const products = await api.get<Product[]>("/api/products?mine=true");

    if (json) {
      console.log(JSON.stringify(products, null, 2));
      return;
    }

    if (products.length === 0) {
      console.log("No products yet. Create one with `fooshop products add`.");
      return;
    }

    const baseUrl = getBaseUrl();
    const rows = products.map((p) => [
      p.title,
      formatPrice(p.priceCents),
      p.status,
      `${baseUrl}/${p.creatorSlug}/${p.slug}`,
    ]);

    console.log(buildTable(["Name", "Price", "Status", "URL"], rows));
  });

// --- products add ---
productsCommand
  .command("add")
  .description("Add a new product")
  .action(async () => {
    const title = await input({ message: "Product name:" });

    const priceStr = await input({
      message: "Price (USD):",
      validate: (v) => {
        const n = parseFloat(v);
        return !isNaN(n) && n >= 0 ? true : "Enter a valid price (e.g. 29.99)";
      },
    });
    const priceCents = Math.round(parseFloat(priceStr) * 100);

    const description = await input({ message: "Description:" });

    const category = await select({
      message: "Category:",
      choices: CATEGORIES.map((c) => ({ name: c, value: c })),
    });

    const filePath = await input({
      message: "Product file path:",
      validate: (v) => (fs.existsSync(v) ? true : "File not found"),
    });

    const coverPath = await input({
      message: "Cover image path (optional, press Enter to skip):",
    });

    const s = spinner("Uploading files...");

    let fileUrl: string;
    try {
      fileUrl = await uploadFile(filePath, "product");
    } catch {
      s.fail("File upload failed");
      return;
    }

    let coverImageUrl: string | undefined;
    if (coverPath && coverPath.trim()) {
      try {
        coverImageUrl = await uploadFile(coverPath.trim(), "cover");
      } catch {
        s.fail("Cover upload failed");
        return;
      }
    }

    s.succeed("Files uploaded!");

    const s2 = spinner("Creating product...");

    try {
      const product = await api.post<Product>("/api/products", {
        title,
        description,
        priceCents,
        category,
        status: "published",
        fileUrl,
        coverImageUrl,
      });

      s2.succeed("Product created!");
      const baseUrl = getBaseUrl();
      successMsg(`${baseUrl}/${product.creatorSlug}/${product.slug}`);
    } catch {
      s2.fail("Failed to create product");
    }
  });

// --- products edit ---
productsCommand
  .command("edit <slug>")
  .description("Edit a product")
  .action(async (slug: string) => {
    const products = await api.get<Product[]>("/api/products?mine=true");
    const product = products.find((p) => p.slug === slug);

    if (!product) {
      console.error(`Product "${slug}" not found.`);
      process.exit(1);
    }

    console.log(`Editing: ${product.title} (${formatPrice(product.priceCents)})`);
    console.log("Press Enter to keep current value.\n");

    const title = await input({
      message: "Product name:",
      default: product.title,
    });

    const priceStr = await input({
      message: "Price (USD):",
      default: (product.priceCents / 100).toFixed(2),
      validate: (v) => {
        const n = parseFloat(v);
        return !isNaN(n) && n >= 0 ? true : "Enter a valid price";
      },
    });
    const priceCents = Math.round(parseFloat(priceStr) * 100);

    const description = await input({
      message: "Description:",
      default: product.description,
    });

    const category = await select({
      message: "Category:",
      choices: CATEGORIES.map((c) => ({ name: c, value: c })),
      default: product.category,
    });

    const s = spinner("Updating product...");
    try {
      await api.put(`/api/products/${product.id}`, {
        title,
        description,
        priceCents,
        category,
      });
      s.succeed("Product updated!");
    } catch {
      s.fail("Failed to update product");
    }
  });

// --- products delete ---
productsCommand
  .command("delete <slug>")
  .description("Delete a product")
  .action(async (slug: string) => {
    const products = await api.get<Product[]>("/api/products?mine=true");
    const product = products.find((p) => p.slug === slug);

    if (!product) {
      console.error(`Product "${slug}" not found.`);
      process.exit(1);
    }

    console.log(`${product.title} — ${formatPrice(product.priceCents)}`);

    const yes = await confirm({
      message: `Delete ${product.title}? This cannot be undone.`,
      default: false,
    });

    if (!yes) {
      console.log("Cancelled.");
      return;
    }

    await api.del(`/api/products/${product.id}`);
    successMsg("Product deleted");
  });
