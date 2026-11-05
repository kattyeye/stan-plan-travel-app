import { describe, expect, it } from "vitest";
import {
  activityUsage,
  buildDayTimeline,
  dayChip,
  explainStop,
  hoursForWeekday,
  localISODate,
  mapsDirectionsUrl,
  mapsEmbedUrl,
  mentions,
  parseHash,
  parseScheduleLine,
  phaseLabel,
  restaurantUsage,
  tripPhase,
  upNext,
} from "../trip-view";
import { SAMPLE_TRIPS } from "../sample-trips";
import { tripFixture } from "./trip-view-fixture";

describe("parseScheduleLine", () => {
  it("reads clock times and time-of-day words", () => {
    expect(parseScheduleLine("9:00am — Kayak")).toMatchObject({ label: "9:00am", minute: 540, bucket: "morning", text: "Kayak" });
    expect(parseScheduleLine("7:30 pm - Dinner")).toMatchObject({ minute: 19 * 60 + 30, bucket: "evening", text: "Dinner" });
    expect(parseScheduleLine("Afternoon – Beach")).toMatchObject({ label: "Afternoon", bucket: "afternoon", text: "Beach" });
    expect(parseScheduleLine("If the surf's up, go to the pier")).toEqual({ text: "If the surf's up, go to the pier" });
  });
});

describe("mentions", () => {
  it("matches whole words, ignoring punctuation and accents", () => {
    expect(mentions("Dinner at Owens Restaurant on the sound", "Owens' Restaurant")).toBe(true);
    expect(mentions("Café Crème for coffee", "Cafe Creme")).toBe(true);
    expect(mentions("Samsonite store", "Sams")).toBe(false);
    expect(mentions("anything", "Bar")).toBe(false); // too short to trust
  });
});

describe("buildDayTimeline", () => {
  const trip = tripFixture();

  it("merges meals into the schedule in time order without duplicating them", () => {
    const stops = buildDayTimeline(trip.itinerary[0], trip);
    expect(stops.map((s) => [s.key, s.kind, s.slot ?? null])).toEqual([
      ["d1-breakfast", "meal", "breakfast"],
      ["d1-s0", "activity", null],
      ["d1-lunch", "meal", "lunch"],
      ["d1-s2", "activity", null],
      ["d1-s1", "meal", "dinner"], // "7pm — Dinner at Owens'" carries the dinner
    ]);
    const dinner = stops.find((s) => s.slot === "dinner")!;
    expect(dinner.place?.name).toBe("Owens' Restaurant");
    expect(dinner.text).toBe("Dinner at Owens' Restaurant on the sound");
  });

  it("matches activities and restaurants to places and letters them for the map", () => {
    const stops = buildDayTimeline(trip.itinerary[0], trip);
    const lettered = stops.filter((s) => s.letter).map((s) => [s.letter, s.place?.name]);
    expect(lettered).toEqual([
      ["A", "Jockey's Ridge State Park"],
      ["B", "Sam & Omie's"],
      ["C", "Owens' Restaurant"],
    ]);
    expect(stops.find((s) => s.slot === "lunch")!.alternatives.map((r) => r.id)).toEqual(["r3"]);
    expect(stops.find((s) => s.slot === "breakfast")!.recipe?.id).toBe("rec-1");
  });

  it("orders balanced buckets and places untimed meals by slot", () => {
    const stops = buildDayTimeline(trip.itinerary[1], trip);
    expect(stops.map((s) => s.key)).toEqual(["d2-breakfast", "d2-s0", "d2-lunch", "d2-s1", "d2-dinner"]);
    expect(stops.map((s) => s.bucket)).toEqual(["morning", "morning", "midday", "evening", "evening"]);
    expect(stops.find((s) => s.slot === "dinner")!.warnings).toEqual(["Call ahead."]);
  });

  it("skips hidden stops when lettering and flags done ones", () => {
    const stops = buildDayTimeline(trip.itinerary[0], trip, { hidden: new Set(["d1-s0"]), done: new Set(["d1-lunch"]) });
    expect(stops.find((s) => s.key === "d1-s0")).toMatchObject({ hidden: true });
    expect(stops.find((s) => s.key === "d1-s0")!.letter).toBeUndefined();
    expect(stops.find((s) => s.key === "d1-lunch")).toMatchObject({ done: true, letter: "A" });
  });

  it("copes with legacy sample trips (embedded names, no ids, non-ISO dates)", () => {
    for (const sample of Object.values(SAMPLE_TRIPS)) {
      for (const day of sample.itinerary) {
        const stops = buildDayTimeline(day, sample);
        const keys = stops.map((s) => s.key);
        expect(new Set(keys).size).toBe(keys.length);
        expect(stops.filter((s) => s.kind === "meal")).toHaveLength(3);
      }
    }
    // "9:00pm — Dinner at Lauda…" absorbs the legacy "Sunset dinner at Lauda Restaurant, Oia" meal.
    const santorini = SAMPLE_TRIPS.santorini;
    const stops = buildDayTimeline(santorini.itinerary[0], santorini);
    expect(stops.filter((s) => /lauda/i.test(s.text))).toHaveLength(1);
  });
});

describe("tripPhase", () => {
  const dates = { start: "2030-06-14", end: "2030-06-16", nights: 2 };
  it("counts down, tracks the day, and ends", () => {
    expect(tripPhase(dates, "2030-06-02")).toEqual({ phase: "before", daysToGo: 12 });
    expect(tripPhase(dates, "2030-06-15")).toEqual({ phase: "during", day: 2, of: 3 });
    expect(tripPhase(dates, "2030-06-17")).toEqual({ phase: "after" });
    expect(phaseLabel(tripPhase(dates, "2030-06-13"))).toBe("Tomorrow!");
    expect(phaseLabel(tripPhase(dates, "2030-06-14"))).toBe("Day 1 of 3 · today");
  });
  it("returns null for dates that don't parse", () => {
    expect(tripPhase({ start: "Jun 14", end: "Jun 19", nights: 5 }, "2030-06-15")).toBeNull();
    expect(phaseLabel(null)).toBeNull();
  });
  it("formats the local date", () => {
    expect(localISODate(new Date(2030, 0, 5, 23, 30))).toBe("2030-01-05");
  });
});

