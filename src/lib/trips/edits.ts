import type { EditOp, GeneratedTrip, ItineraryDay, MealType, ReportReason, Restaurant, TripEdits } from "@/types/trip";
import { WEEKDAYS } from "../pipeline/days";
import { buildDayTimeline, mealVenue, nameVariants } from "../trip-view";

/**
 * Group edits on a ready plan: swap a meal to another researched place, skip
 * or tick off a stop, report a problem. The generated plan is never rewritten;
 * edits are stored beside it and applied on read, so "Reset" is always exact.
 *
 * Shared by the website (/api/trip/[slug]/edits) and anything else that shows
 * a plan (download, client API). Pure: no I/O.
 */

const MAX_KEYS = 300;
const MAX_REPORTS = 50;
const MAX_LOG = 50;
const MAX_NOTE = 280;
const REASONS: readonly ReportReason[] = ["closed", "wrong_hours", "not_a_fit", "other"];
const SLOTS: readonly MealType[] = ["breakfast", "lunch", "dinner"];

export const emptyEdits = (now = new Date().toISOString()): TripEdits => ({
  version: 0,
  mealSwaps: {},
  hidden: [],
  done: [],
  reports: [],
  log: [],
  updatedAt: now,
});

export const swapKey = (day: number, slot: MealType) => `${day}:${slot}`;

const weekdayIndex = (day: ItineraryDay): number | undefined => {
  if (day.weekday) {
    const i = WEEKDAYS.indexOf(day.weekday as (typeof WEEKDAYS)[number]);
    if (i >= 0) return i;
  }
  return /^\d{4}-\d{2}-\d{2}$/.test(day.date) ? new Date(`${day.date}T12:00:00Z`).getUTCDay() : undefined;
};

/**
 * Places the group may switch a meal to: the original pick, its researched
 * alternatives, then any researched place that serves that meal and isn't
 * known to be closed that weekday. Never a free-text venue.
 */
export function swapOptions(trip: GeneratedTrip, dayNumber: number, slot: MealType): Restaurant[] {
  const day = trip.itinerary.find((d) => d.day === dayNumber);
  const meal = day?.meals?.[slot];
  if (!day || !meal || meal.type !== "eat-out") return [];
  const byId = new Map(trip.restaurants.map((r) => [r.id, r]));
  const wd = weekdayIndex(day);
  const openThatDay = (r: Restaurant) =>
    r.verification?.status !== "closed" && (wd === undefined || !r.verification?.openDays || r.verification.openDays.includes(wd));
  const ordered = [meal.restaurantId, ...(meal.alternativeIds ?? [])]
    .map((id) => (id ? byId.get(id) : undefined))
    .filter((r): r is Restaurant => !!r);
  for (const r of trip.restaurants) if (r.bestFor?.includes(slot)) ordered.push(r);
  const seen = new Set<string>();
  return ordered.filter((r) => {
    if (seen.has(r.id) || !openThatDay(r)) return false;
    seen.add(r.id);
    return true;
  });
}

export type EditResult = { ok: true; edits: TripEdits; summary: string } | { ok: false; error: string };

/** Validates one op against the original plan and returns the next edits. */
export function applyEditOp(trip: GeneratedTrip, current: TripEdits | undefined, op: EditOp, now = new Date().toISOString()): EditResult {
  const edits: TripEdits = structuredClone(current ?? emptyEdits(now));
  const fail = (error: string): EditResult => ({ ok: false, error });
  const day = "day" in op && typeof op.day === "number" ? trip.itinerary.find((d) => d.day === op.day) : undefined;
  let summary: string;

  switch (op.type) {
    case "swap_meal": {
      if (!day) return fail("Unknown day.");
      if (!SLOTS.includes(op.slot)) return fail("Unknown meal.");
      const meal = day.meals[op.slot];
      if (meal.type !== "eat-out") return fail("Only meals out can be swapped.");
      const target = swapOptions(trip, op.day, op.slot).find((r) => r.id === op.restaurantId);
      if (!target) return fail("Pick one of the researched places for this meal.");
      const key = swapKey(op.day, op.slot);
      if (target.id === meal.restaurantId) delete edits.mealSwaps[key];
      else edits.mealSwaps[key] = target.id;
      summary = `Day ${op.day} ${op.slot}: ${target.name}`;
      break;
    }
    case "hide_stop":
    case "unhide_stop":
    case "done_stop":
    case "undone_stop": {
      if (!day) return fail("Unknown day.");
      if (!buildDayTimeline(day, trip).some((s) => s.key === op.key)) return fail("Unknown stop.");
      const list = op.type === "hide_stop" || op.type === "unhide_stop" ? "hidden" : "done";
      const add = op.type === "hide_stop" || op.type === "done_stop";
      const set = new Set(edits[list]);
      if (add) set.add(op.key);
      else set.delete(op.key);
      if (set.size > MAX_KEYS) return fail("Too many changes on this trip.");
      edits[list] = [...set];
      summary = `Day ${op.day}: ${add ? (list === "hidden" ? "skipped" : "done") : list === "hidden" ? "un-skipped" : "not done"} a stop`;
      break;
    }
    case "report": {
      if (!REASONS.includes(op.reason)) return fail("Unknown reason.");
      if (op.day !== undefined && !day) return fail("Unknown day.");
      const venue = op.venueId
        ? (trip.restaurants.find((r) => r.id === op.venueId) ?? trip.tips.activities.find((a) => a.id === op.venueId))
        : undefined;
      if (op.venueId && !venue) return fail("Unknown place.");
      const note = typeof op.note === "string" ? op.note.trim().slice(0, MAX_NOTE) : undefined;
      edits.reports = [{ at: now, day: op.day, venueId: op.venueId, venueName: venue?.name, reason: op.reason, note: note || undefined }, ...edits.reports].slice(0, MAX_REPORTS);
      summary = `Reported ${venue?.name ?? "a problem"} (${op.reason.replace("_", " ")})`;
      break;
    }
    case "reset": {
      const reports = edits.reports;
      Object.assign(edits, emptyEdits(now), { version: edits.version, reports });
      summary = "Reset to the original plan";
      break;
    }
    default:
      return fail("Unknown change.");
  }

  edits.version += 1;
  edits.updatedAt = now;
  edits.log = [{ at: now, summary }, ...edits.log].slice(0, MAX_LOG);
  return { ok: true, edits, summary };
}

