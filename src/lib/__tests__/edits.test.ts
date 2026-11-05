import { describe, expect, it } from "vitest";
import { applyEditOp, emptyEdits, parseEditOp, swapOptions, withEdits } from "../trips/edits";
import { buildDayTimeline } from "../trip-view";
import { tripFixture } from "./trip-view-fixture";

const NOW = "2030-06-10T12:00:00Z";

describe("swapOptions", () => {
  it("offers the original, its alternatives, then researched places open that weekday", () => {
    const trip = tripFixture();
    // Day 1 lunch: r1 (pick), r3 (alternative); r2 is dinner-only.
    expect(swapOptions(trip, 1, "lunch").map((r) => r.id)).toEqual(["r1", "r3"]);
    // Day 2 (Saturday) dinner: r2 only opens Fridays, so it's not offered.
    expect(swapOptions(trip, 2, "dinner").map((r) => r.id)).toEqual(["r1", "r3"]);
    expect(swapOptions(trip, 1, "dinner").map((r) => r.id)).toEqual(["r2", "r1", "r3"]);
  });
  it("never swaps home-cooked meals", () => {
    expect(swapOptions(tripFixture(), 1, "breakfast")).toEqual([]);
  });
});

describe("applyEditOp", () => {
  const trip = tripFixture();

  it("accepts a researched swap and rejects anything else", () => {
    const ok = applyEditOp(trip, undefined, { type: "swap_meal", day: 1, slot: "lunch", restaurantId: "r3" }, NOW);
    expect(ok.ok && ok.edits.mealSwaps).toEqual({ "1:lunch": "r3" });
    expect(ok.ok && ok.edits.version).toBe(1);

    expect(applyEditOp(trip, undefined, { type: "swap_meal", day: 2, slot: "dinner", restaurantId: "r2" }, NOW)).toMatchObject({ ok: false });
    expect(applyEditOp(trip, undefined, { type: "swap_meal", day: 1, slot: "lunch", restaurantId: "made-up" }, NOW)).toMatchObject({ ok: false });
    expect(applyEditOp(trip, undefined, { type: "swap_meal", day: 9, slot: "lunch", restaurantId: "r3" }, NOW)).toMatchObject({ ok: false });
  });

  it("swapping back to the original removes the override (undo)", () => {
    const a = applyEditOp(trip, undefined, { type: "swap_meal", day: 1, slot: "lunch", restaurantId: "r3" }, NOW);
    if (!a.ok) throw new Error(a.error);
    const b = applyEditOp(trip, a.edits, { type: "swap_meal", day: 1, slot: "lunch", restaurantId: "r1" }, NOW);
    expect(b.ok && b.edits.mealSwaps).toEqual({});
    expect(b.ok && b.edits.version).toBe(2);
  });

  it("hides, un-hides and ticks off only real stop keys", () => {
    const h = applyEditOp(trip, undefined, { type: "hide_stop", day: 1, key: "d1-s0" }, NOW);
    expect(h.ok && h.edits.hidden).toEqual(["d1-s0"]);
    if (!h.ok) return;
    const u = applyEditOp(trip, h.edits, { type: "unhide_stop", day: 1, key: "d1-s0" }, NOW);
    expect(u.ok && u.edits.hidden).toEqual([]);
    const d = applyEditOp(trip, undefined, { type: "done_stop", day: 1, key: "d1-lunch" }, NOW);
    expect(d.ok && d.edits.done).toEqual(["d1-lunch"]);
    expect(applyEditOp(trip, undefined, { type: "hide_stop", day: 1, key: "d1-s99" }, NOW)).toMatchObject({ ok: false });
    expect(applyEditOp(trip, undefined, { type: "hide_stop", day: 2, key: "d1-s0" }, NOW)).toMatchObject({ ok: false });
  });

  it("stores reports with the venue name, and reset keeps them", () => {
    const r = applyEditOp(trip, undefined, { type: "report", day: 1, venueId: "r2", reason: "closed", note: "  Shut for renovation  " }, NOW);
    if (!r.ok) throw new Error(r.error);
    expect(r.edits.reports[0]).toMatchObject({ venueName: "Owens' Restaurant", reason: "closed", note: "Shut for renovation" });
    const s = applyEditOp(trip, r.edits, { type: "swap_meal", day: 1, slot: "lunch", restaurantId: "r3" }, NOW);
    if (!s.ok) throw new Error(s.error);
    const reset = applyEditOp(trip, s.edits, { type: "reset" }, NOW);
    expect(reset.ok && reset.edits).toMatchObject({ mealSwaps: {}, hidden: [], done: [], version: 3 });
    expect(reset.ok && reset.edits.reports).toHaveLength(1);
    expect(applyEditOp(trip, undefined, { type: "report", venueId: "nope", reason: "closed" }, NOW)).toMatchObject({ ok: false });
  });

  it("keeps a short change log, newest first", () => {
    let edits = emptyEdits(NOW);
    for (let i = 0; i < 60; i++) {
      const r = applyEditOp(trip, edits, { type: i % 2 ? "unhide_stop" : "hide_stop", day: 1, key: "d1-s0" }, NOW);
      if (!r.ok) throw new Error(r.error);
      edits = r.edits;
    }
    expect(edits.log).toHaveLength(50);
    expect(edits.version).toBe(60);
  });
});

