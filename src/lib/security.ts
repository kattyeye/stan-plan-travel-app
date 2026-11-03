import { createHash, createHmac, timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { getKV } from "./kv";

export function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

export function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function bearerToken(req: Request): string | null {
  const header = req.headers.get("authorization") ?? "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : null;
}

/**
 * Admin routes require `Authorization: Bearer $ADMIN_TOKEN`. When ADMIN_TOKEN
 * isn't configured the admin API is disabled rather than open.
 */
export function requireAdmin(req: Request): NextResponse | null {
  const expected = process.env.ADMIN_TOKEN;
  if (!expected) {
    return NextResponse.json(
      { error: "Admin is disabled. Set the ADMIN_TOKEN environment variable to enable it." },
      { status: 503 }
    );
  }
  const token = bearerToken(req);
  if (!token || !safeEqual(token, expected)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}

/**
 * Secret for server-to-server calls between pipeline stages. Uses
 * INTERNAL_API_SECRET when set, otherwise derives one from the Anthropic key so
 * no extra configuration is needed.
 */
export function internalSecret(): string {
  if (process.env.INTERNAL_API_SECRET) return process.env.INTERNAL_API_SECRET;
  const seed = process.env.ANTHROPIC_API_KEY ?? process.env.STRIPE_SECRET_KEY ?? "irie-dev-only";
  return createHmac("sha256", seed).update("irie-internal-pipeline-v1").digest("hex");
}

export function isInternalRequest(req: Request): boolean {
  const token = bearerToken(req);
  return !!token && safeEqual(token, internalSecret());
}

export function clientIp(req: NextRequest | Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

/**
 * Fixed-window rate limit. Fails open if storage is unavailable so a Redis
 * blip never blocks paying customers.
 */
export async function rateLimit(
  bucket: string,
  key: string,
  limit: number,
  windowSeconds: number
): Promise<{ ok: boolean; retryAfter: number }> {
  try {
    const window = Math.floor(Date.now() / 1000 / windowSeconds);
    const k = `rl:${bucket}:${key}:${window}`;
    const kv = getKV();
    const count = await kv.incr(k);
    if (count === 1) await kv.expire(k, windowSeconds);
    const retryAfter = windowSeconds - (Math.floor(Date.now() / 1000) % windowSeconds);
    return { ok: count <= limit, retryAfter };
  } catch (err) {
    console.error("rateLimit failed open:", err);
    return { ok: true, retryAfter: 0 };
  }
}

export function tooManyRequests(retryAfter: number) {
  return NextResponse.json(
    { error: "Too many requests. Please try again shortly." },
    { status: 429, headers: { "Retry-After": String(retryAfter) } }
  );
}

/**
 * Origin for server-to-server pipeline hand-offs. Targets this exact
 * deployment (so previews don't call production) except in production, where
 * the stable production domain avoids Vercel deployment-protection walls.
 */
export function internalOrigin(req?: Request): string {
  if (process.env.VERCEL_ENV === "production" && process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return req ? new URL(req.url).origin : appOrigin();
}

export function internalHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${internalSecret()}`,
    "Content-Type": "application/json",
  };
  if (process.env.VERCEL_AUTOMATION_BYPASS_SECRET) {
    headers["x-vercel-protection-bypass"] = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
  }
  return headers;
}

/** The public origin to build customer-facing links with. */
export function appOrigin(req?: Request): string {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  if (req) return new URL(req.url).origin;
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}
