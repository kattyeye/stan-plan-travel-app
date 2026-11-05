import type { GeneratedTrip } from "@/types/trip";
import { activityUsage, activityKey, buildDayTimeline, dayWeekday, normalizeName, restaurantUsage, SLOTS, type Slot } from "./trip-view";
import { aggregateIngredients } from "./utils";

/**
 * The trip page's command bar: a local index over everything in the plan and
 * a natural-language parser for the common cases ("dinner friday", "kid
 * friendly", "what do I need to book"). Anything the parser can't place may
 * be interpreted by a model on the server — but only into a PlanFilter over
 * this index, so results are always the plan's own data.
 */

export const RESULT_KINDS = ["stop", "restaurant", "activity", "recipe", "event", "grocery", "packing"] as const;
export type ResultKind = (typeof RESULT_KINDS)[number];

export const DIETARY = ["vegetarian", "vegan", "gluten-free", "dairy-free", "nut-free", "halal", "kosher", "pescatarian"] as const;

export interface PlanFilter {
  days: number[];
  slots: Slot[];
  kinds: ResultKind[];
  tags: string[];
  kidFriendly?: boolean;
  bookingRequired?: boolean;
  verifiedOnly?: boolean;
  dietary: string[];
  /** Free keywords, all of which must appear. */
  text: string[];
}

export const emptyFilter = (): PlanFilter => ({ days: [], slots: [], kinds: [], tags: [], dietary: [], text: [] });

export interface SearchEntry {
  id: string;
  kind: ResultKind;
  title: string;
  subtitle: string;
  /** Normalised text to match keywords against. */
  hay: string;
  days: number[];
  slots: Slot[];
  /** "day:slot" pairs where a restaurant is the pick, so "dinner friday" doesn't match Friday's lunch spot. */
  pairs?: string[];
  tags: string[];
  kidFriendly?: boolean;
  bookingRequired?: boolean;
  verified?: boolean;
  target: { tab: "days" | "food" | "explore" | "lists"; day?: number; food?: "plan" | "eat"; lists?: "packing" | "groceries"; highlight?: string };
}

