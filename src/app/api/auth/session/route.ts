import { NextResponse } from "next/server";
import { isAdminEmail, sessionFromCookieHeader } from "@/lib/auth";
import { isBetaTester } from "@/lib/beta";

export const runtime = "nodejs";

/** Who's signed in — for the navbar and the wizard's email prefill. */
export async function GET(req: Request) {
  const session = sessionFromCookieHeader(req.headers.get("cookie"));
  const body = session
    ? { signedIn: true, email: session.email, isAdmin: isAdminEmail(session.email), isBeta: await isBetaTester(session.email).catch(() => false) }
    : { signedIn: false };
  return NextResponse.json(body, { headers: { "Cache-Control": "no-store" } });
}
