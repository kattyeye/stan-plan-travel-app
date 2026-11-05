import { NextResponse } from "next/server";
import { createSessionToken, hashLoginToken, LOGIN_TOKEN_TTL, SESSION_COOKIE, sessionCookieOptions } from "@/lib/auth";
import { getKV } from "@/lib/kv";
import { clientIp, rateLimit, tooManyRequests } from "@/lib/security";

export const runtime = "nodejs";

const expired = () => NextResponse.json({ error: "This sign-in link has expired or was already used. Request a new one." }, { status: 400 });

/**
 * Exchanges a sign-in link's token for a session cookie. POST (not GET) so
 * email security scanners that open links can't use up the token.
 */
export async function POST(req: Request) {
  const limit = await rateLimit("login-verify", clientIp(req), 20, 600);
  if (!limit.ok) return tooManyRequests(limit.retryAfter);

  const body = (await req.json().catch(() => ({}))) as { token?: unknown };
  const token = typeof body.token === "string" ? body.token : "";
  if (!/^[a-f0-9]{64}$/.test(token)) return expired();

  const kv = getKV();
  const hash = hashLoginToken(token);
  const record = await kv.get<{ email: string; next: string }>(`login:${hash}`);
  if (!record) return expired();
  // Single use, even if two tabs race.
  if (!(await kv.set(`login-used:${hash}`, 1, { nx: true, ex: LOGIN_TOKEN_TTL }))) return expired();
  await kv.del(`login:${hash}`);

  const res = NextResponse.json({ ok: true, next: record.next }, { headers: { "Cache-Control": "no-store" } });
  res.cookies.set(SESSION_COOKIE, createSessionToken(record.email), sessionCookieOptions());
  return res;
}
