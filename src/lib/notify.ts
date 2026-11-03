import type { TripRecord } from "@/types/trip";
import { getPartner, sendPartnerWebhook } from "./partners";
import { appOrigin } from "./security";

/**
 * Tells everyone who's waiting that a trip is ready: the traveller (email via
 * Resend when RESEND_API_KEY is set) and the partner who created it (signed webhook).
 */
export async function notifyTripReady(trip: TripRecord): Promise<void> {
  const url = `${appOrigin()}/trip/${trip.slug}`;
  await Promise.allSettled([sendReadyEmail(trip, url), notifyPartner(trip, "trip.ready", { url })]);
}

export async function notifyTripFailed(trip: TripRecord): Promise<void> {
  await notifyPartner(trip, "trip.failed", {});
}

async function notifyPartner(trip: TripRecord, event: string, extra: Record<string, unknown>) {
  if (!trip.partner) return;
  const partner = await getPartner(trip.partner.partnerId);
  if (!partner) return;
  await sendPartnerWebhook(partner, event, {
    tripId: trip.slug,
    externalRef: trip.partner.externalRef ?? null,
    status: trip.status,
    ...extra,
  });
}

const escapeHtml = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

async function sendReadyEmail(trip: TripRecord, url: string) {
  const key = process.env.RESEND_API_KEY;
  if (!key || !trip.email) return;
  const from = process.env.EMAIL_FROM ?? "Irie <trips@irie.travel>";
  const name = escapeHtml(trip.generatedData?.meta.title ?? trip.tripNickname);
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from,
      to: [trip.email],
      subject: `Your trip plan is ready: ${trip.generatedData?.meta.title ?? trip.tripNickname}`,
      html: `<div style="font-family:Georgia,serif;max-width:520px;margin:0 auto;padding:24px;color:#2d331a">
<h1 style="font-weight:400">${name}</h1>
<p>Your Irie plan for ${escapeHtml(trip.wizardData.destination)} is ready — itinerary, meals, grocery list, restaurant guide and packing list, all in one place.</p>
<p><a href="${url}" style="display:inline-block;background:#5b6635;color:#fefae0;padding:12px 22px;border-radius:999px;text-decoration:none">Open your plan</a></p>
<p style="font-size:13px;color:#5b6635">Share the link with your group — no login needed. Opening hours were checked when your plan was made; it's still worth calling ahead for dinner reservations.</p>
</div>`,
    }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) console.error("Resend email failed:", res.status, (await res.text()).slice(0, 200));
}
