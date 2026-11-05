import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AlertTriangle, CheckCircle2, CircleDashed, ExternalLink, Flag, Hourglass, ShoppingCart } from "lucide-react";
import { getSession } from "@/lib/session";
import { listTrips } from "@/lib/db";
import { listBetaTesters } from "@/lib/beta";
import { normalizeEmail } from "@/lib/billing";
import { PRICE_CENTS } from "@/lib/stripe";
import { computeStats, setupChecklist, type AttentionItem } from "@/lib/admin-stats";
import TripsChart from "@/components/admin/TripsChart";
import BetaManager, { MakeBetaButton } from "@/components/admin/BetaManager";
import SignOutButton from "@/components/account/SignOutButton";

export const metadata: Metadata = { title: "Admin — Irie", robots: { index: false } };
export const dynamic = "force-dynamic";

const SAMPLE = 250;
const money = (cents: number) => (cents / 100).toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: cents % 100 ? 2 : 0 });
const pct = (x: number | null) => (x === null ? "—" : `${Math.round(x * 100)}%`);
const ago = (iso: string) => {
  const m = Math.round((Date.now() - Date.parse(iso)) / 60_000);
  return m < 60 ? `${Math.max(1, m)}m ago` : m < 1440 ? `${Math.round(m / 60)}h ago` : `${Math.round(m / 1440)}d ago`;
};

const ATTENTION_ICON: Record<AttentionItem["kind"], typeof Flag> = { stuck: Hourglass, error: AlertTriangle, report: Flag, abandoned: ShoppingCart };

