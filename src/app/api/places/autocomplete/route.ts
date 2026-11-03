import { NextRequest, NextResponse } from "next/server";
import { autocompleteProvider, searchDestinations, type DestinationSuggestion } from "@/lib/geocode";
import { getKV } from "@/lib/kv";
import { clientIp, rateLimit, tooManyRequests } from "@/lib/security";

/** GET /api/places/autocomplete?q=corf — destination suggestions for the wizard and landing page. */
export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get("q") ?? "").trim().replace(/\s+/g, " ").slice(0, 80);
  if (q.length < 2) return NextResponse.json({ suggestions: [] });

  const limit = await rateLimit("autocomplete", clientIp(req), 60, 60);
  if (!limit.ok) return tooManyRequests(limit.retryAfter);

  const provider = autocompleteProvider();
  const key = `geo:v1:${provider}:${q.toLowerCase()}`;
  try {
    const cached = await getKV().get<DestinationSuggestion[]>(key);
    if (cached) return NextResponse.json({ suggestions: cached, provider });
  } catch {
    /* cache unavailable — fall through */
  }

  try {
    const suggestions = await searchDestinations(q, req.nextUrl.searchParams.get("session") ?? undefined);
    await getKV()
      .set(key, suggestions, { ex: 60 * 60 * 24 * 30 })
      .catch(() => {});
    return NextResponse.json({ suggestions, provider }, { headers: { "Cache-Control": "public, max-age=3600" } });
  } catch (err) {
    console.error("autocomplete failed:", err);
    // The input still accepts free text, so degrade quietly.
    return NextResponse.json({ suggestions: [], provider, degraded: true });
  }
}
