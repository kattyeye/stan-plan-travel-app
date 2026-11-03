import { CalendarHeart, CloudSun, ExternalLink, MapPin, ShieldCheck } from "lucide-react";
import type { GeneratedTrip } from "@/types/trip";
import VerifiedBadge from "./VerifiedBadge";

interface Props { trip: GeneratedTrip }

const card: React.CSSProperties = { background: "var(--color-bg-card)", border: "1px solid var(--color-border)", borderRadius: "10px", padding: "1rem 1.125rem" };
const h3: React.CSSProperties = { fontFamily: "var(--font-sans)", fontWeight: 700, color: "var(--color-text)", fontSize: "1rem", margin: "0 0 0.75rem", display: "flex", alignItems: "center", gap: "0.5rem" };
const muted: React.CSSProperties = { color: "var(--color-text-muted)", fontSize: "0.875rem", lineHeight: 1.55, margin: 0 };
const link: React.CSSProperties = { color: "var(--color-brand)", textDecoration: "underline", fontWeight: 500, display: "inline-flex", alignItems: "center", gap: "0.25rem" };

export default function TipsSection({ trip }: Props) {
  const { tips, quality } = trip;
  const events = tips.events ?? [];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
      <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.5rem", color: "var(--color-heading)", margin: 0 }}>Tips &amp; Activities</h2>

      {tips.weather && (
        <section style={{ ...card, display: "flex", gap: "0.75rem" }}>
          <CloudSun size={20} aria-hidden="true" style={{ color: "var(--color-accent)", flexShrink: 0 }} />
          <p style={muted}><strong style={{ color: "var(--color-text)" }}>What to expect: </strong>{tips.weather}</p>
        </section>
      )}

      {events.length > 0 && (
        <section>
          <h3 style={h3}><CalendarHeart size={17} aria-hidden="true" /> Happening while you&apos;re there</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {events.map((e) => (
              <div key={e.name} style={card}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: "0.5rem", flexWrap: "wrap", marginBottom: "0.25rem" }}>
                  <span style={{ fontWeight: 600, color: "var(--color-text)" }}>{e.name}</span>
                  <span style={{ fontSize: "0.8125rem", color: "var(--color-accent)", fontWeight: 600 }}>{e.dates}</span>
                </div>
                <p style={muted}>{e.description}</p>
                {e.sourceUrl && <a href={e.sourceUrl} target="_blank" rel="noopener noreferrer" style={{ ...link, fontSize: "0.8125rem", marginTop: "0.375rem" }}>Event details <ExternalLink size={12} aria-hidden="true" /></a>}
              </div>
            ))}
          </div>
        </section>
      )}

      {tips.activities.length > 0 && (
        <section>
          <h3 style={h3}>🎯 Things to do</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.875rem" }}>
            {tips.activities.map((a, i) => {
              const maps = a.verification?.mapsUrl ?? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${a.name} ${a.address ?? trip.meta.destination}`)}`;
              return (
                <div key={a.id ?? i} style={card}>
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "0.5rem", marginBottom: "0.375rem", flexWrap: "wrap" }}>
                    <span style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
                      <span style={{ fontWeight: 600, color: "var(--color-text)", fontSize: "0.9375rem" }}>{a.name}</span>
                      <VerifiedBadge verification={a.verification} compact />
                    </span>
                    <span style={{ display: "flex", gap: "0.375rem", flexWrap: "wrap" }}>
                      {a.kidFriendly && <span style={pill}>Kid-friendly</span>}
                      {a.bookingRequired && <span style={{ ...pill, background: "var(--color-light-bronze-100)", color: "var(--color-light-bronze-700)" }}>Book ahead</span>}
                    </span>
                  </div>
                  <p style={{ ...muted, marginBottom: "0.5rem" }}>{a.description}</p>
                  <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", fontSize: "0.8125rem", color: "var(--color-text-muted)" }}>
                    {a.duration && <span>⏱ {a.duration}</span>}
                    {a.cost && <span>💵 {a.cost}</span>}
                    <a href={maps} target="_blank" rel="noopener noreferrer" style={link}><MapPin size={12} aria-hidden="true" />Map<span className="sr-only"> for {a.name} (opens in new tab)</span></a>
                    {a.link && <a href={a.link} target="_blank" rel="noopener noreferrer" style={link}>Website<span className="sr-only"> for {a.name} (opens in new tab)</span></a>}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {tips.practical.length > 0 && (
        <section>
          <h3 style={h3}>💡 Practical tips</h3>
          <ul style={{ ...card, listStyle: "none", margin: 0, display: "flex", flexDirection: "column", gap: "0.625rem" }}>
            {tips.practical.map((tip, i) => (
              <li key={i} style={{ display: "flex", gap: "0.625rem", fontSize: "0.875rem", color: "var(--color-text)", lineHeight: 1.55 }}>
                <span aria-hidden="true" style={{ color: "var(--color-text-faint)" }}>·</span>{tip}
              </li>
            ))}
          </ul>
        </section>
      )}

      {tips.dayTrips.length > 0 && (
        <section>
          <h3 style={h3}>🗺️ Day trips</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.875rem" }}>
            {tips.dayTrips.map((dt, i) => (
              <div key={i} style={card}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.375rem", flexWrap: "wrap" }}>
                  <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(dt.destination)}`} target="_blank" rel="noopener noreferrer" style={{ fontWeight: 600, color: "var(--color-text)", fontSize: "0.9375rem" }}>
                    {dt.destination}<span className="sr-only"> on Google Maps (opens in new tab)</span>
                  </a>
                  <span style={{ fontSize: "0.8125rem", color: "var(--color-text-muted)" }}>~{dt.distanceMinutes} min drive</span>
                </div>
                <p style={{ ...muted, marginBottom: "0.5rem" }}>{dt.description}</p>
                {dt.highlights.length > 0 && (
                  <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexWrap: "wrap", gap: "0.375rem" }}>
                    {dt.highlights.map((h, j) => <li key={j} style={pill}>{h}</li>)}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {quality && (
        <section style={{ ...card, background: "var(--color-bg)" }}>
          <h3 style={{ ...h3, fontSize: "0.9375rem" }}><ShieldCheck size={17} aria-hidden="true" /> How we checked this plan</h3>
          <p style={muted}>
            We searched current sources ({quality.webSearches} web searches) for every place in this plan
            {quality.venues.verified > 0 ? `, confirmed ${quality.venues.verified} of ${quality.venues.total} as open on Google Maps,` : ","} and scheduled meals around their opening hours
            {quality.venues.removedClosed > 0 ? `. ${quality.venues.removedClosed} place${quality.venues.removedClosed === 1 ? " was" : "s were"} dropped because ${quality.venues.removedClosed === 1 ? "it's" : "they're"} listed as closed` : ""}.
            Checked {new Date(quality.checkedAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}.
          </p>
          {trip.sources && trip.sources.length > 0 && (
            <details style={{ marginTop: "0.625rem", fontSize: "0.8125rem", color: "var(--color-text-muted)" }}>
              <summary style={{ cursor: "pointer", fontWeight: 500 }}>Sources ({trip.sources.length})</summary>
              <ul style={{ padding: "0.375rem 0 0 1rem", margin: 0, lineHeight: 1.8 }}>
                {trip.sources.map((s) => (
                  <li key={s.url}><a href={s.url} target="_blank" rel="noopener noreferrer" style={{ color: "var(--color-text-muted)" }}>{s.title}</a></li>
                ))}
              </ul>
            </details>
          )}
        </section>
      )}
    </div>
  );
}

const pill: React.CSSProperties = { fontSize: "0.75rem", padding: "0.125rem 0.5rem", borderRadius: "var(--radius-chip)", background: "var(--color-bg-selected)", color: "var(--color-text-muted)", fontWeight: 600 };
