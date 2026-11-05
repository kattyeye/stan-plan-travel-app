import { createHash, createHmac, randomBytes, timingSafeEqual } from "crypto";

/**
 * Passwordless sign-in for travellers and admins.
 *
 *   1. /api/auth/request emails a single-use link (token stored hashed, 15 min).
 *   2. /login/verify posts the token to /api/auth/verify, which sets a signed,
 *      httpOnly session cookie (30 days). No passwords, no user table: a trip
 *      already carries its email, so signing in shows every plan made with it.
 *
 * Admins are the emails listed in ADMIN_EMAILS. This module only depends on
 * Node's crypto so security.ts, routes and server components can all use it.
 */

export const SESSION_COOKIE = "irie_session";
export const SESSION_DAYS = 30;
export const LOGIN_TOKEN_TTL = 15 * 60;

export interface Session {
  email: string;
  /** Expiry, epoch seconds. */
  exp: number;
}

function secret(): string {
  if (process.env.AUTH_SECRET) return process.env.AUTH_SECRET;
  // Same approach as internalSecret(): derive a stable secret from a key that's always configured.
  const seed = process.env.ADMIN_TOKEN ?? process.env.ANTHROPIC_API_KEY ?? "irie-dev-only";
  return createHmac("sha256", seed).update("irie-auth-session-v1").digest("hex");
}

const b64url = (buf: Buffer | string) => Buffer.from(buf).toString("base64url");
const sign = (payload: string) => createHmac("sha256", secret()).update(payload).digest("base64url");

export const cleanEmail = (email: string) => email.trim().toLowerCase();

export function isPlausibleEmail(email: string): boolean {
  return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
}

/** `payload.signature` — tamper-evident, readable without a database lookup. */
export function createSessionToken(email: string, now = Date.now()): string {
  const payload = b64url(JSON.stringify({ e: cleanEmail(email), exp: Math.floor(now / 1000) + SESSION_DAYS * 86_400, v: 1 }));
  return `${payload}.${sign(payload)}`;
}

export function readSessionToken(token: string | undefined | null, now = Date.now()): Session | null {
  if (!token) return null;
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;
  const expected = Buffer.from(sign(payload));
  const given = Buffer.from(sig);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { e?: unknown; exp?: unknown };
    if (typeof data.e !== "string" || typeof data.exp !== "number" || data.exp * 1000 < now) return null;
    return { email: data.e, exp: data.exp };
  } catch {
    return null;
  }
}

/** Reads the session from a raw Cookie header (route handlers that get a plain Request). */
export function sessionFromCookieHeader(header: string | null): Session | null {
  if (!header) return null;
  for (const part of header.split(";")) {
    const [name, ...rest] = part.trim().split("=");
    if (name === SESSION_COOKIE) return readSessionToken(decodeURIComponent(rest.join("=")));
  }
  return null;
}

export function sessionCookieOptions(maxAgeSeconds = SESSION_DAYS * 86_400) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: maxAgeSeconds,
  };
}

// ─── Admins ──────────────────────────────────────────────────────────────────

export function adminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map(cleanEmail)
    .filter(Boolean);
}

export function isAdminEmail(email: string | undefined | null): boolean {
  return !!email && adminEmails().includes(cleanEmail(email));
}

// ─── Login links ─────────────────────────────────────────────────────────────

export function newLoginToken(): { token: string; hash: string } {
  const token = randomBytes(32).toString("hex");
  return { token, hash: hashLoginToken(token) };
}

export const hashLoginToken = (token: string) => createHash("sha256").update(`login:${token}`).digest("hex");

/** Only same-site relative paths, so a sign-in link can never bounce someone to another site. */
export function safeNextPath(next: unknown, fallback = "/account"): string {
  if (typeof next !== "string" || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return fallback;
  if (/[\r\n]/.test(next) || next.length > 300) return fallback;
  return next;
}
