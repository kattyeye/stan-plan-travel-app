"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, ChevronLeft, ChevronRight, Compass, Navigation } from "lucide-react";
import { buildDayTimeline, dayChip, mapsDirectionsUrl, STYLE_INFO, upNext } from "@/lib/trip-view";
import DayTimeline from "./DayTimeline";
import DayMap from "./DayMap";
import { useTripUI } from "./TripContext";
import { chip, eyebrow, ghostButton, iconButton, muted, pillButton, primaryButton, warningBox } from "./ui";
import s from "./trip.module.css";

/** Days tab: one day at a time — day strip, timeline, and the route map beside it. */
export default function ItinerarySection() {
  const { trip, day: activeDay, go, live, edits, preview } = useTripUI();
  const days = trip.itinerary;
  const index = Math.max(0, days.findIndex((d) => d.day === activeDay));
  const current = days[index];
  const style = trip.preferences?.planningStyle ?? "balanced";
  const [direction, setDirection] = useState(0);
  const touch = useRef<{ x: number; y: number; skip: boolean } | null>(null);

  const stops = useMemo(
    () => (current ? buildDayTimeline(current, trip, { hidden: edits?.hidden, done: edits?.done }) : []),
    [current, trip, edits?.hidden, edits?.done]
  );

  if (!current) return <p style={muted}>No days planned yet.</p>;

  const isToday = live.todayDay === current.day;
  const now = isToday ? upNext(stops, live.minuteNow) : null;
  const thin = stops.filter((x) => x.kind === "activity" && !x.hidden).length === 0 || trip.quality?.issues.some((i) => i.code === "day_missing" && i.day === current.day);
  const chipText = dayChip(current);

  const select = (n: number) => {
    const target = days[Math.min(days.length - 1, Math.max(0, n))];
    if (!target || target.day === current.day) return;
    setDirection(target.day > current.day ? 1 : -1);
    go({ tab: "days", day: target.day });
  };

  const onTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    touch.current = { x: t.clientX, y: t.clientY, skip: !!(e.target as Element).closest("[data-no-swipe], iframe, a, button, input, label") };
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    const start = touch.current;
    touch.current = null;
    if (!start || start.skip) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - start.x;
    const dy = t.clientY - start.y;
    if (Math.abs(dx) > 70 && Math.abs(dx) > 2 * Math.abs(dy)) select(index + (dx < 0 ? 1 : -1));
  };

  return (
    <div>
      {days.length > 1 && <DayStrip activeIndex={index} onSelect={select} />}

      <motion.div
        key={current.day}
        initial={{ opacity: 0, x: direction * 28 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.22, ease: "easeOut" }}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <header style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "1rem", margin: "1.25rem 0 1rem" }}>
          <div style={{ minWidth: 0 }}>
            <p style={{ ...eyebrow, marginBottom: "0.25rem" }}>
              Day {current.day} of {days.length}
              {chipText.weekday ? ` · ${chipText.weekday}, ${chipText.date}` : chipText.date ? ` · ${chipText.date}` : ""}
              {isToday ? " · Today" : ""}
            </p>
            <h2 id={`day-${current.day}`} style={{ fontFamily: "var(--font-display)", fontWeight: 400, fontSize: "clamp(1.5rem, 5vw, 2rem)", color: "var(--color-heading)", margin: 0, lineHeight: 1.15 }}>
              {current.theme || `Day ${current.day}`}
            </h2>
            <div style={{ display: "flex", gap: "0.375rem", flexWrap: "wrap", marginTop: "0.5rem" }}>
              <span style={{ ...chip, background: "var(--color-brand-light)", color: "var(--color-heading)" }} title={STYLE_INFO[style].explain}>{STYLE_INFO[style].badge}</span>
              {current.vibe?.map((v) => <span key={v} style={chip}>{v}</span>)}
            </div>
          </div>
          {days.length > 1 && (
            <div className="no-print" style={{ display: "flex", gap: "0.375rem", flexShrink: 0 }}>
              <button type="button" aria-label="Previous day" disabled={index === 0} onClick={() => select(index - 1)} style={{ ...iconButton, opacity: index === 0 ? 0.4 : 1 }}>
                <ChevronLeft size={18} aria-hidden="true" />
              </button>
              <button type="button" aria-label="Next day" disabled={index === days.length - 1} onClick={() => select(index + 1)} style={{ ...iconButton, opacity: index === days.length - 1 ? 0.4 : 1 }}>
                <ChevronRight size={18} aria-hidden="true" />
              </button>
            </div>
          )}
        </header>

        {current.warnings && current.warnings.length > 0 && <DayWarnings warnings={current.warnings} />}

        {now && (now.current || now.next) && <NowNext current={now.current} next={now.next} partOfDay={live.partOfDay} />}

        <div className={s.dayLayout}>
          <div className={s.mapCol}>
            <DayMap dayNumber={current.day} stops={stops} />
          </div>
          <div style={{ minWidth: 0 }}>
            <DayTimeline day={current} stops={stops} style={style} past={now?.past} nextKey={now?.next?.key} />
            {thin && !preview && (
              <div style={{ ...warningBox, background: "var(--color-bg-selected)", color: "var(--color-text)", border: "1px solid var(--color-border)", padding: "0.75rem 0.875rem", marginTop: "0.5rem", alignItems: "center" }}>
                <Compass size={16} aria-hidden="true" style={{ flexShrink: 0 }} />
                <span style={{ flex: 1 }}>This day is wide open. Want ideas?</span>
                <button type="button" onClick={() => go({ tab: "explore" })} style={{ ...ghostButton, minHeight: 40 }}>Explore</button>
              </div>
            )}
          </div>
        </div>

        {days.length > 1 && (
          <nav aria-label="Other days" className="no-print" style={{ display: "flex", justifyContent: "space-between", gap: "0.75rem", marginTop: "1.5rem" }}>
            {index > 0 ? (
              <button type="button" onClick={() => select(index - 1)} style={ghostButton}>
                <ChevronLeft size={16} aria-hidden="true" /> Day {days[index - 1].day}
              </button>
            ) : <span />}
            {index < days.length - 1 && (
              <button type="button" onClick={() => select(index + 1)} style={pillButton(false)}>
                Day {days[index + 1].day}{days[index + 1].theme ? `: ${truncate(days[index + 1].theme!, 28)}` : ""} <ChevronRight size={16} aria-hidden="true" />
              </button>
            )}
          </nav>
        )}
      </motion.div>
    </div>
  );
}

