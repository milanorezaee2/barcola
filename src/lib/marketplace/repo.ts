import "server-only";
import { and, desc, eq, sql } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { getDb, schema } from "@/lib/db/client";
import { slugify } from "@/lib/utils";

const { users, artistProfiles, listings, orders, orderItems, ledgerEntries, payouts, passwordResetTokens } = schema;

/* ------------------------------------------------------------------ */
/* Users                                                                */
/* ------------------------------------------------------------------ */
export async function findUserByEmail(email: string) {
  const db = await getDb();
  const rows = await db
    .select()
    .from(users)
    .where(sql`lower(${users.email}) = ${email.trim().toLowerCase()}`)
    .limit(1);
  return rows[0] ?? null;
}

export async function findUserById(id: string) {
  const db = await getDb();
  const rows = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function createCustomer(name: string, email: string, password: string) {
  const db = await getDb();
  const existing = await findUserByEmail(email);
  if (existing) return { ok: false as const, error: "email_taken" };
  const passwordHash = await bcrypt.hash(password, 10);
  const [row] = await db
    .insert(users)
    .values({ name, email: email.trim().toLowerCase(), passwordHash, role: "customer" })
    .returning();
  return { ok: true as const, user: row };
}

export async function verifyPassword(email: string, password: string) {
  const user = await findUserByEmail(email);
  if (!user) return null;
  const ok = await bcrypt.compare(password, user.passwordHash);
  return ok ? user : null;
}

/* ------------------------------------------------------------------ */
/* Password reset — simulated (no real email delivery)                  */
/* ------------------------------------------------------------------ */
const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

/**
 * Issues a one-time reset token for the given email. Always looks like it succeeded to the
 * caller (never reveals whether the email exists) — the token itself is only returned when a
 * matching account was actually found, so the API layer can decide what to show.
 */
export async function createPasswordResetToken(email: string) {
  const user = await findUserByEmail(email);
  if (!user) return null;
  const db = await getDb();
  const token = crypto.randomUUID().replace(/-/g, "");
  await db.insert(passwordResetTokens).values({
    userId: user.id,
    token,
    expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS),
  });
  return { token, user };
}

export async function verifyPasswordResetToken(token: string) {
  const db = await getDb();
  const rows = await db.select().from(passwordResetTokens).where(eq(passwordResetTokens.token, token)).limit(1);
  const row = rows[0];
  if (!row || row.usedAt || row.expiresAt.getTime() < Date.now()) return null;
  return row;
}

export async function resetPasswordWithToken(token: string, newPassword: string) {
  const db = await getDb();
  const row = await verifyPasswordResetToken(token);
  if (!row) return { ok: false as const, error: "invalid_or_expired_token" };
  const passwordHash = await bcrypt.hash(newPassword, 10);
  await db.transaction(async (tx: typeof db) => {
    await tx.update(users).set({ passwordHash, updatedAt: new Date() }).where(eq(users.id, row.userId));
    await tx.update(passwordResetTokens).set({ usedAt: new Date() }).where(eq(passwordResetTokens.id, row.id));
  });
  return { ok: true as const };
}

/* ------------------------------------------------------------------ */
/* Artist onboarding                                                    */
/* ------------------------------------------------------------------ */
export async function findArtistProfileByUserId(userId: string) {
  const db = await getDb();
  const rows = await db.select().from(artistProfiles).where(eq(artistProfiles.userId, userId)).limit(1);
  return rows[0] ?? null;
}

export async function findArtistProfileBySlug(slug: string) {
  const db = await getDb();
  const rows = await db.select().from(artistProfiles).where(eq(artistProfiles.slug, slug)).limit(1);
  return rows[0] ?? null;
}

async function uniqueArtistSlug(base: string) {
  const db = await getDb();
  const root = slugify(base) || "artist";
  let slug = root;
  let n = 1;
  while (true) {
    const existing = await db.select({ id: artistProfiles.id }).from(artistProfiles).where(eq(artistProfiles.slug, slug)).limit(1);
    if (!existing.length) return slug;
    n += 1;
    slug = `${root}-${n}`;
  }
}

