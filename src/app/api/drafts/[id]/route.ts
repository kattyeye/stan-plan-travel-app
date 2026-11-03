import { NextRequest, NextResponse } from "next/server";
import { getDraft } from "@/lib/partners/drafts";

/** Prefill data for /wizard?draft=<id>. Contains no guest PII beyond what the partner chose to include. */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const draft = await getDraft(id);
  if (!draft) return NextResponse.json({ error: "Draft not found or expired" }, { status: 404 });
  return NextResponse.json({
    id: draft.id,
    wizard: draft.wizard,
    property: draft.property ? { name: draft.property.name, address: draft.property.address, source: draft.property.source } : null,
  });
}
