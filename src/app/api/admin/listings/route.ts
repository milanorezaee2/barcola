import { NextResponse } from "next/server";
import { withNoStore } from "@/lib/http";
import { requireAdmin } from "@/lib/marketplace/guard";
import { listPendingListings } from "@/lib/marketplace/repo";

export const dynamic = "force-dynamic";

/** GET /api/admin/listings — the moderation queue: every listing awaiting review, with its artist. */
export async function GET() {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;
  const rows = await listPendingListings();
  return NextResponse.json({ ok: true, listings: rows }, withNoStore());
}