const truncate = (t: string, n: number) => (t.length > n ? `${t.slice(0, n - 1)}…` : t);

/** Sticky, swipeable row of day chips; marks today and days with something to know. */
function DayStrip({ activeIndex, onSelect }: { activeIndex: number; onSelect: (i: number) => void }) {
  const { trip, live } = useTripUI();
  const strip = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = strip.current?.querySelector<HTMLElement>(`[data-index="${activeIndex}"]`);
    el?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }, [activeIndex]);

  return (
    <div className={`${s.dayStrip} no-print`}>
      <div
        ref={strip}
        role="group"
        aria-label="Choose a day"
        className={s.carousel}
        data-no-swipe
        style={{ margin: 0, padding: 0, gap: "0.5rem" }}
        onKeyDown={(e) => {
          if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
            e.preventDefault();
            onSelect(activeIndex + (e.key === "ArrowRight" ? 1 : -1));
          }
        }}
      >
        {trip.itinerary.map((d, i) => {
          const on = i === activeIndex;
          const c = dayChip(d);
          const today = live.todayDay === d.day;
          const warn = (d.warnings?.length ?? 0) > 0 || Object.values(d.meals ?? {}).some((m) => m?.warnings?.length);
          return (
            <button
              key={d.day}
              type="button"
              data-index={i}
              aria-pressed={on}
              aria-current={today ? "date" : undefined}
              onClick={() => onSelect(i)}
              style={{
                position: "relative", minWidth: 64, minHeight: 56, padding: "0.375rem 0.75rem", borderRadius: "var(--radius-input)", cursor: "pointer",
                border: `1px solid ${on ? "var(--color-brand)" : "var(--color-border)"}`, background: on ? "var(--color-brand)" : "var(--color-bg-card)",
                color: on ? "var(--color-text-inverse)" : "var(--color-text)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", lineHeight: 1.15,
              }}
            >
              <span style={{ fontSize: "0.6875rem", fontWeight: 600, opacity: 0.8, textTransform: "uppercase", letterSpacing: "0.06em" }}>{c.weekday || "Day"}</span>
              <span style={{ fontSize: "0.9375rem", fontWeight: 700 }}>{c.weekday ? c.date.replace(/^\w+ /, "") : d.day}</span>
              <span style={{ fontSize: "0.625rem", opacity: 0.75 }}>Day {d.day}</span>
              {today && <span aria-hidden="true" style={{ position: "absolute", top: 5, left: 6, width: 7, height: 7, borderRadius: 999, background: on ? "var(--color-text-inverse)" : "var(--color-brand)" }} />}
              {warn && <span aria-label="has something to know" style={{ position: "absolute", top: 5, right: 6, width: 7, height: 7, borderRadius: 999, background: "var(--color-warning-text)" }} />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function DayWarnings({ warnings }: { warnings: string[] }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ marginBottom: "1rem" }}>
      <button type="button" aria-expanded={open} onClick={() => setOpen((v) => !v)} style={{ ...warningBox, cursor: "pointer", minHeight: 40, alignItems: "center", margin: 0, fontWeight: 600 }}>
        <AlertTriangle size={14} aria-hidden="true" /> {warnings.length} thing{warnings.length === 1 ? "" : "s"} to know today
      </button>
      {open && warnings.map((w) => (
        <p key={w} role="note" style={warningBox}>
          <AlertTriangle size={13} aria-hidden="true" style={{ flexShrink: 0, marginTop: 2 }} />
          {w}
        </p>
      ))}
    </div>
  );
}

/** Trip mode: what's happening now and what's next, with one big Directions button. */
function NowNext({ current, next, partOfDay }: { current?: ReturnType<typeof upNext>["current"]; next?: ReturnType<typeof upNext>["next"]; partOfDay: string }) {
  const { trip } = useTripUI();
  const directions = next?.place ? mapsDirectionsUrl([next.place], trip.meta.destination) : undefined;
  return (
    <section aria-label="Happening now" style={{ background: "var(--color-header-bg)", color: "var(--color-header-text)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-card)", padding: "1rem 1.125rem", marginBottom: "1.25rem", boxShadow: "var(--shadow-float)" }}>
      <p style={{ margin: 0, fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--color-header-muted)" }}>Good {partOfDay} · trip mode</p>
      {current && (
        <p style={{ margin: "0.375rem 0 0", fontSize: "0.9375rem" }}>
          <strong>Now:</strong> {current.place?.name ?? current.text}
        </p>
      )}
      {next ? (
        <p style={{ margin: "0.25rem 0 0", fontSize: "1.0625rem", fontFamily: "var(--font-display)" }}>
          Next{next.time ? ` at ${next.time}` : ""}: {next.place?.name ?? next.text}
        </p>
      ) : (
        <p style={{ margin: "0.25rem 0 0", fontSize: "1.0625rem", fontFamily: "var(--font-display)" }}>That&apos;s the last thing today — enjoy the evening.</p>
      )}
      {directions && (
        <a href={directions} target="_blank" rel="noopener noreferrer" style={{ ...primaryButton, marginTop: "0.75rem", background: "var(--color-header-text)", color: "var(--color-header-bg)", borderColor: "var(--color-header-text)" }}>
          <Navigation size={16} aria-hidden="true" /> Directions to {next?.place?.name}
          <span className="sr-only"> (opens Google Maps)</span>
        </a>
      )}
    </section>
  );
}