const norm = normalizeName;
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function buildSearchIndex(trip: GeneratedTrip): SearchEntry[] {
  const out: SearchEntry[] = [];
  const rUse = restaurantUsage(trip);
  const aUse = activityUsage(trip);
  const stopKeyFor = new Map<string, string>(); // `${day}:${slot}` → stop key

  for (const day of trip.itinerary) {
    for (const stop of buildDayTimeline(day, trip)) {
      if (stop.slot) stopKeyFor.set(`${day.day}:${stop.slot}`, stop.key);
      const p = stop.place;
      out.push({
        id: `stop:${stop.key}`,
        kind: "stop",
        title: p?.name ?? stop.recipe?.name ?? stop.text,
        subtitle: [`Day ${day.day}`, stop.slot ? cap(stop.slot) : null, stop.time].filter(Boolean).join(" · "),
        hay: norm([stop.text, p?.name, stop.recipe?.name, ...(p?.tags ?? []), ...(stop.recipe?.tags ?? []), ...(stop.recipe?.dietaryNotes ?? []), stop.meal?.type === "cook-in" ? "cook home house" : ""].join(" ")),
        days: [day.day],
        slots: stop.slot ? [stop.slot] : [],
        tags: (p?.tags ?? []).map(norm),
        kidFriendly: p?.kidFriendly,
        bookingRequired: p?.bookingRequired,
        verified: p?.verification?.status === "verified",
        target: { tab: "days", day: day.day, highlight: stop.key },
      });
    }
  }

  for (const r of trip.restaurants) {
    const uses = rUse.get(r.id) ?? [];
    const primary = uses.filter((u) => u.primary);
    out.push({
      id: `restaurant:${r.id}`,
      kind: "restaurant",
      title: r.name,
      subtitle: [r.priceRange, primary.length ? `On day ${primary.map((u) => u.day).join(", ")}` : "Restaurant guide"].filter(Boolean).join(" · "),
      hay: norm([r.name, r.description, r.address, ...r.tags, ...(r.bestFor ?? [])].join(" ")),
      days: primary.map((u) => u.day),
      slots: (r.bestFor ?? []).filter((b): b is Slot => (SLOTS as readonly string[]).includes(b)),
      pairs: primary.map((u) => `${u.day}:${u.slot}`),
      tags: [...r.tags, ...(r.bestFor ?? [])].map(norm),
      verified: r.verification?.status === "verified",
      target: primary[0]
        ? { tab: "days", day: primary[0].day, highlight: stopKeyFor.get(`${primary[0].day}:${primary[0].slot}`) }
        : { tab: "food", food: "eat" },
    });
  }

  for (const a of trip.tips?.activities ?? []) {
    const days = aUse.get(activityKey(a)) ?? [];
    out.push({
      id: `activity:${activityKey(a)}`,
      kind: "activity",
      title: a.name,
      subtitle: [a.duration, a.cost, days.length ? `On day ${days.join(", ")}` : "Things to do"].filter(Boolean).join(" · "),
      hay: norm([a.name, a.description, ...a.tags, a.kidFriendly ? "kids family" : ""].join(" ")),
      days,
      slots: [],
      tags: a.tags.map(norm),
      kidFriendly: a.kidFriendly,
      bookingRequired: a.bookingRequired,
      verified: a.verification?.status === "verified",
      target: days[0] ? { tab: "days", day: days[0] } : { tab: "explore" },
    });
  }

  for (const r of trip.recipes) {
    const slot = (SLOTS as readonly string[]).includes(r.mealType) ? (r.mealType as Slot) : undefined;
    out.push({
      id: `recipe:${r.id}`,
      kind: "recipe",
      title: r.name,
      subtitle: [`Day ${r.day}`, cap(r.mealType), `serves ${r.servings}`].join(" · "),
      hay: norm([r.name, ...r.tags, ...(r.dietaryNotes ?? []), ...r.ingredients.map((i) => i.item), "recipe cook"].join(" ")),
      days: [r.day],
      slots: slot ? [slot] : [],
      tags: r.tags.map(norm),
      target: { tab: "days", day: r.day, highlight: slot ? stopKeyFor.get(`${r.day}:${slot}`) : undefined },
    });
  }

  for (const e of trip.tips?.events ?? []) {
    out.push({ id: `event:${e.name}`, kind: "event", title: e.name, subtitle: e.dates, hay: norm(`${e.name} ${e.description} event`), days: [], slots: [], tags: [], target: { tab: "explore" } });
  }

  const g = trip.groceryList;
  const master = g.master ?? aggregateIngredients([...g.byMeal.map((m) => ({ recipeId: m.recipeId, ingredients: m.ingredients })), { ingredients: g.staples }]);
  for (const m of master) {
    out.push({ id: `grocery:${m.item}`, kind: "grocery", title: m.item, subtitle: `Groceries · ${m.quantity}`, hay: norm(`${m.item} ${m.category} grocery buy shop`), days: [], slots: [], tags: [norm(m.category)], target: { tab: "lists", lists: "groceries" } });
  }
  for (const items of Object.values(trip.packingList)) {
    for (const it of items) {
      out.push({ id: `packing:${it.item}`, kind: "packing", title: it.item, subtitle: "Packing list", hay: norm(`${it.item} pack bring`), days: [], slots: [], tags: [], target: { tab: "lists", lists: "packing" } });
    }
  }
  return out;
}

/** Every tag in the plan — the only tags a model-produced filter may use. */
export function tagVocabulary(trip: GeneratedTrip): string[] {
  const all = [
    ...trip.restaurants.flatMap((r) => [...r.tags, ...(r.bestFor ?? [])]),
    ...(trip.tips?.activities ?? []).flatMap((a) => a.tags),
    ...trip.recipes.flatMap((r) => r.tags),
  ];
  return [...new Set(all.map(norm).filter(Boolean))].sort();
}

// ─── Local parser ────────────────────────────────────────────────────────────

const STOP_WORDS = new Set(
  "a an and any are around at best can do does for from get go good have i idea ideas in is it list lists me my near need of on or our place places plan please show some something spot spots stuff that the there things this to trip want we what whats when where which with you".split(" ")
);
const WEEKDAY_WORDS: Record<string, string> = {
  sunday: "Sunday", sun: "Sunday", monday: "Monday", mon: "Monday", tuesday: "Tuesday", tue: "Tuesday", tues: "Tuesday",
  wednesday: "Wednesday", wed: "Wednesday", thursday: "Thursday", thu: "Thursday", thurs: "Thursday",
  friday: "Friday", fri: "Friday", saturday: "Saturday", sat: "Saturday",
};
const ORDINALS: Record<string, number> = { first: 1, second: 2, third: 3, fourth: 4, fifth: 5, sixth: 6, seventh: 7 };
const SLOT_WORDS: Record<string, Slot> = { breakfast: "breakfast", brunch: "breakfast", lunch: "lunch", dinner: "dinner", supper: "dinner", tonight: "dinner" };
const KIND_WORDS: Record<string, ResultKind[]> = {
  restaurant: ["restaurant"], restaurants: ["restaurant"], eat: ["restaurant", "stop"], food: ["restaurant", "stop", "recipe"],
  recipe: ["recipe"], recipes: ["recipe"], cook: ["recipe"], cooking: ["recipe"],
  pack: ["packing"], packing: ["packing"], bring: ["packing"],
  grocery: ["grocery"], groceries: ["grocery"], shopping: ["grocery"], buy: ["grocery"],
  event: ["event"], events: ["event"], festival: ["event"], happening: ["event"],
  activity: ["activity"], activities: ["activity"],
};
const DIET_WORDS: Record<string, string> = {
  vegetarian: "vegetarian", veggie: "vegetarian", vegan: "vegan", gf: "gluten-free", gluten: "gluten-free", glutenfree: "gluten-free",
  dairy: "dairy-free", nut: "nut-free", nuts: "nut-free", halal: "halal", kosher: "kosher", pescatarian: "pescatarian",
};

