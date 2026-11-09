import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { emailEnabled, layout, sendEmail } from "@/lib/notify";
import { appOrigin, requireAdmin } from "@/lib/security";

/**
 * POST /api/admin/email-test { "to": "you@example.com" } — sends a test email
 * and returns exactly what the email provider said, so setup problems
 * (missing key, unverified sender domain) are visible immediately.
 */
export async function POST(req: NextRequest) {
  const denied = requireAdmin(req);
  if (denied) return denied;
  const body = z.object({ to: z.string().trim().email() }).safeParse(await req.json().catch(() => ({})));
  if (!body.success) return NextResponse.json({ error: "Enter a valid email address" }, { status: 400 });

  const result = await sendEmail({
    to: body.data.to,
    tag: "test",
    subject: "Irie test email",
    text: `If you can read this, trip emails are working. Sent from ${appOrigin()}.`,
    html: layout("Trip emails are working", `<p>If you can read this, Irie can email travellers their plans.</p>`, { label: "Open Irie", url: appOrigin() }),
  });

  const hint = !emailEnabled()
    ? "RESEND_API_KEY isn't set in this deployment. Add it in Vercel → Settings → Environment Variables, then redeploy."
    : !result.ok && /domain|verify|from/i.test(result.error ?? "")
      ? `The sender address isn't on a domain verified in Resend. Verify your domain at resend.com/domains and set EMAIL_FROM (currently "${process.env.EMAIL_FROM || "Irie <trips@irietravel.app>"}").`
      : !result.ok && /403|401|api key/i.test(result.error ?? "")
        ? "Resend rejected the API key, or the key can only send to your own address until a domain is verified."
        : null;

  return NextResponse.json({ ...result, from: process.env.EMAIL_FROM || "Irie <trips@irietravel.app> (default)", hint }, { status: result.ok ? 200 : 502 });
}