describe("parseEditOp", () => {
  it("accepts well-formed ops and rejects junk", () => {
    expect(parseEditOp({ type: "swap_meal", day: 1, slot: "dinner", restaurantId: "r1" })).toEqual({ type: "swap_meal", day: 1, slot: "dinner", restaurantId: "r1" });
    expect(parseEditOp({ type: "swap_meal", day: "1", slot: "dinner", restaurantId: "r1" })).toBeNull();
    expect(parseEditOp({ type: "swap_meal", day: 1, slot: "brunch", restaurantId: "r1" })).toBeNull();
    expect(parseEditOp({ type: "hide_stop", day: 1, key: "x".repeat(41) })).toBeNull();
    expect(parseEditOp({ type: "report", reason: "boring" })).toBeNull();
    expect(parseEditOp({ type: "drop_table" })).toBeNull();
    expect(parseEditOp(null)).toBeNull();
  });
});

describe("withEdits", () => {
  it("returns the plan untouched without edits", () => {
    const trip = tripFixture();
    expect(withEdits(trip, undefined)).toBe(trip);
    expect(withEdits(trip, emptyEdits(NOW))).toBe(trip);
  });

  it("applies a swap to the meal, its schedule line and its alternatives", () => {
    const trip = tripFixture();
    const r = applyEditOp(trip, undefined, { type: "swap_meal", day: 1, slot: "dinner", restaurantId: "r3" }, NOW);
    if (!r.ok) throw new Error(r.error);
    const out = withEdits(trip, r.edits);
    const dinner = out.itinerary[0].meals.dinner;
    expect(dinner).toMatchObject({ restaurantId: "r3", name: "Dinner at Mulligan's" });
    expect(dinner.alternativeIds).toEqual(["r2"]);
    expect(dinner.note).toContain("instead of Owens' Restaurant");
    expect(out.itinerary[0].activities[1]).toBe("7:00pm — Dinner at Mulligan's on the sound");
    // The timeline still shows one dinner stop, now at the new place, under the same key.
    const stops = buildDayTimeline(out.itinerary[0], out);
    expect(stops.filter((s) => s.slot === "dinner").map((s) => [s.key, s.place?.name])).toEqual([["d1-s1", "Mulligan's"]]);
    // The original plan is never mutated.
    expect(trip.itinerary[0].meals.dinner.restaurantId).toBe("r2");
  });

  it("drops skipped schedule lines only when asked", () => {
    const trip = tripFixture();
    const r = applyEditOp(trip, undefined, { type: "hide_stop", day: 1, key: "d1-s2" }, NOW);
    if (!r.ok) throw new Error(r.error);
    expect(withEdits(trip, r.edits).itinerary[0].activities).toHaveLength(3);
    expect(withEdits(trip, r.edits, { dropHidden: true }).itinerary[0].activities).toEqual([
      "10:00am — Climb Jockey's Ridge State Park dunes",
      "7:00pm — Dinner at Owens' Restaurant on the sound",
    ]);
  });
});
