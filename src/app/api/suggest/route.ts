import { NextResponse } from "next/server";
import { clientIp, rateLimit, tooManyRequests } from "@/lib/security";
import { suggestForDestination } from "@/lib/suggest";

export const runtime = "nodejs";

/** Website: destination-aware chips for the wizard. */
export async function POST(req: Request) {
  const limit = await rateLimit("suggest", clientIp(req), 30, 600);
  if (!limit.ok) return tooManyRequests(limit.retryAfter);

  const body = (await req.json().catch(() => ({}))) as { destination?: unknown; numKids?: unknown };
  const destination = typeof body.destination === "string" ? body.destination.trim() : "";
  const numKids = typeof body.numKids === "number" ? body.numKids : 0;
  if (destination.length < 2) return NextResponse.json({ error: "destination is required" }, { status: 400 });

  try {
    return NextResponse.json(await suggestForDestination(destination, numKids));
  } catch (err) {
    console.error("suggest route error:", err);
    return NextResponse.json({ error: "suggestion_failed" }, { status: 500 });
  }
}
