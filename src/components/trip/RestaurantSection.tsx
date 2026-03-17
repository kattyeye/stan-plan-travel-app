import { GeneratedTrip } from "@/types/trip";

interface Props { trip: GeneratedTrip }

export default function RestaurantSection({ trip }: Props) {
  return (
    <div>
      <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.5rem", color: "var(--color-text)", marginBottom: "1.5rem" }}>
        Where to Eat &amp; Drink
      </h2>
      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        {trip.restaurants.map((r) => (
          <div key={r.id} style={{
            background: "var(--color-bg-card)",
            border: "1px solid var(--color-border)",
            borderRadius: "14px",
            padding: "1.25rem 1.5rem",
          }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "0.75rem", flexWrap: "wrap", marginBottom: "0.5rem" }}>
              <div>
                <span style={{ fontWeight: 700, color: "var(--color-text)", fontSize: "1rem" }}>{r.name}</span>
                {r.rating && <span style={{ marginLeft: "0.5rem", color: "var(--color-papaya-whip-600)", fontSize: "0.875rem" }}>★ {r.rating}</span>}
              </div>
              <span style={{ fontWeight: 600, color: "var(--color-light-bronze-600)", fontSize: "0.9375rem" }}>{r.priceRange}</span>
            </div>

            <p style={{ color: "var(--color-text-muted)", fontSize: "0.875rem", lineHeight: 1.5, marginBottom: "0.75rem" }}>{r.description}</p>

            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.375rem", marginBottom: "0.625rem" }}>
              {r.tags.map((tag) => (
                <span key={tag} style={{ padding: "0.1875rem 0.625rem", borderRadius: "999px", background: "var(--color-border)", color: "var(--color-text-muted)", fontSize: "0.78125rem", fontWeight: 500 }}>
                  {tag}
                </span>
              ))}
            </div>

            <div style={{ display: "flex", gap: "1.25rem", flexWrap: "wrap", fontSize: "0.8125rem", color: "var(--color-text-muted)" }}>
              {r.address && (
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${r.name} ${r.address}`)}`}
                  target="_blank" rel="noopener noreferrer"
                  aria-label={`Map directions to ${r.name} (opens in new tab)`}
                  style={{ color: "var(--color-text-muted)", textDecoration: "none" }}
                >
                  <span aria-hidden="true">📍 </span>{r.address} <span aria-hidden="true">↗</span>
                </a>
              )}
              {r.hours && <span><span aria-hidden="true">🕐 </span>{r.hours}</span>}
              {r.link && (
                <a href={r.link} target="_blank" rel="noopener noreferrer" aria-label={`${r.name} website (opens in new tab)`} style={{ color: "var(--color-brand)", textDecoration: "underline", fontWeight: 500 }}>
                  Website <span aria-hidden="true">↗</span>
                </a>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
