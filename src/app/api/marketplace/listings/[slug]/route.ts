import { NextResponse } from "next/server";
import { withNoStore } from "@/lib/http";
import { findListingBySlug } from "@/lib/marketplace/repo";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const row = await findListingBySlug(slug);
  if (!row || row.listing.status !== "published") {
    return NextResponse.json({ ok: false, error: "not_found" }, withNoStore({ status: 404 }));
  }
  return NextResponse.json({ ok: true, ...row }, withNoStore());
}
