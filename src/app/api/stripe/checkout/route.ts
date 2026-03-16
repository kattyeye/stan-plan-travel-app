import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { slug, email, tripNickname } = await req.json();
    // TODO: create Stripe checkout session, return URL
    return NextResponse.json({ url: "/wizard?payment=placeholder" });
  } catch (error) {
    return NextResponse.json({ error: "Checkout failed" }, { status: 500 });
  }
}
