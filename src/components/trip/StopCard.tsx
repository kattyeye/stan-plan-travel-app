"use client";
import { useState } from "react";
import { AlertTriangle, CalendarCheck, ChefHat, CheckCircle2, Coffee, HelpCircle, MapPin, Navigation, Repeat, Sparkle, Utensils } from "lucide-react";
import type { ItineraryDay, PlanningStyle } from "@/types/trip";
import { dayWeekday, hoursForWeekday, mapsDirectionsUrl, placeMapsUrl, type TimelineStop } from "@/lib/trip-view";
import RecipeCard from "./RecipeCard";
import VerifiedBadge from "./VerifiedBadge";
import WhyThisSheet from "./WhyThisSheet";
import { useTripUI } from "./TripContext";
import { chip, chipWarm, ghostButton, muted, pillButton, warningBox } from "./ui";

const SLOT_ICON = { breakfast: Coffee, lunch: Utensils, dinner: Utensils } as const;
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

interface Props {
  stop: TimelineStop;
  day: ItineraryDay;
  style: PlanningStyle;
  /** Trip mode: earlier today. */
  past?: boolean;
  /** Trip mode: the next thing on today's plan. */
  isNext?: boolean;
  isLast?: boolean;
  highlighted?: boolean;
  flashClass?: string;
  /** Extra content inside the card (flexible style's meal options). */
  extra?: React.ReactNode;
}