/**
 * Registers a brand-new account as an artist applicant: creates the `users` row with
 * role="artist" AND the linked `artist_profiles` row in "pending" status (awaiting admin
 * approval before the storefront + listing tools unlock).
 */
export async function createArtistApplicant(input: {
  name: string;
  email: string;
  password: string;
  professionFa?: string;
  professionEn?: string;
  bioFa?: string;
  bioEn?: string;
}) {
  const db = await getDb();
  const existing = await findUserByEmail(input.email);
  if (existing) return { ok: false as const, error: "email_taken" };
  const passwordHash = await bcrypt.hash(input.password, 10);
  const slug = await uniqueArtistSlug(input.name);
  return db.transaction(async (tx: typeof db) => {
    const [user] = await tx
      .insert(users)
      .values({ name: input.name, email: input.email.trim().toLowerCase(), passwordHash, role: "artist" })
      .returning();
    const [profile] = await tx
      .insert(artistProfiles)
      .values({
        userId: user.id,
        slug,
        displayNameFa: input.name,
        displayNameEn: input.name,
        professionFa: input.professionFa ?? "",
        professionEn: input.professionEn ?? "",
        bioFa: input.bioFa ?? "",
        bioEn: input.bioEn ?? "",
        status: "pending",
      })
      .returning();
    return { ok: true as const, user, profile };
  });
}

export async function listArtistApplications(status?: "pending" | "approved" | "rejected" | "suspended") {
  const db = await getDb();
  const rows = await db
    .select({
      profile: artistProfiles,
      user: { id: users.id, name: users.name, email: users.email, role: users.role, createdAt: users.createdAt },
    })
    .from(artistProfiles)
    .innerJoin(users, eq(users.id, artistProfiles.userId))
    .where(status ? eq(artistProfiles.status, status) : sql`true`)
    .orderBy(desc(artistProfiles.appliedAt));
  return rows;
}

export async function setArtistStatus(profileId: string, status: "approved" | "rejected" | "suspended", commissionPct?: number) {
  const db = await getDb();
  const [row] = await db
    .update(artistProfiles)
    .set({
      status,
      approvedAt: status === "approved" ? new Date() : undefined,
      ...(commissionPct !== undefined ? { commissionPct: commissionPct.toFixed(2) } : {}),
    })
    .where(eq(artistProfiles.id, profileId))
    .returning();
  return row ?? null;
}

/* ------------------------------------------------------------------ */
/* Listings (artist-managed products/patterns)                          */
/* ------------------------------------------------------------------ */
async function uniqueListingSlug(base: string) {
  const db = await getDb();
  const root = slugify(base) || "listing";
  let slug = root;
  let n = 1;
  while (true) {
    const existing = await db.select({ id: listings.id }).from(listings).where(eq(listings.slug, slug)).limit(1);
    if (!existing.length) return slug;
    n += 1;
    slug = `${root}-${n}`;
  }
}

export async function createListing(artistId: string, input: {
  kind: "pattern" | "product";
  titleFa: string;
  titleEn: string;
  descriptionFa?: string;
  descriptionEn?: string;
  image: string;
  gallery?: string[];
  categorySlug?: string;
  priceFa: number;
  priceEn: number;
  tags?: string[];
}) {
  const db = await getDb();
  const slug = await uniqueListingSlug(input.titleEn || input.titleFa);
  const sku = `RA-${input.kind === "pattern" ? "PT" : "SH"}-${Date.now().toString(36).toUpperCase()}`;
  const [row] = await db
    .insert(listings)
    .values({
      artistId,
      kind: input.kind,
      slug,
      sku,
      titleFa: input.titleFa,
      titleEn: input.titleEn,
      descriptionFa: input.descriptionFa ?? "",
      descriptionEn: input.descriptionEn ?? "",
      image: input.image,
      gallery: input.gallery ?? [],
      categorySlug: input.categorySlug ?? "",
      priceFa: Math.round(input.priceFa),
      priceEn: Math.round(input.priceEn),
      tags: input.tags ?? [],
      status: "pending_review",
    })
    .returning();
  return row;
}

