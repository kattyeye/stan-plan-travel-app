import { describe, expect, it } from "vitest";
import { buildSearchIndex, parseQueryLocal, runFilter, sanitizeFilter, tagVocabulary } from "../trip-search";
import { tripFixture } from "./trip-view-fixture";

const trip = tripFixture();
const index = buildSearchIndex(trip);
const titles = (q: string, today?: number) => runFilter(index, parseQueryLocal(q, trip, today).filter).results.map((r) => `${r.kind}:${r.title}`);

describe("buildSearchIndex", () => {
  it("indexes stops, places, recipes and lists with deep-link targets", () => {
    const kinds = new Set(index.map((e) => e.kind));
    expect([...kinds].sort()).toEqual(["activity", "packing", "recipe", "restaurant", "stop"].sort().filter((k) => kinds.has(k as never)));
    const owens = index.find((e) => e.id === "restaurant:r2")!;
    expect(owens.target).toEqual({ tab: "days", day: 1, highlight: "d1-s1" });
    expect(index.find((e) => e.id === "restaurant:r3")!.target).toEqual({ tab: "days", day: 2, highlight: "d2-lunch" });
  });
});

describe("parseQueryLocal", () => {
  it("understands days, weekdays and meals", () => {
    expect(parseQueryLocal("dinner friday", trip).filter).toMatchObject({ days: [1], slots: ["dinner"] });
    expect(parseQueryLocal("what's on day 2", trip).filter).toMatchObject({ days: [2] });
    expect(parseQueryLocal("second day lunch", trip).filter).toMatchObject({ days: [2], slots: ["lunch"] });
    expect(parseQueryLocal("last day", trip).filter.days).toEqual([2]);
  });

  it("resolves today/tonight/tomorrow only during the trip", () => {
    expect(parseQueryLocal("dinner tonight", trip, 1).filter).toMatchObject({ days: [1], slots: ["dinner"] });
    expect(parseQueryLocal("tomorrow", trip, 1).filter.days).toEqual([2]);
    expect(parseQueryLocal("tonight", trip).confidence).toBe("low");
  });

  it("understands flags, diets and tags", () => {
    const f = parseQueryLocal("kid-friendly stuff I need to book", trip).filter;
    expect(f).toMatchObject({ kidFriendly: true, bookingRequired: true, text: [] });
    expect(parseQueryLocal("gluten free", trip).filter.dietary).toEqual(["gluten-free"]);
    expect(parseQueryLocal("seafood", trip).filter.tags).toEqual(["seafood"]);
  });

  it("marks unfamiliar phrasing as low confidence", () => {
    expect(parseQueryLocal("somewhere romantic with a view of the water", trip).confidence).toBe("low");
    expect(parseQueryLocal("dinner friday", trip).confidence).toBe("high");
  });
});

describe("runFilter", () => {
  it("answers common questions from the plan", () => {
    expect(titles("dinner friday")).toEqual(["stop:Owens' Restaurant", "restaurant:Owens' Restaurant"]);
    expect(titles("what do I need to book")).toEqual(["stop:Island Farm", "activity:Island Farm"]);
    expect(titles("pancakes")).toContain("recipe:Pancakes (buttermilk)");
  });

  it("falls back to closest matches when every keyword can't match", () => {
    const r = runFilter(index, { ...parseQueryLocal("dunes zeppelin", trip).filter });
    expect(r.loose).toBe(true);
    expect(r.results.map((e) => e.title)).toContain("Jockey's Ridge State Park");
  });
});

describe("sanitizeFilter", () => {
  it("drops anything outside the plan", () => {
    const f = sanitizeFilter(
      { days: [1, 9], slots: ["dinner", "brunch" as never], kinds: ["restaurant", "spaceship" as never], tags: ["Seafood", "made-up"], dietary: ["vegan", "keto"], text: ["a", "x".repeat(40), "sunset"], kidFriendly: true },
      trip
    );
    expect(f).toEqual({ days: [1], slots: ["dinner"], kinds: ["restaurant"], tags: ["seafood"], dietary: ["vegan"], text: ["sunset"], kidFriendly: true, bookingRequired: undefined, verifiedOnly: undefined });
    expect(tagVocabulary(trip)).toContain("seafood");
  });
});
