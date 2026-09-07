import "server-only";
import { cookies } from "next/headers";

/**
 * Server-side admin authentication.
 *
 * Production: set ADMIN_EMAIL + ADMIN_PASSWORD (+ optional AUTH_SECRET).
 * Development (no ADMIN_PASSWORD): any "admin@…" email with a 4+ char password is accepted.
 *
 * Sessions are HMAC-signed, HttpOnly cookies — no database required.
 */

export const SESSION_COOKIE = "ra-session";
const SESSION_TTL_S = 60 * 60 * 24 * 14; // 14 days

export interface SessionUser {
  name: string;
  email: string;
  role: "admin";
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

/** Validate credentials. Returns the session user or an error code. */
export function verifyCredentials(email: string, password: string): { ok: true; user: SessionUser } | { ok: false; error: string } {
  const e = email.trim().toLowerCase();
  if (adminConfigured()) {
    const okEmail = timingSafeEqual(e, String(process.env.ADMIN_EMAIL).trim().toLowerCase());
    const okPass = timingSafeEqual(password, String(process.env.ADMIN_PASSWORD));
    if (okEmail && okPass) return { ok: true, user: { name: e.split("@")[0], email: e, role: "admin" } };
    return { ok: false, error: "invalid_credentials" };
  }
  if (process.env.NODE_ENV === "production") return { ok: false, error: "admin_not_configured" };
  // Development fallback
  if (e.startsWith("admin@") && password.length >= 4) return { ok: true, user: { name: e.split("@")[0], email: e, role: "admin" } };
  return { ok: false, error: "invalid_credentials" };
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
    return { name: data.name, email: data.email, role: "admin" };
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