/** Parses an untrusted request body into an op (shape only; meaning is checked by applyEditOp). */
export function parseEditOp(raw: unknown): EditOp | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const int = (v: unknown) => (typeof v === "number" && Number.isInteger(v) && v > 0 && v < 400 ? v : undefined);
  const str = (v: unknown, max: number) => (typeof v === "string" && v.length > 0 && v.length <= max ? v : undefined);
  switch (o.type) {
    case "swap_meal": {
      const day = int(o.day);
      const slot = SLOTS.find((s) => s === o.slot);
      const restaurantId = str(o.restaurantId, 80);
      return day && slot && restaurantId ? { type: "swap_meal", day, slot, restaurantId } : null;
    }
    case "hide_stop":
    case "unhide_stop":
    case "done_stop":
    case "undone_stop": {
      const day = int(o.day);
      const key = str(o.key, 40);
      return day && key ? { type: o.type, day, key } : null;
    }
    case "report": {
      const reason = REASONS.find((r) => r === o.reason);
      if (!reason) return null;
      return { type: "report", reason, day: int(o.day), venueId: str(o.venueId, 80), note: typeof o.note === "string" ? o.note.slice(0, MAX_NOTE) : undefined };
    }
    case "reset":
      return { type: "reset" };
    default:
      return null;
  }
}

/**
 * The plan the group sees: meal swaps applied (names, schedule lines and
 * alternatives follow the new pick). With `dropHidden`, skipped schedule
 * lines are removed — for the offline download and the client API, which
 * don't render skip controls.
 */
export function withEdits(trip: GeneratedTrip, edits: TripEdits | undefined, opts: { dropHidden?: boolean } = {}): GeneratedTrip {
  if (!edits || (Object.keys(edits.mealSwaps).length === 0 && (!opts.dropHidden || edits.hidden.length === 0))) return trip;
  const out: GeneratedTrip = structuredClone(trip);
  const byId = new Map(out.restaurants.map((r) => [r.id, r]));

  for (const [key, id] of Object.entries(edits.mealSwaps)) {
    const [dayStr, slot] = key.split(":") as [string, MealType];
    const day = out.itinerary.find((d) => d.day === Number(dayStr));
    const meal = day?.meals?.[slot];
    const next = byId.get(id);
    if (!day || !meal || !next || meal.type !== "eat-out") continue;
    const original = mealVenue(meal, byId);
    if (original?.id === next.id) continue;
    meal.restaurantId = next.id;
    meal.restaurant = undefined;
    meal.name = original && meal.name.includes(original.name) ? meal.name.replace(original.name, next.name) : next.name;
    meal.alternativeIds = [original?.id, ...(meal.alternativeIds ?? [])].filter((x): x is string => !!x && x !== next.id).filter((x, i, a) => a.indexOf(x) === i);
    meal.note = original ? `Your group picked ${next.name} instead of ${original.name}.` : `Your group picked ${next.name}.`;
    meal.warnings = undefined;
    if (original) {
      const variants = nameVariants(original.name);
      day.activities = day.activities.map((line) => {
        const hit = variants.find((v) => line.includes(v));
        return hit ? line.split(hit).join(next.name) : line;
      });
    }
  }

  if (opts.dropHidden && edits.hidden.length) {
    const hidden = new Set(edits.hidden);
    for (const day of out.itinerary) {
      day.activities = day.activities.filter((_, i) => !hidden.has(`d${day.day}-s${i}`));
    }
  }
  return out;
}
