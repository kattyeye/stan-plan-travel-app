import { NextResponse } from "next/server";

/**
 * Helpers for the public client API (/api/v1/client/*) used by mobile apps and
 * browser extensions.
 *
 * No secrets: anything shipped inside an app can be extracted, so these
 * endpoints are public like the website's, protected by validation and rate
 * limits. A trip's unguessable id is its access capability (as with web links).
 *
 * CORS is open (`*`) because no cookies or credentials are ever accepted;
 * restrict it with IRIE_CLIENT_ORIGINS (comma-separated, e.g.
 * "chrome-extension://abcdefgh,https://app.example.com") if you prefer.
 */

export const CLIENT_API_VERSION = "2026-11-03";

function allowedOrigin(req: Request): string | null {
  const list = (process.env.IRIE_CLIENT_ORIGINS ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  if (list.length === 0) return "*";
  const origin = req.headers.get("origin");
  return origin && list.includes(origin) ? origin : null;
}

export function corsHeaders(req: Request): Record<string, string> {
  const origin = allowedOrigin(req);
  const headers: Record<string, string> = {
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-Irie-Client",
    "Access-Control-Max-Age": "86400",
    "Irie-Api-Version": CLIENT_API_VERSION,
  };
  if (origin) headers["Access-Control-Allow-Origin"] = origin;
  if (origin && origin !== "*") headers["Vary"] = "Origin";
  return headers;
}

export function preflight(req: Request) {
  return new NextResponse(null, { status: 204, headers: corsHeaders(req) });
}

export function ok(req: Request, data: unknown, init: { status?: number; headers?: Record<string, string> } = {}) {
  return NextResponse.json(data, { status: init.status ?? 200, headers: { ...corsHeaders(req), ...init.headers } });
}

export type ClientErrorType =
  | "invalid_request"
  | "not_found"
  | "payment_required"
  | "rate_limited"
  | "storage_unavailable"
  | "server_error";

export function fail(
  req: Request,
  status: number,
  type: ClientErrorType,
  message: string,
  extra: Record<string, unknown> = {},
  headers: Record<string, string> = {}
) {
  return NextResponse.json({ error: { type, message, ...extra } }, { status, headers: { ...corsHeaders(req), ...headers } });
}

export function rateLimited(req: Request, retryAfter: number) {
  return fail(req, 429, "rate_limited", "Too many requests. Please try again shortly.", { retryAfter }, { "Retry-After": String(retryAfter) });
}
