import { NextResponse } from "next/server";
import { createSessionToken, SESSION_COOKIE, sessionCookieOptions, sessionForCustomer } from "@/lib/auth";
import { createCustomer } from "@/lib/marketplace/repo";
import { withNoStore } from "@/lib/http";
import { clientIp, tooManyAttempts, recordFailure, clearFailures } from "@/lib/rate-limit";

/** Registers a real DB-backed "customer" account. Never let a cached answer through: this sets
 *  the session cookie. */
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { name?: string; email?: string; password?: string } | null;
  if (!body?.name?.trim() || !body?.email?.trim() || !body?.password || body.password.length < 6) {
    return NextResponse.json({ ok: false, error: "invalid_payload" }, withNoStore({ status: 400 }));
  }
  const key = `signup|${clientIp(req)}|${body.email.trim().toLowerCase()}`;
  if (tooManyAttempts(key)) return NextResponse.json({ ok: false, error: "too_many_attempts" }, withNoStore({ status: 429 }));

  const result = await createCustomer(body.name.trim(), body.email.trim(), body.password);
  if (!result.ok) {
    recordFailure(key);
    return NextResponse.json({ ok: false, error: result.error }, withNoStore({ status: 409 }));
  }
  clearFailures(key);
  const sessionUser = sessionForCustomer(result.user);
  const res = NextResponse.json({ ok: true, user: sessionUser }, withNoStore());
  res.cookies.set(SESSION_COOKIE, await createSessionToken(sessionUser), sessionCookieOptions());
  return res;
}
