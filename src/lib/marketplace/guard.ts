import { NextResponse } from "next/server";
import { getSession, type SessionUser } from "@/lib/auth";
import { withNoStore } from "@/lib/http";

/** Requires a signed-in session with role="artist" AND an approved artist profile. */
export async function requireApprovedArtist(): Promise<
  { ok: true; session: SessionUser & { artistId: string } } | { ok: false; response: NextResponse }
> {
  const session = await getSession();
  if (!session || session.role !== "artist" || !session.artistId) {
    return { ok: false, response: NextResponse.json({ ok: false, error: "unauthorized" }, withNoStore({ status: 401 })) };
  }
  if (session.artistStatus !== "approved") {
    return { ok: false, response: NextResponse.json({ ok: false, error: "artist_not_approved" }, withNoStore({ status: 403 })) };
  }
  return { ok: true, session: session as SessionUser & { artistId: string } };
}

/** Requires a signed-in session with role="artist" (approved or not — used for read-only views like the applicant's own dashboard). */
export async function requireArtist(): Promise<
  { ok: true; session: SessionUser & { artistId: string } } | { ok: false; response: NextResponse }
> {
  const session = await getSession();
  if (!session || session.role !== "artist" || !session.artistId) {
    return { ok: false, response: NextResponse.json({ ok: false, error: "unauthorized" }, withNoStore({ status: 401 })) };
  }
  return { ok: true, session: session as SessionUser & { artistId: string } };
}

/** Requires a signed-in admin session (DB admin or the env-fallback admin). */
export async function requireAdmin(): Promise<{ ok: true; session: SessionUser } | { ok: false; response: NextResponse }> {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return { ok: false, response: NextResponse.json({ ok: false, error: "unauthorized" }, withNoStore({ status: 401 })) };
  }
  return { ok: true, session };
}
