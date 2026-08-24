/**
 * Trip → calendar events → iCalendar (.ics).
 *
 * Platform-free and dependency-free. The web serves `toICS()` as a download;
 * a React Native app feeds `buildTripEvents()` straight to `expo-calendar`
 * without a server round trip. Both share this file.
 *
 * ## Why there is no timezone
 * Events are emitted as iCalendar *floating* times — `DTSTART:20260814T090000`
 * with no `Z` and no `TZID`. A floating time means "09:00 wherever you are",
 * which is exactly right for a travel itinerary: 9am kayaking is 9am local to
 * the kayak. Pinning a timezone would require reliably resolving each
 * destination to an IANA zone, which we have no source for — and getting it
 * wrong would silently shift every event.
 */

import { formatClock } from "./normalize";
import type { ItineraryActivity, NormalizedTrip, Restaurant } from "./types";

export interface CalendarEvent {
  /** Stable across regenerations so re-importing updates instead of duplicating. */
  uid: string;
  title: string;
  /** YYYY-MM-DD */
  date: string;
  /** HH:MM. Absent means an all-day event. */
  start?: string;
  end?: string;
  location?: string;
  description?: string;
  url?: string;
}

export interface BuildEventsOptions {
  /** Namespaces UIDs — pass the trip slug. */
  tripId: string;
  /** Include activity events. Default true. */
  activities?: boolean;
  /** Include per-meal events. Default true. */
  meals?: boolean;
  /** Minutes for a timed activity with no end time. Default 90. */
  activityDurationMinutes?: number;
  /** Minutes for a meal. Default 60. */
  mealDurationMinutes?: number;
  /** Linked back to from each event, so a tap opens the full plan. */
  tripUrl?: string;
}

const MEAL_LABELS = { breakfast: "Breakfast", lunch: "Lunch", dinner: "Dinner" } as const;

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

