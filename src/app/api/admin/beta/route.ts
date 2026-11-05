import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { sessionFromCookieHeader } from "@/lib/auth";
import { addBetaTester, listBetaTesters, removeBetaTester } from "@/lib/beta";
import { requireAdmin } from "@/lib/security";

/** Beta testers: free, unlimited plans until removed. */
export async function GET(req: NextRequest) {
  const denied = await requireAdmin(req);
  if (denied) return denied;
  return NextResponse.json({ testers: await listBetaTesters() }, { headers: { "Cache-Control": "no-store" } });
}

const Body = z.object({ email: z.string().trim().toLowerCase().email().max(254), note: z.string().trim().max(120).optional() });

export async function POST(req: NextRequest) {
  const denied = await requireAdmin(req);
  if (denied) return denied;
  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Enter a valid email." }, { status: 400 });
  const addedBy = sessionFromCookieHeader(req.headers.get("cookie"))?.email ?? "admin token";
  const tester = await addBetaTester(parsed.data.email, { note: parsed.data.note, addedBy });
  return NextResponse.json({ tester, testers: await listBetaTesters() }, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const denied = await requireAdmin(req);
  if (denied) return denied;
  const parsed = Body.pick({ email: true }).safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Enter a valid email." }, { status: 400 });
  await removeBetaTester(parsed.data.email);
  return NextResponse.json({ testers: await listBetaTesters() });
}
