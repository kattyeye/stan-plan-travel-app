/**
 * Backward-compatibility layer between stored trips and renderers.
 *
 * Trips generated before structured times store activities as prose strings
 * ("9:00am — Kayak rental at Kitty Hawk"). Newer ones store objects with real
 * `startTime` fields. Rather than migrate Redis or break existing customer
 * links, everything is normalized on read: components and the calendar builder
 * only ever see `ItineraryActivity` objects and meals that always have a time.
 *
 * Platform-free — safe to import from React Native.
 */

import type {
  GeneratedTrip,
  ItineraryActivity,
  Meal,
  NormalizedItineraryDay,
  NormalizedMeal,
  NormalizedTrip,
  RawActivity,
} from "./types";

/** Fallback meal times when the generator didn't supply one. */
export const DEFAULT_MEAL_TIMES = {
  breakfast: "08:30",
  lunch: "12:30",
  dinner: "18:30",
} as const;

/**
 * Time-of-day words the `balanced` planning style emits instead of clock times.
 * These map to a representative hour so a balanced trip still exports a usable
 * calendar — approximate, but far more useful than a wall of all-day events.
 */
const BUCKET_TIMES: Record<string, string> = {
  "early morning": "07:00",
  morning: "09:00",
  "mid morning": "10:30",
  "late morning": "10:30",
  midday: "12:00",
  noon: "12:00",
  lunchtime: "12:30",
  afternoon: "13:00",
  "early afternoon": "13:00",
  "mid afternoon": "15:00",
  "late afternoon": "16:00",
  sunset: "19:00",
  evening: "18:00",
  "early evening": "17:30",
  night: "20:00",
  nighttime: "20:00",
};

/**
 * Parse a clock string into "HH:MM" 24-hour, or null.
 *
 * Deliberately rejects a bare number ("9"), which is far more likely to be part
 * of prose ("9 people at the beach") than a time.
 */