/** Your view of the business: is it set up, how is it doing, what needs you. */
export default async function AdminDashboard() {
  const session = await getSession();
  if (!session) redirect("/login?next=/admin");
  if (!session.isAdmin) {
    return (
      <div style={{ maxWidth: 520, margin: "0 auto", padding: "4rem 1rem", textAlign: "center" }}>
        <h1 style={h1}>Not an admin account</h1>
        <p style={{ color: "var(--color-text-muted)" }}>You&apos;re signed in as {session.email}. Admin access comes from the ADMIN_EMAILS setting.</p>
        <SignOutButton />
      </div>
    );
  }

  const [{ trips, total }, testers] = await Promise.all([listTrips(0, SAMPLE), listBetaTesters()]);
  const stats = computeStats(trips, { now: new Date(), priceCents: PRICE_CENTS });
  const setup = setupChecklist();
  const betaSet = new Set(testers.map((t) => normalizeEmail(t.email)));

  return (
    <div style={{ minHeight: "calc(100vh - 60px)", background: "var(--color-bg)" }}>
      <div style={{ maxWidth: 1120, margin: "0 auto", padding: "2rem 1rem 4rem", display: "flex", flexDirection: "column", gap: "1.5rem" }}>
        <header style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
          <div>
            <p style={eyebrow}>Admin · {session.email}</p>
            <h1 style={{ ...h1, margin: "0.25rem 0 0" }}>Dashboard</h1>
          </div>
          <nav aria-label="Admin" style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            <Link href="/admin/trips" style={pill}>All trips &amp; partners</Link>
            <a href="https://dashboard.stripe.com" target="_blank" rel="noopener noreferrer" style={pill}>Stripe <ExternalLink size={13} aria-hidden="true" /></a>
            <SignOutButton />
          </nav>
        </header>

        <section aria-labelledby="setup-h" style={card}>
          <h2 id="setup-h" style={h2}>
            {setup.blocking ? `${setup.blocking} thing${setup.blocking === 1 ? "" : "s"} to finish before taking real payments` : setup.live ? "Live — ready for real customers" : "Set up — Stripe is still in test mode"}
          </h2>
          <ul style={{ listStyle: "none", padding: 0, margin: "0.75rem 0 0", display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 320px), 1fr))", gap: "0.5rem" }}>
            {setup.items.map((i) => (
              <li key={i.label} style={{ display: "flex", gap: "0.5rem", alignItems: "flex-start", fontSize: "0.875rem" }}>
                {i.ok ? (
                  <CheckCircle2 size={16} aria-label="done" style={{ color: "var(--color-success-text)", flexShrink: 0, marginTop: 2 }} />
                ) : i.required ? (
                  <AlertTriangle size={16} aria-label="required" style={{ color: "var(--color-warning-text)", flexShrink: 0, marginTop: 2 }} />
                ) : (
                  <CircleDashed size={16} aria-label="optional" style={{ color: "var(--color-text-faint)", flexShrink: 0, marginTop: 2 }} />
                )}
                <span>
                  <strong style={{ color: "var(--color-text)" }}>{i.label}</strong>
                  <span style={{ display: "block", color: "var(--color-text-muted)", fontSize: "0.8125rem" }}>{i.detail}</span>
                </span>
              </li>
            ))}
            <li style={{ display: "flex", gap: "0.5rem", alignItems: "flex-start", fontSize: "0.875rem" }}>
              <CircleDashed size={16} aria-label="check manually" style={{ color: "var(--color-text-faint)", flexShrink: 0, marginTop: 2 }} />
              <span>
                <strong style={{ color: "var(--color-text)" }}>Vercel Pro plan</strong>
                <span style={{ display: "block", color: "var(--color-text-muted)", fontSize: "0.8125rem" }}>Hobby doesn&apos;t allow commercial use — upgrade before charging.</span>
              </span>
            </li>
          </ul>
          <p style={{ ...muted, marginTop: "0.75rem" }}>Step-by-step: docs/GO_LIVE.md in the repo.</p>
        </section>

        <section aria-label="Key numbers" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 170px), 1fr))", gap: "0.75rem" }}>
          <Kpi label="Trips today" value={String(stats.today)} sub={`${stats.last7} this week · ${stats.last30} in 30 days`} />
          <Kpi label="Revenue, 30 days" value={money(stats.revenue30Cents)} sub={`${stats.billing30.stripe} paid plan${stats.billing30.stripe === 1 ? "" : "s"}${stats.discounts30Cents ? ` · ${money(stats.discounts30Cents)} in promo discounts` : ""}${stats.revenueEstimated ? " · some estimated at list price" : ""}`} />
          <Kpi label="Plans built OK, 7 days" value={pct(stats.successRate7)} sub={`${stats.status.error} failed · ${stats.status.building} building now`} />
          <Kpi label="Median build time" value={stats.medianBuildMinutes === null ? "—" : `${stats.medianBuildMinutes.toFixed(1)} min`} sub="from paid to ready" />
          <Kpi label="Places verified" value={pct(stats.verifiedShare)} sub="on Google, last 30 days" />
          <Kpi label="Traveller reports" value={String(stats.reports)} sub={`${stats.tripsWithGroupEdits} trip${stats.tripsWithGroupEdits === 1 ? "" : "s"} edited by groups`} />
        </section>

        <section aria-labelledby="chart-h" style={card}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: "1rem", flexWrap: "wrap", marginBottom: "0.75rem" }}>
            <h2 id="chart-h" style={h2}>Trips started per day</h2>
            <p style={{ ...muted, margin: 0 }}>Last 30 days: {stats.billing30.stripe} paid · {stats.billing30.free} free · {stats.billing30.comp} beta · {stats.billing30.partner} partner</p>
          </div>
          <TripsChart days={stats.daily} />
        </section>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 420px), 1fr))", gap: "1.5rem", alignItems: "start" }}>
          <section aria-labelledby="attention-h" style={card}>
            <h2 id="attention-h" style={h2}>Needs your attention</h2>
            {stats.attention.length === 0 ? (
              <p style={{ ...muted, marginTop: "0.5rem" }}>Nothing right now — no failed, stuck or reported trips.</p>
            ) : (
              <ul style={{ listStyle: "none", padding: 0, margin: "0.625rem 0 0", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                {stats.attention.map((a, i) => {
                  const Icon = ATTENTION_ICON[a.kind];
                  return (
                    <li key={`${a.slug}-${a.kind}-${i}`} style={{ display: "flex", gap: "0.625rem", alignItems: "flex-start", fontSize: "0.875rem" }}>
                      <Icon size={16} aria-hidden="true" style={{ color: a.kind === "abandoned" ? "var(--color-text-faint)" : "var(--color-warning-text)", flexShrink: 0, marginTop: 2 }} />
                      <span style={{ minWidth: 0 }}>
                        <span style={{ color: "var(--color-text)" }}>{a.message}</span>
                        <span style={{ display: "block", color: "var(--color-text-muted)", fontSize: "0.8125rem" }}>
                          {a.destination} · {a.email} · {ago(a.at)} ·{" "}
                          <Link href={a.kind === "abandoned" ? "/admin/trips" : `/trip/${a.slug}${a.kind === "report" ? "" : "/generating"}`} style={{ color: "var(--color-brand)" }}>open</Link>
                        </span>
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section aria-labelledby="beta-h" style={card}>
            <h2 id="beta-h" style={h2}>Beta testers</h2>
            <p style={{ ...muted, margin: "0.25rem 0 0.75rem" }}>Free, unlimited plans (safety cap {process.env.IRIE_BETA_DAILY_LIMIT ?? 10}/day each) until removed. For one-off freebies, create a 100%-off promotion code in Stripe — checkout accepts codes.</p>
            <BetaManager initial={testers} />
          </section>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 420px), 1fr))", gap: "1.5rem", alignItems: "start" }}>
          <section aria-labelledby="users-h" style={card}>
            <h2 id="users-h" style={h2}>Recent travellers</h2>
            {stats.users.length === 0 ? (
              <p style={{ ...muted, marginTop: "0.5rem" }}>No trips yet.</p>
            ) : (
              <div style={{ overflowX: "auto", marginTop: "0.5rem" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8125rem" }}>
                  <thead>
                    <tr>{["Email", "Trips", "Paid", "Last", ""].map((h) => <th key={h} style={th}>{h}</th>)}</tr>
                  </thead>
                  <tbody>
                    {stats.users.map((u) => (
                      <tr key={u.email}>
                        <td style={{ ...td, maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{u.email}</td>
                        <td style={td}>{u.trips}</td>
                        <td style={td}>{u.paid}</td>
                        <td style={{ ...td, whiteSpace: "nowrap" }}>{ago(u.lastAt)}</td>
                        <td style={{ ...td, textAlign: "right" }}>{betaSet.has(normalizeEmail(u.email)) ? <span style={{ color: "var(--color-accent)", fontWeight: 700 }}>Beta</span> : <MakeBetaButton email={u.email} />}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section aria-labelledby="dest-h" style={card}>
            <h2 id="dest-h" style={h2}>Top destinations, 30 days</h2>
            {stats.topDestinations.length === 0 ? (
              <p style={{ ...muted, marginTop: "0.5rem" }}>No trips yet.</p>
            ) : (
              <ol style={{ margin: "0.5rem 0 0", paddingLeft: "1.25rem", fontSize: "0.875rem", color: "var(--color-text)", display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                {stats.topDestinations.map((d) => (
                  <li key={d.destination}>{d.destination} <span style={{ color: "var(--color-text-muted)" }}>· {d.count}</span></li>
                ))}
              </ol>
            )}
            <p style={{ ...muted, marginTop: "1rem" }}>
              Status now: {stats.status.ready} ready · {stats.status.building} building · {stats.status.pending} awaiting payment · {stats.status.error} failed
            </p>
          </section>
        </div>

        <p style={{ ...muted, textAlign: "center" }}>
          Based on the latest {Math.min(SAMPLE, total)} of {total} trips. Trip details, regenerate and partner keys live in <Link href="/admin/trips" style={{ color: "var(--color-brand)" }}>All trips</Link>.
        </p>
      </div>
    </div>
  );
}

function Kpi({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div style={{ ...card, padding: "0.875rem 1rem" }}>
      <p style={{ ...eyebrow, margin: 0 }}>{label}</p>
      <p style={{ fontFamily: "var(--font-display)", fontSize: "1.875rem", color: "var(--color-heading)", margin: "0.25rem 0 0.125rem", lineHeight: 1.1 }}>{value}</p>
      <p style={{ ...muted, fontSize: "0.75rem", margin: 0 }}>{sub}</p>
    </div>
  );
}

const card: React.CSSProperties = { background: "var(--color-bg-card)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-card)", boxShadow: "var(--shadow-card)", padding: "1.125rem 1.25rem" };
const h1: React.CSSProperties = { fontFamily: "var(--font-display)", fontWeight: 400, fontSize: "clamp(1.75rem, 5vw, 2.5rem)", color: "var(--color-heading)", margin: 0 };
const h2: React.CSSProperties = { fontFamily: "var(--font-sans)", fontWeight: 700, fontSize: "1rem", color: "var(--color-text)", margin: 0 };
const eyebrow: React.CSSProperties = { margin: 0, fontSize: "0.6875rem", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--color-text-faint)" };
const muted: React.CSSProperties = { color: "var(--color-text-muted)", fontSize: "0.8125rem", lineHeight: 1.5 };
const pill: React.CSSProperties = { display: "inline-flex", alignItems: "center", gap: "0.375rem", minHeight: 40, padding: "0 0.875rem", borderRadius: "var(--radius-chip)", border: "1px solid var(--color-border)", background: "var(--color-bg-card)", color: "var(--color-text)", fontSize: "0.8125rem", fontWeight: 600, textDecoration: "none" };
const th: React.CSSProperties = { textAlign: "left", padding: "0.375rem 0.5rem", borderBottom: "1px solid var(--color-border)", color: "var(--color-text-muted)", fontWeight: 600 };
const td: React.CSSProperties = { padding: "0.375rem 0.5rem", borderBottom: "1px solid var(--color-border)", color: "var(--color-text)" };
