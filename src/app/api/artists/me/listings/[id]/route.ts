import { NextResponse } from "next/server";
import { withNoStore } from "@/lib/http";
import { requireArtist } from "@/lib/marketplace/guard";
import { deleteListing, updateListing } from "@/lib/marketplace/repo";

export const dynamic = "force-dynamic";

/** PATCH: edit one of the artist's own listings. Editing anything on a published listing sends
 *  it back to "pending_review" unless the caller explicitly sets another status (e.g. archiving). */
export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const guard = await requireArtist();
  if (!guard.ok) return guard.response;
  const { id } = await ctx.params;
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ ok: false, error: "invalid_payload" }, withNoStore({ status: 400 }));

  const patch: Record<string, unknown> = {};
  for (const key of ["titleFa", "titleEn", "descriptionFa", "descriptionEn", "image", "categorySlug"] as const) {
    if (typeof body[key] === "string") patch[key] = body[key];
  }
  if (Array.isArray(body.gallery)) patch.gallery = body.gallery;
  if (Array.isArray(body.tags)) patch.tags = body.tags;
  if (Number.isFinite(body.priceFa)) patch.priceFa = Math.round(Number(body.priceFa));
  if (Number.isFinite(body.priceEn)) patch.priceEn = Math.round(Number(body.priceEn));
  if (body.status === "draft" || body.status === "archived") patch.status = body.status;
  else if (Object.keys(patch).length) patch.status = "pending_review"; // any content edit re-queues moderation

  const row = await updateListing(id, guard.session.artistId, patch);
  if (!row) return NextResponse.json({ ok: false, error: "not_found" }, withNoStore({ status: 404 }));
  return NextResponse.json({ ok: true, listing: row }, withNoStore());
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const guard = await requireArtist();
  if (!guard.ok) return guard.response;
  const { id } = await ctx.params;
  await deleteListing(id, guard.session.artistId);
  return NextResponse.json({ ok: true }, withNoStore());
}
