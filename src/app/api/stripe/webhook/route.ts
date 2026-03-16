import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  // TODO: verify Stripe webhook signature, handle checkout.session.completed
  return NextResponse.json({ received: true });
}
