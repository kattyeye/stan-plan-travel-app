"use client";
import { useEffect, useState, useSyncExternalStore } from "react";
import type { TripMeta } from "@/types/trip";
import { localISODate, tripPhase, type TripPhase } from "@/lib/trip-view";

export interface TripLive {
  /** False until mounted — server HTML never depends on the viewer's clock. */
  hydrated: boolean;
  phase: TripPhase | null;
  /** Trip day number that is "today", during the trip. */
  todayDay?: number;
  /** Minutes since local midnight. */
  minuteNow: number;
  online: boolean;
  /** "morning" | "afternoon" | "evening" for greetings. */
  partOfDay: "morning" | "afternoon" | "evening";
}

const subscribeOnline = (cb: () => void) => {
  window.addEventListener("online", cb);
  window.addEventListener("offline", cb);
  return () => {
    window.removeEventListener("online", cb);
    window.removeEventListener("offline", cb);
  };
};

/** Where the viewer is relative to the trip, re-evaluated every minute. */
export function useTripLive(dates: TripMeta["dates"]): TripLive {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- read the viewer's clock only after mount
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);
  const online = useSyncExternalStore(subscribeOnline, () => navigator.onLine, () => true);

  const phase = now ? tripPhase(dates, localISODate(now)) : null;
  const minuteNow = now ? now.getHours() * 60 + now.getMinutes() : 0;
  return {
    hydrated: !!now,
    phase,
    todayDay: phase?.phase === "during" ? phase.day : undefined,
    minuteNow,
    online,
    partOfDay: minuteNow < 12 * 60 ? "morning" : minuteNow < 17 * 60 ? "afternoon" : "evening",
  };
}
