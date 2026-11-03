import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createPartner, listPartners } from "@/lib/partners";
import { requireAdmin } from "@/lib/security";

export async function GET(req: NextRequest) {
  const denied = requireAdmin(req);
  if (denied) return denied;
  const partners = await listPartners();
  return NextResponse.json({ partners: partners.map((p) => ({ ...p, webhookSecret: p.webhookSecret ? "whsec_…" : undefined })) });
}

const CreatePartner = z.object({
  name: z.string().trim().min(2).max(80),
  billing: z.enum(["partner", "guest"]).default("guest"),
  webhookUrl: z.string().url().startsWith("https://").optional(),
});

/** Creates a partner. The API key and webhook secret are only ever shown in this response. */
export async function POST(req: NextRequest) {
  const denied = requireAdmin(req);
  if (denied) return denied;
  const parsed = CreatePartner.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  const { partner, apiKey } = await createPartner(parsed.data);
  return NextResponse.json({ partner, apiKey }, { status: 201 });
}
