import {
  pgTable,
  pgEnum,
  uuid,
  text,
  integer,
  boolean,
  jsonb,
  timestamp,
  primaryKey,
  unique,
} from "drizzle-orm/pg-core";
type AdapterAccountType = "oauth" | "oidc" | "email" | "webauthn";

// ─── Auth.js tables ─────────────────────────────────────────────────────────

export const users = pgTable("user", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name"),
  email: text("email").unique(),
  emailVerified: timestamp("emailVerified", { mode: "date" }),
  image: text("image"),
});

export const accounts = pgTable(
  "account",
  {
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").$type<AdapterAccountType>().notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("providerAccountId").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (account) => ({
    compositePk: primaryKey({
      columns: [account.provider, account.providerAccountId],
    }),
  })
);

export const sessions = pgTable("session", {
  sessionToken: text("sessionToken").primaryKey(),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});

export const verificationTokens = pgTable(
  "verificationToken",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (verificationToken) => ({
    compositePk: primaryKey({
      columns: [verificationToken.identifier, verificationToken.token],
    }),
  })
);

export const authenticators = pgTable(
  "authenticator",
  {
    credentialID: text("credentialID").notNull().unique(),
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    providerAccountId: text("providerAccountId").notNull(),
    credentialPublicKey: text("credentialPublicKey").notNull(),
    counter: integer("counter").notNull(),
    credentialDeviceType: text("credentialDeviceType").notNull(),
    credentialBackedUp: boolean("credentialBackedUp").notNull(),
    transports: text("transports"),
  },
  (authenticator) => ({
    compositePK: primaryKey({
      columns: [authenticator.userId, authenticator.credentialID],
    }),
  })
);

// ─── Business tables ────────────────────────────────────────────────────────

export type StoreTheme = {
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
  textColor: string;
  accentColor: string;
  fontFamily: "sans" | "serif" | "mono";
  heroStyle: "gradient" | "solid" | "minimal";
  layout: "grid" | "featured" | "list";
};

export const DEFAULT_THEME: StoreTheme = {
  primaryColor: "#2563eb",
  secondaryColor: "#7c3aed",
  backgroundColor: "#ffffff",
  textColor: "#1f2937",
  accentColor: "#3b82f6",
  fontFamily: "sans",
  heroStyle: "minimal",
  layout: "grid",
};

export const productStatusEnum = pgEnum("product_status", [
  "draft",
  "published",
]);
export const orderStatusEnum = pgEnum("order_status", [
  "pending",
  "completed",
  "refunded",
]);

export const discountTypeEnum = pgEnum("discount_type", [
  "percentage",
  "fixed",
]);

export const creators = pgTable("creators", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id")
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: "cascade" }),
  email: text("email").notNull(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  stripeConnectId: text("stripe_connect_id"),
  storeName: text("store_name"),
  storeDescription: text("store_description"),
  storeTheme: jsonb("store_theme").$type<StoreTheme>(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const products = pgTable("products", {
  id: uuid("id").primaryKey().defaultRandom(),
  creatorId: uuid("creator_id")
    .notNull()
    .references(() => creators.id),
  title: text("title").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description").notNull(),
  priceCents: integer("price_cents").notNull(),
  currency: text("currency").notNull().default("usd"),
  fileUrl: text("file_url"),
  coverImageUrl: text("cover_image_url"),
  category: text("category"),
  metadataJson: jsonb("metadata_json").$type<{
    tags: string[];
    format: string;
    aiDescription: string;
  }>(),
  status: productStatusEnum("status").notNull().default("draft"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const orders = pgTable("orders", {
  id: uuid("id").primaryKey().defaultRandom(),
  productId: uuid("product_id")
    .notNull()
    .references(() => products.id),
  creatorId: uuid("creator_id")
    .notNull()
    .references(() => creators.id),
  buyerEmail: text("buyer_email").notNull(),
  buyerName: text("buyer_name"),
  amountCents: integer("amount_cents").notNull(),
  platformFeeCents: integer("platform_fee_cents").notNull(),
  stripePaymentIntentId: text("stripe_payment_intent_id").unique(),
  couponId: uuid("coupon_id").references(() => coupons.id),
  status: orderStatusEnum("status").notNull().default("pending"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const coupons = pgTable("coupons", {
  id: uuid("id").primaryKey().defaultRandom(),
  creatorId: uuid("creator_id")
    .notNull()
    .references(() => creators.id),
  code: text("code").notNull(),
  discountType: discountTypeEnum("discount_type").notNull(),
  discountValue: integer("discount_value").notNull(),
  productId: uuid("product_id").references(() => products.id),
  minAmountCents: integer("min_amount_cents"),
  maxRedemptions: integer("max_redemptions"),
  redemptionCount: integer("redemption_count").notNull().default(0),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
}, (table) => ({
  uniqueCreatorCode: unique().on(table.creatorId, table.code),
}));

export const downloadTokens = pgTable("download_tokens", {
  id: uuid("id").primaryKey().defaultRandom(),
  orderId: uuid("order_id")
    .notNull()
    .references(() => orders.id),
  token: uuid("token").notNull().unique().$defaultFn(() => crypto.randomUUID()),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  downloadCount: integer("download_count").notNull().default(0),
  source: text("source").notNull().default("web"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const pageViews = pgTable("page_views", {
  id: uuid("id").primaryKey().defaultRandom(),
  productId: uuid("product_id").references(() => products.id),
  storeSlug: text("store_slug"),
  source: text("source").notNull().default("web"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const buyIntents = pgTable("buy_intents", {
  id: uuid("id").primaryKey().defaultRandom(),
  productId: uuid("product_id")
    .notNull()
    .references(() => products.id),
  creatorId: uuid("creator_id")
    .notNull()
    .references(() => creators.id),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});
