"use client";
import { useMemo, useState } from "react";
import { CalendarDays, ExternalLink, MapPin, Navigation, Star } from "lucide-react";
import type { GeneratedTrip, Restaurant } from "@/types/trip";
import { buildDayTimeline, mapsDirectionsUrl, placeMapsUrl, restaurantPlace, restaurantUsage, type MealUse } from "@/lib/trip-view";
import VerifiedBadge from "./VerifiedBadge";
import { useTripUI } from "./TripContext";
import { card, chip, chipWarm, link, muted, pillButton } from "./ui";
import s from "./trip.module.css";

interface Props { trip: GeneratedTrip }

const RANK = { verified: 0, "web-sourced": 1, unverified: 2, closed: 3 } as const;
const FILTERS = [
  { id: "all", label: "All" },
  { id: "plan", label: "On your plan" },
  { id: "coffee", label: "Coffee" },
  { id: "breakfast", label: "Breakfast" },
  { id: "lunch", label: "Lunch" },
  { id: "dinner", label: "Dinner" },
  { id: "drinks", label: "Drinks" },
  { id: "dessert", label: "Dessert" },
] as const;
type FilterId = (typeof FILTERS)[number]["id"];

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function RestaurantCard({ r, uses, onLocate }: { r: Restaurant; uses: MealUse[]; onLocate: (u: MealUse) => void }) {
  const { trip } = useTripUI();
  const v = r.verification;
  const place = restaurantPlace(r);
  const directions = mapsDirectionsUrl([place], trip.meta.destination);
  const primary = uses.filter((u) => u.primary);
  const backup = uses.filter((u) => !u.primary);
  return (
    <article style={{ ...card, padding: "1rem 1.125rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "0.75rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap", minWidth: 0 }}>
          <h3 style={{ fontFamily: "var(--font-sans)", fontWeight: 700, color: "var(--color-text)", fontSize: "1rem", margin: 0 }}>{r.name}</h3>
          <VerifiedBadge verification={v} />
        </div>
        <span style={{ fontWeight: 700, color: "var(--color-accent)", fontSize: "0.9375rem", flexShrink: 0 }}>{r.priceRange}</span>
      </div>

      {r.rating && (
        <p style={{ display: "flex", alignItems: "center", gap: "0.25rem", fontSize: "0.8125rem", color: "var(--color-text-muted)", margin: 0 }}>
          <Star size={13} aria-hidden="true" style={{ color: "var(--color-papaya-whip-500)", fill: "var(--color-papaya-whip-500)" }} />
          {r.rating}
          {v?.reviewCount ? <span>· {v.reviewCount.toLocaleString()} Google reviews</span> : null}
        </p>
      )}

      {(primary.length > 0 || backup.length > 0) && (
        <div style={{ display: "flex", gap: "0.375rem", flexWrap: "wrap" }}>
          {primary.map((u) => (
            <button key={`${u.day}-${u.slot}`} type="button" onClick={() => onLocate(u)} style={{ ...chipWarm, border: "none", cursor: "pointer", minHeight: 28 }}>
              <CalendarDays size={12} aria-hidden="true" /> Day {u.day} {u.slot}
            </button>
          ))}
          {backup.length > 0 && <span style={chip}>Backup for {backup.slice(0, 2).map((u) => `day ${u.day} ${u.slot}`).join(", ")}</span>}
        </div>
      )}

      <p style={{ ...muted, margin: 0 }}>{r.description}</p>

      {r.tags.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.375rem" }}>
          {r.tags.map((tag) => <span key={tag} style={{ ...chip, fontWeight: 500 }}>{tag}</span>)}
        </div>
      )}

      {v?.hours?.length ? (
        <details style={{ fontSize: "0.8125rem", color: "var(--color-text-muted)" }}>
          <summary style={{ cursor: "pointer", fontWeight: 500, minHeight: 28 }}>Opening hours (Google)</summary>
          <ul style={{ listStyle: "none", padding: "0.375rem 0 0", margin: 0, lineHeight: 1.7 }}>
            {v.hours.map((h) => <li key={h}>{h}</li>)}
          </ul>
        </details>
      ) : r.hours ? (
        <p style={{ fontSize: "0.8125rem", color: "var(--color-text-muted)", margin: 0 }}>🕐 {r.hours}</p>
      ) : null}

      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "center", marginTop: "auto", paddingTop: "0.25rem" }}>
        {directions && (
          <a href={directions} target="_blank" rel="noopener noreferrer" style={{ ...pillButton(false), minHeight: 40, fontSize: "0.8125rem" }}>
            <Navigation size={14} aria-hidden="true" /> Directions<span className="sr-only"> to {r.name} (opens Google Maps)</span>
          </a>
        )}
        <a href={placeMapsUrl(place, trip.meta.destination)} target="_blank" rel="noopener noreferrer" style={{ ...link, fontSize: "0.8125rem" }}>
          <MapPin size={13} aria-hidden="true" /> {r.address || "Map"}<span className="sr-only"> (opens in new tab)</span>
        </a>
        {r.link && (
          <a href={r.link} target="_blank" rel="noopener noreferrer" style={{ ...link, fontSize: "0.8125rem" }}>
            <ExternalLink size={13} aria-hidden="true" /> Website<span className="sr-only"> for {r.name} (opens in new tab)</span>
          </a>
        )}
        {r.sourceUrl && !v?.mapsUrl && (
          <a href={r.sourceUrl} target="_blank" rel="noopener noreferrer" style={{ ...link, fontSize: "0.8125rem", color: "var(--color-text-faint)" }}>
            Source<span className="sr-only"> for {r.name} (opens in new tab)</span>
          </a>
        )}
      </div>
    </article>
  );
}