export interface ParseResult {
  filter: PlanFilter;
  /** "high" when every word was understood; "low" leaves room for the AI fallback. */
  confidence: "high" | "low";
  /** Human labels for the chips shown above results. */
  labels: string[];
}

/** Turns casual phrasing into a filter, in code. `todayDay` resolves "today/tonight/tomorrow" during the trip. */
export function parseQueryLocal(q: string, trip: GeneratedTrip, todayDay?: number): ParseResult {
  const f = emptyFilter();
  const labels: string[] = [];
  const vocab = new Set(tagVocabulary(trip));
  const tokens = norm(q.replace(/gluten[\s-]free/gi, "glutenfree").replace(/kid[\s-]friendly/gi, "kids").replace(/things to do/gi, "activities")).split(" ").filter(Boolean);
  let unknown = 0;
  const days = trip.itinerary;
  const addDay = (n: number | undefined, label: string) => {
    if (n && days.some((d) => d.day === n) && !f.days.includes(n)) {
      f.days.push(n);
      labels.push(label);
    } else if (!n) unknown++;
  };

  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    const nextNum = tokens[i + 1] && /^\d+$/.test(tokens[i + 1]) ? parseInt(tokens[i + 1], 10) : undefined;
    if ((t === "day" || t === "d") && nextNum) {
      addDay(nextNum, `Day ${nextNum}`);
      i++;
    } else if (/^d\d+$/.test(t)) {
      addDay(parseInt(t.slice(1), 10), `Day ${t.slice(1)}`);
    } else if (ORDINALS[t] && tokens[i + 1] === "day") {
      addDay(ORDINALS[t], `Day ${ORDINALS[t]}`);
      i++;
    } else if (t === "last" && tokens[i + 1] === "day") {
      addDay(days[days.length - 1]?.day, "Last day");
      i++;
    } else if (WEEKDAY_WORDS[t]) {
      const match = days.filter((d) => dayWeekday(d) === WEEKDAY_WORDS[t]);
      if (match.length) match.forEach((d) => addDay(d.day, WEEKDAY_WORDS[t]));
      else unknown++;
    } else if (t === "today" || t === "tonight" || t === "tomorrow") {
      const n = todayDay ? todayDay + (t === "tomorrow" ? 1 : 0) : undefined;
      if (n) addDay(n, cap(t));
      else unknown++;
      if (t === "tonight" && !f.slots.includes("dinner")) f.slots.push("dinner");
    } else if (SLOT_WORDS[t]) {
      if (!f.slots.includes(SLOT_WORDS[t])) {
        f.slots.push(SLOT_WORDS[t]);
        labels.push(cap(SLOT_WORDS[t]));
      }
    } else if (KIND_WORDS[t]) {
      for (const k of KIND_WORDS[t]) if (!f.kinds.includes(k)) f.kinds.push(k);
      labels.push(cap(t));
    } else if (t === "kids" || t === "kid" || t === "family" || t === "children" || t === "child") {
      f.kidFriendly = true;
      labels.push("Kid-friendly");
    } else if (["book", "booking", "reserve", "reservation", "reservations", "tickets", "ticket"].includes(t)) {
      f.bookingRequired = true;
      labels.push("Book ahead");
    } else if (t === "verified" || t === "confirmed") {
      f.verifiedOnly = true;
      labels.push("Verified");
    } else if (DIET_WORDS[t] && ((t !== "nut" && t !== "dairy") || tokens[i + 1] === "free")) {
      const d = DIET_WORDS[t];
      if (!f.dietary.includes(d)) {
        f.dietary.push(d);
        labels.push(d);
      }
      if (tokens[i + 1] === "free") i++;
    } else if (t === "coffee" || t === "drinks" || t === "dessert" || vocab.has(t)) {
      if (!f.tags.includes(t)) {
        f.tags.push(t);
        labels.push(t);
      }
    } else if (!STOP_WORDS.has(t) && t.length > 1 && !/^\d+$/.test(t)) {
      f.text.push(t);
      labels.push(`“${t}”`);
    }
  }
  const structured = f.days.length + f.slots.length + f.kinds.length + f.tags.length + f.dietary.length + Number(!!f.kidFriendly) + Number(!!f.bookingRequired) + Number(!!f.verifiedOnly);
  return { filter: f, confidence: unknown === 0 && (structured > 0 || f.text.length <= 2) ? "high" : "low", labels };
}

