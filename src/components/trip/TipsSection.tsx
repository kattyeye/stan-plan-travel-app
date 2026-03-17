import { GeneratedTrip } from "@/types/trip";

interface Props { trip: GeneratedTrip }

export default function TipsSection({ trip }: Props) {
  const { tips } = trip;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
      <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.5rem", color: "var(--color-text)", marginBottom: 0 }}>
        Tips &amp; Activities
      </h2>

      {/* Activities */}
      {tips.activities.length > 0 && (
        <section>
          <h3 style={{ fontWeight: 700, color: "var(--color-text)", fontSize: "1rem", marginBottom: "0.875rem" }}>🎯 Things to Do</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.875rem" }}>
            {tips.activities.map((a, i) => (
              <div key={i} style={{ background: "var(--color-bg-card)", border: "1px solid var(--color-border)", borderRadius: "10px", padding: "1rem 1.25rem" }}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "0.5rem", marginBottom: "0.375rem" }}>
                  <span style={{ fontWeight: 600, color: "var(--color-text)", fontSize: "0.9375rem" }}>{a.name}</span>
                  <div style={{ display: "flex", gap: "0.375rem", flexShrink: 0 }}>
                    {a.kidFriendly && <span style={{ fontSize: "0.75rem", padding: "0.125rem 0.5rem", borderRadius: "999px", background: "var(--color-border)", color: "var(--color-text-muted)", fontWeight: 600 }}>Kid-friendly</span>}
                    {a.bookingRequired && <span style={{ fontSize: "0.75rem", padding: "0.125rem 0.5rem", borderRadius: "999px", background: "var(--color-light-bronze-100)", color: "var(--color-light-bronze-700)", fontWeight: 600 }}>Book ahead</span>}
                  </div>
                </div>
                <p style={{ color: "var(--color-text-muted)", fontSize: "0.875rem", lineHeight: 1.5, marginBottom: "0.5rem" }}>{a.description}</p>
                <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", fontSize: "0.8125rem", color: "var(--color-text-muted)" }}>
                  {a.duration && <span>⏱ {a.duration}</span>}
                  {a.cost && <span>💵 {a.cost}</span>}
                  {a.link
                    ? <a href={a.link} target="_blank" rel="noopener noreferrer" aria-label={`More info about ${a.name} (opens in new tab)`} style={{ color: "var(--color-brand)", textDecoration: "underline", fontWeight: 500 }}>More info <span aria-hidden="true">↗</span></a>
                    : <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(a.name)}`} target="_blank" rel="noopener noreferrer" aria-label={`${a.name} on Google Maps (opens in new tab)`} style={{ color: "var(--color-brand)", textDecoration: "underline", fontWeight: 500 }}>Google Maps <span aria-hidden="true">↗</span></a>
                  }
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Practical tips */}
      {tips.practical.length > 0 && (
        <section>
          <h3 style={{ fontWeight: 700, color: "var(--color-text)", fontSize: "1rem", marginBottom: "0.875rem" }}>💡 Practical Tips</h3>
          <div style={{ background: "var(--color-bg-card)", border: "1px solid var(--color-border)", borderRadius: "10px", padding: "1rem 1.25rem" }}>
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "0.625rem" }}>
              {tips.practical.map((tip, i) => (
                <li key={i} style={{ display: "flex", gap: "0.625rem", fontSize: "0.875rem", color: "var(--color-text)", lineHeight: 1.5 }}>
                  <span style={{ color: "var(--color-text-faint)", flexShrink: 0 }}>·</span>
                  {tip}
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* Day trips */}
      {tips.dayTrips.length > 0 && (
        <section>
          <h3 style={{ fontWeight: 700, color: "var(--color-text)", fontSize: "1rem", marginBottom: "0.875rem" }}>🗺️ Day Trips</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.875rem" }}>
            {tips.dayTrips.map((dt, i) => (
              <div key={i} style={{ background: "var(--color-bg-card)", border: "1px solid var(--color-border)", borderRadius: "10px", padding: "1rem 1.25rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.375rem" }}>
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(dt.destination)}`}
                    target="_blank" rel="noopener noreferrer"
                    aria-label={`${dt.destination} on Google Maps (opens in new tab)`}
                    style={{ fontWeight: 600, color: "var(--color-text)", fontSize: "0.9375rem", textDecoration: "none" }}
                  >
                    {dt.destination} <span aria-hidden="true">↗</span>
                  </a>
                  <span style={{ fontSize: "0.8125rem", color: "var(--color-text-muted)" }}>~{dt.distanceMinutes} min away</span>
                </div>
                <p style={{ color: "var(--color-text-muted)", fontSize: "0.875rem", lineHeight: 1.5, marginBottom: "0.5rem" }}>{dt.description}</p>
                {dt.highlights.length > 0 && (
                  <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexWrap: "wrap", gap: "0.375rem" }}>
                    {dt.highlights.map((h, j) => (
                      <li key={j} style={{ padding: "0.1875rem 0.625rem", borderRadius: "999px", background: "var(--color-border)", color: "var(--color-text-muted)", fontSize: "0.78125rem" }}>
                        {h}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