/** One stop on a day's timeline: when, what, where (with checks), and what you can do about it. */
export default function StopCard({ stop, day, style, past, isNext, isLast, highlighted, flashClass, extra }: Props) {
  const { trip, edits, preview } = useTripUI();
  const [why, setWhy] = useState(false);
  const destination = trip.meta.destination;
  const p = stop.place;
  const hoursToday = hoursForWeekday(p?.verification?.hours, dayWeekday(day));
  const directions = p ? mapsDirectionsUrl([p], destination) : undefined;
  const flagged = stop.warnings.length > 0 || p?.verification?.status === "unverified";
  const canSwap = stop.meal?.type === "eat-out" && (stop.alternatives.length > 0 || flagged);
  const Icon = stop.slot ? (stop.recipe ? ChefHat : SLOT_ICON[stop.slot]) : Sparkle;
  const timeLabel = style === "flexible" ? undefined : stop.time;

  if (stop.hidden) {
    return (
      <li data-stop={stop.key} style={{ display: "grid", gridTemplateColumns: "40px minmax(0,1fr)", gap: "0.75rem", alignItems: "center", padding: "0.25rem 0" }}>
        <span aria-hidden="true" style={{ width: 10, height: 10, borderRadius: 999, background: "var(--color-border)", justifySelf: "center" }} />
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap", color: "var(--color-text-faint)", fontSize: "0.8125rem" }}>
          <span style={{ textDecoration: "line-through" }}>{stop.place?.name ?? stop.text}</span>
          <span>· skipped by your group</span>
          {edits && !preview && (
            <button type="button" disabled={!edits.canEdit} onClick={() => edits.apply({ type: "unhide_stop", day: day.day, key: stop.key }, "Back on the plan")} style={{ ...ghostButton, minHeight: 36, fontSize: "0.8125rem", padding: "0 0.75rem" }}>
              Restore
            </button>
          )}
        </div>
      </li>
    );
  }

  return (
    <li data-stop={stop.key} style={{ display: "grid", gridTemplateColumns: "40px minmax(0,1fr)", gap: "0.75rem", opacity: past || stop.done ? 0.62 : 1, transition: "opacity 0.2s" }}>
      {/* Rail: map letter or icon, joined by a line */}
      <div aria-hidden="true" style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
        <span
          style={{
            width: 34, height: 34, borderRadius: 999, display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
            background: stop.done ? "var(--color-success-bg)" : stop.letter ? "var(--color-brand)" : "var(--color-bg-selected)",
            color: stop.done ? "var(--color-success-text)" : stop.letter ? "var(--color-text-inverse)" : "var(--color-text-muted)",
            fontWeight: 700, fontSize: "0.875rem", boxShadow: isNext ? "0 0 0 4px var(--color-brand-light)" : "none",
          }}
        >
          {stop.done ? <CheckCircle2 size={18} /> : stop.letter ?? <Icon size={16} />}
        </span>
        {!isLast && <span style={{ flex: 1, width: 2, background: "var(--color-border)", marginTop: 4, minHeight: 16 }} />}
      </div>

      <article
        className={highlighted ? flashClass : undefined}
        aria-label={`${timeLabel ? `${timeLabel}: ` : ""}${stop.text}`}
        style={{
          background: "var(--color-bg-card)", border: `1px solid ${isNext ? "var(--color-brand)" : "var(--color-border)"}`, borderRadius: "var(--radius-card)",
          padding: "0.875rem 1rem", marginBottom: "0.875rem", boxShadow: "var(--shadow-card)", minWidth: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap", marginBottom: "0.25rem" }}>
          {timeLabel && <span style={{ fontWeight: 700, color: "var(--color-brand)", fontSize: "0.875rem" }}>{timeLabel}</span>}
          {stop.slot && <span style={stop.meal?.type === "eat-out" ? chipWarm : chip}>{cap(stop.slot)} · {stop.meal?.type === "eat-out" ? "eat out" : "cook in"}</span>}
          {isNext && <span style={{ ...chip, background: "var(--color-brand)", color: "var(--color-text-inverse)" }}>Up next</span>}
          {stop.done && <span style={{ ...chip, background: "var(--color-success-bg)", color: "var(--color-success-text)" }}>Done</span>}
        </div>

        <p style={{ margin: 0, fontSize: "1rem", fontWeight: 600, color: "var(--color-text)", lineHeight: 1.4 }}>{stop.text}</p>

        {p && (
          <div style={{ display: "flex", alignItems: "center", gap: "0.375rem", flexWrap: "wrap", fontSize: "0.8125rem", color: "var(--color-text-muted)", marginTop: "0.375rem" }}>
            <MapPin size={13} aria-hidden="true" />
            <a href={placeMapsUrl(p, destination)} target="_blank" rel="noopener noreferrer" style={{ color: "var(--color-text)", fontWeight: 600 }}>
              {p.name}
              <span className="sr-only"> (opens map in new tab)</span>
            </a>
            {p.priceRange && <span>· {p.priceRange}</span>}
            <VerifiedBadge verification={p.verification} compact />
          </div>
        )}

        {(hoursToday || p?.bookingRequired || (p?.kidFriendly && trip.meta.group.kids > 0)) && (
          <div style={{ display: "flex", gap: "0.375rem", flexWrap: "wrap", marginTop: "0.5rem" }}>
            {hoursToday && <span style={chip}>🕐 {dayWeekday(day)?.slice(0, 3)} {hoursToday}</span>}
            {p?.bookingRequired && <span style={chipWarm}><CalendarCheck size={12} aria-hidden="true" /> Book ahead</span>}
            {p?.kidFriendly && trip.meta.group.kids > 0 && <span style={chip}>Kid-friendly</span>}
          </div>
        )}

        {stop.meal?.note && <p style={{ ...muted, fontSize: "0.8125rem", marginTop: "0.5rem" }}>{stop.meal.note}</p>}

        {stop.warnings.map((w) => (
          <p key={w} role="note" style={{ ...warningBox, marginTop: "0.5rem" }}>
            <AlertTriangle size={13} aria-hidden="true" style={{ flexShrink: 0, marginTop: 2 }} />
            {w}
          </p>
        ))}

        {stop.alternatives.length > 0 && style !== "flexible" && (
          <p style={{ fontSize: "0.8125rem", color: "var(--color-text-faint)", margin: "0.5rem 0 0" }}>
            Backup: {stop.alternatives.map((r) => r.name).join(" · ")}
          </p>
        )}

        {stop.recipe && <div style={{ marginTop: "0.625rem" }}><RecipeCard recipe={stop.recipe} compact /></div>}

        {extra}

        <div className="no-print" style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginTop: "0.75rem" }}>
          {directions && (
            <a href={directions} target="_blank" rel="noopener noreferrer" style={{ ...pillButton(!!isNext), minHeight: 40, fontSize: "0.8125rem" }}>
              <Navigation size={14} aria-hidden="true" /> Directions<span className="sr-only"> to {p?.name} (opens Google Maps)</span>
            </a>
          )}
          {flagged && canSwap && edits && !preview ? (
            <button type="button" onClick={() => setWhy(true)} style={{ ...pillButton(true), minHeight: 40, fontSize: "0.8125rem" }}>
              <Repeat size={14} aria-hidden="true" /> Swap to an open option
            </button>
          ) : null}
          <button type="button" onClick={() => setWhy(true)} aria-haspopup="dialog" style={{ ...ghostButton, minHeight: 40, fontSize: "0.8125rem" }}>
            <HelpCircle size={14} aria-hidden="true" /> Why this?{canSwap && !flagged && !preview ? " · Swap" : ""}
          </button>
        </div>
      </article>
      <WhyThisSheet stop={stop} day={day} open={why} onClose={() => setWhy(false)} />
    </li>
  );
}
