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

export function emailEnabled(): boolean {
  return !!process.env.RESEND_API_KEY;
}

/** Sends one email through Resend. Returns false (and logs) on failure; never throws. */
export async function sendEmail(msg: { to: string; subject: string; html: string }): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  if (!key || !msg.to) return false;
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: process.env.EMAIL_FROM ?? "Irie <trips@irie.travel>", to: [msg.to], subject: msg.subject, html: msg.html }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) console.error("Resend email failed:", res.status, (await res.text()).slice(0, 200));
    return res.ok;
  } catch (err) {
    console.error("Resend email failed:", err);
    return false;
  }
}

// Emails can't use CSS variables, so they carry the brand's hex values (like the offline export).
const emailShell = (body: string) =>
  `<div style="font-family:Georgia,serif;max-width:520px;margin:0 auto;padding:24px;color:#2d331a">${body}</div>`;
const emailButton = (href: string, label: string) =>
  `<p><a href="${href}" style="display:inline-block;background:#5b6635;color:#fefae0;padding:12px 22px;border-radius:999px;text-decoration:none">${label}</a></p>`;

async function sendReadyEmail(trip: TripRecord, url: string) {
  if (!trip.email) return;
  const name = escapeHtml(trip.generatedData?.meta.title ?? trip.tripNickname);
  await sendEmail({
    to: trip.email,
    subject: `Your trip plan is ready: ${trip.generatedData?.meta.title ?? trip.tripNickname}`,
    html: emailShell(`<h1 style="font-weight:400">${name}</h1>
<p>Your Irie plan for ${escapeHtml(trip.wizardData.destination)} is ready — itinerary, meals, grocery list, restaurant guide and packing list, all in one place.</p>
${emailButton(url, "Open your plan")}
<p style="font-size:13px;color:#5b6635">Share the link with your group — no login needed. Sign in at ${escapeHtml(appOrigin())}/account any time to see all your trips. Opening hours were checked when your plan was made; it's still worth calling ahead for dinner reservations.</p>`),
  });
}

/** The magic sign-in link. */
export async function sendLoginEmail(to: string, link: string): Promise<boolean> {
  return sendEmail({
    to,
    subject: "Your Irie sign-in link",
    html: emailShell(`<h1 style="font-weight:400">Sign in to Irie</h1>
<p>Tap the button to see all your trips. The link works once and expires in 15 minutes.</p>
${emailButton(link, "Sign in to Irie")}
<p style="font-size:13px;color:#5b6635">Didn't ask for this? You can ignore this email — nobody can sign in without the link.</p>`),
  });
}
