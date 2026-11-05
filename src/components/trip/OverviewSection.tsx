"use client";
import { useMemo } from "react";
import { motion } from "framer-motion";
import { ArrowRight, CalendarCheck, ChefHat, ChevronRight, CloudSun, History, Luggage, MapPin, Moon, RotateCcw, ShieldCheck, ShoppingCart, Users } from "lucide-react";
import type { GeneratedTrip } from "@/types/trip";
import { buildDayTimeline, dayChip, SLOTS, STYLE_INFO, upNext } from "@/lib/trip-view";
import { useStoredChecklist } from "@/hooks/useStoredChecklist";
import { groceryMaster, groceryStorageKey, packingInitial, packingStorageKey } from "./checklists";
import { useTripUI } from "./TripContext";
import { card, chip, eyebrow, ghostButton, h2, h3, muted, primaryButton } from "./ui";
import s from "./trip.module.css";

/** The hook: what's next, the whole trip at a glance, what to do before you go, and what we checked. */
export default function OverviewSection() {
  const { trip, slug, go, edits, preview } = useTripUI();
  const { meta, quality, tips, preferences } = trip;
  const style = preferences?.planningStyle ?? "balanced";

  const meals = trip.itinerary.flatMap((d) => SLOTS.map((slot) => d.meals?.[slot]).filter(Boolean));
  const cookIns = meals.filter((m) => m!.type === "cook-in").length;
  const toBook = tips.activities.filter((a) => a.bookingRequired);
  const venues = [...trip.restaurants, ...tips.activities];
  const verified = quality?.venues.verified ?? venues.filter((v) => v.verification?.status === "verified").length;
  const total = quality?.venues.total ?? venues.length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.75rem" }}>
      <NowCard />

      <section aria-labelledby="glance-h">
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: "1rem", marginBottom: "0.75rem" }}>
          <h2 id="glance-h" style={h2}>Your trip at a glance</h2>
          <button type="button" onClick={() => go({ tab: "days" })} style={{ ...ghostButton, minHeight: 40, border: "none", padding: "0 0.5rem" }}>
            All days <ChevronRight size={16} aria-hidden="true" />
          </button>
        </div>
        <DayCarousel />
      </section>

      <section aria-label="Trip stats" className={s.statGrid}>
        <Stat icon={<Moon size={16} />} value={`${meta.dates.nights}`} label={meta.dates.nights === 1 ? "night" : "nights"} />
        <Stat icon={<Users size={16} />} value={`${meta.group.totalPeople}`} label={meta.group.kids ? `people · ${meta.group.kids} kid${meta.group.kids === 1 ? "" : "s"}` : meta.group.totalPeople === 1 ? "traveller" : "travellers"} />
        <Stat icon={<ShieldCheck size={16} />} value={!total ? "—" : verified ? `${verified}/${total}` : `${total}`} label={verified ? "places verified on Google" : "places researched live"} onClick={() => go({ tab: "food", food: "eat" })} />
        <Stat icon={<ChefHat size={16} />} value={`${cookIns}`} label={`of ${meals.length} meals at home`} onClick={() => go({ tab: "food", food: "plan" })} />
      </section>

      {!preview && <BeforeYouGo toBook={toBook.map((a) => a.name)} />}

      <section aria-labelledby="checked-h" style={{ ...card, padding: "1.125rem 1.25rem" }}>
        <h2 id="checked-h" style={{ ...h3, fontSize: "1.0625rem", marginBottom: "0.5rem" }}>
          <ShieldCheck size={18} aria-hidden="true" style={{ color: "var(--color-success-text)" }} /> We checked this plan
        </h2>
        <CheckedSummary trip={trip} />
        <p style={{ ...muted, fontSize: "0.8125rem", marginTop: "0.75rem" }}>
          <span style={{ ...chip, background: "var(--color-brand-light)", color: "var(--color-heading)", marginRight: "0.375rem" }}>{STYLE_INFO[style].badge}</span>
          {STYLE_INFO[style].explain}
        </p>
        {tips.weather && (
          <p style={{ ...muted, display: "flex", gap: "0.5rem", marginTop: "0.75rem" }}>
            <CloudSun size={16} aria-hidden="true" style={{ flexShrink: 0, color: "var(--color-accent)", marginTop: 2 }} />
            <span><strong style={{ color: "var(--color-text)" }}>Weather: </strong>{tips.weather}</span>
          </p>
        )}
      </section>

      {edits && edits.edits.log.length > 0 && (
        <section aria-labelledby="changes-h" style={{ ...card, padding: "1.125rem 1.25rem" }}>
          <h2 id="changes-h" style={{ ...h3, marginBottom: "0.5rem" }}>
            <History size={17} aria-hidden="true" /> Changes by your group
          </h2>
          <ul style={{ listStyle: "none", padding: 0, margin: "0 0 0.75rem", display: "flex", flexDirection: "column", gap: "0.375rem" }}>
            {edits.edits.log.slice(0, 4).map((l, i) => (
              <li key={i} style={{ fontSize: "0.875rem", color: "var(--color-text)", display: "flex", justifyContent: "space-between", gap: "0.75rem" }}>
                <span>{l.summary}</span>
                <span style={{ color: "var(--color-text-faint)", whiteSpace: "nowrap", fontSize: "0.8125rem" }}>{ago(l.at)}</span>
              </li>
            ))}
          </ul>
          <button
            type="button"
            disabled={!edits.canEdit}
            onClick={() => {
              if (window.confirm("Reset to the original plan for everyone? Swaps, skips and ticks will be cleared.")) edits.apply({ type: "reset" }, "Back to the original plan");
            }}
            style={{ ...ghostButton, minHeight: 40 }}
          >
            <RotateCcw size={15} aria-hidden="true" /> Reset to original plan
          </button>
        </section>
      )}

      {slug && !preview && <p style={{ ...muted, fontSize: "0.75rem", textAlign: "center" }}>Anyone with this link sees the same plan — share it with your group.</p>}
    </div>
  );
}

