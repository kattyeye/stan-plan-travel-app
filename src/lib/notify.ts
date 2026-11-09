import type { EmailLogEntry, TripRecord } from "@/types/trip";
import { claimOnce, updateTrip } from "./db";
import { getPartner, sendPartnerWebhook } from "./partners";
import { appOrigin } from "./security";

/**
 * Everything that tells people about their trip: emails to the traveller (via
 * Resend) and signed webhooks to the partner who created it.
 *
 * Emails:
 *   started — "we're building it" + the link, so nobody has to keep a tab open
 *   ready   — "your plan is ready" + the link
 *   failed  — "something went wrong" + a link that retries
 *
 * Setup: RESEND_API_KEY, and EMAIL_FROM on a domain verified in Resend
 * (e.g. "Irie <trips@irietravel.app>"). Every attempt — including skips when
 * email isn't configured — is logged and recorded on the trip for /admin.
 */

export function emailEnabled(): boolean {
  return !!process.env.RESEND_API_KEY;
}

const DEFAULT_FROM = "Irie <trips@irietravel.app>";

export interface SendResult {
  ok: boolean;
  id?: string;
  error?: string;
}

/** Sends one email through Resend. Never throws; the result says what happened. */
export async function sendEmail(msg: { to: string; subject: string; html: string; text: string; tag?: string }): Promise<SendResult> {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.warn(`[email] not sent (${msg.tag ?? "email"}): RESEND_API_KEY is not set`);
    return { ok: false, error: "not_configured" };
  }
  if (!msg.to) return { ok: false, error: "no_recipient" };
  try {
    const res = await fetch(`${process.env.RESEND_API_URL ?? "https://api.resend.com"}/emails`, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM || DEFAULT_FROM,
        to: [msg.to],
        subject: msg.subject,
        html: msg.html,
        text: msg.text,
        ...(process.env.EMAIL_REPLY_TO ? { reply_to: process.env.EMAIL_REPLY_TO } : {}),
        ...(msg.tag ? { tags: [{ name: "type", value: msg.tag }] } : {}),
      }),
      signal: AbortSignal.timeout(10_000),
    });
    const body = (await res.json().catch(() => ({}))) as { id?: string; message?: string; name?: string };
    if (!res.ok) {
      const error = `${res.status} ${body.name ?? ""} ${body.message ?? ""}`.trim();
      console.error(`[email] Resend rejected ${msg.tag ?? "email"} to ${maskEmail(msg.to)}: ${error}`);
      return { ok: false, error };
    }
    console.info(`[email] sent ${msg.tag ?? "email"} to ${maskEmail(msg.to)} (${body.id})`);
    return { ok: true, id: body.id };
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    console.error(`[email] send failed (${msg.tag ?? "email"}):`, error);
    return { ok: false, error };
  }
}

export function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!domain) return "***";
  return `${local.slice(0, 2)}${"*".repeat(Math.max(1, local.length - 2))}@${domain}`;
}

async function record(trip: TripRecord, kind: "started" | "ready" | "failed", result: SendResult) {
  const entry: EmailLogEntry = { at: new Date().toISOString(), ok: result.ok, ...(result.id ? { id: result.id } : {}), ...(result.error ? { error: result.error } : {}) };
  await updateTrip(trip.slug, (t) => ({ emails: { ...t.emails, [kind]: entry } })).catch(() => {});
}

// ─── Lifecycle notifications ─────────────────────────────────────────────────

/** "We're on it" — sent once when building starts, so the traveller can close the tab. */
export async function notifyTripStarted(trip: TripRecord): Promise<void> {
  if (!trip.email || !(await claimOnce("email-started", trip.slug))) return;
  const url = `${appOrigin()}/trip/${trip.slug}/generating`;
  const where = trip.wizardData.destination;
  const result = await sendEmail({
    to: trip.email,
    tag: "trip_started",
    subject: `We're building your ${where} plan`,
    text: `We're researching restaurants, activities and events for ${where} and checking that everything is open on your dates. It usually takes 3–5 minutes.\n\nYou can close the tab — we'll email you again when it's ready. Follow along here: ${url}`,
    html: layout(
      `We're building your ${esc(where)} plan`,
      `<p>We're researching restaurants, activities and events for <strong>${esc(where)}</strong> and checking that everything is open on your dates. It usually takes 3–5 minutes.</p>
       <p>You can close the tab — we'll email you again the moment it's ready.</p>`,
      { label: "Follow along", url }
    ),
  });
  await record(trip, "started", result);
}