export async function updateListing(listingId: string, artistId: string, patch: Partial<{
  titleFa: string; titleEn: string; descriptionFa: string; descriptionEn: string; image: string;
  gallery: string[]; categorySlug: string; priceFa: number; priceEn: number; tags: string[];
  status: "draft" | "pending_review" | "published" | "archived";
}>) {
  const db = await getDb();
  const [row] = await db
    .update(listings)
    .set({ ...patch, updatedAt: new Date(), ...(patch.status === "pending_review" ? { rejectionReason: null } : {}) })
    .where(and(eq(listings.id, listingId), eq(listings.artistId, artistId)))
    .returning();
  return row ?? null;
}

export async function deleteListing(listingId: string, artistId: string) {
  const db = await getDb();
  await db.delete(listings).where(and(eq(listings.id, listingId), eq(listings.artistId, artistId)));
}

export async function listListingsForArtist(artistId: string) {
  const db = await getDb();
  return db.select().from(listings).where(eq(listings.artistId, artistId)).orderBy(desc(listings.createdAt));
}

export async function listPendingListings() {
  const db = await getDb();
  return db
    .select({ listing: listings, artist: artistProfiles })
    .from(listings)
    .innerJoin(artistProfiles, eq(artistProfiles.id, listings.artistId))
    .where(eq(listings.status, "pending_review"))
    .orderBy(desc(listings.createdAt));
}

export async function reviewListing(listingId: string, decision: "published" | "rejected", reason?: string) {
  const db = await getDb();
  const [row] = await db
    .update(listings)
    .set({
      status: decision,
      rejectionReason: decision === "rejected" ? (reason ?? "") : null,
      publishedAt: decision === "published" ? new Date() : undefined,
      updatedAt: new Date(),
    })
    .where(eq(listings.id, listingId))
    .returning();
  return row ?? null;
}

export async function listPublishedListings(kind?: "pattern" | "product") {
  const db = await getDb();
  return db
    .select({ listing: listings, artist: artistProfiles })
    .from(listings)
    .innerJoin(artistProfiles, eq(artistProfiles.id, listings.artistId))
    .where(kind ? and(eq(listings.status, "published"), eq(listings.kind, kind)) : eq(listings.status, "published"))
    .orderBy(desc(listings.publishedAt));
}

export async function findListingBySlug(slug: string) {
  const db = await getDb();
  const rows = await db
    .select({ listing: listings, artist: artistProfiles })
    .from(listings)
    .innerJoin(artistProfiles, eq(artistProfiles.id, listings.artistId))
    .where(eq(listings.slug, slug))
    .limit(1);
  return rows[0] ?? null;
}

/* ------------------------------------------------------------------ */
/* Orders — checkout with automatic per-item commission split           */
/* ------------------------------------------------------------------ */
export interface CheckoutLine {
  listingId: string;
  title: string;
  image: string;
  unitPrice: number; // in the order's currency
  qty: number;
}

export async function placeOrder(input: {
  userId?: string | null;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  shippingAddress?: string;
  currency: "fa" | "en";
  lines: CheckoutLine[];
}) {
  const db = await getDb();
  const orderNumber = `RA-${Date.now().toString(36).toUpperCase()}`;
  const totalAmount = input.lines.reduce((sum, l) => sum + l.unitPrice * l.qty, 0);

  return db.transaction(async (tx: typeof db) => {
    const [order] = await tx
      .insert(orders)
      .values({
        orderNumber,
        userId: input.userId ?? null,
        customerName: input.customerName,
        customerEmail: input.customerEmail,
        customerPhone: input.customerPhone ?? "",
        shippingAddress: input.shippingAddress ?? "",
        currency: input.currency,
        totalAmount,
        status: "paid",
      })
      .returning();

    for (const line of input.lines) {
      // `line.listingId` may reference a real marketplace listing OR come from the legacy static
      // seed catalogue (which has no DB row) — look it up defensively and fall back to a
      // platform-only sale (no artist ledger entry) rather than a foreign-key violation.
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(line.listingId);
      const listingRows = isUuid ? await tx.select().from(listings).where(eq(listings.id, line.listingId)).limit(1) : [];
      const listing = listingRows[0];
      const artistId = listing?.artistId ?? null;
      let commissionPct = 30;
      if (artistId) {
        const profileRows = await tx.select().from(artistProfiles).where(eq(artistProfiles.id, artistId)).limit(1);
        commissionPct = profileRows[0] ? Number(profileRows[0].commissionPct) : 30;
      }
      const lineTotal = line.unitPrice * line.qty;
      const commissionAmount = artistId ? Math.round((lineTotal * commissionPct) / 100) : 0;
      const artistEarning = artistId ? lineTotal - commissionAmount : 0;

      const [item] = await tx
        .insert(orderItems)
        .values({
          orderId: order.id,
          listingId: listing ? line.listingId : null,
          artistId,
          title: line.title,
          image: line.image,
          unitPrice: line.unitPrice,
          qty: line.qty,
          lineTotal,
          commissionPct: commissionPct.toFixed(2),
          commissionAmount,
          artistEarning,
        })
        .returning();

      if (artistId) {
        await tx.insert(ledgerEntries).values({
          artistId,
          type: "sale",
          amount: artistEarning,
          currency: input.currency,
          orderItemId: item.id,
          note: `Sale: ${line.title} × ${line.qty}`,
        });
      }
    }

    return order;
  });
}

