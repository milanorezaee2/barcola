import { NextResponse } from "next/server";
import { withNoStore } from "@/lib/http";
import { requireAdmin } from "@/lib/marketplace/guard";
import { listArtistApplications } from "@/lib/marketplace/repo";

export const dynamic = "force-dynamic";

/** GET /api/admin/artists?status=pending — list artist applications/profiles for the admin queue. */
export async function GET(req: Request) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;
  const status = new URL(req.url).searchParams.get("status") as "pending" | "approved" | "rejected" | "suspended" | null;
  const rows = await listArtistApplications(status ?? undefined);
  return NextResponse.json({ ok: true, applications: rows }, withNoStore());
}
