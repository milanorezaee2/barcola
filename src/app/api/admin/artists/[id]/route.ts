import { NextResponse } from "next/server";
import { withNoStore } from "@/lib/http";
import { requireAdmin } from "@/lib/marketplace/guard";
import { setArtistStatus } from "@/lib/marketplace/repo";

export const dynamic = "force-dynamic";

/** PATCH /api/admin/artists/[id] — approve / reject / suspend an artist profile, optionally
 *  overriding their commission percentage. */
export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;
  const { id } = await ctx.params;
  const body = (await req.json().catch(() => null)) as { status?: "approved" | "rejected" | "suspended"; commissionPct?: number } | null;
  if (!body?.status || !["approved", "rejected", "suspended"].includes(body.status)) {
    return NextResponse.json({ ok: false, error: "invalid_payload" }, withNoStore({ status: 400 }));
  }
  const row = await setArtistStatus(id, body.status, typeof body.commissionPct === "number" ? body.commissionPct : undefined);
  if (!row) return NextResponse.json({ ok: false, error: "not_found" }, withNoStore({ status: 404 }));
  return NextResponse.json({ ok: true, profile: row }, withNoStore());
}