function ago(iso: string): string {
  const mins = Math.round((Date.now() - Date.parse(iso)) / 60_000);
  if (!Number.isFinite(mins) || mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  if (mins < 60 * 24) return `${Math.round(mins / 60)}h ago`;
  return `${Math.round(mins / 1440)}d ago`;
}

/** Changes with the trip phase: countdown before, live "next up" during, and "plan another" after. */
function NowCard() {
  const { trip, live, go } = useTripUI();
  const { meta } = trip;
  const p = live.phase;
  const first = trip.itinerary[0];
  const firstChip = first ? dayChip(first) : null;

  const today = p?.phase === "during" ? trip.itinerary.find((d) => d.day === p.day) : undefined;
  const next = useMemo(() => (today ? upNext(buildDayTimeline(today, trip), live.minuteNow).next : undefined), [today, trip, live.minuteNow]);

  const base: React.CSSProperties = { background: "var(--color-header-bg)", color: "var(--color-header-text)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-card)", padding: "1.25rem", boxShadow: "var(--shadow-float)", overflow: "hidden" };

  if (p?.phase === "during" && today) {
    return (
      <motion.section initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} aria-label="Today" style={base}>
        <p style={{ ...eyebrow, color: "var(--color-header-muted)" }}>Good {live.partOfDay} · Day {p.day} of {p.of}</p>
        <h2 style={{ ...h2, color: "var(--color-header-text)", fontSize: "1.75rem", margin: "0.25rem 0 0.5rem" }}>{today.theme || `Day ${today.day}`}</h2>
        {next && <p style={{ margin: "0 0 1rem", fontSize: "0.9375rem" }}>Up next{next.time ? ` at ${next.time}` : ""}: <strong>{next.place?.name ?? next.text}</strong></p>}
        <button type="button" onClick={() => go({ tab: "days", day: today.day, highlight: next?.key })} style={{ ...primaryButton, background: "var(--color-header-text)", color: "var(--color-header-bg)", borderColor: "var(--color-header-text)" }}>
          Open today <ArrowRight size={16} aria-hidden="true" />
        </button>
      </motion.section>
    );
  }

  if (p?.phase === "after") {
    const params = new URLSearchParams({ adults: String(meta.group.adults), children: String(meta.group.kids) });
    for (const d of trip.preferences?.dietaryRestrictions ?? []) params.append("diet", d);
    return (
      <section aria-label="After the trip" style={base}>
        <p style={{ ...eyebrow, color: "var(--color-header-muted)" }}>Welcome home</p>
        <h2 style={{ ...h2, color: "var(--color-header-text)", fontSize: "1.75rem", margin: "0.25rem 0 0.5rem" }}>Hope {meta.destination.split(",")[0]} was irie ✨</h2>
        <p style={{ margin: "0 0 1rem", fontSize: "0.9375rem", color: "var(--color-header-muted)" }}>Same crew, new place? We&apos;ll keep your group and dietary needs.</p>
        <a href={`/wizard?${params}`} style={{ ...primaryButton, background: "var(--color-header-text)", color: "var(--color-header-bg)", borderColor: "var(--color-header-text)" }}>
          Plan your next trip <ArrowRight size={16} aria-hidden="true" />
        </a>
      </section>
    );
  }

  return (
    <motion.section initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} aria-label="Countdown" style={{ ...base, display: "flex", gap: "1.25rem", alignItems: "center", flexWrap: "wrap" }}>
      {p?.phase === "before" && (
        <div aria-hidden="true" style={{ textAlign: "center", minWidth: 88 }}>
          <div style={{ fontFamily: "var(--font-display)", fontSize: "3.25rem", lineHeight: 1, color: "var(--color-cornsilk-300)" }}>{p.daysToGo}</div>
          <div style={{ fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--color-header-muted)" }}>{p.daysToGo === 1 ? "day to go" : "days to go"}</div>
        </div>
      )}
      <div style={{ flex: "1 1 220px", minWidth: 0 }}>
        <p style={{ ...eyebrow, color: "var(--color-header-muted)" }}>{p?.phase === "before" ? "Your trip" : "Your plan"}</p>
        <h2 style={{ ...h2, color: "var(--color-header-text)", fontSize: "1.5rem", margin: "0.25rem 0 0.375rem" }}>
          {trip.itinerary.length} days in {meta.destination.split(",")[0]}
        </h2>
        <p style={{ margin: "0 0 0.875rem", fontSize: "0.875rem", color: "var(--color-header-muted)" }}>
          {firstChip?.weekday ? `Starts ${firstChip.weekday}, ${firstChip.date}` : "Every place researched live and checked"} · {meta.group.totalPeople} {meta.group.totalPeople === 1 ? "traveller" : "travellers"}
        </p>
        <button type="button" onClick={() => go({ tab: "days", day: first?.day ?? 1 })} style={{ ...primaryButton, background: "var(--color-header-text)", color: "var(--color-header-bg)", borderColor: "var(--color-header-text)" }}>
          Start with Day 1 <ArrowRight size={16} aria-hidden="true" />
        </button>
      </div>
    </motion.section>
  );
}

