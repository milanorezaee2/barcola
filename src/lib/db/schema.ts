import { relations, sql } from "drizzle-orm";
import {
  boolean,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

/**
 * Rosie Atelier — Marketplace database schema (Postgres, via Drizzle ORM).
 *
 * Three real, first-class account roles:
 *   - "customer": can browse, buy, favourite, review.
 *   - "artist":   has a public storefront (artistProfiles), can create/manage
 *                 their own listings, and earns commissioned revenue on sales.
 *   - "admin":    full back-office control (existing cookie-session admin is
 *                 layered on top of this — see src/lib/auth.ts).
 *
 * Money is modelled as integer *minor units* (rial for `fa`, cent-equivalent
 * for `en`) inside `numeric` columns to avoid float rounding.
 */

/* ------------------------------------------------------------------ */
/* Enums                                                                */
/* ------------------------------------------------------------------ */
export const userRoleEnum = pgEnum("user_role", ["customer", "artist", "admin"]);
export const artistStatusEnum = pgEnum("artist_status", ["pending", "approved", "rejected", "suspended"]);
export const listingKindEnum = pgEnum("listing_kind", ["pattern", "product"]);
export const listingStatusEnum = pgEnum("listing_status", ["draft", "pending_review", "published", "rejected", "archived"]);
export const orderStatusEnum = pgEnum("order_status", ["pending", "paid", "fulfilled", "cancelled", "refunded"]);
export const payoutStatusEnum = pgEnum("payout_status", ["pending", "processing", "paid", "failed"]);
export const ledgerTypeEnum = pgEnum("ledger_type", ["sale", "commission", "payout", "adjustment", "refund"]);

/* ------------------------------------------------------------------ */
/* Users — one row per account, any role                               */
/* ------------------------------------------------------------------ */
export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    email: text("email").notNull(),
    passwordHash: text("password_hash").notNull(),
    role: userRoleEnum("role").notNull().default("customer"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("users_email_unique").on(sql`lower(${t.email})`)],
);

/* ------------------------------------------------------------------ */
/* Password reset tokens — simulated "forgot password" flow             */
/* No real email delivery is wired up: a one-time token is issued and   */
/* handed back directly in the API response / shown on-screen, exactly  */
/* like every other "simulated" flow in this project (payments, etc).   */
/* ------------------------------------------------------------------ */
export const passwordResetTokens = pgTable(
  "password_reset_tokens",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    token: text("token").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    usedAt: timestamp("used_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("password_reset_tokens_token_unique").on(t.token)],
);

/* ------------------------------------------------------------------ */
/* Artist profiles — the public storefront, 1:1 with a "artist" user   */
/* ------------------------------------------------------------------ */
export const artistProfiles = pgTable(
  "artist_profiles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    slug: text("slug").notNull(),
    displayNameFa: text("display_name_fa").notNull(),
    displayNameEn: text("display_name_en").notNull(),
    professionFa: text("profession_fa").default("").notNull(),
    professionEn: text("profession_en").default("").notNull(),
    bioFa: text("bio_fa").default("").notNull(),
    bioEn: text("bio_en").default("").notNull(),
    avatar: text("avatar").default("").notNull(),
    cover: text("cover").default("").notNull(),
    /** Commission taken by the platform, in percent (0-100). Admin-adjustable per artist. */
    commissionPct: numeric("commission_pct", { precision: 5, scale: 2 }).notNull().default("30.00"),
    status: artistStatusEnum("status").notNull().default("pending"),
    appliedAt: timestamp("applied_at", { withTimezone: true }).notNull().defaultNow(),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
  },
  (t) => [uniqueIndex("artist_profiles_user_unique").on(t.userId), uniqueIndex("artist_profiles_slug_unique").on(t.slug)],
);

/* ------------------------------------------------------------------ */
/* Listings — a marketplace item an artist created (pattern or product) */
/* ------------------------------------------------------------------ */
export const listings = pgTable(
  "listings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    artistId: uuid("artist_id").notNull().references(() => artistProfiles.id, { onDelete: "cascade" }),
    kind: listingKindEnum("kind").notNull(),
    slug: text("slug").notNull(),
    sku: text("sku").notNull(),
    titleFa: text("title_fa").notNull(),
    titleEn: text("title_en").notNull(),
    descriptionFa: text("description_fa").default("").notNull(),
    descriptionEn: text("description_en").default("").notNull(),
    image: text("image").notNull(),
    gallery: jsonb("gallery").$type<string[]>().notNull().default([]),
    categorySlug: text("category_slug").default("").notNull(),
    /** Price stored as an integer in each currency's minor/whole unit — { fa: toman, en: usd }. */
    priceFa: integer("price_fa").notNull(),
    priceEn: integer("price_en").notNull(),
    tags: jsonb("tags").$type<string[]>().notNull().default([]),
    status: listingStatusEnum("status").notNull().default("draft"),
    rejectionReason: text("rejection_reason"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    publishedAt: timestamp("published_at", { withTimezone: true }),
  },
  (t) => [uniqueIndex("listings_slug_unique").on(t.slug), uniqueIndex("listings_sku_unique").on(t.sku)],
);

