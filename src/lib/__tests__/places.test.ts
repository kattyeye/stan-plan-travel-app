import { describe, expect, it } from "vitest";
import { isOpenAt, nameSimilarity, parseClock, type OpeningPeriod } from "../places";

const p = (day: number, open: string, close: string, closeDay = day): OpeningPeriod => ({
  open: { day, hour: +open.slice(0, 2), minute: +open.slice(2) },
  close: { day: closeDay, hour: +close.slice(0, 2), minute: +close.slice(2) },
});

describe("opening hours", () => {
  // Dinner-only Wed–Sun, plus a Saturday that runs past midnight.
  const periods = [3, 4, 5, 0].map((d) => p(d, "1700", "2200")).concat(p(6, "1700", "0100", 0));

  it("knows when a venue is open", () => {
    expect(isOpenAt(periods, 3, 19)).toBe(true);
    expect(isOpenAt(periods, 3, 12)).toBe(false); // no lunch
    expect(isOpenAt(periods, 1, 19)).toBe(false); // closed Monday
    expect(isOpenAt(periods, 6, 23, 30)).toBe(true); // late Saturday
    expect(isOpenAt(periods, 0, 0, 30)).toBe(true); // ...into Sunday 00:30
    expect(isOpenAt(undefined, 3, 19)).toBeUndefined();
  });

  it("treats a single period without close as 24/7", () => {
    expect(isOpenAt([{ open: { day: 0, hour: 0, minute: 0 } }], 4, 3)).toBe(true);
  });

  it("parses clock strings", () => {
    expect(parseClock("7:30pm")).toEqual({ hour: 19, minute: 30 });
    expect(parseClock("12am")).toEqual({ hour: 0, minute: 0 });
    expect(parseClock("noon")).toEqual({ hour: 12, minute: 0 });
    expect(parseClock("19:15")).toEqual({ hour: 19, minute: 15 });
    expect(parseClock("Evening")).toBeUndefined();
  });

  it("matches business names conservatively", () => {
    expect(nameSimilarity("Owens' Restaurant", "Owens Restaurant")).toBe(1);
    expect(nameSimilarity("Sam & Omie's", "Sam & Omie's Restaurant")).toBe(1);
    expect(nameSimilarity("The Salty Dog", "Salty Dog Grill")).toBe(1);
    expect(nameSimilarity("Blue Moon Beach Grill", "Blue Water Grill")).toBeLessThan(0.6);
  });
});
