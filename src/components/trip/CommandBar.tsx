"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronRight, Loader2, Search, Sparkles, X } from "lucide-react";
import { localISODate } from "@/lib/trip-view";
import { buildSearchIndex, emptyFilter, filterLabels, parseQueryLocal, runFilter, type PlanFilter, type ResultKind, type SearchEntry } from "@/lib/trip-search";
import { useSpeechInput } from "@/hooks/useSpeechInput";
import VoiceButton from "@/components/voice/VoiceButton";
import Sheet from "./Sheet";
import { useTripUI } from "./TripContext";
import { chip, muted } from "./ui";

const GROUP_LABEL: Record<ResultKind, string> = {
  stop: "On your days",
  restaurant: "Places to eat",
  activity: "Things to do",
  recipe: "Recipes",
  event: "Events",
  grocery: "Groceries",
  packing: "Packing",
};

type Source = "local" | "ai" | "loose";

/**
 * "Ask or search your trip" — typed or spoken. Common phrasing is understood
 * in the browser; anything else is interpreted on the server into a filter
 * over the plan (never a made-up answer). The applied filters show as chips
 * you can remove.
 */
export default function CommandBar() {
  const { trip, slug, go, live, preview } = useTripUI();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<PlanFilter | null>(null);
  const [source, setSource] = useState<Source>("local");
  const [thinking, setThinking] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const index = useMemo(() => buildSearchIndex(trip), [trip]);
  const abort = useRef<AbortController | null>(null);

  const run = useCallback(
    async (q: string, allowAI: boolean) => {
      const text = q.trim();
      abort.current?.abort();
      if (text.length < 2) {
        setFilter(null);
        return;
      }
      const local = parseQueryLocal(text, trip, live.todayDay);
      const found = runFilter(index, local.filter);
      setFilter(local.filter);
      setSource(found.loose ? "loose" : "local");
      const needsAI = allowAI && slug && live.online && (found.results.length === 0 || local.confidence === "low");
      if (!needsAI) return;
      const controller = new AbortController();
      abort.current = controller;
      setThinking(true);
      try {
        const res = await fetch(`/api/trip/${encodeURIComponent(slug!)}/ask`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: text, today: localISODate(new Date()) }),
          signal: controller.signal,
        });
        if (!res.ok) throw new Error(String(res.status));
        const { filter: ai } = (await res.json()) as { filter?: PlanFilter };
        if (ai && runFilter(index, ai).results.length > 0) {
          setFilter(ai);
          setSource("ai");
        }
      } catch {
        /* keep the local (or closest-match) results */
      } finally {
        if (abort.current === controller) setThinking(false);
      }
    },
    [index, live.online, live.todayDay, slug, trip]
  );

  const speech = useSpeechInput(
    useCallback(
      (heard: string) => {
        setQuery(heard);
        void run(heard, true);
      },
      [run]
    )
  );

  // "/" or ⌘K opens the bar on laptops.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = (e.target as HTMLElement | null)?.closest("input, textarea, [contenteditable='true']");
      if ((e.key === "/" && !typing) || (e.key.toLowerCase() === "k" && (e.metaKey || e.ctrlKey))) {
        e.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Live results while typing (local only — the AI runs on submit).
  useEffect(() => {
    const t = setTimeout(() => void run(query, false), 180);
    return () => clearTimeout(t);
  }, [query, run]);

  if (preview) return null;

  const results = filter ? runFilter(index, filter).results : [];
  const groups = (Object.keys(GROUP_LABEL) as ResultKind[]).map((k) => ({ kind: k, items: results.filter((r) => r.kind === k) })).filter((g) => g.items.length);
  const suggestions = suggest(trip, live.phase?.phase, live.partOfDay);

  const pick = (e: SearchEntry) => {
    setOpen(false);
    go(e.target);
  };

  return (
    <>
      <div className="no-print" style={{ display: "flex", gap: "0.5rem", alignItems: "center", marginBottom: "1.25rem" }}>
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-haspopup="dialog"
          aria-keyshortcuts="/ Control+K Meta+K"
          style={{
            flex: 1, minHeight: 48, display: "flex", alignItems: "center", gap: "0.625rem", padding: "0 1rem", borderRadius: "var(--radius-chip)",
            border: "1px solid var(--color-border)", background: "var(--color-bg-card)", color: "var(--color-text-faint)", fontSize: "0.9375rem", cursor: "text", boxShadow: "var(--shadow-card)", textAlign: "left",
          }}
        >
          <Search size={18} aria-hidden="true" style={{ color: "var(--color-brand)" }} />
          <span style={{ flex: 1 }}>Ask or search your trip…</span>
          <kbd aria-hidden="true" style={{ ...chip, fontFamily: "inherit", fontSize: "0.6875rem" }}>/</kbd>
        </button>
        <VoiceButton
          speech={{ ...speech, toggle: () => { setOpen(true); speech.toggle(); } }}
          label="Ask your trip by voice"
          size={48}
        />
      </div>

      <Sheet open={open} onClose={() => { speech.stop(); setOpen(false); }} title="Ask your trip" subtitle="Type or speak — answers come only from your plan.">
        <form
          role="search"
          onSubmit={(e) => {
            e.preventDefault();
            void run(query, true);
          }}
          style={{ display: "flex", gap: "0.5rem", alignItems: "center", marginBottom: "0.75rem" }}
        >
          <div style={{ position: "relative", flex: 1 }}>
            <Search size={16} aria-hidden="true" style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "var(--color-text-faint)" }} />
            <input
              ref={input}
              data-autofocus
              type="search"
              enterKeyHint="search"
              aria-label="Ask or search your trip"
              placeholder={speech.listening ? "Listening…" : "e.g. dinner friday, kid-friendly, what to book"}
              value={speech.listening && speech.interim ? speech.interim : query}
              onChange={(e) => setQuery(e.target.value)}
              maxLength={200}
              style={{ width: "100%", minHeight: 48, padding: "0 2.5rem 0 2.5rem", borderRadius: "var(--radius-chip)", border: "1px solid var(--color-border-focus)", background: "var(--color-bg-input)", color: "var(--color-text)", fontSize: "1rem", outline: "none", boxSizing: "border-box" }}
            />
            {query && (
              <button type="button" aria-label="Clear" onClick={() => { setQuery(""); setFilter(null); input.current?.focus(); }} style={{ position: "absolute", right: 4, top: "50%", transform: "translateY(-50%)", width: 40, height: 40, border: "none", background: "transparent", color: "var(--color-text-faint)", cursor: "pointer" }}>
                <X size={16} aria-hidden="true" />
              </button>
            )}
          </div>
          <VoiceButton speech={speech} label="Ask by voice" size={48} />
        </form>
        {speech.error && <p role="alert" style={{ ...muted, fontSize: "0.8125rem", color: "var(--color-warning-text)", marginBottom: "0.5rem" }}>{speech.error}</p>}

        {!filter && (
          <div>
            <p style={{ ...muted, fontSize: "0.8125rem", marginBottom: "0.5rem" }}>Try</p>
            <div style={{ display: "flex", gap: "0.375rem", flexWrap: "wrap" }}>
              {suggestions.map((sug) => (
                <button key={sug} type="button" onClick={() => { setQuery(sug); void run(sug, true); }} style={{ ...chip, minHeight: 36, padding: "0 0.875rem", border: "1px solid var(--color-border)", cursor: "pointer", fontSize: "0.8125rem" }}>
                  {sug}
                </button>
              ))}
            </div>
          </div>
        )}

        {filter && (
          <div aria-live="polite">
            <FilterChips filter={filter} onChange={(f) => { setFilter(f); setSource("local"); }} source={source} thinking={thinking} />
            {results.length === 0 && !thinking && (
              <p style={{ ...muted, marginTop: "0.75rem" }}>Nothing in your plan matches that. Try “dinner”, “day 2”, “coffee” or “kid-friendly”.</p>
            )}
            {groups.map((g) => (
              <section key={g.kind} style={{ marginTop: "0.875rem" }}>
                <h3 style={{ fontSize: "0.6875rem", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--color-text-faint)", margin: "0 0 0.375rem" }}>{GROUP_LABEL[g.kind]}</h3>
                <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                  {g.items.slice(0, 8).map((r) => (
                    <li key={r.id}>
                      <button type="button" onClick={() => pick(r)} style={{ width: "100%", minHeight: 52, display: "flex", alignItems: "center", gap: "0.625rem", padding: "0.5rem 0.75rem", border: "1px solid var(--color-border)", borderRadius: "var(--radius-input)", background: "var(--color-bg)", color: "var(--color-text)", textAlign: "left", cursor: "pointer" }}>
                        <span style={{ flex: 1, minWidth: 0 }}>
                          <span style={{ display: "block", fontWeight: 600, fontSize: "0.9375rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.title}</span>
                          <span style={{ display: "block", fontSize: "0.75rem", color: "var(--color-text-muted)" }}>{r.subtitle}</span>
                        </span>
                        <ChevronRight size={16} aria-hidden="true" style={{ color: "var(--color-text-faint)", flexShrink: 0 }} />
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
      </Sheet>
    </>
  );
}

/** The understood filters as removable chips — the explanation and the control in one. */
function FilterChips({ filter, onChange, source, thinking }: { filter: PlanFilter; onChange: (f: PlanFilter) => void; source: Source; thinking: boolean }) {
  const { trip } = useTripUI();
  const parts: { label: string; remove: () => PlanFilter }[] = [];
  const without = <K extends keyof PlanFilter>(k: K, v?: unknown): PlanFilter => {
    const cur = filter[k];
    return { ...filter, [k]: Array.isArray(cur) ? cur.filter((x) => x !== v) : undefined };
  };
  for (const d of filter.days) parts.push({ label: filterLabels({ ...emptyFilter(), days: [d] }, trip)[0], remove: () => without("days", d) });
  for (const x of filter.slots) parts.push({ label: x.charAt(0).toUpperCase() + x.slice(1), remove: () => without("slots", x) });
  for (const x of filter.kinds) parts.push({ label: GROUP_LABEL[x], remove: () => without("kinds", x) });
  for (const x of filter.tags) parts.push({ label: x, remove: () => without("tags", x) });
  for (const x of filter.dietary) parts.push({ label: x, remove: () => without("dietary", x) });
  if (filter.kidFriendly) parts.push({ label: "Kid-friendly", remove: () => without("kidFriendly") });
  if (filter.bookingRequired) parts.push({ label: "Book ahead", remove: () => without("bookingRequired") });
  if (filter.verifiedOnly) parts.push({ label: "Verified", remove: () => without("verifiedOnly") });
  for (const x of filter.text) parts.push({ label: `“${x}”`, remove: () => without("text", x) });

  return (
    <div style={{ display: "flex", gap: "0.375rem", flexWrap: "wrap", alignItems: "center" }}>
      <span style={{ fontSize: "0.75rem", color: "var(--color-text-faint)", display: "inline-flex", alignItems: "center", gap: "0.25rem" }}>
        {thinking ? <Loader2 size={12} aria-hidden="true" className="animate-spin" /> : source === "ai" ? <Sparkles size={12} aria-hidden="true" /> : null}
        {thinking ? "Thinking…" : source === "ai" ? "AI read this as" : source === "loose" ? "Closest matches for" : "Showing"}
      </span>
      {parts.map((p) => (
        <button key={p.label} type="button" onClick={() => onChange(p.remove())} aria-label={`Remove filter ${p.label}`} style={{ ...chip, minHeight: 32, border: "1px solid var(--color-border-focus)", background: "var(--color-bg-selected)", color: "var(--color-text)", cursor: "pointer" }}>
          {p.label} <X size={11} aria-hidden="true" />
        </button>
      ))}
    </div>
  );
}

/** Suggestions that fit the moment: on the trip, before it, or for this group. */
function suggest(trip: ReturnType<typeof useTripUI>["trip"], phase: string | undefined, partOfDay: string): string[] {
  const out: string[] = [];
  if (phase === "during") out.push(partOfDay === "evening" ? "Dinner tonight" : partOfDay === "afternoon" ? "Today" : "Breakfast today", "Tomorrow");
  if (trip.tips.activities.some((a) => a.bookingRequired)) out.push("What do I need to book?");
  if (trip.meta.group.kids > 0) out.push("Kid-friendly");
  if (trip.restaurants.some((r) => r.bestFor?.includes("coffee"))) out.push("Coffee");
  for (const d of trip.preferences?.dietaryRestrictions ?? []) if (/vegan|vegetarian|gluten/i.test(d)) out.push(d);
  out.push("Dinner on day 2", "Packing list");
  return [...new Set(out)].slice(0, 6);
}
