import { NextResponse } from "next/server";
import { withNoStore } from "@/lib/http";
import { getDb, schema } from "@/lib/db/client";
import { createArtistApplicant, createCustomer, createListing, findUserByEmail, setArtistStatus, reviewListing } from "@/lib/marketplace/repo";
import { artists, patterns, products } from "@/lib/data/seed";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

/**
 * Development-only helper: seeds the marketplace database with demo accounts and migrates the
 * static seed catalogue (artists/patterns/products) into real, approved DB rows so the new
 * marketplace has content to browse end-to-end. Idempotent — safe to call more than once.
 *
 * Disabled outside development to avoid ever exposing a data-mutating endpoint in production.
 */
export async function POST() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ ok: false, error: "disabled_in_production" }, withNoStore({ status: 403 }));
  }

  const summary: Record<string, unknown> = {};

  // 1) Demo customer account
  const customerEmail = "customer@demo.test";
  let customer = await findUserByEmail(customerEmail);
  if (!customer) {
    const r = await createCustomer("Demo Customer", customerEmail, "password123");
    customer = r.ok ? r.user : null;
  }
  summary.customer = customer ? { email: customerEmail, password: "password123" } : null;

  // 2) Migrate each seed artist into a real, approved artist account + profile.
  const artistIdMap: Record<string, string> = {}; // seed artist.id -> real artistProfiles.id
  for (const a of artists) {
    const email = `${a.slug}@demo.test`;
    let user = await findUserByEmail(email);
    let profileId: string | undefined;
    if (!user) {
      const applied = await createArtistApplicant({
        name: a.name.en,
        email,
        password: "password123",
        professionFa: a.profession.fa,
        professionEn: a.profession.en,
        bioFa: a.bio.fa,
        bioEn: a.bio.en,
      });
      if (applied.ok) {
        user = applied.user;
        profileId = applied.profile.id;
        await setArtistStatus(applied.profile.id, "approved");
      }
    } else {
      const db = await getDb();
      const rows = await db.select().from(schema.artistProfiles).where(eq(schema.artistProfiles.userId, user.id)).limit(1);
      profileId = rows[0]?.id;
      if (profileId && rows[0]?.status !== "approved") await setArtistStatus(profileId, "approved");
    }
    if (profileId) artistIdMap[a.id] = profileId;
  }
  summary.artists = Object.keys(artistIdMap).length;

  // 3) Migrate seed patterns (only ones with a real artist) into published listings.
  let listingCount = 0;
  const db = await getDb();
  for (const p of patterns) {
    if (!p.artistId || !artistIdMap[p.artistId]) continue;
    const existing = await db.select({ id: schema.listings.id }).from(schema.listings).where(eq(schema.listings.sku, p.sku)).limit(1);
    if (existing.length) continue;
    const row = await createListing(artistIdMap[p.artistId], {
      kind: "pattern",
      titleFa: p.title.fa,
      titleEn: p.title.en,
      descriptionFa: p.description.fa,
      descriptionEn: p.description.en,
      image: p.image,
      gallery: p.gallery,
      categorySlug: p.categoryId,
      priceFa: p.price.fa,
      priceEn: p.price.en,
      tags: p.tags,
    });
    await reviewListing(row.id, "published");
    listingCount += 1;
  }
  for (const p of products) {
    if (!p.artistId || !artistIdMap[p.artistId]) continue;
    const existing = await db.select({ id: schema.listings.id }).from(schema.listings).where(eq(schema.listings.sku, p.sku)).limit(1);
    if (existing.length) continue;
    const row = await createListing(artistIdMap[p.artistId], {
      kind: "product",
      titleFa: p.title.fa,
      titleEn: p.title.en,
      descriptionFa: p.description.fa,
      descriptionEn: p.description.en,
      image: p.colors[0]?.image ?? "/images/products/cushion-0.jpg",
      categorySlug: p.categoryId,
      priceFa: p.price.fa,
      priceEn: p.price.en,
    });
    await reviewListing(row.id, "published");
    listingCount += 1;
  }
  summary.listingsPublished = listingCount;

  // 4) One pending applicant (unapproved) so the admin moderation queue isn't empty in demos.
  const pendingEmail = "pending-artist@demo.test";
  if (!(await findUserByEmail(pendingEmail))) {
    await createArtistApplicant({
      name: "Pending Artist",
      email: pendingEmail,
      password: "password123",
      professionFa: "طراح در انتظار تأیید",
      professionEn: "Designer awaiting approval",
    });
  }
  summary.pendingArtist = { email: pendingEmail, password: "password123" };

  return NextResponse.json({ ok: true, summary }, withNoStore());
}
