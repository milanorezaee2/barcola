import { NextResponse } from "next/server";
import { withNoStore } from "@/lib/http";
import { requireApprovedArtist } from "@/lib/marketplace/guard";
import { listPayouts, requestPayout } from "@/lib/marketplace/repo";

export const dynamic = "force-dynamic";

export async function GET() {
  const guard = await requireApprovedArtist();
  if (!guard.ok) return guard.response;
  const rows = await listPayouts(guard.session.artistId);
  return NextResponse.json({ ok: true, payouts: rows }, withNoStore());
}

/** Request a (simulated) payout/withdrawal. No real payment gateway is wired up — the request is
 *  recorded and immediately marked "paid" against the artist's ledger, exactly like a real payout
 *  bookkeeping-wise, just without moving actual money. */
export async function POST(req: Request) {
  const guard = await requireApprovedArtist();
  if (!guard.ok) return guard.response;
  const body = (await req.json().catch(() => null)) as { amount?: number; currency?: "fa" | "en"; destination?: string } | null;
  const amount = Math.round(Number(body?.amount));
  if (!amount || amount <= 0) return NextResponse.json({ ok: false, error: "invalid_amount" }, withNoStore({ status: 400 }));
  const result = await requestPayout(guard.session.artistId, amount, body?.currency === "en" ? "en" : "fa", body?.destination?.trim() ?? "");
  if (!result.ok) return NextResponse.json({ ok: false, error: result.error }, withNoStore({ status: 400 }));
  return NextResponse.json({ ok: true, payout: result.payout }, withNoStore({ status: 201 }));
}
