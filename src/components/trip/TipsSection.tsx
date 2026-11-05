"use client";
import { useMemo, useState } from "react";
import { CalendarDays, CalendarHeart, Clock, ExternalLink, Lightbulb, MapPin, Navigation, Wallet } from "lucide-react";
import type { GeneratedTrip } from "@/types/trip";
import { activityKey, activityPlace, activityUsage, mapsDirectionsUrl, placeMapsUrl } from "@/lib/trip-view";
import VerifiedBadge from "./VerifiedBadge";
import { useTripUI } from "./TripContext";
import { card, chip, chipWarm, h2, h3, link, muted, pillButton } from "./ui";
import s from "./trip.module.css";

interface Props { trip: GeneratedTrip }

type Filter = "all" | "plan" | "kids" | "book";

/** Explore: what's on while you're there, things to do, day trips and practical tips. */
export default function TipsSection({ trip }: Props) {
  const { go } = useTripUI();
  const { tips } = trip;
  const events = tips.events ?? [];
  const usage = useMemo(() => activityUsage(trip), [trip]);
  const [filter, setFilter] = useState<Filter>("all");
  const hasKids = trip.meta.group.kids > 0;

  const filters: { id: Filter; label: string; show: boolean }[] = [
    { id: "all", label: "All", show: true },
    { id: "plan", label: "On your plan", show: usage.size > 0 },
    { id: "kids", label: "Kid-friendly", show: hasKids || tips.activities.some((a) => a.kidFriendly) },
    { id: "book", label: "Book ahead", show: tips.activities.some((a) => a.bookingRequired) },
  ];
  const activities = tips.activities.filter(
    (a) => filter === "all" || (filter === "plan" ? usage.has(activityKey(a)) : filter === "kids" ? a.kidFriendly : a.bookingRequired)
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
      <h2 style={h2}>Explore</h2>

      {events.length > 0 && (
        <section aria-labelledby="events-h">
          <h3 id="events-h" style={{ ...h3, marginBottom: "0.75rem" }}><CalendarHeart size={17} aria-hidden="true" /> Happening while you&apos;re there</h3>
          <div className={s.carousel} data-no-swipe>
            {events.map((e) => (
              <article key={e.name} style={{ ...card, width: 280, padding: "1rem", borderLeft: "4px solid var(--color-accent)" }}>
                <p style={{ margin: 0, fontSize: "0.8125rem", color: "var(--color-accent)", fontWeight: 700 }}>{e.dates}</p>
                <p style={{ margin: "0.25rem 0 0.375rem", fontWeight: 700, color: "var(--color-text)" }}>{e.name}</p>
                <p style={{ ...muted, fontSize: "0.8125rem" }}>{e.description}</p>
                {e.sourceUrl && (
                  <a href={e.sourceUrl} target="_blank" rel="noopener noreferrer" style={{ ...link, fontSize: "0.8125rem", marginTop: "0.5rem" }}>
                    Event details <ExternalLink size={12} aria-hidden="true" />
                  </a>
                )}
              </article>
            ))}
          </div>
        </section>
      )}

      {tips.activities.length > 0 && (
        <section aria-labelledby="todo-h">
          <h3 id="todo-h" style={{ ...h3, marginBottom: "0.75rem" }}>🎯 Things to do</h3>
          {filters.filter((f) => f.show).length > 1 && (
            <div role="group" aria-label="Filter activities" className={s.carousel} data-no-swipe style={{ gap: "0.5rem", marginBottom: "0.25rem" }}>
              {filters.filter((f) => f.show).map((f) => (
                <button key={f.id} type="button" aria-pressed={filter === f.id} onClick={() => setFilter(f.id)} style={pillButton(filter === f.id)}>
                  {f.label}
                </button>
              ))}
            </div>
          )}
          <p aria-live="polite" style={{ ...muted, fontSize: "0.8125rem", marginBottom: "0.75rem" }}>{activities.length} {activities.length === 1 ? "idea" : "ideas"}</p>
          <div className={s.grid2}>
            {activities.map((a, i) => {
              const place = activityPlace(a);
              const days = usage.get(activityKey(a)) ?? [];
              const directions = mapsDirectionsUrl([place], trip.meta.destination);
              return (
                <article key={a.id ?? i} style={{ ...card, padding: "1rem 1.125rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
                    <h4 style={{ margin: 0, fontWeight: 700, color: "var(--color-text)", fontSize: "1rem" }}>{a.name}</h4>
                    <VerifiedBadge verification={a.verification} compact />
                  </div>
                  <div style={{ display: "flex", gap: "0.375rem", flexWrap: "wrap" }}>
                    {days.map((d) => (
                      <button key={d} type="button" onClick={() => go({ tab: "days", day: d })} style={{ ...chipWarm, border: "none", cursor: "pointer", minHeight: 28 }}>
                        <CalendarDays size={12} aria-hidden="true" /> On day {d}
                      </button>
                    ))}
                    {a.kidFriendly && <span style={chip}>Kid-friendly</span>}
                    {a.bookingRequired && <span style={chipWarm}>Book ahead</span>}
                  </div>
                  <p style={{ ...muted, margin: 0 }}>{a.description}</p>
                  <div style={{ display: "flex", gap: "0.875rem", flexWrap: "wrap", fontSize: "0.8125rem", color: "var(--color-text-muted)" }}>
                    {a.duration && <span style={{ display: "inline-flex", alignItems: "center", gap: "0.25rem" }}><Clock size={13} aria-hidden="true" /> {a.duration}</span>}
                    {a.cost && <span style={{ display: "inline-flex", alignItems: "center", gap: "0.25rem" }}><Wallet size={13} aria-hidden="true" /> {a.cost}</span>}
                  </div>
                  <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "center", marginTop: "auto", paddingTop: "0.25rem" }}>
                    {directions && (
                      <a href={directions} target="_blank" rel="noopener noreferrer" style={{ ...pillButton(false), minHeight: 40, fontSize: "0.8125rem" }}>
                        <Navigation size={14} aria-hidden="true" /> Directions<span className="sr-only"> to {a.name} (opens Google Maps)</span>
                      </a>
                    )}
                    <a href={placeMapsUrl(place, trip.meta.destination)} target="_blank" rel="noopener noreferrer" style={{ ...link, fontSize: "0.8125rem" }}>
                      <MapPin size={13} aria-hidden="true" /> Map<span className="sr-only"> for {a.name} (opens in new tab)</span>
                    </a>
                    {a.link && <a href={a.link} target="_blank" rel="noopener noreferrer" style={{ ...link, fontSize: "0.8125rem" }}>Website<span className="sr-only"> for {a.name} (opens in new tab)</span></a>}
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      )}

      {tips.dayTrips.length > 0 && (
        <section aria-labelledby="daytrips-h">
          <h3 id="daytrips-h" style={{ ...h3, marginBottom: "0.75rem" }}>🗺️ Day trips</h3>
          <div className={s.carousel} data-no-swipe>
            {tips.dayTrips.map((dt, i) => (
              <article key={i} style={{ ...card, width: 280, padding: "1rem" }}>
                <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(dt.destination)}`} target="_blank" rel="noopener noreferrer" style={{ fontWeight: 700, color: "var(--color-text)", fontSize: "1rem" }}>
                  {dt.destination}<span className="sr-only"> on Google Maps (opens in new tab)</span>
                </a>
                <p style={{ margin: "0.125rem 0 0.5rem", fontSize: "0.8125rem", color: "var(--color-accent)", fontWeight: 600 }}>~{dt.distanceMinutes} min drive</p>
                <p style={{ ...muted, fontSize: "0.8125rem", marginBottom: "0.5rem" }}>{dt.description}</p>
                {dt.highlights.length > 0 && (
                  <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexWrap: "wrap", gap: "0.375rem" }}>
                    {dt.highlights.map((h, j) => <li key={j} style={chip}>{h}</li>)}
                  </ul>
                )}
              </article>
            ))}
          </div>
        </section>
      )}

      {tips.practical.length > 0 && (
        <details style={{ ...card, padding: "0.25rem 1.125rem" }} open={tips.practical.length <= 4}>
          <summary style={{ cursor: "pointer", minHeight: 48, display: "flex", alignItems: "center", gap: "0.5rem", fontWeight: 700, color: "var(--color-text)" }}>
            <Lightbulb size={17} aria-hidden="true" /> Good to know ({tips.practical.length})
          </summary>
          <ul style={{ listStyle: "none", margin: "0 0 1rem", padding: 0, display: "flex", flexDirection: "column", gap: "0.625rem" }}>
            {tips.practical.map((tip, i) => (
              <li key={i} style={{ display: "flex", gap: "0.625rem", fontSize: "0.875rem", color: "var(--color-text)", lineHeight: 1.55 }}>
                <span aria-hidden="true" style={{ color: "var(--color-text-faint)" }}>·</span>{tip}
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
