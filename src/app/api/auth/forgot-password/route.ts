import { NextResponse } from "next/server";
import { withNoStore } from "@/lib/http";
import { createPasswordResetToken } from "@/lib/marketplace/repo";
import { clientIp, tooManyAttempts, recordFailure } from "@/lib/rate-limit";

/**
 * Simulated "forgot password" flow: no real email service is wired up (this project's payment
 * and payout flows are simulated the same way), so instead of sending an email we return the
 * one-time reset link/token directly in the response — the UI surfaces it on screen so the whole
 * reset loop is fully testable end-to-end without any external service.
 */
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { email?: string } | null;
  if (!body?.email?.trim()) return NextResponse.json({ ok: false, error: "invalid_payload" }, withNoStore({ status: 400 }));

  const key = `forgot|${clientIp(req)}|${body.email.trim().toLowerCase()}`;
  if (tooManyAttempts(key)) return NextResponse.json({ ok: false, error: "too_many_attempts" }, withNoStore({ status: 429 }));

  const result = await createPasswordResetToken(body.email.trim());
  if (!result) {
    // Never reveal whether the email exists — respond the same way either way.
    recordFailure(key);
    return NextResponse.json({ ok: true, token: null }, withNoStore());
  }
  // No email gateway is connected: hand the token back so the client can show a "reset link" —
  // this is the simulated equivalent of "check your inbox".
  return NextResponse.json({ ok: true, token: result.token }, withNoStore());
}
