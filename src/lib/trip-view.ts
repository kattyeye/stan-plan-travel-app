import type {
  Activity,
  GeneratedTrip,
  ItineraryDay,
  Meal,
  PlanningStyle,
  Recipe,
  Restaurant,
  TripMeta,
  Verification,
} from "@/types/trip";
import { WEEKDAYS } from "./pipeline/days";
import { parseClock } from "./places";

/**
 * Pure view logic for the trip page: turns a stored plan into the timeline,
 * map stops, phase ("12 days to go") and explanations the UI shows. Everything
 * here is derived in code from stored facts — nothing is model-written.
 */

export type Slot = "breakfast" | "lunch" | "dinner";
export const SLOTS: readonly Slot[] = ["breakfast", "lunch", "dinner"];

export type Bucket = "morning" | "midday" | "afternoon" | "evening" | "anytime";
export const BUCKET_LABEL: Record<Bucket, string> = {
  morning: "Morning",
  midday: "Midday",
  afternoon: "Afternoon",
  evening: "Evening",
  anytime: "Any time",
};

// ─── Schedule lines ──────────────────────────────────────────────────────────

const TIME_PREFIX =
  /^\s*((?:\d{1,2}(?::\d{2})?\s*(?:am|pm|a\.m\.|p\.m\.)?)|noon|morning|midday|afternoon|evening|late night|night)\s*[—–-]\s*/i;

const BUCKET_WORDS: Record<string, Bucket> = {
  morning: "morning",
  breakfast: "morning",
  midday: "midday",
  noon: "midday",
  lunch: "midday",
  afternoon: "afternoon",
  evening: "evening",
  dinner: "evening",
  night: "evening",
  "late night": "evening",
};
const BUCKET_MINUTE: Record<Bucket, number> = { morning: 540, midday: 750, afternoon: 900, evening: 1140, anytime: 0 };
const SLOT_MINUTE: Record<Slot, number> = { breakfast: 480, lunch: 750, dinner: 1140 };

export function bucketForMinute(minute: number): Bucket {
  if (minute < 11 * 60) return "morning";
  if (minute < 14 * 60) return "midday";
  if (minute < 17 * 60 + 30) return "afternoon";
  return "evening";
}

export interface ParsedTime {
  /** As written: "9:00am", "Morning". */
  label?: string;
  /** Minutes since midnight when a clock time was given. */
  minute?: number;
  bucket?: Bucket;
}

/** Reads a meal or schedule time: "7:30pm", "19:00", "Evening", null. */
export function parseTimeLabel(raw: string | null | undefined): ParsedTime {
  const label = raw?.trim();
  if (!label) return {};
  const word = BUCKET_WORDS[label.toLowerCase()];
  if (word) return { label, bucket: word };
  if (/^\d/.test(label) || /^noon/i.test(label)) {
    const clock = parseClock(label);
    if (clock) {
      const minute = clock.hour * 60 + clock.minute;
      return { label, minute, bucket: bucketForMinute(minute) };
    }
  }
  return { label };
}

/** "9:00am — Kayak at Kitty Hawk" → { time: "9:00am", text: "Kayak at Kitty Hawk" }. */
export function parseScheduleLine(line: string): ParsedTime & { text: string } {
  const m = line.match(TIME_PREFIX);
  if (!m) return { text: line.trim() };
  return { ...parseTimeLabel(m[1]), text: line.slice(m[0].length).trim() };
}

// ─── Places ──────────────────────────────────────────────────────────────────

export interface PlaceRef {
  kind: "restaurant" | "activity";
  id?: string;
  name: string;
  address?: string;
  verification?: Verification;
  priceRange?: string;
  rating?: string;
  bookingRequired?: boolean;
  kidFriendly?: boolean;
  sourceUrl?: string;
  link?: string;
  tags: string[];
}

