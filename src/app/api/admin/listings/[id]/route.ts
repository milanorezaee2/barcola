import { NextResponse } from "next/server";
import { withNoStore } from "@/lib/http";
import { requireAdmin } from "@/lib/marketplace/guard";
import { reviewListing } from "@/lib/marketplace/repo";

export const dynamic = "force-dynamic";

/** PATCH /api/admin/listings/[id] — approve (publish) or reject a pending listing. */
export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;
  const { id } = await ctx.params;
  const body = (await req.json().catch(() => null)) as { decision?: "published" | "rejected"; reason?: string } | null;
  if (body?.decision !== "published" && body?.decision !== "rejected") {
    return NextResponse.json({ ok: false, error: "invalid_payload" }, withNoStore({ status: 400 }));
  }
  const row = await reviewListing(id, body.decision, body.reason);
  if (!row) return NextResponse.json({ ok: false, error: "not_found" }, withNoStore({ status: 404 }));
  return NextResponse.json({ ok: true, listing: row }, withNoStore());
}
