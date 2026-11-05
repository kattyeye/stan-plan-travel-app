"use client";
import { useEffect } from "react";
import { Check, MapPin, Navigation } from "lucide-react";
import type { ItineraryDay, PlanningStyle, Restaurant } from "@/types/trip";
import { BUCKET_LABEL, mapsDirectionsUrl, placeMapsUrl, restaurantPlace, type Bucket, type TimelineStop } from "@/lib/trip-view";
import StopCard from "./StopCard";
import VerifiedBadge from "./VerifiedBadge";
import { useTripUI } from "./TripContext";
import { chip, eyebrow, h3, muted } from "./ui";
import s from "./trip.module.css";

interface Props {
  day: ItineraryDay;
  stops: TimelineStop[];
  style: PlanningStyle;
  past?: ReadonlySet<string>;
  nextKey?: string;
}

/**
 * A day as a timeline. The planning style changes the shape:
 * structured → exact times; balanced → Morning / Midday / Afternoon / Evening;
 * flexible → ideas to pick from, and 2–3 options per meal.
 */
export default function DayTimeline({ day, stops, style, past, nextKey }: Props) {
  const { highlight } = useTripUI();

  useEffect(() => {
    if (!highlight) return;
    const el = document.querySelector(`[data-stop="${CSS.escape(highlight)}"]`);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [highlight, day.day]);

  const card = (stop: TimelineStop, i: number, list: TimelineStop[]) => (
    <StopCard
      key={stop.key}
      stop={stop}
      day={day}
      style={style}
      past={past?.has(stop.key)}
      isNext={stop.key === nextKey}
      isLast={i === list.length - 1}
      highlighted={highlight === stop.key}
      flashClass={s.flash}
      extra={style === "flexible" && stop.meal?.type === "eat-out" && stop.alternatives.length > 0 ? <MealOptions stop={stop} day={day} /> : undefined}
    />
  );

  if (style === "flexible") {
    const ideas = stops.filter((x) => x.kind === "activity");
    const meals = stops.filter((x) => x.kind === "meal");
    return (
      <div>
        <h3 style={{ ...h3, marginBottom: "0.25rem" }}>Ideas for today</h3>
        <p style={{ ...muted, marginBottom: "0.875rem" }}>Pick what fits the mood — none of it is on a clock.</p>
        {ideas.length ? <ol style={listStyle}>{ideas.map(card)}</ol> : <p style={muted}>An open day. Follow your nose.</p>}
        <h3 style={{ ...h3, margin: "1.25rem 0 0.25rem" }}>Food, your way</h3>
        <p style={{ ...muted, marginBottom: "0.875rem" }}>A first pick plus backups for each meal. Swipe to compare.</p>
        <ol style={listStyle}>{meals.map(card)}</ol>
      </div>
    );
  }

  if (style === "balanced") {
    const groups: { bucket: Bucket; items: TimelineStop[] }[] = [];
    for (const stop of stops) {
      const last = groups[groups.length - 1];
      if (last && last.bucket === stop.bucket) last.items.push(stop);
      else groups.push({ bucket: stop.bucket, items: [stop] });
    }
    return (
      <div>
        {groups.map((g, gi) => (
          <section key={`${g.bucket}-${gi}`} aria-label={BUCKET_LABEL[g.bucket]}>
            <p style={{ ...eyebrow, margin: gi ? "0.5rem 0 0.625rem 52px" : "0 0 0.625rem 52px" }}>{BUCKET_LABEL[g.bucket]}</p>
            <ol style={listStyle}>{g.items.map(card)}</ol>
          </section>
        ))}
      </div>
    );
  }

  return <ol style={listStyle}>{stops.map(card)}</ol>;
}

const listStyle: React.CSSProperties = { listStyle: "none", padding: 0, margin: 0 };

/** Flexible style: the meal's other researched options side by side; picking one swaps it for the whole group. */
function MealOptions({ stop, day }: { stop: TimelineStop; day: ItineraryDay }) {
  const { trip, edits, preview } = useTripUI();
  const options: Restaurant[] = stop.alternatives;
  const destination = trip.meta.destination;
  return (
    <div data-no-swipe style={{ marginTop: "0.75rem" }}>
      <p style={{ ...eyebrow, marginBottom: "0.375rem" }}>Or try</p>
      <div className={s.carousel} style={{ margin: 0, padding: "0.125rem 0 0.5rem" }}>
        {options.map((r) => {
          const directions = mapsDirectionsUrl([restaurantPlace(r)], destination);
          return (
            <div key={r.id} style={{ width: 220, background: "var(--color-bg)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-input)", padding: "0.625rem 0.75rem" }}>
              <a href={placeMapsUrl(restaurantPlace(r), destination)} target="_blank" rel="noopener noreferrer" style={{ fontWeight: 700, color: "var(--color-text)", fontSize: "0.9375rem", display: "block" }}>
                {r.name}
                <span className="sr-only"> (opens map in new tab)</span>
              </a>
              <span style={{ display: "flex", gap: "0.375rem", alignItems: "center", flexWrap: "wrap", fontSize: "0.75rem", color: "var(--color-text-muted)", margin: "0.25rem 0 0.5rem" }}>
                {r.priceRange} <VerifiedBadge verification={r.verification} compact />
                {r.tags[0] && <span style={chip}>{r.tags[0]}</span>}
              </span>
              <span style={{ display: "flex", gap: "0.375rem" }}>
                {directions && (
                  <a href={directions} target="_blank" rel="noopener noreferrer" aria-label={`Directions to ${r.name}`} style={miniBtn}>
                    <Navigation size={13} aria-hidden="true" />
                  </a>
                )}
                {edits && !preview && stop.slot && (
                  <button
                    type="button"
                    disabled={!edits.canEdit}
                    onClick={() => edits.apply({ type: "swap_meal", day: day.day, slot: stop.slot!, restaurantId: r.id }, `Day ${day.day} ${stop.slot}: ${r.name}`)}
                    style={{ ...miniBtn, flex: 1, gap: "0.25rem", fontWeight: 700, color: "var(--color-brand)" }}
                  >
                    <Check size={13} aria-hidden="true" /> Pick this
                  </button>
                )}
                {!edits && <MapPin size={13} aria-hidden="true" />}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const miniBtn: React.CSSProperties = {
  minHeight: 40, minWidth: 40, display: "inline-flex", alignItems: "center", justifyContent: "center", borderRadius: "var(--radius-chip)",
  border: "1px solid var(--color-border)", background: "var(--color-bg-card)", color: "var(--color-text)", cursor: "pointer", fontSize: "0.8125rem",
};