/** Where to eat & drink: filter by meal, see where each spot sits on the plan. */
export default function RestaurantSection({ trip }: Props) {
  const { go } = useTripUI();
  const [filter, setFilter] = useState<FilterId>("all");
  const usage = useMemo(() => restaurantUsage(trip), [trip]);
  const sorted = useMemo(
    () => [...trip.restaurants].sort((a, b) => RANK[a.verification?.status ?? "web-sourced"] - RANK[b.verification?.status ?? "web-sourced"]),
    [trip.restaurants]
  );
  const available = FILTERS.filter(
    (f) => f.id === "all" || (f.id === "plan" ? usage.size > 0 : trip.restaurants.some((r) => r.bestFor?.includes(f.id as never)))
  );
  const shown = sorted.filter((r) => filter === "all" || (filter === "plan" ? usage.get(r.id)?.some((u) => u.primary) : r.bestFor?.includes(filter as never)));
  const verified = trip.restaurants.filter((r) => r.verification?.status === "verified").length;

  const locate = (u: MealUse) => {
    const day = trip.itinerary.find((d) => d.day === u.day);
    const key = day ? buildDayTimeline(day, trip).find((x) => x.slot === u.slot)?.key : undefined;
    go({ tab: "days", day: u.day, highlight: key });
  };

  return (
    <div>
      {trip.quality && (
        <p style={{ ...muted, marginBottom: "1rem" }}>
          {verified > 0
            ? `${verified} of ${trip.restaurants.length} spots confirmed open on Google Maps when your plan was made.`
            : "Every spot was found in current web sources when your plan was made."}{" "}
          Hours change — call ahead for dinner.
        </p>
      )}
      {available.length > 2 && (
        <div role="group" aria-label="Filter places" className={s.carousel} data-no-swipe style={{ gap: "0.5rem", marginBottom: "0.5rem" }}>
          {available.map((f) => (
            <button key={f.id} type="button" aria-pressed={filter === f.id} onClick={() => setFilter(f.id)} style={pillButton(filter === f.id)}>
              {f.label}
            </button>
          ))}
        </div>
      )}
      <p aria-live="polite" style={{ ...muted, fontSize: "0.8125rem", marginBottom: "0.75rem" }}>
        {shown.length} {shown.length === 1 ? "place" : "places"}{filter !== "all" ? ` · ${cap(FILTERS.find((f) => f.id === filter)!.label.toLowerCase())}` : ""}
      </p>
      <div className={s.grid2}>
        {shown.map((r) => <RestaurantCard key={r.id} r={r} uses={usage.get(r.id) ?? []} onLocate={locate} />)}
      </div>
    </div>
  );
}