// ─── Matching ────────────────────────────────────────────────────────────────

const KIND_ORDER: Record<ResultKind, number> = { stop: 0, restaurant: 1, activity: 2, recipe: 3, event: 4, grocery: 5, packing: 6 };

export function runFilter(index: SearchEntry[], f: PlanFilter, limit = 30): { results: SearchEntry[]; loose: boolean } {
  const kinds = f.kinds.length ? f.kinds : f.slots.length || f.dietary.length ? (["stop", "restaurant", "recipe"] as ResultKind[]) : [];
  const base = (e: SearchEntry) =>
    (!kinds.length || kinds.includes(e.kind)) &&
    (f.days.length && f.slots.length && e.pairs
      ? e.pairs.some((p) => f.days.some((d) => f.slots.some((sl) => p === `${d}:${sl}`)))
      : (!f.days.length || e.days.some((d) => f.days.includes(d))) && (!f.slots.length || e.slots.some((sl) => f.slots.includes(sl)))) &&
    (!f.tags.length || f.tags.some((t) => e.tags.includes(t) || e.hay.includes(t))) &&
    (!f.kidFriendly || !!e.kidFriendly) &&
    (!f.bookingRequired || !!e.bookingRequired) &&
    (!f.verifiedOnly || !!e.verified) &&
    (!f.dietary.length || f.dietary.some((d) => e.hay.includes(norm(d)) || e.hay.includes(norm(d.replace("-free", ""))) || e.tags.includes(norm(d))));
  const words = f.text.map(norm).filter(Boolean);
  const sort = (xs: SearchEntry[]) => [...xs].sort((a, b) => KIND_ORDER[a.kind] - KIND_ORDER[b.kind] || (a.days[0] ?? 99) - (b.days[0] ?? 99));

  const strict = index.filter((e) => base(e) && words.every((w) => e.hay.includes(w)));
  if (strict.length || !words.length) return { results: sort(strict).slice(0, limit), loose: false };
  // Closest matches: any keyword.
  const loose = index.filter((e) => base(e) && words.some((w) => e.hay.includes(w)));
  return { results: sort(loose).slice(0, limit), loose: true };
}

/** Keeps a model-produced filter inside the plan: real days, known tags and kinds, short keywords. */
export function sanitizeFilter(raw: Partial<PlanFilter>, trip: GeneratedTrip): PlanFilter {
  const days = new Set(trip.itinerary.map((d) => d.day));
  const vocab = new Set(tagVocabulary(trip));
  const uniq = <T>(xs: T[]) => [...new Set(xs)];
  return {
    days: uniq((raw.days ?? []).filter((d) => days.has(d))),
    slots: uniq((raw.slots ?? []).filter((x): x is Slot => (SLOTS as readonly string[]).includes(x))),
    kinds: uniq((raw.kinds ?? []).filter((k): k is ResultKind => (RESULT_KINDS as readonly string[]).includes(k))),
    tags: uniq((raw.tags ?? []).map(norm).filter((t) => vocab.has(t))).slice(0, 6),
    kidFriendly: raw.kidFriendly === true || undefined,
    bookingRequired: raw.bookingRequired === true || undefined,
    verifiedOnly: raw.verifiedOnly === true || undefined,
    dietary: uniq((raw.dietary ?? []).filter((d) => (DIETARY as readonly string[]).includes(d))),
    text: uniq((raw.text ?? []).map(norm).filter((t) => t.length > 1 && t.length <= 30 && !STOP_WORDS.has(t))).slice(0, 4),
  };
}

/** Chip labels for a filter (used when the server interpreted the query). */
export function filterLabels(f: PlanFilter, trip: GeneratedTrip): string[] {
  const out: string[] = [];
  for (const d of f.days) {
    const day = trip.itinerary.find((x) => x.day === d);
    out.push(day && dayWeekday(day) ? `Day ${d} · ${dayWeekday(day)!.slice(0, 3)}` : `Day ${d}`);
  }
  out.push(...f.slots.map(cap), ...f.kinds.map(cap), ...f.tags, ...f.dietary);
  if (f.kidFriendly) out.push("Kid-friendly");
  if (f.bookingRequired) out.push("Book ahead");
  if (f.verifiedOnly) out.push("Verified");
  out.push(...f.text.map((t) => `“${t}”`));
  return out;
}
