import { ExternalLink, MapPin, Star } from "lucide-react";
import type { GeneratedTrip, Restaurant } from "@/types/trip";
import VerifiedBadge from "./VerifiedBadge";

interface Props { trip: GeneratedTrip }

const RANK = { verified: 0, "web-sourced": 1, unverified: 2, closed: 3 } as const;

function RestaurantCard({ r }: { r: Restaurant }) {
  const v = r.verification;
  const mapsUrl = v?.mapsUrl ?? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${r.name} ${r.address ?? ""}`)}`;
  return (
    <article style={{ background: "var(--color-bg-card)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-card)", padding: "1.125rem 1.25rem" }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "0.75rem", marginBottom: "0.375rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
          <h3 style={{ fontFamily: "var(--font-sans)", fontWeight: 700, color: "var(--color-text)", fontSize: "1rem", margin: 0 }}>{r.name}</h3>
          <VerifiedBadge verification={v} />
        </div>
        <span style={{ fontWeight: 600, color: "var(--color-accent)", fontSize: "0.9375rem", flexShrink: 0 }}>{r.priceRange}</span>
      </div>

      {r.rating && (
        <p style={{ display: "flex", alignItems: "center", gap: "0.25rem", fontSize: "0.8125rem", color: "var(--color-text-muted)", margin: "0 0 0.5rem" }}>
          <Star size={13} aria-hidden="true" style={{ color: "var(--color-papaya-whip-500)", fill: "var(--color-papaya-whip-500)" }} />
          {r.rating}
          {v?.reviewCount ? <span>· {v.reviewCount.toLocaleString()} Google reviews</span> : null}
        </p>
      )}

      <p style={{ color: "var(--color-text-muted)", fontSize: "0.875rem", lineHeight: 1.55, margin: "0 0 0.75rem" }}>{r.description}</p>

      {r.tags.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.375rem", marginBottom: "0.75rem" }}>
          {r.tags.map((tag) => (
            <span key={tag} style={{ padding: "0.125rem 0.625rem", borderRadius: "var(--radius-chip)", background: "var(--color-bg-selected)", color: "var(--color-text-muted)", fontSize: "0.75rem", fontWeight: 500 }}>{tag}</span>
          ))}
        </div>
      )}

      {v?.hours?.length ? (
        <details style={{ fontSize: "0.8125rem", color: "var(--color-text-muted)", marginBottom: "0.625rem" }}>
          <summary style={{ cursor: "pointer", fontWeight: 500 }}>Opening hours (Google)</summary>
          <ul style={{ listStyle: "none", padding: "0.375rem 0 0", margin: 0, lineHeight: 1.7 }}>
            {v.hours.map((h) => <li key={h}>{h}</li>)}
          </ul>
        </details>
      ) : r.hours ? (
        <p style={{ fontSize: "0.8125rem", color: "var(--color-text-muted)", margin: "0 0 0.625rem" }}>🕐 {r.hours}</p>
      ) : null}

      <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", fontSize: "0.8125rem" }}>
        <a href={mapsUrl} target="_blank" rel="noopener noreferrer" style={linkStyle}>
          <MapPin size={13} aria-hidden="true" /> {r.address || "Map"}<span className="sr-only"> (opens in new tab)</span>
        </a>
        {r.link && (
          <a href={r.link} target="_blank" rel="noopener noreferrer" style={linkStyle}>
            <ExternalLink size={13} aria-hidden="true" /> Website<span className="sr-only"> for {r.name} (opens in new tab)</span>
          </a>
        )}
        {r.sourceUrl && !v?.mapsUrl && (
          <a href={r.sourceUrl} target="_blank" rel="noopener noreferrer" style={{ ...linkStyle, color: "var(--color-text-faint)" }}>
            Source<span className="sr-only"> for {r.name} (opens in new tab)</span>
          </a>
        )}
      </div>
    </article>
  );
}

const linkStyle: React.CSSProperties = { display: "inline-flex", alignItems: "center", gap: "0.25rem", color: "var(--color-brand)", textDecoration: "underline", textUnderlineOffset: 2 };

export default function RestaurantSection({ trip }: Props) {
  const sorted = [...trip.restaurants].sort((a, b) => RANK[a.verification?.status ?? "web-sourced"] - RANK[b.verification?.status ?? "web-sourced"]);
  const verified = trip.restaurants.filter((r) => r.verification?.status === "verified").length;
  return (
    <div>
      <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.5rem", color: "var(--color-heading)", marginBottom: "0.375rem" }}>Where to Eat &amp; Drink</h2>
      {trip.quality && (
        <p style={{ color: "var(--color-text-muted)", fontSize: "0.875rem", marginBottom: "1.25rem" }}>
          {verified > 0
            ? `${verified} of ${trip.restaurants.length} spots confirmed open on Google Maps when your plan was made.`
            : "Every spot was found in current web sources when your plan was made."}{" "}
          Hours change — call ahead for dinner.
        </p>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        {sorted.map((r) => <RestaurantCard key={r.id} r={r} />)}
      </div>
    </div>
  );
}
