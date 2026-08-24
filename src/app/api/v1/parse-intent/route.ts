import { NextResponse } from "next/server";
import { MAX_INTENT_TEXT } from "@/core/intent";
import { parseIntent } from "@/lib/intent";

export const runtime = "nodejs";

/**
 * POST /api/v1/parse-intent
 *
 * Body: { text: string }
 *
 * Turns "4 days in the Bahamas, swimming with stingrays, I'm flexible, need a
 * 2 bedroom place" into a Partial<WizardData> plus the list of required fields
 * still missing.
 *
 * Text in, structured data out — no audio ever reaches the server, which is
 * what lets web and native share this endpoint unchanged.
 */
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { text?: unknown };
    const text = typeof body.text === "string" ? body.text.trim() : "";

    if (!text) {
      return NextResponse.json({ error: "Tell us about your trip first." }, { status: 400 });
    }
    if (text.length > MAX_INTENT_TEXT) {
      return NextResponse.json(
        { error: `Keep it under ${MAX_INTENT_TEXT} characters.` },
        { status: 400 },
      );
    }

    return NextResponse.json(await parseIntent(text));
  } catch (error) {
    console.error("parse-intent route error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not understand that." },
      { status: 500 },
    );
  }
}