/* ------------------------------------------------------------------ */
/* Artist earnings dashboard                                            */
/* ------------------------------------------------------------------ */
export async function artistBalance(artistId: string) {
  const db = await getDb();
  const rows = await db
    .select({ total: sql<string>`coalesce(sum(${ledgerEntries.amount}), 0)` })
    .from(ledgerEntries)
    .where(eq(ledgerEntries.artistId, artistId));
  return Number(rows[0]?.total ?? 0);
}

export async function artistLedger(artistId: string, limit = 50) {
  const db = await getDb();
  return db
    .select()
    .from(ledgerEntries)
    .where(eq(ledgerEntries.artistId, artistId))
    .orderBy(desc(ledgerEntries.createdAt))
    .limit(limit);
}

export async function artistSalesStats(artistId: string) {
  const db = await getDb();
  const rows = await db
    .select({
      totalSales: sql<string>`coalesce(sum(${orderItems.lineTotal}), 0)`,
      totalEarnings: sql<string>`coalesce(sum(${orderItems.artistEarning}), 0)`,
      totalCommission: sql<string>`coalesce(sum(${orderItems.commissionAmount}), 0)`,
      itemsSold: sql<string>`coalesce(sum(${orderItems.qty}), 0)`,
      orders: sql<string>`count(distinct ${orderItems.orderId})`,
    })
    .from(orderItems)
    .where(eq(orderItems.artistId, artistId));
  const r = rows[0];
  return {
    totalSales: Number(r?.totalSales ?? 0),
    totalEarnings: Number(r?.totalEarnings ?? 0),
    totalCommission: Number(r?.totalCommission ?? 0),
    itemsSold: Number(r?.itemsSold ?? 0),
    orders: Number(r?.orders ?? 0),
  };
}

export async function artistRecentSales(artistId: string, limit = 20) {
  const db = await getDb();
  return db
    .select()
    .from(orderItems)
    .where(eq(orderItems.artistId, artistId))
    .orderBy(desc(orderItems.id))
    .limit(limit);
}

/* ------------------------------------------------------------------ */
/* Payouts (simulated — no real payment gateway)                        */
/* ------------------------------------------------------------------ */
export async function requestPayout(artistId: string, amount: number, currency: "fa" | "en", destination: string) {
  const db = await getDb();
  const balance = await artistBalance(artistId);
  if (amount <= 0 || amount > balance) return { ok: false as const, error: "insufficient_balance" };
  return db.transaction(async (tx: typeof db) => {
    const [payout] = await tx
      .insert(payouts)
      .values({ artistId, amount, currency, destination, status: "paid", processedAt: new Date(), method: "bank_transfer" })
      .returning();
    await tx.insert(ledgerEntries).values({
      artistId,
      type: "payout",
      amount: -amount,
      currency,
      payoutId: payout.id,
      note: `Payout to ${destination || "bank account"}`,
    });
    return { ok: true as const, payout };
  });
}

export async function listPayouts(artistId: string) {
  const db = await getDb();
  return db.select().from(payouts).where(eq(payouts.artistId, artistId)).orderBy(desc(payouts.requestedAt));
}
