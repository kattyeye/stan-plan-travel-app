"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MotionConfig, motion, useAnimationControls } from "framer-motion";
import { Download, WifiOff } from "lucide-react";
import type { GeneratedTrip, TripEdits } from "@/types/trip";
import { parseHash, TAB_IDS, type FoodView, type HashState, type ListsView, type TabId } from "@/lib/trip-view";
import { withEdits } from "@/lib/trips/edits";
import { useTripLive } from "@/hooks/useTripLive";
import TripNav from "./TripNav";
import OverviewSection from "./OverviewSection";
import ItinerarySection from "./ItinerarySection";
import FoodSection from "./FoodSection";
import TipsSection from "./TipsSection";
import ListsSection from "./ListsSection";
import UndoToast from "./UndoToast";
import CoachMarks from "./CoachMarks";
import CommandBar from "./CommandBar";
import { TripUIProvider, type GoTo, type TripUI } from "./TripContext";
import { useTripEdits } from "./useTripEdits";
import s from "./trip.module.css";

interface Props {
  trip: GeneratedTrip;
  slug?: string;
  /** Browser key for the Maps Embed API. Without it, maps fall back to "Open in Google Maps" links. */
  mapsKey?: string;
  edits?: TripEdits;
  /** Sample plan behind the paywall: Days only, other tabs locked. */
  preview?: boolean;
  /** Rendered after the content (the paywall on previews). */
  children?: React.ReactNode;
}

interface View {
  tab: TabId;
  day: number;
  food: FoodView;
  lists: ListsView;
}

const hashFor = (v: View) =>
  v.tab === "days" ? `#days-${v.day}` : v.tab === "food" ? `#food-${v.food}` : v.tab === "lists" ? `#lists-${v.lists}` : `#${v.tab}`;