/** Swipeable story-style cards, one per day. */
function DayCarousel() {
  const { trip, go, live, edits } = useTripUI();
  return (
    <ul className={s.carousel} data-no-swipe style={{ listStyle: "none" }}>
      {trip.itinerary.map((d, i) => {
        const stops = buildDayTimeline(d, trip, { hidden: edits?.hidden });
        const highlights = stops.filter((x) => !x.hidden && (x.place || x.kind === "activity")).slice(0, 3);
        const out = SLOTS.filter((sl) => d.meals?.[sl]?.type === "eat-out").length;
        const c = dayChip(d);
        const today = live.todayDay === d.day;
        return (
          <li key={d.day}>
          <motion.button
            type="button"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: Math.min(i, 6) * 0.05 }}
            onClick={() => go({ tab: "days", day: d.day })}
            style={{
              ...card, width: 248, minHeight: 210, padding: "1rem", textAlign: "left", cursor: "pointer", color: "var(--color-text)",
              display: "flex", flexDirection: "column", gap: "0.5rem", borderColor: today ? "var(--color-brand)" : "var(--color-border)",
            }}
          >
            <span style={{ ...eyebrow, color: today ? "var(--color-brand)" : "var(--color-text-faint)" }}>
              Day {d.day}{c.weekday ? ` · ${c.weekday} ${c.date}` : c.date ? ` · ${c.date}` : ""}{today ? " · Today" : ""}
            </span>
            <span style={{ fontFamily: "var(--font-display)", fontSize: "1.25rem", lineHeight: 1.2, color: "var(--color-heading)" }}>{d.theme || `Day ${d.day}`}</span>
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "0.25rem", flex: 1 }}>
              {highlights.map((h) => (
                <li key={h.key} style={{ display: "flex", gap: "0.375rem", alignItems: "baseline", fontSize: "0.8125rem", color: "var(--color-text-muted)", minWidth: 0 }}>
                  <MapPin size={11} aria-hidden="true" style={{ flexShrink: 0, color: "var(--color-brand)" }} />
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{h.place?.name ?? h.text}</span>
                </li>
              ))}
            </ul>
            <span style={{ display: "flex", gap: "0.375rem", flexWrap: "wrap" }}>
              {d.vibe?.slice(0, 2).map((v) => <span key={v} style={chip}>{v}</span>)}
              <span style={{ ...chip, background: "transparent", border: "1px solid var(--color-border)" }}>🍴 {out} out · {3 - out} in</span>
            </span>
          </motion.button>
          </li>
        );
      })}
    </ul>
  );
}

