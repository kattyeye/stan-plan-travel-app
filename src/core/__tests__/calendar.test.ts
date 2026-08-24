import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { buildTripEvents, toICS, googleCalendarUrl, formatEventTime } from "../calendar";
import { normalizeTrip } from "../normalize";
import type { GeneratedTrip } from "../types";

const NOW = new Date("2026-08-01T12:00:00.000Z");

function makeTrip(overrides: Partial<GeneratedTrip["itinerary"][number]> = {}): GeneratedTrip {
  return {
    meta: { destination: "Outer Banks, NC" },
    recipes: [
      {
        id: "rec-1",
        name: "Shrimp Boil",
        prepTime: "15 min",
        cookTime: "30 min",
        servings: 6,
        tip: "Buy shrimp same-day.",
      },
    ],
    itinerary: [
      {
        day: 1,
        date: "2026-08-14",
        theme: "Arrival",
        meals: {
          breakfast: { type: "cook-in", name: "Eggs" },
          lunch: { type: "eat-out", name: "Taco stand" },
          dinner: { type: "cook-in", name: "Shrimp Boil", recipeId: "rec-1" },
        },
        activities: [],
        vibe: [],
        ...overrides,
      },
    ],
  } as unknown as GeneratedTrip;
}

const build = (t: GeneratedTrip, opts = {}) =>
  buildTripEvents(normalizeTrip(t), { tripId: "abc123", ...opts });

describe("buildTripEvents", () => {
  it("creates a timed event per timed activity", () => {
    const events = build(makeTrip({ activities: ["9:00am — Kayak rental"] }), { meals: false });
    assert.equal(events.length, 1);
    assert.deepEqual(
      { title: events[0].title, start: events[0].start, end: events[0].end, date: events[0].date },
      { title: "Kayak rental", start: "09:00", end: "10:30", date: "2026-08-14" },
    );
  });

  it("honours an explicit end time instead of the default duration", () => {
    const events = build(makeTrip({ activities: ["10:00am–1:00pm — Stingray tour"] }), { meals: false });
    assert.equal(events[0].end, "13:00");
  });

  it("never lets a late event roll past midnight", () => {
    const events = build(makeTrip({ activities: ["11:45pm — Stargazing"] }), { meals: false });
    assert.equal(events[0].end, "23:59");
  });

  it("collects untimed activities into one all-day event, not many", () => {
    const events = build(
      makeTrip({ activities: ["Kayaking if you feel like it", "Maybe the lighthouse"] }),
      { meals: false },
    );
    assert.equal(events.length, 1);
    assert.equal(events[0].start, undefined, "should be all-day");
    assert.match(events[0].title, /Day 1 — Arrival/);
    assert.equal(events[0].description, "• Kayaking if you feel like it\n• Maybe the lighthouse");
  });

  it("mixes timed events and one all-day bucket on the same day", () => {
    const events = build(
      makeTrip({ activities: ["9:00am — Kayak rental", "Maybe the lighthouse"] }),
      { meals: false },
    );
    assert.equal(events.length, 2);
    assert.equal(events.filter((e) => e.start).length, 1);
    assert.equal(events.filter((e) => !e.start).length, 1);
  });

  it("builds meal events with recipe detail and restaurant location", () => {
    const events = build(
      makeTrip({
        meals: {
          breakfast: { type: "cook-in", name: "Eggs" },
          lunch: {
            type: "eat-out",
            name: "Sam's Seafood",
            restaurant: {
              id: "r1", name: "Sam's Seafood", address: "1 Beach Rd",
              hours: "11-9", tags: [], description: "Local classic", priceRange: "$$",
            },
          },
          dinner: { type: "cook-in", name: "Shrimp Boil", recipeId: "rec-1" },
        },
      }),
      { activities: false },
    );
    assert.equal(events.length, 3);

    const lunch = events.find((e) => e.title.startsWith("Lunch"))!;
    assert.equal(lunch.location, "Sam's Seafood, 1 Beach Rd");

    const dinner = events.find((e) => e.title.startsWith("Dinner"))!;
    assert.match(dinner.description!, /Recipe: Shrimp Boil/);
    assert.match(dinner.description!, /Serves 6/);
    assert.equal(dinner.location, undefined, "cook-in meals have no location");
  });

  it("uses the resolved ISO date, not the display date", () => {
    const trip = makeTrip({ activities: ["9:00am — Kayak"], date: "Aug 14" });
    (trip as { meta: { dates?: unknown; destination: string } }).meta = {
      destination: "Outer Banks, NC",
      dates: { start: "2026-08-14" },
    };
    const events = build(trip, { meals: false });
    assert.equal(events[0].date, "2026-08-14");
  });

  it("gives every event a stable, unique uid", () => {
    const events = build(makeTrip({ activities: ["9:00am — A", "10:00am — B", "Untimed C"] }));
    const uids = events.map((e) => e.uid);
    assert.equal(new Set(uids).size, uids.length, "uids must be unique");
    assert.deepEqual(build(makeTrip({ activities: ["9:00am — A", "10:00am — B", "Untimed C"] })).map((e) => e.uid), uids);
  });

  it("skips days that have no resolvable calendar date", () => {
    const trip = makeTrip({ activities: ["9:00am — Kayak"] });
    // Sample-style trip: human-readable dates, no year anywhere.
    (trip as { meta: { dates?: unknown; destination: string } }).meta = {
      destination: "Santorini",
      dates: { start: "Jun 14" },
    };
    trip.itinerary[0].date = "Jun 14";
    assert.deepEqual(build(trip), [], "must not emit a malformed date");
  });

  it("respects the activities/meals toggles", () => {
    const trip = makeTrip({ activities: ["9:00am — Kayak"] });
    assert.equal(build(trip, { meals: false, activities: false }).length, 0);
    assert.equal(build(trip, { meals: false }).length, 1);
    assert.equal(build(trip, { activities: false }).length, 3);
  });
});

