import { NextRequest, NextResponse } from "next/server";
import {
  REFERRAL_COOKIE,
  REFERRAL_QUERY_PARAM,
  REFERRAL_TTL_DAYS,
  normalizeReferralCode,
} from "@/core/referral";

/**
 * Capture a creator referral code from `?ref=` into a cookie.
 *
 * Runs on page routes only. The code is validated here rather than at use time
 * so nothing unvalidated is ever persisted. First touch wins: if a visitor
 * already carries a code, a later creator's link doesn't steal the credit.
 */
export function middleware(req: NextRequest) {
  const incoming = normalizeReferralCode(req.nextUrl.searchParams.get(REFERRAL_QUERY_PARAM));
  if (!incoming) return NextResponse.next();
  if (req.cookies.get(REFERRAL_COOKIE)?.value) return NextResponse.next();

  const res = NextResponse.next();
  res.cookies.set(REFERRAL_COOKIE, incoming, {
    maxAge: REFERRAL_TTL_DAYS * 24 * 60 * 60,
    sameSite: "lax",
    httpOnly: false, // read client-side for attribution display
    path: "/",
  });
  return res;
}

export const config = {
  // Skip API routes, static assets and image optimization.
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|ico|webp)$).*)"],
};
