import { NextResponse } from "next/server";
import { withNoStore } from "@/lib/http";
import { listPublishedListings } from "@/lib/marketplace/repo";

export const dynamic = "force-dynamic";

/** GET /api/marketplace/listings?kind=pattern|product — public storefront feed of published,
 *  artist-created listings (real DB rows, distinct from the static seed catalogue). */
export async function GET(req: Request) {
  const kind = new URL(req.url).searchParams.get("kind") as "pattern" | "product" | null;
  const rows = await listPublishedListings(kind ?? undefined);
  return NextResponse.json({ ok: true, listings: rows }, withNoStore());
}