function fromMinutes(total: number): string {
  const clamped = Math.min(total, 23 * 60 + 59);
  const h = Math.floor(clamped / 60);
  const m = clamped % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** End time for an event, defaulting to a duration and never crossing midnight. */
function resolveEnd(start: string, end: string | undefined, durationMinutes: number): string {
  if (end && toMinutes(end) > toMinutes(start)) return end;
  return fromMinutes(toMinutes(start) + durationMinutes);
}

function activityDescription(activity: ItineraryActivity): string | undefined {
  const parts: string[] = [];
  if (activity.notes) parts.push(activity.notes);
  if (activity.bookingRequired) parts.push("Booking required.");
  return parts.length ? parts.join("\n\n") : undefined;
}

function restaurantLocation(restaurant: Restaurant | undefined): string | undefined {
  if (!restaurant) return undefined;
  return restaurant.address ? `${restaurant.name}, ${restaurant.address}` : restaurant.name;
}

/**
 * Turn a normalized trip into calendar events.
 *
 * Timed activities become individual timed events. Untimed activities — the
 * norm for `flexible` trips — are collected into a single all-day event per
 * day, so a loose plan still lands in the calendar as something useful rather
 * than being dropped or exploding into noise.
 */
export function buildTripEvents(trip: NormalizedTrip, options: BuildEventsOptions): CalendarEvent[] {
  const {
    tripId,
    activities: includeActivities = true,
    meals: includeMeals = true,
    activityDurationMinutes = 90,
    mealDurationMinutes = 60,
    tripUrl,
  } = options;

  const events: CalendarEvent[] = [];

  for (const day of trip.itinerary) {
    // Without a real date there is nowhere to put the event. normalizeTrip()
    // already tried the trip start as a fallback.
    const date = day.isoDate;
    if (!date) continue;

    const untimed: ItineraryActivity[] = [];

    if (includeActivities) {
      day.activities.forEach((activity, index) => {
        if (!activity.startTime) {
          untimed.push(activity);
          return;
        }
        events.push({
          uid: `${tripId}-d${day.day}-a${index}`,
          title: activity.title,
          date,
          start: activity.startTime,
          end: resolveEnd(activity.startTime, activity.endTime, activityDurationMinutes),
          location: activity.location,
          description: activityDescription(activity),
          url: tripUrl,
        });
      });

      if (untimed.length > 0) {
        const heading = day.theme ? `Day ${day.day} — ${day.theme}` : `Day ${day.day}`;
        events.push({
          uid: `${tripId}-d${day.day}-ideas`,
          title: `${heading} · ${trip.meta?.destination ?? "Trip"}`,
          date,
          description: untimed.map((a) => `• ${a.title}`).join("\n"),
          url: tripUrl,
        });
      }
    }

    if (includeMeals) {
      for (const slot of ["breakfast", "lunch", "dinner"] as const) {
        const meal = day.meals[slot];
        if (!meal?.name || meal.name === "—") continue;

        const isCookIn = meal.type === "cook-in";
        const recipe = meal.recipeId ? trip.recipes?.find((r) => r.id === meal.recipeId) : undefined;

        const description = isCookIn
          ? [
              recipe ? `Recipe: ${recipe.name}` : undefined,
              recipe ? `Prep ${recipe.prepTime} · Cook ${recipe.cookTime} · Serves ${recipe.servings}` : undefined,
              recipe?.tip,
            ]
              .filter(Boolean)
              .join("\n")
          : [meal.restaurant?.description, meal.restaurant?.hours && `Hours: ${meal.restaurant.hours}`]
              .filter(Boolean)
              .join("\n");

        events.push({
          uid: `${tripId}-d${day.day}-${slot}`,
          title: `${MEAL_LABELS[slot]}: ${meal.name}`,
          date,
          start: meal.time,
          end: resolveEnd(meal.time, undefined, mealDurationMinutes),
          location: isCookIn ? undefined : restaurantLocation(meal.restaurant),
          description: description || undefined,
          url: meal.restaurant?.link ?? tripUrl,
        });
      }
    }
  }

  return events;
}

// ─── iCalendar serialization ─────────────────────────────────────────────────

/** Escape per RFC 5545 §3.3.11. Backslash must be replaced first. */
function escapeText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

/**
 * Fold to 75 octets per line (RFC 5545 §3.1), continuing with a leading space.
 * Counts UTF-8 bytes, not characters, so multi-byte content folds legally.
 */
function foldLine(line: string): string {
  const encoder = new TextEncoder();
  if (encoder.encode(line).length <= 75) return line;

  const out: string[] = [];
  let current = "";
  let currentBytes = 0;
  // Split by code point so a surrogate pair is never severed.
  for (const char of line) {
    const size = encoder.encode(char).length;
    const limit = out.length === 0 ? 75 : 74; // continuation lines carry a leading space
    if (currentBytes + size > limit) {
      out.push(current);
      current = "";
      currentBytes = 0;
    }
    current += char;
    currentBytes += size;
  }
  if (current) out.push(current);
  return out.join("\r\n ");
}

const yyyymmdd = (date: string) => date.replace(/-/g, "");
const hhmmss = (time: string) => `${time.replace(":", "")}00`;

/** Next calendar day — iCalendar all-day DTEND is exclusive. */
function nextDay(date: string): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

function eventLines(event: CalendarEvent, stamp: string): string[] {
  const lines = ["BEGIN:VEVENT", `UID:${event.uid}@irie.trip`, `DTSTAMP:${stamp}`];

  if (event.start) {
    lines.push(`DTSTART:${yyyymmdd(event.date)}T${hhmmss(event.start)}`);
    if (event.end) lines.push(`DTEND:${yyyymmdd(event.date)}T${hhmmss(event.end)}`);
  } else {
    lines.push(`DTSTART;VALUE=DATE:${yyyymmdd(event.date)}`);
    lines.push(`DTEND;VALUE=DATE:${yyyymmdd(nextDay(event.date))}`);
  }

  lines.push(`SUMMARY:${escapeText(event.title)}`);
  if (event.location) lines.push(`LOCATION:${escapeText(event.location)}`);
  if (event.description) lines.push(`DESCRIPTION:${escapeText(event.description)}`);
  if (event.url) lines.push(`URL:${escapeText(event.url)}`);
  lines.push("END:VEVENT");
  return lines;
}

export interface ICSOptions {
  /** Shown as the calendar name by clients that honour X-WR-CALNAME. */
  calendarName?: string;
  /** Overrides DTSTAMP — for deterministic output in tests. */
  now?: Date;
}

export function toICS(events: CalendarEvent[], options: ICSOptions = {}): string {
  const stamp = (options.now ?? new Date()).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Irie//Trip Planner//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
  ];
  if (options.calendarName) {
    lines.push(`X-WR-CALNAME:${escapeText(options.calendarName)}`);
  }
  for (const event of events) lines.push(...eventLines(event, stamp));
  lines.push("END:VCALENDAR");

  return lines.map(foldLine).join("\r\n") + "\r\n";
}

/**
 * "Add to Google Calendar" URL for a single event — the fallback for browsers
 * that mishandle a downloaded .ics.
 */
export function googleCalendarUrl(event: CalendarEvent): string {
  const dates = event.start
    ? `${yyyymmdd(event.date)}T${hhmmss(event.start)}/${yyyymmdd(event.date)}T${hhmmss(event.end ?? event.start)}`
    : `${yyyymmdd(event.date)}/${yyyymmdd(nextDay(event.date))}`;

  const params = new URLSearchParams({ action: "TEMPLATE", text: event.title, dates });
  if (event.description) params.set("details", event.description);
  if (event.location) params.set("location", event.location);
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/** Display helper: "9:00 AM – 10:30 AM", or "All day". */
export function formatEventTime(event: CalendarEvent): string {
  if (!event.start) return "All day";
  return event.end ? `${formatClock(event.start)} – ${formatClock(event.end)}` : formatClock(event.start);
}