export async function notifyTripReady(trip: TripRecord): Promise<void> {
  const url = `${appOrigin()}/trip/${trip.slug}`;
  const tasks: Promise<unknown>[] = [notifyPartner(trip, "trip.ready", { url })];
  if (trip.email && (await claimOnce("email-ready", `${trip.slug}:${trip.generatedData?.generatedAt ?? ""}`))) {
    const title = trip.generatedData?.meta.title ?? trip.tripNickname;
    tasks.push(
      sendEmail({
        to: trip.email,
        tag: "trip_ready",
        subject: `Your trip plan is ready: ${title}`,
        text: `Your Irie plan for ${trip.wizardData.destination} is ready — itinerary, meals, grocery list, restaurant guide and packing list.\n\nOpen it: ${url}\n\nShare the link with your group — no login needed.`,
        html: layout(
          esc(title),
          `<p>Your Irie plan for ${esc(trip.wizardData.destination)} is ready — itinerary, meals, grocery list, restaurant guide and packing list, all in one place.</p>
           <p style="font-size:13px;color:#5b6635">Share the link with your group — no login needed. Opening hours were checked when your plan was made; it's still worth calling ahead for dinner reservations.</p>`,
          { label: "Open your plan", url }
        ),
      }).then((r) => record(trip, "ready", r))
    );
  }
  await Promise.allSettled(tasks);
}

export async function notifyTripFailed(trip: TripRecord): Promise<void> {
  const url = `${appOrigin()}/trip/${trip.slug}/generating`;
  const tasks: Promise<unknown>[] = [notifyPartner(trip, "trip.failed", {})];
  if (trip.email && (await claimOnce("email-failed", trip.slug, 60 * 60 * 6))) {
    tasks.push(
      sendEmail({
        to: trip.email,
        tag: "trip_failed",
        subject: `Your ${trip.wizardData.destination} plan hit a snag`,
        text: `We couldn't finish your ${trip.wizardData.destination} plan. Nothing is lost — open this link and tap "Try again": ${url}`,
        html: layout(
          "We hit a snag",
          `<p>We couldn't finish your <strong>${esc(trip.wizardData.destination)}</strong> plan this time. Nothing is lost — your answers are saved.</p>
           <p>Open the link and tap <strong>Try again</strong>.</p>`,
          { label: "Try again", url }
        ),
      }).then((r) => record(trip, "failed", r))
    );
  }
  // Optional: alert whoever runs Irie.
  if (process.env.ADMIN_ALERT_EMAIL) {
    tasks.push(
      sendEmail({
        to: process.env.ADMIN_ALERT_EMAIL,
        tag: "admin_alert",
        subject: `[Irie] Trip ${trip.slug} failed`,
        text: `Trip ${trip.slug} (${trip.wizardData.destination}) failed. Details: ${appOrigin()}/admin/trips`,
        html: `<p>Trip <code>${esc(trip.slug)}</code> (${esc(trip.wizardData.destination)}) failed.</p><p><a href="${appOrigin()}/admin/trips">Open admin</a></p>`,
      })
    );
  }
  await Promise.allSettled(tasks);
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

// ─── Templates ───────────────────────────────────────────────────────────────

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/**
 * Email HTML can't use the app's CSS variables (mail clients strip them), so
 * the brand colours are written out here — the one place that's allowed.
 */
export function layout(heading: string, body: string, cta: { label: string; url: string }): string {
  return `<!doctype html><html><body style="margin:0;background:#f4f6ee;padding:24px 12px">
<div style="max-width:520px;margin:0 auto;background:#fefbe6;border:1px solid #d5dcbc;border-radius:14px;padding:28px 24px;font-family:Georgia,'Times New Roman',serif;color:#2d331a;font-size:16px;line-height:1.55">
<p style="margin:0 0 12px;font-family:Arial,sans-serif;font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:#88994f">Irie</p>
<h1 style="font-weight:400;font-size:26px;line-height:1.2;margin:0 0 16px">${heading}</h1>
${body}
<p style="margin:24px 0 8px"><a href="${cta.url}" style="display:inline-block;background:#5b6635;color:#fefae0;padding:12px 22px;border-radius:999px;text-decoration:none;font-family:Arial,sans-serif;font-weight:600">${esc(cta.label)}</a></p>
<p style="font-family:Arial,sans-serif;font-size:12px;color:#88994f;margin:16px 0 0">Or paste this link: <a href="${cta.url}" style="color:#5b6635">${cta.url}</a></p>
</div></body></html>`;
}