/* ------------------------------------------------------------------ */
/* Orders — a customer checkout. One order can span multiple artists;  */
/* orderItems carries the per-artist commission split at time of sale. */
/* ------------------------------------------------------------------ */
export const orders = pgTable("orders", {
  id: uuid("id").primaryKey().defaultRandom(),
  orderNumber: text("order_number").notNull(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
  customerName: text("customer_name").notNull(),
  customerEmail: text("customer_email").notNull(),
  customerPhone: text("customer_phone").default("").notNull(),
  shippingAddress: text("shipping_address").default("").notNull(),
  currency: text("currency").notNull().default("fa"),
  totalAmount: integer("total_amount").notNull(),
  status: orderStatusEnum("status").notNull().default("paid"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const orderItems = pgTable("order_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  orderId: uuid("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
  listingId: uuid("listing_id").references(() => listings.id, { onDelete: "set null" }),
  artistId: uuid("artist_id").references(() => artistProfiles.id, { onDelete: "set null" }),
  title: text("title").notNull(),
  image: text("image").default("").notNull(),
  unitPrice: integer("unit_price").notNull(),
  qty: integer("qty").notNull().default(1),
  lineTotal: integer("line_total").notNull(),
  /** Commission percent frozen at sale time, so later rate changes never rewrite history. */
  commissionPct: numeric("commission_pct", { precision: 5, scale: 2 }).notNull().default("30.00"),
  commissionAmount: integer("commission_amount").notNull().default(0),
  artistEarning: integer("artist_earning").notNull().default(0),
});

/* ------------------------------------------------------------------ */
/* Ledger — every credit/debit affecting an artist's balance            */
/* ------------------------------------------------------------------ */
export const ledgerEntries = pgTable("ledger_entries", {
  id: uuid("id").primaryKey().defaultRandom(),
  artistId: uuid("artist_id").notNull().references(() => artistProfiles.id, { onDelete: "cascade" }),
  type: ledgerTypeEnum("type").notNull(),
  amount: integer("amount").notNull(), // positive = credit to artist, negative = debit
  currency: text("currency").notNull().default("fa"),
  orderItemId: uuid("order_item_id").references(() => orderItems.id, { onDelete: "set null" }),
  payoutId: uuid("payout_id"),
  note: text("note").default("").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/* ------------------------------------------------------------------ */
/* Payouts — a simulated withdrawal requested by an artist              */
/* ------------------------------------------------------------------ */
export const payouts = pgTable("payouts", {
  id: uuid("id").primaryKey().defaultRandom(),
  artistId: uuid("artist_id").notNull().references(() => artistProfiles.id, { onDelete: "cascade" }),
  amount: integer("amount").notNull(),
  currency: text("currency").notNull().default("fa"),
  status: payoutStatusEnum("status").notNull().default("pending"),
  method: text("method").default("bank_transfer").notNull(),
  destination: text("destination").default("").notNull(),
  requestedAt: timestamp("requested_at", { withTimezone: true }).notNull().defaultNow(),
  processedAt: timestamp("processed_at", { withTimezone: true }),
  note: text("note").default("").notNull(),
});

/* ------------------------------------------------------------------ */
/* Relations (for query ergonomics)                                     */
/* ------------------------------------------------------------------ */
export const usersRelations = relations(users, ({ one }) => ({
  artistProfile: one(artistProfiles, { fields: [users.id], references: [artistProfiles.userId] }),
}));

export const artistProfilesRelations = relations(artistProfiles, ({ one, many }) => ({
  user: one(users, { fields: [artistProfiles.userId], references: [users.id] }),
  listings: many(listings),
  payouts: many(payouts),
  ledgerEntries: many(ledgerEntries),
}));

export const listingsRelations = relations(listings, ({ one }) => ({
  artist: one(artistProfiles, { fields: [listings.artistId], references: [artistProfiles.id] }),
}));

export const ordersRelations = relations(orders, ({ many }) => ({
  items: many(orderItems),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, { fields: [orderItems.orderId], references: [orders.id] }),
  listing: one(listings, { fields: [orderItems.listingId], references: [listings.id] }),
  artist: one(artistProfiles, { fields: [orderItems.artistId], references: [artistProfiles.id] }),
}));

export const payoutsRelations = relations(payouts, ({ one }) => ({
  artist: one(artistProfiles, { fields: [payouts.artistId], references: [artistProfiles.id] }),
}));

export const ledgerEntriesRelations = relations(ledgerEntries, ({ one }) => ({
  artist: one(artistProfiles, { fields: [ledgerEntries.artistId], references: [artistProfiles.id] }),
  orderItem: one(orderItems, { fields: [ledgerEntries.orderItemId], references: [orderItems.id] }),
}));

export type UserRow = typeof users.$inferSelect;
export type ArtistProfileRow = typeof artistProfiles.$inferSelect;
export type ListingRow = typeof listings.$inferSelect;
export type OrderRow = typeof orders.$inferSelect;
export type OrderItemRow = typeof orderItems.$inferSelect;
export type LedgerEntryRow = typeof ledgerEntries.$inferSelect;
export type PayoutRow = typeof payouts.$inferSelect;
export type PasswordResetTokenRow = typeof passwordResetTokens.$inferSelect;