export const normalizeName = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[’'`]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

/** True when `name` appears in `text` as whole words (names under 4 chars never match). */
export function mentions(text: string, name: string | undefined): boolean {
  if (!name) return false;
  const n = normalizeName(name);
  if (n.length < 4) return false;
  return ` ${normalizeName(text)} `.includes(` ${n} `);
}

export function restaurantPlace(r: Restaurant): PlaceRef {
  return {
    kind: "restaurant",
    id: r.id,
    name: r.name,
    address: r.address || r.verification?.address,
    verification: r.verification,
    priceRange: r.priceRange,
    rating: r.rating,
    sourceUrl: r.sourceUrl,
    link: r.link,
    tags: r.tags ?? [],
  };
}

export function activityPlace(a: Activity): PlaceRef {
  return {
    kind: "activity",
    id: a.id,
    name: a.name,
    address: a.address || a.verification?.address,
    verification: a.verification,
    bookingRequired: a.bookingRequired,
    kidFriendly: a.kidFriendly,
    sourceUrl: a.sourceUrl,
    link: a.link,
    tags: a.tags ?? [],
  };
}

/** The longest-named researched activity a schedule line mentions. */
export function matchActivity(text: string, activities: Activity[]): Activity | undefined {
  let best: Activity | undefined;
  for (const a of activities) {
    if (mentions(text, a.name) && (!best || a.name.length > best.name.length)) best = a;
  }
  return best;
}

/** The venue behind a meal: the referenced restaurant, or a legacy embedded one. */
export function mealVenue(meal: Meal, restaurants: Map<string, Restaurant>): Restaurant | undefined {
  return (meal.restaurantId ? restaurants.get(meal.restaurantId) : undefined) ?? meal.restaurant;
}

/** A short name to look for in schedule lines: venue name, recipe name, or "… at X" in the meal name. */
function mealHints(meal: Meal, venue: Restaurant | undefined, recipe: Recipe | undefined): string[] {
  const hints: string[] = [];
  if (venue) hints.push(venue.name);
  if (recipe) hints.push(recipe.name.replace(/\s*\(.*?\)\s*/g, " ").trim());
  const at = meal.name.match(/\bat\s+(?:the\s+)?([^,—–-]+)/i)?.[1]?.trim();
  if (at && !/^(the )?(house|villa|home|cabin|condo|rental|airbnb|place)$/i.test(at)) hints.push(at);
  if (!venue && !recipe) hints.push(meal.name);
  return [...new Set(hints.flatMap(nameVariants))];
}

const GENERIC_VENUE_WORDS = /\b(restaurant|restaurante|ristorante|taverna|tavern|cafe|café|bar|bistro|kitchen|grill|eatery|the)\b/gi;

/**
 * A name plus its everyday short form, longest first — schedules often write
 * "Dinner at Lauda" for "Lauda Restaurant".
 */
export function nameVariants(name: string): string[] {
  const short = name.replace(GENERIC_VENUE_WORDS, " ").replace(/\s+/g, " ").trim();
  return short !== name && normalizeName(short).length >= 4 ? [name, short] : [name];
}

// ─── Timeline ────────────────────────────────────────────────────────────────

export interface TimelineStop {
  /** Stable id: `d{day}-s{i}` for schedule lines, `d{day}-{slot}` for meals not in the schedule. */
  key: string;
  kind: "activity" | "meal";
  time?: string;
  /** Minutes since midnight when a clock time is known. */
  minute?: number;
  bucket: Bucket;
  /** Sort position (minutes); estimated when no clock time is given. */
  order: number;
  text: string;
  slot?: Slot;
  meal?: Meal;
  recipe?: Recipe;
  place?: PlaceRef;
  alternatives: Restaurant[];
  /** Map marker letter (A, B, …) matching Google's directions embed. */
  letter?: string;
  warnings: string[];
  hidden?: boolean;
  done?: boolean;
}

export interface TimelineOptions {
  hidden?: ReadonlySet<string>;
  done?: ReadonlySet<string>;
}

const MAX_MAP_STOPS = 22; // origin + destination + 20 waypoints

export function buildDayTimeline(day: ItineraryDay, trip: GeneratedTrip, opts: TimelineOptions = {}): TimelineStop[] {
  const restaurants = new Map(trip.restaurants.map((r) => [r.id, r]));
  const recipes = new Map(trip.recipes.map((r) => [r.id, r]));
  const activities = trip.tips?.activities ?? [];

  const stops: (TimelineStop & { seq: number; tie: number })[] = day.activities.map((line, i) => {
    const p = parseScheduleLine(line);
    const activity = matchActivity(p.text, activities);
    const restaurant = activity ? undefined : trip.restaurants.find((r) => mentions(p.text, r.name));
    return {
      key: `d${day.day}-s${i}`,
      kind: "activity",
      time: p.label,
      minute: p.minute,
      bucket: p.bucket ?? "anytime",
      order: 0,
      text: p.text,
      place: activity ? activityPlace(activity) : restaurant ? restaurantPlace(restaurant) : undefined,
      alternatives: [],
      warnings: [],
      seq: i,
      tie: 0,
    };
  });

  // Estimated order for lines without a clock time: their time-of-day bucket,
  // else the previous line's position, so the model's sequence is preserved.
  let prev = 420;
  for (const s of stops) {
    s.order = s.minute ?? (s.bucket !== "anytime" ? BUCKET_MINUTE[s.bucket] : prev);
    prev = s.order;
  }

  const claimed = new Set<number>();
  SLOTS.forEach((slot, si) => {
    const meal = day.meals?.[slot];
    if (!meal) return;
    const venue = mealVenue(meal, restaurants);
    const recipe = meal.recipeId ? recipes.get(meal.recipeId) : undefined;
    const alternatives = (meal.alternativeIds ?? []).map((id) => restaurants.get(id)).filter((r): r is Restaurant => !!r);
    const mt = parseTimeLabel(meal.time);
    const fields = {
      kind: "meal" as const,
      slot,
      meal,
      recipe,
      place: venue ? restaurantPlace(venue) : undefined,
      alternatives,
      warnings: meal.warnings ?? [],
    };

    // A schedule line that already describes this meal ("9pm — Dinner at Lauda") carries it.
    const hints = mealHints(meal, venue, recipe);
    const idx = stops.findIndex((s, i) => !claimed.has(i) && s.kind === "activity" && hints.some((h) => mentions(s.text, h)));
    if (idx >= 0) {
      claimed.add(idx);
      const s = stops[idx];
      Object.assign(s, fields, { place: fields.place ?? s.place, time: s.time ?? mt.label, minute: s.minute ?? mt.minute });
      if (s.bucket === "anytime") s.bucket = mt.bucket ?? "anytime";
      return;
    }
    const order = mt.minute ?? (mt.bucket ? BUCKET_MINUTE[mt.bucket] : SLOT_MINUTE[slot]);
    stops.push({
      ...fields,
      key: `d${day.day}-${slot}`,
      time: mt.label,
      minute: mt.minute,
      bucket: mt.bucket ?? bucketForMinute(SLOT_MINUTE[slot]),
      order,
      text: recipe?.name ?? meal.name,
      seq: 1000 + si,
      tie: slot === "breakfast" ? -1 : 1,
    });
  });

  stops.sort((a, b) => a.order - b.order || a.tie - b.tie || a.seq - b.seq);

  let letter = 0;
  return stops.map((s) => {
    const out: TimelineStop & { seq?: number; tie?: number } = { ...s };
    delete out.seq;
    delete out.tie;
    if (s.bucket === "anytime" && s.order > 0) out.bucket = bucketForMinute(s.order);
    if (opts.hidden?.has(s.key)) out.hidden = true;
    if (opts.done?.has(s.key)) out.done = true;
    if (s.place && !out.hidden && letter < MAX_MAP_STOPS) out.letter = String.fromCharCode(65 + letter++);
    return out;
  });
}

/** Every stop key a day can have — used to validate edits. */
export function stopKeys(day: ItineraryDay, trip: GeneratedTrip): string[] {
  return buildDayTimeline(day, trip).map((s) => s.key);
}

// ─── Maps ────────────────────────────────────────────────────────────────────

const placeQuery = (p: PlaceRef, destination: string) => [p.name, p.address || destination].filter(Boolean).join(", ");
const embedLocation = (p: PlaceRef, destination: string) =>
  p.verification?.placeId ? `place_id:${p.verification.placeId}` : placeQuery(p, destination);

/** The map link for one place: Google's own listing when verified, else a search. */
export function placeMapsUrl(p: PlaceRef, destination: string): string {
  if (p.verification?.mapsUrl) return p.verification.mapsUrl;
  const params = new URLSearchParams({ api: "1", query: placeQuery(p, destination) });
  if (p.verification?.placeId) params.set("query_place_id", p.verification.placeId);
  return `https://www.google.com/maps/search/?${params}`;
}

/**
 * Google Maps directions deep link (no key; opens the app on phones). With a
 * single stop it navigates there from the traveller's current location.
 */
export function mapsDirectionsUrl(places: PlaceRef[], destination: string): string | undefined {
  if (places.length === 0) return undefined;
  const params = new URLSearchParams({ api: "1" });
  const last = places[places.length - 1];
  params.set("destination", placeQuery(last, destination));
  if (last.verification?.placeId) params.set("destination_place_id", last.verification.placeId);
  if (places.length > 1) {
    const first = places[0];
    params.set("origin", placeQuery(first, destination));
    if (first.verification?.placeId) params.set("origin_place_id", first.verification.placeId);
    const mid = places.slice(1, -1).slice(0, 9); // Maps URLs allow 9 waypoints on mobile
    if (mid.length) {
      params.set("waypoints", mid.map((p) => placeQuery(p, destination)).join("|"));
      // Place ids must line up one-to-one with waypoints, so only send them when all are known.
      if (mid.every((p) => p.verification?.placeId)) params.set("waypoint_place_ids", mid.map((p) => p.verification!.placeId).join("|"));
    }
  }
  return `https://www.google.com/maps/dir/?${params}`;
}

/** Maps Embed API URL (free, unlimited): a route for 2+ stops, a pin for one, the area otherwise. */
export function mapsEmbedUrl(places: PlaceRef[], key: string, destination: string): string {
  const base = "https://www.google.com/maps/embed/v1";
  if (places.length >= 2) {
    const params = new URLSearchParams({
      key,
      origin: embedLocation(places[0], destination),
      destination: embedLocation(places[places.length - 1], destination),
    });
    const mid = places.slice(1, -1).slice(0, 20);
    if (mid.length) params.set("waypoints", mid.map((p) => embedLocation(p, destination)).join("|"));
    return `${base}/directions?${params}`;
  }
  const q = places.length === 1 ? embedLocation(places[0], destination) : destination;
  return `${base}/place?${new URLSearchParams({ key, q })}`;
}

// ─── Dates & phase ───────────────────────────────────────────────────────────

const ISO = /^\d{4}-\d{2}-\d{2}$/;
const dayNumber = (iso: string) => Math.round(Date.parse(`${iso}T12:00:00Z`) / 86_400_000);

/** The viewer's local calendar date as YYYY-MM-DD. */
export function localISODate(now: Date): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export type TripPhase =
  | { phase: "before"; daysToGo: number }
  | { phase: "during"; day: number; of: number }
  | { phase: "after" };

/** Where the traveller is relative to the trip, or null when dates don't parse (legacy samples). */
export function tripPhase(dates: TripMeta["dates"], today: string): TripPhase | null {
  if (!ISO.test(dates.start) || !ISO.test(today)) return null;
  const start = dayNumber(dates.start);
  const end = ISO.test(dates.end) ? dayNumber(dates.end) : start + dates.nights;
  const t = dayNumber(today);
  if (t < start) return { phase: "before", daysToGo: start - t };
  if (t > end) return { phase: "after" };
  return { phase: "during", day: t - start + 1, of: end - start + 1 };
}

export function phaseLabel(p: TripPhase | null): string | null {
  if (!p) return null;
  if (p.phase === "before") return p.daysToGo === 1 ? "Tomorrow!" : `${p.daysToGo} days to go`;
  if (p.phase === "during") return `Day ${p.day} of ${p.of} · today`;
  return "Hope it was irie";
}

/** "Friday" for a day — stored weekday first, else computed from an ISO date. */
export function dayWeekday(day: Pick<ItineraryDay, "date" | "weekday">): string | undefined {
  if (day.weekday) return day.weekday;
  if (!ISO.test(day.date)) return undefined;
  return WEEKDAYS[new Date(`${day.date}T12:00:00Z`).getUTCDay()];
}

/** "Fri" and "14" for the day picker; falls back to the raw date string. */
export function dayChip(day: Pick<ItineraryDay, "date" | "weekday">): { weekday: string; date: string } {
  if (!ISO.test(day.date)) return { weekday: "", date: day.date };
  const d = new Date(`${day.date}T12:00:00Z`);
  return {
    weekday: d.toLocaleDateString("en-US", { weekday: "short", timeZone: "UTC" }),
    date: d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" }),
  };
}

/** Google's line for one weekday ("Friday: 11 AM – 9 PM") without the day name. */
export function hoursForWeekday(hours: string[] | undefined, weekday: string | undefined): string | undefined {
  if (!hours?.length || !weekday) return undefined;
  const line = hours.find((h) => h.toLowerCase().startsWith(weekday.toLowerCase()));
  return line?.slice(line.indexOf(":") + 1).trim() || undefined;
}

/** The stop happening now and the next one, by the viewer's clock. */
export function upNext(stops: TimelineStop[], minuteNow: number): { current?: TimelineStop; next?: TimelineStop; past: Set<string> } {
  const visible = stops.filter((s) => !s.hidden && s.order > 0);
  const past = new Set<string>();
  let current: TimelineStop | undefined;
  let next: TimelineStop | undefined;
  for (let i = 0; i < visible.length; i++) {
    const s = visible[i];
    const following = visible[i + 1];
    if (s.order <= minuteNow) {
      if (following && following.order <= minuteNow) past.add(s.key);
      else current = s;
    } else if (!next) {
      next = s;
    }
  }
  return { current, next, past };
}

// ─── Cross-references ────────────────────────────────────────────────────────

export interface MealUse {
  day: number;
  slot: Slot;
  primary: boolean;
}

/** Where each restaurant appears in the itinerary (primary pick or alternative). */
export function restaurantUsage(trip: GeneratedTrip): Map<string, MealUse[]> {
  const out = new Map<string, MealUse[]>();
  const add = (id: string, use: MealUse) => out.set(id, [...(out.get(id) ?? []), use]);
  for (const d of trip.itinerary) {
    for (const slot of SLOTS) {
      const m = d.meals?.[slot];
      if (!m) continue;
      if (m.restaurantId) add(m.restaurantId, { day: d.day, slot, primary: true });
      for (const id of m.alternativeIds ?? []) add(id, { day: d.day, slot, primary: false });
    }
  }
  return out;
}

/** Days on which each activity (by id, else name) is in the schedule. */
export function activityUsage(trip: GeneratedTrip): Map<string, number[]> {
  const out = new Map<string, number[]>();
  for (const a of trip.tips?.activities ?? []) {
    const days = trip.itinerary.filter((d) => d.activities.some((line) => mentions(line, a.name))).map((d) => d.day);
    if (days.length) out.set(a.id ?? a.name, days);
  }
  return out;
}

export const activityKey = (a: Activity) => a.id ?? a.name;

// ─── Explanations ────────────────────────────────────────────────────────────

export type ReasonSource = "google" | "web" | "you" | "checks" | "ai";
export interface Reason {
  source: ReasonSource;
  text: string;
  href?: string;
}

const fmtDate = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

/**
 * "Why this?" — every line is built from stored facts and says where it came
 * from, so travellers can tell Google's data, their own answers, Irie's code
 * checks and the AI's choices apart.
 */
export function explainStop(stop: TimelineStop, day: ItineraryDay, trip: GeneratedTrip): Reason[] {
  const out: Reason[] = [];
  const p = stop.place;
  const v = p?.verification;
  const weekday = dayWeekday(day);
  const prefs = trip.preferences;

  if (stop.recipe) {
    out.push({ source: "ai", text: `Irie's planner picked this home-cooked ${stop.slot ?? "meal"} for day ${day.day}.` });
    out.push({ source: "checks", text: `Scaled in code to ${stop.recipe.servings} servings for your group of ${trip.meta.group.totalPeople}.` });
    const notes = stop.recipe.dietaryNotes ?? [];
    if (prefs?.dietaryRestrictions?.length) {
      out.push({
        source: "checks",
        text: notes.length ? `Checked for ${prefs.dietaryRestrictions.join(", ")}: ${notes.join("; ")}` : `Checked against ${prefs.dietaryRestrictions.join(", ")}.`,
      });
    }
  } else if (p) {
    out.push({ source: "ai", text: `Irie's planner chose ${p.name} from places found in live web research — never invented.` });
  } else {
    out.push({ source: "ai", text: "A suggestion from Irie's planner for this part of the day." });
  }

  if (v?.status === "verified") {
    out.push({ source: "google", text: `Confirmed open on Google Maps${v.checkedAt ? ` · checked ${fmtDate(v.checkedAt)}` : ""}.`, href: v.mapsUrl });
    const today = hoursForWeekday(v.hours, weekday);
    if (today) out.push({ source: "google", text: `${weekday} hours: ${today}.` });
    if (stop.kind === "meal" && v.hours?.length && !stop.warnings.length) {
      out.push({ source: "checks", text: "This meal's day and time were checked against those hours." });
    }
    if (v.rating) out.push({ source: "google", text: `Rated ${v.rating.toFixed(1)} on Google${v.reviewCount ? ` from ${v.reviewCount.toLocaleString()} reviews` : ""}.` });
  } else if (v?.status === "web-sourced") {
    out.push({ source: "web", text: "Found in current web sources, but not confirmed on Google Maps — worth a quick check.", href: p?.sourceUrl });
  } else if (v?.status === "unverified") {
    out.push({ source: "checks", text: "We couldn't confirm current hours. Call ahead before you go." });
  }

  if (p?.sourceUrl && v?.status === "verified") out.push({ source: "web", text: "Where our research found it.", href: p.sourceUrl });

  const note = stop.meal?.note;
  if (note && /so we picked .+ instead/i.test(note)) out.push({ source: "checks", text: `Swapped in automatically: ${note}` });

  if (p?.priceRange && prefs?.budget) out.push({ source: "you", text: `${p.priceRange} — you chose a ${prefs.budget} budget.` });
  if (p?.kidFriendly && trip.meta.group.kids > 0) {
    out.push({ source: "you", text: `Kid-friendly — you're travelling with ${trip.meta.group.kids} ${trip.meta.group.kids === 1 ? "kid" : "kids"}.` });
  }
  if (p?.bookingRequired) out.push({ source: "web", text: "Our research says to book ahead." });
  if (day.vibe?.length) out.push({ source: "ai", text: `Fits the day's vibe: ${day.vibe.join(", ")}.` });
  if (stop.alternatives.length) {
    out.push({ source: "checks", text: `${stop.alternatives.length} backup ${stop.alternatives.length === 1 ? "option was" : "options were"} researched for this slot.` });
  }
  for (const w of stop.warnings) out.push({ source: "checks", text: w });
  return out;
}

// ─── Hash routing ────────────────────────────────────────────────────────────

export const TAB_IDS = ["overview", "days", "food", "explore", "lists"] as const;
export type TabId = (typeof TAB_IDS)[number];
export type FoodView = "plan" | "eat";
export type ListsView = "packing" | "groceries";

export interface HashState {
  tab: TabId;
  day?: number;
  food?: FoodView;
  lists?: ListsView;
}

/** Reads `#days-3`, `#lists-groceries` and the old six-tab hashes (`#grocery`, `#itinerary`, …). */
export function parseHash(hash: string): HashState | null {
  const h = hash.replace(/^#/, "").toLowerCase();
  if (!h) return null;
  const legacy: Record<string, HashState> = {
    itinerary: { tab: "days" },
    meals: { tab: "food", food: "plan" },
    restaurants: { tab: "food", food: "eat" },
    tips: { tab: "explore" },
    grocery: { tab: "lists", lists: "groceries" },
    packing: { tab: "lists", lists: "packing" },
  };
  if (legacy[h]) return legacy[h];
  const [tab, sub] = h.split("-", 2);
  if (!(TAB_IDS as readonly string[]).includes(tab)) return null;
  const state: HashState = { tab: tab as TabId };
  if (tab === "days" && sub && /^\d+$/.test(sub)) state.day = parseInt(sub, 10);
  if (tab === "food" && (sub === "plan" || sub === "eat")) state.food = sub;
  if (tab === "lists" && (sub === "packing" || sub === "groceries")) state.lists = sub;
  return state;
}

export const STYLE_INFO: Record<PlanningStyle, { badge: string; explain: string }> = {
  structured: { badge: "Minute-by-minute", explain: "Exact times and one assigned place for every meal." },
  balanced: { badge: "Balanced", explain: "Time-of-day blocks, with one backup for each meal out." },
  flexible: { badge: "Go with the flow", explain: "Ideas and moods instead of times, with 2–3 options for each meal." },
};
