import { NextResponse } from "next/server";
import { createSessionToken, SESSION_COOKIE, sessionCookieOptions, sessionForArtistApplicant } from "@/lib/auth";
import { createArtistApplicant } from "@/lib/marketplace/repo";
import { withNoStore } from "@/lib/http";
import { clientIp, tooManyAttempts, recordFailure, clearFailures } from "@/lib/rate-limit";

/**
 * Public "become a creator" application. Creates a real `users` row (role="artist") plus a
 * linked `artist_profiles` row in status="pending" — the applicant is signed in immediately (so
 * they can track their application from a dashboard) but every artist-only capability (listing
 * creation, storefront visibility, payouts) stays locked until an admin approves the profile.
 */
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as {
    name?: string;
    email?: string;
    password?: string;
    professionFa?: string;
    professionEn?: string;
    bioFa?: string;
    bioEn?: string;
  } | null;
  if (!body?.name?.trim() || !body?.email?.trim() || !body?.password || body.password.length < 6) {
    return NextResponse.json({ ok: false, error: "invalid_payload" }, withNoStore({ status: 400 }));
  }
  const key = `apply|${clientIp(req)}|${body.email.trim().toLowerCase()}`;
  if (tooManyAttempts(key)) return NextResponse.json({ ok: false, error: "too_many_attempts" }, withNoStore({ status: 429 }));

  const result = await createArtistApplicant({
    name: body.name.trim(),
    email: body.email.trim(),
    password: body.password,
    professionFa: body.professionFa?.trim(),
    professionEn: body.professionEn?.trim(),
    bioFa: body.bioFa?.trim(),
    bioEn: body.bioEn?.trim(),
  });
  if (!result.ok) {
    recordFailure(key);
    return NextResponse.json({ ok: false, error: result.error }, withNoStore({ status: 409 }));
  }
  clearFailures(key);
  const sessionUser = sessionForArtistApplicant(result.user, result.profile.id);
  const res = NextResponse.json({ ok: true, user: sessionUser, profile: result.profile }, withNoStore());
  res.cookies.set(SESSION_COOKIE, await createSessionToken(sessionUser), sessionCookieOptions());
  return res;
}
