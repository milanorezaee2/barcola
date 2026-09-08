import "server-only";
import { cookies } from "next/headers";
import { findArtistProfileByUserId, verifyPassword } from "@/lib/marketplace/repo";

/**
 * Unified session authentication for all three real account roles: "customer", "artist" and
 * "admin".
 *
 * - Admins: either a real DB user with role="admin", OR (for zero-setup local/dev use) the
 *   ADMIN_EMAIL/ADMIN_PASSWORD environment fallback — kept for backward compatibility with the
 *   existing admin content panel.
 * - Customers & artists: always real rows in the `users` table (see src/lib/db/schema.ts),
 *   password-hashed with bcrypt. Artists additionally carry an `artist_profiles` row with an
 *   approval workflow (pending → approved/rejected/suspended) and a commission rate.
 *
 * Sessions are HMAC-signed, HttpOnly cookies — no server-side session store required.
 */

export const SESSION_COOKIE = "ra-session";
const SESSION_TTL_S = 60 * 60 * 24 * 14; // 14 days

export interface SessionUser {
  /** Database user id. `null` only for the env-configured admin fallback (no DB row). */
  id: string | null;
  name: string;
  email: string;
  role: "admin" | "artist" | "customer";
  artistId?: string;
  artistStatus?: "pending" | "approved" | "rejected" | "suspended";
}

const enc = new TextEncoder();

function secret(): string {
  return process.env.AUTH_SECRET || process.env.ADMIN_PASSWORD || "rosie-atelier-dev-secret";
}

function b64url(bytes: ArrayBuffer | Uint8Array): string {
  const u8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let s = "";
  for (const b of u8) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function fromB64url(s: string): string {
  const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
  return atob(s.replace(/-/g, "+").replace(/_/g, "/") + pad);
}

async function sign(payload: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", enc.encode(secret()), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return b64url(await crypto.subtle.sign("HMAC", key, enc.encode(payload)));
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
}

export function adminConfigured(): boolean {
  return Boolean(process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD);
}

/** Validate credentials against the env-configured admin account only (legacy fallback path). */
function verifyEnvAdmin(email: string, password: string): SessionUser | null {
  const e = email.trim().toLowerCase();
  if (adminConfigured()) {
    const okEmail = timingSafeEqual(e, String(process.env.ADMIN_EMAIL).trim().toLowerCase());
    const okPass = timingSafeEqual(password, String(process.env.ADMIN_PASSWORD));
    if (okEmail && okPass) return { id: null, name: e.split("@")[0], email: e, role: "admin" };
    return null;
  }
  if (process.env.NODE_ENV === "production") return null;
  // Development fallback: any admin@… email with a 4+ char password.
  if (e.startsWith("admin@") && password.length >= 4) return { id: null, name: e.split("@")[0], email: e, role: "admin" };
  return null;
}

/**
 * Full credential check: env-admin fallback first (keeps existing `/admin` behaviour working
 * with zero DB setup), then a real DB user (customer or artist) via bcrypt.
 */
export async function verifyCredentials(email: string, password: string): Promise<{ ok: true; user: SessionUser } | { ok: false; error: string }> {
  const envAdmin = verifyEnvAdmin(email, password);
  if (envAdmin) return { ok: true, user: envAdmin };

  const dbUser = await verifyPassword(email, password);
  if (dbUser) {
    if (dbUser.role === "artist") {
      const profile = await findArtistProfileByUserId(dbUser.id);
      return {
        ok: true,
        user: { id: dbUser.id, name: dbUser.name, email: dbUser.email, role: "artist", artistId: profile?.id, artistStatus: profile?.status },
      };
    }
    return { ok: true, user: { id: dbUser.id, name: dbUser.name, email: dbUser.email, role: dbUser.role } };
  }

  if (email.trim().toLowerCase().startsWith("admin@") && !adminConfigured() && process.env.NODE_ENV === "production") {
    return { ok: false, error: "admin_not_configured" };
  }
  return { ok: false, error: "invalid_credentials" };
}

/** Build a SessionUser for a freshly-created customer account (used right after signup). */
export function sessionForCustomer(user: { id: string; name: string; email: string }): SessionUser {
  return { id: user.id, name: user.name, email: user.email, role: "customer" };
}

/** Build a SessionUser for a freshly-created artist applicant (used right after applying). */
export function sessionForArtistApplicant(user: { id: string; name: string; email: string }, artistId: string): SessionUser {
  return { id: user.id, name: user.name, email: user.email, role: "artist", artistId, artistStatus: "pending" };
}

export async function createSessionToken(user: SessionUser): Promise<string> {
  const payload = b64url(enc.encode(JSON.stringify({ ...user, exp: Math.floor(Date.now() / 1000) + SESSION_TTL_S })));
  return `${payload}.${await sign(payload)}`;
}

export async function readSessionToken(token: string | undefined): Promise<SessionUser | null> {
  if (!token) return null;
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;
  if (!timingSafeEqual(await sign(payload), sig)) return null;
  try {
    const data = JSON.parse(fromB64url(payload)) as SessionUser & { exp: number };
    if (!data.exp || data.exp < Math.floor(Date.now() / 1000)) return null;
    return { id: data.id ?? null, name: data.name, email: data.email, role: data.role, artistId: data.artistId, artistStatus: data.artistStatus };
  } catch {
    return null;
  }
}

export async function getSession(): Promise<SessionUser | null> {
  const store = await cookies();
  return readSessionToken(store.get(SESSION_COOKIE)?.value);
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_S,
  };
}
