import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { wizardData, stripeSessionId } = await req.json();
    // TODO: verify Stripe → generate slug → call Claude (JSON) → call Claude (HTML) → save to DB → email link
    return NextResponse.json({ slug: "placeholder" });
  } catch (error) {
    console.error("Generate error:", error);
    return NextResponse.json({ error: "Generation failed" }, { status: 500 });
  }
}
