import { NextResponse } from "next/server";
import { cleanEmail, isPlausibleEmail, LOGIN_TOKEN_TTL, newLoginToken, safeNextPath } from "@/lib/auth";
import { normalizeEmail } from "@/lib/billing";
import { getKV } from "@/lib/kv";
import { emailEnabled, sendLoginEmail } from "@/lib/notify";
import { appOrigin, clientIp, rateLimit, sha256, tooManyRequests } from "@/lib/security";

export const runtime = "nodejs";

/**
 * Emails a one-tap sign-in link. The response is the same whether or not the
 * email has trips, so it can't be used to find out who uses Irie.
 */
export async function POST(req: Request) {
  const ipLimit = await rateLimit("login-ip", clientIp(req), 10, 600);
  if (!ipLimit.ok) return tooManyRequests(ipLimit.retryAfter);

  const body = (await req.json().catch(() => ({}))) as { email?: unknown; next?: unknown };
  const email = typeof body.email === "string" ? cleanEmail(body.email) : "";
  if (!isPlausibleEmail(email)) return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });

  const emailLimit = await rateLimit("login-email", sha256(normalizeEmail(email)), 4, 600);
  if (!emailLimit.ok) {
    return NextResponse.json({ error: "We just sent you a link — check your inbox (and spam), or try again in a few minutes." }, { status: 429 });
  }

  const devLinks = !emailEnabled() && (process.env.NODE_ENV !== "production" || process.env.IRIE_DEV_LOGIN_LINKS === "true");
  if (!emailEnabled() && !devLinks) {
    console.error("Sign-in requested but RESEND_API_KEY is not set");
    return NextResponse.json({ error: "Sign-in by email isn't switched on yet. Please try again soon." }, { status: 503 });
  }

  const { token, hash } = newLoginToken();
  await getKV().set(`login:${hash}`, { email, next: safeNextPath(body.next) }, { ex: LOGIN_TOKEN_TTL });
  const link = `${appOrigin(req)}/login/verify?token=${token}`;

  if (devLinks) return NextResponse.json({ ok: true, devLink: link });
  if (!(await sendLoginEmail(email, link))) {
    return NextResponse.json({ error: "We couldn't send the email just now. Please try again in a minute." }, { status: 502 });
  }
  return NextResponse.json({ ok: true });
}