export function parseClock(input: string): string | null {
  const m = input.trim().match(/^(\d{1,2})(?::(\d{2}))?\s*(a\.?m\.?|p\.?m\.?)?$/i);
  if (!m) return null;

  const hasMinutes = m[2] !== undefined;
  const meridiem = m[3]?.toLowerCase().replace(/\./g, "");
  if (!hasMinutes && !meridiem) return null;

  let hour = Number(m[1]);
  const minute = hasMinutes ? Number(m[2]) : 0;
  if (hour > 23 || minute > 59) return null;

  if (meridiem === "pm" && hour < 12) hour += 12;
  if (meridiem === "am" && hour === 12) hour = 0;
  if (hour > 23) return null;

  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

/** Split "<prefix> — <rest>" where the separator is a dash or a colon. */
function splitPrefix(raw: string): { prefix: string; rest: string } | null {
  const m =
    raw.match(/^\s*([^—–]{1,40}?)\s*[—–]\s*(.+)$/) ||
    raw.match(/^\s*(\S[^-]{0,38}?)\s+-\s+(.+)$/) ||
    raw.match(/^\s*([A-Za-z][A-Za-z ]{0,19}?)\s*:\s*(.+)$/);
  if (!m) return null;
  const prefix = m[1].trim();
  const rest = m[2].trim();
  if (!prefix || !rest) return null;
  return { prefix, rest };
}

/** Interpret a leading prefix as a clock time, time range, or time-of-day word. */
function parseTimePrefix(prefix: string): { startTime?: string; endTime?: string } | null {
  const range = prefix.match(/^(.+?)\s*(?:–|—|-|\bto\b|\buntil\b)\s*(.+)$/i);
  if (range) {
    const start = parseClock(range[1]);
    const end = parseClock(range[2]);
    if (start && end) return { startTime: start, endTime: end };
  }

  const single = parseClock(prefix);
  if (single) return { startTime: single };

  const word = prefix.toLowerCase().replace(/[^a-z ]/g, " ").replace(/\s+/g, " ").trim();
  if (BUCKET_TIMES[word]) return { startTime: BUCKET_TIMES[word] };

  return null;
}

function capitalize(s: string): string {
  return s.length ? s[0].toUpperCase() + s.slice(1) : s;
}

/** One clock token, e.g. "10:30am" / "14:00" / "9 PM". */
const CLOCK = String.raw`\d{1,2}(?::\d{2})?\s*(?:a\.?m\.?|p\.?m\.?)?`;

/**
 * "10:30am–12:30pm — Guided excursion" in one shot.
 *
 * Must be tried before the generic prefix split, otherwise the en-dash *inside*
 * the range is mistaken for the title separator and the end time leaks into
 * the title.
 */
const RANGE_PREFIX_RE = new RegExp(
  String.raw`^\s*(${CLOCK})\s*(?:–|—|-|\bto\b|\buntil\b)\s*(${CLOCK})\s*[—–:-]\s*(.+)$`,
  "i",
);

/** Upgrade one activity — object passes through, string gets its time parsed out. */
export function normalizeActivity(raw: RawActivity): ItineraryActivity {
  if (typeof raw !== "string") {
    return { ...raw, title: raw.title?.trim() ?? "" };
  }

  const text = raw.trim();

  const range = text.match(RANGE_PREFIX_RE);
  if (range) {
    const start = parseClock(range[1]);
    const end = parseClock(range[2]);
    if (start && end) {
      return { title: capitalize(range[3].trim()), startTime: start, endTime: end };
    }
  }

  const split = splitPrefix(text);
  if (split) {
    const times = parseTimePrefix(split.prefix);
    if (times) {
      return { title: capitalize(split.rest), ...times };
    }
  }

  // No recognizable time — an untimed suggestion, which becomes an all-day event.
  return { title: text };
}

function normalizeMeal(meal: Meal | undefined, slot: keyof typeof DEFAULT_MEAL_TIMES): NormalizedMeal {
  const base: Meal = meal ?? { type: "eat-out", name: "—" };
  return {
    ...base,
    time: (base.time && parseClock(base.time)) || DEFAULT_MEAL_TIMES[slot],
  };
}

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Add whole days to a YYYY-MM-DD date. UTC math avoids DST shifting the date. */
function addDays(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/**
 * Resolve a real calendar date for a day.
 *
 * The schema asks for YYYY-MM-DD, but generators do emit things like "Jun 14",
 * and the bundled sample trips use that form. Fall back to counting forward
 * from the trip start; if that is not ISO either, give up rather than emit a
 * malformed date — a wrong date on someone's calendar is worse than none.
 */
function resolveIsoDate(
  day: GeneratedTrip["itinerary"][number],
  tripStart?: string,
): string | undefined {
  if (typeof day.date === "string" && ISO_DATE_RE.test(day.date)) return day.date;
  if (tripStart && ISO_DATE_RE.test(tripStart) && Number.isFinite(day.day)) {
    return addDays(tripStart, Math.max(0, day.day - 1));
  }
  return undefined;
}

export function normalizeDay(
  day: GeneratedTrip["itinerary"][number],
  tripStart?: string,
): NormalizedItineraryDay {
  return {
    ...day,
    isoDate: resolveIsoDate(day, tripStart),
    activities: (day.activities ?? []).map(normalizeActivity).filter((a) => a.title.length > 0),
    meals: {
      breakfast: normalizeMeal(day.meals?.breakfast, "breakfast"),
      lunch: normalizeMeal(day.meals?.lunch, "lunch"),
      dinner: normalizeMeal(day.meals?.dinner, "dinner"),
    },
  };
}

/**
 * Normalize a whole trip. Cheap and pure — call it at the read boundary
 * (page load / API response) so no component ever sees a raw activity.
 */
export function normalizeTrip(trip: GeneratedTrip): NormalizedTrip {
  const tripStart = trip.meta?.dates?.start;
  return {
    ...trip,
    itinerary: (trip.itinerary ?? []).map((day) => normalizeDay(day, tripStart)),
  };
}

/** Human-readable "9:00 AM" for display. Returns "" for undefined. */
export function formatClock(hhmm: string | undefined): string {
  if (!hhmm) return "";
  const m = hhmm.match(/^(\d{2}):(\d{2})$/);
  if (!m) return "";
  const hour = Number(m[1]);
  const minute = m[2];
  const meridiem = hour < 12 ? "AM" : "PM";
  const display = hour % 12 === 0 ? 12 : hour % 12;
  return `${display}:${minute} ${meridiem}`;
}