/** The trip page as a small app: five tabs, deep links, group edits, trip mode. */
export default function TripTabs({ trip: original, slug, mapsKey, edits: initialEdits, preview = false, children }: Props) {
  const firstDay = original.itinerary[0]?.day ?? 1;
  const [view, setView] = useState<View>({ tab: preview ? "days" : "overview", day: firstDay, food: "plan", lists: "packing" });
  const [highlight, setHighlight] = useState<string | undefined>();
  const live = useTripLive(original.meta.dates);
  const edits = useTripEdits(preview ? undefined : slug, original, initialEdits, live.online);
  const trip = useMemo(() => withEdits(original, edits?.edits), [original, edits?.edits]);
  const viewKey = `irie:${slug ?? original.meta.title}:view`;
  const initialised = useRef(false);
  const viewRef = useRef(view);
  useEffect(() => {
    viewRef.current = view;
  }, [view]);

  const validDay = useCallback((d: number | undefined) => (d && original.itinerary.some((x) => x.day === d) ? d : undefined), [original.itinerary]);

  const apply = useCallback(
    (to: Partial<HashState>, prev: View): View => ({
      tab: preview ? "days" : (to.tab ?? prev.tab),
      day: validDay(to.day) ?? prev.day,
      food: to.food ?? prev.food,
      lists: to.lists ?? prev.lists,
    }),
    [preview, validDay]
  );

  // Pick the opening view once the viewer's clock is known:
  // a deep link wins, then "today" during the trip, then where they left off.
  useEffect(() => {
    if (!live.hydrated || initialised.current) return;
    initialised.current = true;
    const fromHash = parseHash(window.location.hash);
    let next: Partial<HashState> | null = fromHash;
    if (!next && live.todayDay && validDay(live.todayDay)) next = { tab: "days", day: live.todayDay };
    if (!next) {
      try {
        const saved = JSON.parse(localStorage.getItem(viewKey) ?? "null") as Partial<View> | null;
        if (saved && (TAB_IDS as readonly string[]).includes(saved.tab ?? "")) next = saved;
      } catch {
        /* no saved view */
      }
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial view depends on hash, clock and storage (client only)
    if (next) setView((prev) => apply(next!, prev));
  }, [live.hydrated, live.todayDay, apply, validDay, viewKey]);

  // Back/forward and pasted links.
  useEffect(() => {
    const onHash = () => {
      const h = parseHash(window.location.hash);
      if (h) setView((prev) => apply(h, prev));
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, [apply]);

  // Keep the URL and the remembered view in step.
  useEffect(() => {
    if (!initialised.current) return;
    history.replaceState(null, "", hashFor(view));
    try {
      localStorage.setItem(viewKey, JSON.stringify(view));
    } catch {
      /* ignore */
    }
  }, [view, viewKey]);

  const go = useCallback(
    (to: GoTo) => {
      if (preview && to.tab && to.tab !== "days") {
        document.getElementById("paywall")?.scrollIntoView({ behavior: "smooth", block: "start" });
        return;
      }
      const prev = viewRef.current;
      const next = apply(to, prev);
      viewRef.current = next;
      setView(next);
      setHighlight(to.highlight);
      if (next.tab !== prev.tab) {
        const content = document.getElementById("trip-content");
        if (content) {
          const offset = window.matchMedia("(min-width: 768px)").matches ? 120 : 64;
          const top = content.getBoundingClientRect().top + window.scrollY - offset;
          if (window.scrollY > top) window.scrollTo({ top, behavior: "smooth" });
        }
      }
    },
    [apply, preview]
  );

  const ui: TripUI = {
    trip,
    original,
    slug,
    mapsKey,
    preview,
    tab: view.tab,
    day: view.day,
    food: view.food,
    lists: view.lists,
    highlight,
    go,
    live,
    edits,
  };

  return (
    <TripUIProvider value={ui}>
      <MotionConfig reducedMotion="user">
        <div style={{ background: "var(--color-bg)", minHeight: "60vh" }}>
          <style>{`
            @media print {
              [role="tabpanel"], .print-show { display: block !important; }
              .recipe-body { display: block !important; }
            }
          `}</style>

          <TripNav active={view.tab} onSelect={(id, focus) => {
            go({ tab: id });
            if (focus) requestAnimationFrame(() => document.getElementById(`tab-${id}`)?.focus());
          }} locked={preview ? TAB_IDS.filter((t) => t !== "days") : []} />

          {!live.online && (
            <div role="status" className="no-print" style={{ background: "var(--color-warning-bg)", color: "var(--color-warning-text)", borderBottom: "1px solid var(--color-warning-border)", fontSize: "0.8125rem" }}>
              <div style={{ maxWidth: 1120, margin: "0 auto", padding: "0.5rem 1rem", display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                <WifiOff size={15} aria-hidden="true" />
                <span style={{ flex: 1 }}>You&apos;re offline. Your plan still works; maps and group changes come back when you reconnect.</span>
                {slug && <a href={`/api/trip/${slug}/download`} download style={{ color: "inherit", fontWeight: 700, display: "inline-flex", alignItems: "center", gap: "0.25rem" }}><Download size={14} aria-hidden="true" /> Offline copy</a>}
              </div>
            </div>
          )}

          <div id="trip-content" className={`${s.content} ${view.tab === "days" ? s.contentWide : ""}`}>
            {!preview && <CommandBar />}
            {(preview ? (["days"] as const) : TAB_IDS).map((id) => (
              <Panel key={id} id={id} active={view.tab === id}>
                {id === "overview" && <OverviewSection />}
                {id === "days" && <ItinerarySection />}
                {id === "food" && <FoodSection trip={trip} />}
                {id === "explore" && <TipsSection trip={trip} />}
                {id === "lists" && <ListsSection trip={trip} slug={slug} />}
              </Panel>
            ))}
            {children}
          </div>

          {edits && <UndoToast toast={edits.toast} onDismiss={edits.dismissToast} />}
          {!preview && live.hydrated && <CoachMarks />}
        </div>
      </MotionConfig>
    </TripUIProvider>
  );
}

/** A tab panel that stays mounted (state survives, print shows all) and fades in when it becomes active. */
function Panel({ id, active, children }: { id: TabId; active: boolean; children: React.ReactNode }) {
  const controls = useAnimationControls();
  useEffect(() => {
    if (active) controls.start({ opacity: [0, 1], y: [6, 0], transition: { duration: 0.2, ease: "easeOut" } });
  }, [active, controls]);
  return (
    <div id={`panel-${id}`} role="tabpanel" aria-labelledby={`tab-${id}`} hidden={!active} tabIndex={-1} style={{ outline: "none" }}>
      <motion.div animate={controls}>{children}</motion.div>
    </div>
  );
}
