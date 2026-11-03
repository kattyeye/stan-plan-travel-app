export const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] as const;

export interface DaySkeleton {
  day: number;
  /** YYYY-MM-DD */
  date: string;
  weekday: (typeof WEEKDAYS)[number];
  /** 0 = Sunday */
  weekdayIndex: number;
}

/**
 * The calendar for the trip: arrival day through departure day, so a 5-night
 * trip has 6 days. Dates and weekdays always come from here, never from the model.
 */
export function buildDays(startDate: string, nights: number): DaySkeleton[] {
  const start = Date.parse(`${startDate}T12:00:00Z`);
  return Array.from({ length: nights + 1 }, (_, i) => {
    const d = new Date(start + i * 86_400_000);
    const weekdayIndex = d.getUTCDay();
    return { day: i + 1, date: d.toISOString().slice(0, 10), weekday: WEEKDAYS[weekdayIndex], weekdayIndex };
  });
}

/** "Fri, Jun 14" */
export function shortDate(isoDate: string): string {
  const d = new Date(`${isoDate}T12:00:00Z`);
  if (Number.isNaN(d.getTime())) return isoDate;
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" });
}