describe("toICS", () => {
  const ics = (t: GeneratedTrip, opts = {}) =>
    toICS(build(t, opts), { calendarName: "OBX Trip", now: NOW });

  it("wraps events in a valid VCALENDAR using CRLF endings", () => {
    const out = ics(makeTrip({ activities: ["9:00am — Kayak"] }), { meals: false });
    assert.ok(out.startsWith("BEGIN:VCALENDAR\r\n"));
    assert.ok(out.trimEnd().endsWith("END:VCALENDAR"));
    assert.ok(out.includes("VERSION:2.0"));
    assert.ok(out.includes("X-WR-CALNAME:OBX Trip"));
    assert.equal(out.includes("\n\n"), false);
    // Every line break must be CRLF, never a bare LF.
    assert.equal(out.split("\n").every((l, i, arr) => i === arr.length - 1 || l.endsWith("\r")), true);
  });

  it("emits floating local times — no Z suffix, no TZID", () => {
    const out = ics(makeTrip({ activities: ["9:00am — Kayak"] }), { meals: false });
    assert.ok(out.includes("DTSTART:20260814T090000"));
    assert.equal(/DTSTART:[0-9T]+Z/.test(out), false, "must not be UTC");
    assert.equal(out.includes("TZID"), false, "must not pin a timezone");
  });

  it("uses an exclusive DTEND for all-day events", () => {
    const out = ics(makeTrip({ activities: ["Maybe the lighthouse"] }), { meals: false });
    assert.ok(out.includes("DTSTART;VALUE=DATE:20260814"));
    assert.ok(out.includes("DTEND;VALUE=DATE:20260815"));
  });

  it("escapes commas, semicolons, backslashes and newlines in text", () => {
    const out = toICS(
      [{ uid: "x", title: "Dinner; wine, cheese \\ more", date: "2026-08-14", description: "line1\nline2" }],
      { now: NOW },
    );
    assert.ok(out.includes(String.raw`SUMMARY:Dinner\; wine\, cheese \\ more`));
    assert.ok(out.includes("DESCRIPTION:line1\\nline2"));
  });

  it("folds long lines to 75 octets with a leading-space continuation", () => {
    const out = toICS(
      [{ uid: "x", title: "A".repeat(200), date: "2026-08-14" }],
      { now: NOW },
    );
    for (const line of out.split("\r\n")) {
      assert.ok(Buffer.byteLength(line, "utf8") <= 75, `line too long: ${line.length}`);
    }
    assert.ok(out.includes("\r\n "), "expected a folded continuation line");
  });

  it("folds multi-byte characters without splitting them", () => {
    const out = toICS([{ uid: "x", title: "🏖️".repeat(40), date: "2026-08-14" }], { now: NOW });
    for (const line of out.split("\r\n")) {
      assert.ok(Buffer.byteLength(line, "utf8") <= 75);
    }
    // Unfolding must reproduce the original text intact.
    const summary = out.split("\r\n").reduce<string[]>((acc, line) => {
      if (line.startsWith(" ") && acc.length) acc[acc.length - 1] += line.slice(1);
      else acc.push(line);
      return acc;
    }, []).find((l) => l.startsWith("SUMMARY:"))!;
    assert.equal(summary, `SUMMARY:${"🏖️".repeat(40)}`);
  });
});

describe("googleCalendarUrl", () => {
  it("builds a timed template link", () => {
    const url = googleCalendarUrl({ uid: "x", title: "Kayak", date: "2026-08-14", start: "09:00", end: "10:30" });
    assert.ok(url.includes("dates=20260814T090000%2F20260814T103000"));
    assert.ok(url.includes("text=Kayak"));
  });

  it("builds an all-day template link with an exclusive end date", () => {
    const url = googleCalendarUrl({ uid: "x", title: "Beach day", date: "2026-08-14" });
    assert.ok(url.includes("dates=20260814%2F20260815"));
  });
});

describe("formatEventTime", () => {
  it("formats ranges and all-day events", () => {
    assert.equal(formatEventTime({ uid: "x", title: "t", date: "2026-08-14", start: "09:00", end: "10:30" }), "9:00 AM – 10:30 AM");
    assert.equal(formatEventTime({ uid: "x", title: "t", date: "2026-08-14" }), "All day");
  });
});
