"use client";
import { motion } from "framer-motion";
import { CalendarDays, Compass, ListChecks, Sparkles, Utensils } from "lucide-react";
import type { TabId } from "@/lib/trip-view";
import s from "./trip.module.css";

export const NAV_TABS: { id: TabId; label: string; Icon: typeof Sparkles }[] = [
  { id: "overview", label: "Overview", Icon: Sparkles },
  { id: "days", label: "Days", Icon: CalendarDays },
  { id: "food", label: "Food", Icon: Utensils },
  { id: "explore", label: "Explore", Icon: Compass },
  { id: "lists", label: "Lists", Icon: ListChecks },
];

interface Props {
  active: TabId;
  onSelect: (id: TabId, focus?: boolean) => void;
  /** Sample-plan preview: these tabs are shown but locked behind the paywall. */
  locked?: TabId[];
  /** Small counters, e.g. unchecked list items. */
  badges?: Partial<Record<TabId, string>>;
}

/** Five-tab app bar: thumb-reach bottom bar on phones, sticky top bar on laptops. */
export default function TripNav({ active, onSelect, locked = [], badges = {} }: Props) {
  function handleKeyDown(e: React.KeyboardEvent, index: number) {
    const map: Record<string, number> = { ArrowRight: index + 1, ArrowLeft: index - 1, Home: 0, End: NAV_TABS.length - 1 };
    if (!(e.key in map)) return;
    e.preventDefault();
    onSelect(NAV_TABS[(map[e.key] + NAV_TABS.length) % NAV_TABS.length].id, true);
  }

  return (
    <nav className={`${s.nav} no-print`} aria-label="Trip sections">
      <div role="tablist" aria-label="Trip sections" className={s.navInner}>
        {NAV_TABS.map((tab, index) => {
          const selected = active === tab.id;
          const isLocked = locked.includes(tab.id);
          return (
            <button
              key={tab.id}
              id={`tab-${tab.id}`}
              role="tab"
              type="button"
              aria-selected={selected}
              aria-controls={`panel-${tab.id}`}
              aria-disabled={isLocked || undefined}
              tabIndex={selected ? 0 : -1}
              onClick={() => onSelect(tab.id)}
              onKeyDown={(e) => handleKeyDown(e, index)}
              className={s.navTab}
              style={isLocked ? { opacity: 0.5 } : undefined}
            >
              {selected && <motion.span layoutId="trip-nav-indicator" className={s.navIndicator} transition={{ type: "spring", stiffness: 500, damping: 40 }} />}
              <tab.Icon size={20} aria-hidden="true" strokeWidth={selected ? 2.4 : 1.8} />
              <span className={s.navLabel}>{tab.label}</span>
              {isLocked && <span aria-hidden="true" className={s.navLock}>🔒</span>}
              {isLocked && <span className="sr-only"> (locked in the sample)</span>}
              {badges[tab.id] && !isLocked && (
                <span
                  aria-label={badges[tab.id]}
                  style={{
                    position: "absolute", top: 6, right: "calc(50% - 22px)", minWidth: 8, height: 8, borderRadius: 999,
                    background: "var(--color-accent)", border: "2px solid var(--color-bg-card)",
                  }}
                />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
