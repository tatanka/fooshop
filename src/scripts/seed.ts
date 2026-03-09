import "dotenv/config";
import { db } from "../db";
import { users, creators, products, orders } from "../db/schema";
import { inArray } from "drizzle-orm";

// ─── Deterministic IDs ──────────────────────────────────────────────────────

const USER_IDS = ["seed-user-1", "seed-user-2"] as const;

const CREATOR_IDS = [
  "00000000-0000-0000-0000-000000000001",
  "00000000-0000-0000-0000-000000000002",
] as const;

const PRODUCT_IDS = [
  "00000000-0000-0000-0000-100000000001",
  "00000000-0000-0000-0000-100000000002",
  "00000000-0000-0000-0000-100000000003",
  "00000000-0000-0000-0000-100000000004",
  "00000000-0000-0000-0000-100000000005",
  "00000000-0000-0000-0000-100000000006",
  "00000000-0000-0000-0000-100000000007",
] as const;

const ORDER_IDS = [
  "00000000-0000-0000-0000-200000000001",
  "00000000-0000-0000-0000-200000000002",
  "00000000-0000-0000-0000-200000000003",
  "00000000-0000-0000-0000-200000000004",
  "00000000-0000-0000-0000-200000000005",
  "00000000-0000-0000-0000-200000000006",
] as const;

// ─── Seed data ──────────────────────────────────────────────────────────────

const seedUsers = [
  { id: USER_IDS[0], name: "Alice Demo", email: "alice@demo.test" },
  { id: USER_IDS[1], name: "Bob Demo", email: "bob@demo.test" },
];

const seedCreators = [
  {
    id: CREATOR_IDS[0],
    userId: USER_IDS[0],
    email: "alice@demo.test",
    name: "Alice Demo",
    slug: "alice-demo",
    storeName: "Alice's Digital Shop",
    storeDescription: "Demo store for testing",
  },
  {
    id: CREATOR_IDS[1],
    userId: USER_IDS[1],
    email: "bob@demo.test",
    name: "Bob Demo",
    slug: "bob-demo",
    storeName: "Bob's Creative Hub",
    storeDescription: "Demo store for testing",
  },
];

const seedProducts = [
  // Alice's products (4)
  {
    id: PRODUCT_IDS[0],
    creatorId: CREATOR_IDS[0],
    title: "The Developer's Handbook",
    slug: "the-developers-handbook",
    description: "A comprehensive guide to modern software development practices.",
    priceCents: 999,
    category: "ebook",
    status: "published" as const,
  },
  {
    id: PRODUCT_IDS[1],
    creatorId: CREATOR_IDS[0],
    title: "Startup Landing Page Template",
    slug: "startup-landing-page-template",
    description: "A clean, conversion-optimized landing page template for SaaS startups.",
    priceCents: 1999,
    category: "template",
    status: "draft" as const,
  },
  {
    id: PRODUCT_IDS[2],
    creatorId: CREATOR_IDS[0],
    title: "Full-Stack Next.js Course",
    slug: "full-stack-nextjs-course",
    description: "Learn to build production-ready apps with Next.js, TypeScript, and PostgreSQL.",
    priceCents: 4999,
    category: "course",
    status: "published" as const,
  },
  {
    id: PRODUCT_IDS[3],
    creatorId: CREATOR_IDS[0],
    title: "Moody Lightroom Preset Pack",
    slug: "moody-lightroom-preset-pack",
    description: "10 cinematic Lightroom presets for moody, atmospheric photo editing.",
    priceCents: 499,
    category: "preset",
    status: "published" as const,
  },
  // Bob's products (3)
  {
    id: PRODUCT_IDS[4],
    creatorId: CREATOR_IDS[1],
    title: "ChatGPT Prompt Engineering Pack",
    slug: "chatgpt-prompt-engineering-pack",
    description: "50 battle-tested prompts for developers, marketers, and writers.",
    priceCents: 299,
    category: "prompt",
    status: "published" as const,
  },
  {
    id: PRODUCT_IDS[5],
    creatorId: CREATOR_IDS[1],
    title: "3D Icon Asset Bundle",
    slug: "3d-icon-asset-bundle",
    description: "120 high-quality 3D icons in PNG, SVG, and Figma formats.",
    priceCents: 1499,
    category: "asset",
    status: "published" as const,
  },
  {
    id: PRODUCT_IDS[6],
    creatorId: CREATOR_IDS[1],
    title: "Indie Hacker's Playbook",
    slug: "indie-hackers-playbook",
    description: "From idea to $10k MRR — a practical guide for solo founders.",
    priceCents: 1299,
    category: "ebook",
    status: "published" as const,
  },
];

