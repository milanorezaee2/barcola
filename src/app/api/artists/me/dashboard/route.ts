import { NextResponse } from "next/server";
import { withNoStore } from "@/lib/http";
import { requireArtist } from "@/lib/marketplace/guard";
import { artistBalance, artistLedger, artistRecentSales, artistSalesStats, findArtistProfileByUserId, listPayouts } from "@/lib/marketplace/repo";

export const dynamic = "force-dynamic";

/** One-shot summary payload for the artist dashboard home screen: profile status, balance,
 *  aggregate stats, recent sales, ledger and payout history. */
export async function GET() {
  const guard = await requireArtist();
  if (!guard.ok) return guard.response;
  const artistId = guard.session.artistId;

  const [profile, balance, stats, recentSales, ledger, payouts] = await Promise.all([
    guard.session.id ? findArtistProfileByUserId(guard.session.id) : null,
    artistBalance(artistId),
    artistSalesStats(artistId),
    artistRecentSales(artistId, 20),
    artistLedger(artistId, 50),
    listPayouts(artistId),
  ]);

  return NextResponse.json({ ok: true, profile, balance, stats, recentSales, ledger, payouts }, withNoStore());
}