describe("hoursForWeekday & dayChip", () => {
  it("picks the weekday's Google hours line", () => {
    expect(hoursForWeekday(["Friday: 5:00 PM – 9:30 PM", "Saturday: Closed"], "Friday")).toBe("5:00 PM – 9:30 PM");
    expect(hoursForWeekday(["Saturday: Closed"], "Friday")).toBeUndefined();
    expect(hoursForWeekday(undefined, "Friday")).toBeUndefined();
  });
  it("labels day chips and falls back for legacy dates", () => {
    expect(dayChip({ date: "2030-06-14" })).toEqual({ weekday: "Fri", date: "Jun 14" });
    expect(dayChip({ date: "Jun 14" })).toEqual({ weekday: "", date: "Jun 14" });
  });
});

describe("map URLs", () => {
  const trip = tripFixture();
  const places = buildDayTimeline(trip.itinerary[0], trip).filter((s) => s.letter).map((s) => s.place!);

  it("builds a directions deep link with place ids when every waypoint has one", () => {
    const url = new URL(mapsDirectionsUrl(places, "Nags Head, NC")!);
    expect(url.pathname).toBe("/maps/dir/");
    expect(url.searchParams.get("origin_place_id")).toBe("PA1");
    expect(url.searchParams.get("destination_place_id")).toBe("P2");
    expect(url.searchParams.get("waypoint_place_ids")).toBe("P1");
    expect(mapsDirectionsUrl([], "x")).toBeUndefined();
  });

  it("builds Maps Embed URLs for routes, single places and the area", () => {
    const route = new URL(mapsEmbedUrl(places, "KEY", "Nags Head, NC"));
    expect(route.pathname).toBe("/maps/embed/v1/directions");
    expect(route.searchParams.get("origin")).toBe("place_id:PA1");
    expect(route.searchParams.get("waypoints")).toBe("place_id:P1");
    const one = new URL(mapsEmbedUrl([{ kind: "restaurant", name: "Mulligan's", address: "1 Beach Rd", tags: [] }], "KEY", "Nags Head, NC"));
    expect(one.pathname).toBe("/maps/embed/v1/place");
    expect(one.searchParams.get("q")).toBe("Mulligan's, 1 Beach Rd");
    expect(new URL(mapsEmbedUrl([], "KEY", "Nags Head, NC")).searchParams.get("q")).toBe("Nags Head, NC");
  });
});

describe("upNext", () => {
  it("finds the current and next stop by the clock", () => {
    const trip = tripFixture();
    const stops = buildDayTimeline(trip.itinerary[0], trip);
    const at11 = upNext(stops, 11 * 60);
    expect(at11.current?.key).toBe("d1-s0");
    expect(at11.next?.key).toBe("d1-lunch");
    expect([...at11.past]).toEqual(["d1-breakfast"]);
    expect(upNext(stops, 6 * 60).next?.key).toBe("d1-breakfast");
  });
});

describe("usage", () => {
  it("maps restaurants and activities to the days that use them", () => {
    const trip = tripFixture();
    expect(restaurantUsage(trip).get("r1")).toEqual([
      { day: 1, slot: "lunch", primary: true },
      { day: 2, slot: "dinner", primary: true },
    ]);
    expect(restaurantUsage(trip).get("r3")).toEqual([
      { day: 1, slot: "lunch", primary: false },
      { day: 2, slot: "lunch", primary: true },
    ]);
    expect(activityUsage(trip).get("a2")).toEqual([2]);
  });
});

describe("explainStop", () => {
  it("cites Google, the guest's answers and Irie's checks separately", () => {
    const trip = tripFixture();
    const day = trip.itinerary[0];
    const dinner = buildDayTimeline(day, trip).find((s) => s.slot === "dinner")!;
    const reasons = explainStop(dinner, day, trip);
    const sources = reasons.map((r) => r.source);
    expect(sources).toContain("google");
    expect(sources).toContain("you");
    expect(sources).toContain("checks");
    expect(reasons.find((r) => r.text.startsWith("Friday hours"))?.text).toBe("Friday hours: 5:00 PM – 9:30 PM.");
    expect(reasons.some((r) => r.text.includes("$$$ — you chose a moderate budget"))).toBe(true);
  });

  it("explains recipes with code-computed servings and dietary checks", () => {
    const trip = tripFixture();
    const day = trip.itinerary[0];
    const breakfast = buildDayTimeline(day, trip).find((s) => s.slot === "breakfast")!;
    const text = explainStop(breakfast, day, trip).map((r) => r.text).join(" | ");
    expect(text).toContain("4 servings");
    expect(text).toContain("peanut allergy");
  });
});

describe("parseHash", () => {
  it("handles new and legacy hashes", () => {
    expect(parseHash("#days-3")).toEqual({ tab: "days", day: 3 });
    expect(parseHash("#lists-groceries")).toEqual({ tab: "lists", lists: "groceries" });
    expect(parseHash("#grocery")).toEqual({ tab: "lists", lists: "groceries" });
    expect(parseHash("#restaurants")).toEqual({ tab: "food", food: "eat" });
    expect(parseHash("#itinerary")).toEqual({ tab: "days" });
    expect(parseHash("#nope")).toBeNull();
    expect(parseHash("")).toBeNull();
  });
});