function fee(amountCents: number) {
  return Math.round(amountCents * 5 / 100);
}

const seedOrders = [
  // 4 completed
  {
    id: ORDER_IDS[0],
    productId: PRODUCT_IDS[0],
    creatorId: CREATOR_IDS[0],
    buyerEmail: "buyer1@example.com",
    buyerName: "Carol Buyer",
    amountCents: 999,
    platformFeeCents: fee(999),
    stripePaymentIntentId: "pi_seed_001",
    status: "completed" as const,
  },
  {
    id: ORDER_IDS[1],
    productId: PRODUCT_IDS[2],
    creatorId: CREATOR_IDS[0],
    buyerEmail: "buyer2@example.com",
    buyerName: "Dave Buyer",
    amountCents: 4999,
    platformFeeCents: fee(4999),
    stripePaymentIntentId: "pi_seed_002",
    status: "completed" as const,
  },
  {
    id: ORDER_IDS[2],
    productId: PRODUCT_IDS[4],
    creatorId: CREATOR_IDS[1],
    buyerEmail: "buyer1@example.com",
    buyerName: "Carol Buyer",
    amountCents: 299,
    platformFeeCents: fee(299),
    stripePaymentIntentId: "pi_seed_003",
    status: "completed" as const,
  },
  {
    id: ORDER_IDS[3],
    productId: PRODUCT_IDS[6],
    creatorId: CREATOR_IDS[1],
    buyerEmail: "buyer3@example.com",
    buyerName: "Eve Buyer",
    amountCents: 1299,
    platformFeeCents: fee(1299),
    stripePaymentIntentId: "pi_seed_004",
    status: "completed" as const,
  },
  // 1 pending
  {
    id: ORDER_IDS[4],
    productId: PRODUCT_IDS[3],
    creatorId: CREATOR_IDS[0],
    buyerEmail: "buyer2@example.com",
    buyerName: "Dave Buyer",
    amountCents: 499,
    platformFeeCents: fee(499),
    stripePaymentIntentId: "pi_seed_005",
    status: "pending" as const,
  },
  // 1 refunded
  {
    id: ORDER_IDS[5],
    productId: PRODUCT_IDS[5],
    creatorId: CREATOR_IDS[1],
    buyerEmail: "buyer3@example.com",
    buyerName: "Eve Buyer",
    amountCents: 1499,
    platformFeeCents: fee(1499),
    stripePaymentIntentId: "pi_seed_006",
    status: "refunded" as const,
  },
];

// ─── Main ───────────────────────────────────────────────────────────────────

async function seed() {
  console.log("Seeding database...");

  // 1. Delete existing seed data (reverse FK order)
  await db.delete(orders).where(inArray(orders.id, [...ORDER_IDS]));
  await db.delete(products).where(inArray(products.id, [...PRODUCT_IDS]));
  await db.delete(creators).where(inArray(creators.id, [...CREATOR_IDS]));
  await db.delete(users).where(inArray(users.id, [...USER_IDS]));

  // 2. Insert users
  await db.insert(users).values(seedUsers);

  // 3. Insert creators
  await db.insert(creators).values(seedCreators);

  // 4. Insert products
  await db.insert(products).values(seedProducts);

  // 5. Insert orders
  await db.insert(orders).values(seedOrders);

  console.log("Seed complete!");
  console.log("  Users: 2");
  console.log("  Creators: 2");
  console.log("  Products: 7");
  console.log("  Orders: 6");

  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