function Stat({ icon, value, label, onClick }: { icon: React.ReactNode; value: string; label: string; onClick?: () => void }) {
  const inner = (
    <>
      <span aria-hidden="true" style={{ color: "var(--color-brand)", display: "flex" }}>{icon}</span>
      <span style={{ fontFamily: "var(--font-display)", fontSize: "1.625rem", color: "var(--color-heading)", lineHeight: 1.1 }}>{value}</span>
      <span style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", lineHeight: 1.3 }}>{label}</span>
    </>
  );
  const style: React.CSSProperties = { ...card, padding: "0.875rem", display: "flex", flexDirection: "column", gap: "0.25rem", textAlign: "left", color: "var(--color-text)", minHeight: 96 };
  return onClick ? (
    <button type="button" onClick={onClick} style={{ ...style, cursor: "pointer" }}>{inner}</button>
  ) : (
    <div style={style}>{inner}</div>
  );
}

/** Prep mode: the few things worth doing before you leave. */
function BeforeYouGo({ toBook }: { toBook: string[] }) {
  const { trip, slug, go } = useTripUI();
  const packInit = useMemo(() => () => packingInitial(trip.packingList), [trip.packingList]);
  const master = useMemo(() => groceryMaster(trip), [trip]);
  const groceryInit = useMemo(() => () => ({}) as Record<string, boolean>, []);
  const packing = useStoredChecklist(packingStorageKey(slug, trip), packInit);
  const grocery = useStoredChecklist(groceryStorageKey(slug, trip), groceryInit);
  const packTotal = Object.keys(packing.checked).length;
  const packDone = Object.values(packing.checked).filter(Boolean).length;
  const shopDone = master.filter((m) => grocery.checked[m.item]).length;

  const rows: { icon: React.ReactNode; title: string; detail: string; done?: boolean; onClick: () => void }[] = [];
  if (toBook.length) {
    rows.push({ icon: <CalendarCheck size={18} />, title: `Book ahead: ${toBook.length} place${toBook.length === 1 ? "" : "s"}`, detail: toBook.slice(0, 3).join(" · "), onClick: () => go({ tab: "explore" }) });
  }
  if (packTotal) rows.push({ icon: <Luggage size={18} />, title: "Pack", detail: `${packDone} of ${packTotal} packed`, done: packDone === packTotal, onClick: () => go({ tab: "lists", lists: "packing" }) });
  if (master.length) rows.push({ icon: <ShoppingCart size={18} />, title: "Shop for the house", detail: `${shopDone} of ${master.length} in the cart`, done: shopDone === master.length, onClick: () => go({ tab: "lists", lists: "groceries" }) });
  if (!rows.length) return null;

  return (
    <section aria-labelledby="prep-h">
      <h2 id="prep-h" style={{ ...h2, marginBottom: "0.75rem" }}>Before you go</h2>
      <ul style={{ ...card, listStyle: "none", padding: 0, margin: 0, overflow: "hidden" }}>
        {rows.map((r, i) => (
          <li key={r.title} style={{ borderTop: i ? "1px solid var(--color-border)" : "none" }}>
            <button type="button" onClick={r.onClick} style={{ width: "100%", minHeight: 60, display: "flex", alignItems: "center", gap: "0.875rem", padding: "0.75rem 1rem", background: "transparent", border: "none", cursor: "pointer", textAlign: "left", color: "var(--color-text)" }}>
              <span aria-hidden="true" style={{ width: 36, height: 36, borderRadius: 999, display: "inline-flex", alignItems: "center", justifyContent: "center", background: r.done ? "var(--color-success-bg)" : "var(--color-bg-selected)", color: r.done ? "var(--color-success-text)" : "var(--color-brand)", flexShrink: 0 }}>{r.icon}</span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: "block", fontWeight: 600 }}>{r.title}{r.done ? " ✓" : ""}</span>
                <span style={{ display: "block", fontSize: "0.8125rem", color: "var(--color-text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.detail}</span>
              </span>
              <ChevronRight size={18} aria-hidden="true" style={{ color: "var(--color-text-faint)" }} />
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** What the code checked, with links to the days that have something to know. */
function CheckedSummary({ trip }: { trip: GeneratedTrip }) {
  const { go } = useTripUI();
  const q = trip.quality;
  const swapped = q?.issues.filter((i) => i.code === "venue_swapped").length ?? 0;
  const flagged = trip.itinerary.flatMap((d) => [
    ...(d.warnings ?? []).map((w) => ({ day: d.day, text: w })),
    ...SLOTS.flatMap((sl) => (d.meals?.[sl]?.warnings ?? []).map((w) => ({ day: d.day, text: w }))),
  ]);
  const lines: string[] = [];
  if (q) {
    lines.push(q.venues.verified > 0 ? `${q.venues.verified} of ${q.venues.total} places confirmed open on Google Maps` : `${q.venues.total} places found in current web sources`);
    if (q.webSearches) lines.push(`${q.webSearches} live web searches — nothing made up`);
    if (q.venues.removedClosed) lines.push(`${q.venues.removedClosed} closed place${q.venues.removedClosed === 1 ? "" : "s"} removed`);
    if (swapped) lines.push(`${swapped} meal${swapped === 1 ? "" : "s"} moved to places open that day`);
  } else {
    lines.push("Built from researched places, with dates and servings worked out in code");
  }
  if (trip.preferences?.dietaryRestrictions?.length) lines.push(`Recipes checked for ${trip.preferences.dietaryRestrictions.join(", ")}`);

  return (
    <>
      <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "0.375rem" }}>
        {lines.map((l) => (
          <li key={l} style={{ display: "flex", gap: "0.5rem", fontSize: "0.875rem", color: "var(--color-text)" }}>
            <span aria-hidden="true" style={{ color: "var(--color-success-text)", fontWeight: 700 }}>✓</span>
            {l}
          </li>
        ))}
      </ul>
      {flagged.length > 0 && (
        <div style={{ marginTop: "0.75rem" }}>
          <p style={{ ...muted, fontSize: "0.8125rem", fontWeight: 600, marginBottom: "0.375rem" }}>{flagged.length} thing{flagged.length === 1 ? "" : "s"} worth knowing</p>
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "0.25rem" }}>
            {flagged.slice(0, 4).map((f, i) => (
              <li key={i}>
                <button type="button" onClick={() => go({ tab: "days", day: f.day })} style={{ display: "flex", gap: "0.5rem", alignItems: "baseline", width: "100%", minHeight: 40, background: "var(--color-warning-bg)", border: "1px solid var(--color-warning-border)", borderRadius: 8, padding: "0.375rem 0.625rem", color: "var(--color-warning-text)", fontSize: "0.8125rem", textAlign: "left", cursor: "pointer" }}>
                  <strong style={{ whiteSpace: "nowrap" }}>Day {f.day}</strong> {f.text}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
      {q && (
        <p style={{ ...muted, fontSize: "0.75rem", marginTop: "0.625rem" }}>
          Checked {new Date(q.checkedAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}. Hours change — call ahead for dinner.
        </p>
      )}
      {trip.sources && trip.sources.length > 0 && (
        <details style={{ marginTop: "0.5rem", fontSize: "0.8125rem", color: "var(--color-text-muted)" }}>
          <summary style={{ cursor: "pointer", fontWeight: 500, minHeight: 32 }}>Sources ({trip.sources.length})</summary>
          <ul style={{ padding: "0.375rem 0 0 1rem", margin: 0, lineHeight: 1.8 }}>
            {trip.sources.map((src) => (
              <li key={src.url}><a href={src.url} target="_blank" rel="noopener noreferrer" style={{ color: "var(--color-text-muted)" }}>{src.title}</a></li>
            ))}
          </ul>
        </details>
      )}
    </>
  );
}
