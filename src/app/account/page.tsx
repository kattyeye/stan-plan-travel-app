import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, CalendarDays, MapPin, Plus, Sparkles } from "lucide-react";
import type { TripRecord } from "@/types/trip";
import { getSession } from "@/lib/session";
import { listUserTrips } from "@/lib/db";
import { isBetaTester } from "@/lib/beta";
import { shortDate } from "@/lib/pipeline/days";
import { localISODate, phaseLabel, tripPhase } from "@/lib/trip-view";
import SignOutButton from "@/components/account/SignOutButton";

export const metadata: Metadata = { title: "My trips — Irie", robots: { index: false } };
export const dynamic = "force-dynamic";

const STATUS: Record<TripRecord["status"], { label: string; bg: string; fg: string }> = {
  ready: { label: "Ready", bg: "var(--color-success-bg)", fg: "var(--color-success-text)" },
  generating: { label: "Being built", bg: "var(--color-bg-selected)", fg: "var(--color-brand)" },
  paid: { label: "Queued", bg: "var(--color-bg-selected)", fg: "var(--color-brand)" },
  pending: { label: "Awaiting payment", bg: "var(--color-warning-bg)", fg: "var(--color-warning-text)" },
  error: { label: "Needs a retry", bg: "var(--color-error-bg)", fg: "var(--color-error-text)" },
};

/** "My trips": every plan made with the signed-in email. */
export default async function AccountPage() {
  const session = await getSession();
  if (!session) redirect("/login?next=/account");
  const [trips, beta] = await Promise.all([listUserTrips(session.email), isBetaTester(session.email).catch(() => false)]);
  const today = localISODate(new Date());

  return (
    <div style={{ minHeight: "calc(100vh - 60px)", background: "var(--color-bg)" }}>
      <div style={{ maxWidth: 880, margin: "0 auto", padding: "2rem 1rem 4rem" }}>
        <header style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap", marginBottom: "1.5rem" }}>
          <div>
            <p style={{ margin: 0, fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--color-text-faint)" }}>Signed in as {session.email}</p>
            <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 400, fontSize: "clamp(1.75rem, 5vw, 2.5rem)", color: "var(--color-heading)", margin: "0.25rem 0 0" }}>My trips</h1>
          </div>
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            {session.isAdmin && (
              <Link href="/admin" style={pill(false)}>Admin dashboard</Link>
            )}
            <SignOutButton />
          </div>
        </header>

        {beta && (
          <p style={{ display: "flex", alignItems: "center", gap: "0.5rem", margin: "0 0 1.25rem", padding: "0.75rem 1rem", borderRadius: "var(--radius-input)", background: "var(--color-bg-selected)", color: "var(--color-text)", fontSize: "0.875rem" }}>
            <Sparkles size={16} aria-hidden="true" style={{ color: "var(--color-accent)" }} /> You&apos;re a beta tester — your plans are on us. Thank you for helping shape Irie!
          </p>
        )}

        <Link href="/wizard" style={{ ...pill(true), marginBottom: "1.5rem" }}>
          <Plus size={16} aria-hidden="true" /> Plan a new trip
        </Link>

        {trips.length === 0 ? (
          <div style={{ background: "var(--color-bg-card)", border: "1px dashed var(--color-border-focus)", borderRadius: "var(--radius-card)", padding: "2rem 1.25rem", textAlign: "center" }}>
            <p style={{ fontFamily: "var(--font-display)", fontSize: "1.25rem", color: "var(--color-heading)", margin: "0 0 0.375rem" }}>No trips yet</p>
            <p style={{ color: "var(--color-text-muted)", margin: 0, fontSize: "0.9375rem" }}>Plans you make with {session.email} will show up here.</p>
          </div>
        ) : (
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 260px), 1fr))", gap: "1rem" }}>
            {trips.map((t) => {
              const status = STATUS[t.status];
              const ready = t.status === "ready" && t.generatedData;
              const href = ready ? `/trip/${t.slug}` : `/trip/${t.slug}/generating`;
              const phase = ready ? phaseLabel(tripPhase(t.generatedData!.meta.dates, today)) : null;
              return (
                <li key={t.slug}>
                  <Link href={href} style={{ display: "flex", flexDirection: "column", gap: "0.5rem", height: "100%", minHeight: 170, padding: "1rem 1.125rem", background: "var(--color-bg-card)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-card)", boxShadow: "var(--shadow-card)", textDecoration: "none", color: "var(--color-text)" }}>
                    <span style={{ display: "flex", gap: "0.375rem", flexWrap: "wrap" }}>
                      <span style={{ ...chip, background: status.bg, color: status.fg }}>{status.label}</span>
                      {phase && <span style={{ ...chip, background: "var(--color-highlight)", color: "var(--color-heading)" }}>{phase}</span>}
                      {t.billing === "comp" && <span style={chip}>Beta</span>}
                    </span>
                    <span style={{ fontFamily: "var(--font-display)", fontSize: "1.25rem", lineHeight: 1.2, color: "var(--color-heading)" }}>{t.generatedData?.meta.title ?? t.tripNickname ?? t.wizardData.destination}</span>
                    <span style={{ display: "flex", alignItems: "center", gap: "0.375rem", fontSize: "0.875rem", color: "var(--color-text-muted)" }}>
                      <MapPin size={14} aria-hidden="true" /> {t.wizardData.destination}
                    </span>
                    <span style={{ display: "flex", alignItems: "center", gap: "0.375rem", fontSize: "0.875rem", color: "var(--color-text-muted)" }}>
                      <CalendarDays size={14} aria-hidden="true" /> {shortDate(t.wizardData.startDate)} – {shortDate(t.wizardData.endDate)}
                    </span>
                    <span style={{ marginTop: "auto", display: "inline-flex", alignItems: "center", gap: "0.25rem", fontSize: "0.875rem", fontWeight: 700, color: "var(--color-brand)" }}>
                      {ready ? "Open plan" : t.status === "error" ? "See what happened" : "See progress"} <ArrowRight size={14} aria-hidden="true" />
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

const chip: React.CSSProperties = { display: "inline-flex", alignItems: "center", padding: "0.125rem 0.5rem", borderRadius: "var(--radius-chip)", fontSize: "0.75rem", fontWeight: 700, background: "var(--color-bg-selected)", color: "var(--color-text-muted)" };
const pill = (primary: boolean): React.CSSProperties => ({
  display: "inline-flex", alignItems: "center", gap: "0.375rem", minHeight: 44, padding: "0 1.125rem", borderRadius: "var(--radius-chip)", fontWeight: 700, fontSize: "0.875rem", textDecoration: "none",
  background: primary ? "var(--color-brand)" : "var(--color-bg-card)", color: primary ? "var(--color-text-inverse)" : "var(--color-text)", border: primary ? "none" : "1px solid var(--color-border)",
});
