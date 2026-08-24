import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  DEFAULT_MEAL_TIMES,
  formatClock,
  normalizeActivity,
  normalizeTrip,
  parseClock,
} from "../normalize";
import type { GeneratedTrip } from "../types";

describe("parseClock", () => {
  it("parses 12-hour times with a meridiem", () => {
    assert.equal(parseClock("9am"), "09:00");
    assert.equal(parseClock("9:30 PM"), "21:30");
    assert.equal(parseClock("12am"), "00:00");
    assert.equal(parseClock("12pm"), "12:00");
    assert.equal(parseClock("7:05 p.m."), "19:05");
  });

  it("parses 24-hour times", () => {
    assert.equal(parseClock("18:00"), "18:00");
    assert.equal(parseClock("0:30"), "00:30");
  });

  it("rejects a bare number, which is usually prose not a time", () => {
    assert.equal(parseClock("9"), null);
    assert.equal(parseClock("4"), null);
  });

  it("rejects out-of-range and non-numeric input", () => {
    assert.equal(parseClock("25:00"), null);
    assert.equal(parseClock("10:75"), null);
    assert.equal(parseClock("abc"), null);
    assert.equal(parseClock(""), null);
  });
});

describe("normalizeActivity — legacy prose strings", () => {
  it("extracts a leading clock time", () => {
    assert.deepEqual(normalizeActivity("9:00am — Kayak rental at Kitty Hawk"), {
      title: "Kayak rental at Kitty Hawk",
      startTime: "09:00",
    });
  });

  it("extracts a time range without leaking the end time into the title", () => {
    assert.deepEqual(normalizeActivity("10:30am–12:30pm — Guided stingray excursion"), {
      title: "Guided stingray excursion",
      startTime: "10:30",
      endTime: "12:30",
    });
    assert.deepEqual(normalizeActivity("2:00pm to 4:00pm — Snorkeling"), {
      title: "Snorkeling",
      startTime: "14:00",
      endTime: "16:00",
    });
  });

  it("maps balanced-style time-of-day words to representative hours", () => {
    assert.deepEqual(normalizeActivity("Morning — head to the kayak rental"), {
      title: "Head to the kayak rental",
      startTime: "09:00",
    });
    assert.deepEqual(normalizeActivity("Afternoon: relax at the pool"), {
      title: "Relax at the pool",
      startTime: "13:00",
    });
  });

  it("leaves flexible-style suggestions untimed", () => {
    assert.deepEqual(normalizeActivity("Kayaking is great here if you feel like it"), {
      title: "Kayaking is great here if you feel like it",
    });
  });

  it("does not mistake a dash inside prose for a time separator", () => {
    assert.deepEqual(normalizeActivity("Visit the lighthouse — it's worth the climb"), {
      title: "Visit the lighthouse — it's worth the climb",
    });
    assert.deepEqual(normalizeActivity("Grab coffee at 9 people's favorite spot"), {
      title: "Grab coffee at 9 people's favorite spot",
    });
  });
});

describe("normalizeActivity — structured objects", () => {
  it("passes an already-structured activity through untouched", () => {
    const input = { title: "Dive", startTime: "07:15", location: "Pier", bookingRequired: true };
    assert.deepEqual(normalizeActivity(input), input);
  });
});

function tripWith(day: Partial<GeneratedTrip["itinerary"][number]>): GeneratedTrip {
  return {
    itinerary: [
      {
        day: 1,
        date: "2026-08-14",
        meals: {
          breakfast: { type: "cook-in", name: "Eggs" },
          lunch: { type: "eat-out", name: "Taco stand" },
          dinner: { type: "cook-in", name: "Pasta" },
        },
        activities: [],
        vibe: [],
        ...day,
      },
    ],
  } as unknown as GeneratedTrip;
}

describe("normalizeTrip", () => {
  it("fills default meal times when the generator supplied none", () => {
    const out = normalizeTrip(tripWith({}));
    assert.equal(out.itinerary[0].meals.breakfast.time, DEFAULT_MEAL_TIMES.breakfast);
    assert.equal(out.itinerary[0].meals.lunch.time, DEFAULT_MEAL_TIMES.lunch);
    assert.equal(out.itinerary[0].meals.dinner.time, DEFAULT_MEAL_TIMES.dinner);
  });

  it("keeps a supplied meal time", () => {
    const out = normalizeTrip(
      tripWith({
        meals: {
          breakfast: { type: "cook-in", name: "Eggs", time: "07:45" },
          lunch: { type: "eat-out", name: "Taco stand" },
          dinner: { type: "cook-in", name: "Pasta" },
        },
      }),
    );
    assert.equal(out.itinerary[0].meals.breakfast.time, "07:45");
  });

  it("drops empty activities", () => {
    const out = normalizeTrip(tripWith({ activities: ["", "   ", "Real thing"] }));
    assert.equal(out.itinerary[0].activities.length, 1);
    assert.equal(out.itinerary[0].activities[0].title, "Real thing");
  });

  it("handles a mixed legacy/structured activity list", () => {
    const out = normalizeTrip(
      tripWith({ activities: ["9:00am — Old style", { title: "New style", startTime: "11:00" }] }),
    );
    assert.deepEqual(out.itinerary[0].activities, [
      { title: "Old style", startTime: "09:00" },
      { title: "New style", startTime: "11:00" },
    ]);
  });

  it("keeps an ISO date as the machine-usable date", () => {
    const out = normalizeTrip(tripWith({ date: "2026-08-14" }));
    assert.equal(out.itinerary[0].isoDate, "2026-08-14");
  });

  it("derives an ISO date from the trip start when the day date is not ISO", () => {
    const trip = tripWith({ date: "Jun 15", day: 2 });
    (trip as { meta?: unknown }).meta = { dates: { start: "2026-06-14" } };
    const out = normalizeTrip(trip);
    assert.equal(out.itinerary[0].isoDate, "2026-06-15");
    assert.equal(out.itinerary[0].date, "Jun 15", "display date is preserved");
  });

  it("leaves isoDate undefined rather than inventing a wrong date", () => {
    const trip = tripWith({ date: "Jun 15", day: 2 });
    (trip as { meta?: unknown }).meta = { dates: { start: "Jun 14" } };
    assert.equal(normalizeTrip(trip).itinerary[0].isoDate, undefined);
  });

  it("tolerates a trip with no itinerary at all", () => {
    assert.deepEqual(normalizeTrip({} as GeneratedTrip).itinerary, []);
  });
});

describe("formatClock", () => {
  it("renders 12-hour display times", () => {
    assert.equal(formatClock("09:00"), "9:00 AM");
    assert.equal(formatClock("13:05"), "1:05 PM");
    assert.equal(formatClock("00:30"), "12:30 AM");
    assert.equal(formatClock("12:00"), "12:00 PM");
  });

  it("returns empty string for missing or malformed input", () => {
    assert.equal(formatClock(undefined), "");
    assert.equal(formatClock("nope"), "");
  });
});
