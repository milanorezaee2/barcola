import { NextResponse } from "next/server";
import { withNoStore } from "@/lib/http";
import { requireApprovedArtist, requireArtist } from "@/lib/marketplace/guard";
import { createListing, listListingsForArtist } from "@/lib/marketplace/repo";

export const dynamic = "force-dynamic";

/** GET: the signed-in artist's own listings (any status), newest first. */
export async function GET() {
  const guard = await requireArtist();
  if (!guard.ok) return guard.response;
  const rows = await listListingsForArtist(guard.session.artistId);
  return NextResponse.json({ ok: true, listings: rows }, withNoStore());
}

/** POST: create a new listing. Only *approved* artists may create listings; it starts in
 *  "pending_review" and only becomes visible on the storefront once an admin approves it. */
export async function POST(req: Request) {
  const guard = await requireApprovedArtist();
  if (!guard.ok) return guard.response;
  const body = (await req.json().catch(() => null)) as
    | {
        kind?: "pattern" | "product";
        titleFa?: string;
        titleEn?: string;
        descriptionFa?: string;
        descriptionEn?: string;
        image?: string;
        gallery?: string[];
        categorySlug?: string;
        priceFa?: number;
        priceEn?: number;
        tags?: string[];
      }
    | null;
  if (!body?.kind || !body.titleFa?.trim() || !body.titleEn?.trim() || !body.image?.trim() || !Number(body.priceFa) || !Number(body.priceEn)) {
    return NextResponse.json({ ok: false, error: "invalid_payload" }, withNoStore({ status: 400 }));
  }
  const row = await createListing(guard.session.artistId, {
    kind: body.kind,
    titleFa: body.titleFa.trim(),
    titleEn: body.titleEn.trim(),
    descriptionFa: body.descriptionFa?.trim(),
    descriptionEn: body.descriptionEn?.trim(),
    image: body.image.trim(),
    gallery: body.gallery,
    categorySlug: body.categorySlug,
    priceFa: Number(body.priceFa),
    priceEn: Number(body.priceEn),
    tags: body.tags,
  });
  return NextResponse.json({ ok: true, listing: row }, withNoStore({ status: 201 }));
}
