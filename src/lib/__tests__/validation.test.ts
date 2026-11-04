import { describe, expect, it } from "vitest";
import { normalizeListing } from "../partners/adapters";
import { signWebhook } from "../partners";
import { PropertyContextSchema, parseWizardData } from "../validation";
import { renderTripHtml } from "../export-html";
import { toStrictJsonSchema } from "../claude";
import { PlanDraftSchema } from "../pipeline/schemas";
import { buildDays } from "../pipeline/days";
import { assembleTrip, buildVenues, normalizePlan } from "../pipeline/normalize";
import { brief, plan, wizard } from "./fixtures";
import { createHmac } from "crypto";

describe("parseWizardData", () => {
  const base = { destination: "Asheville, NC", startDate: "2030-05-01", endDate: "2030-05-04", email: "A@Example.com " };

  it("normalises and derives nights server-side", () => {
    const r = parseWizardData({ ...base, nights: 99, numKids: 1, kidAges: [4, 9] });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.nights).toBe(3);
    expect(r.data.email).toBe("a@example.com");
    expect(r.data.kidAges).toEqual([4]);
    expect(r.data.tripNickname).toBe("Asheville, NC");
  });

  it("rejects bad input with field-level errors", () => {
    const r = parseWizardData({ ...base, vibes: ["raving"] });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(Object.keys(r.fields)).toEqual(["vibes.0"]);
    const backwards = parseWizardData({ ...base, endDate: "2030-04-30" });
    expect(!backwards.ok && backwards.fields.endDate).toMatch(/at least one night/);
    expect(parseWizardData({ ...base, startDate: "2020-01-01", endDate: "2020-01-03" }).ok).toBe(false);
    expect(parseWizardData({ ...base, endDate: "2030-06-01" }).ok).toBe(false);
  });

  it("lets partner trips omit the guest email", () => {
    const { email: _omit, ...rest } = base;
    const r = parseWizardData(rest, { requireEmail: false });
    expect(r.ok && r.data.email).toBe("");
    expect(parseWizardData(rest).ok).toBe(false);
  });
});

describe("listing adapters", () => {
  it("maps an Airbnb-style listing", () => {
    const p = normalizeListing("airbnb", {
      id: 12345, name: "Oceanfront Cottage", lat: "35.95", lng: -75.62, person_capacity: 8, bedrooms: 4,
      amenities: ["Kitchen", "Wifi", "Hot tub"], check_in_time: "16:00", house_rules: "No parties\nNo pets",
      address: { street: "1 Ocean Blvd", city: "Nags Head", state: "NC", country: "US" },
    });
    expect(p).toMatchObject({ source: "airbnb", externalId: "12345", lat: 35.95, maxGuests: 8, kitchen: "full", houseRules: ["No parties", "No pets"], address: "1 Ocean Blvd, Nags Head, NC, US" });
    expect(PropertyContextSchema.safeParse(p).success).toBe(true);
  });

  it("maps a VRBO-style listing", () => {
    const p = normalizeListing("vrbo", { listingId: "321.1", headline: "Mountain cabin", geoCode: { latitude: 35.6, longitude: -82.5 }, maxOccupancy: 6, amenities: [{ name: "Kitchenette" }, { name: "Fire pit" }] });
    expect(p).toMatchObject({ source: "vrbo", externalId: "321.1", name: "Mountain cabin", lat: 35.6, kitchen: "kitchenette", amenities: ["Kitchenette", "Fire pit"] });
  });
});

describe("webhook signatures", () => {
  it("signs t.body with HMAC-SHA256", () => {
    const sig = signWebhook("whsec_test", '{"a":1}', 1700000000);
    const expected = createHmac("sha256", "whsec_test").update('1700000000.{"a":1}').digest("hex");
    expect(sig).toBe(`t=1700000000,v1=${expected}`);
  });
});

describe("structured-output schema", () => {
  it("closes every object and keeps enums", () => {
    const s = JSON.stringify(toStrictJsonSchema(PlanDraftSchema));
    expect(s).toContain('"enum":["cook-in","eat-out"]');
    expect(s).not.toContain("$schema");
    const walk = (n: unknown): void => {
      if (Array.isArray(n)) return n.forEach(walk);
      if (!n || typeof n !== "object") return;
      const o = n as Record<string, unknown>;
      if (o.type === "object") expect(o.additionalProperties).toBe(false);
      Object.values(o).forEach(walk);
    };
    walk(toStrictJsonSchema(PlanDraftSchema));
  });
});

describe("HTML export", () => {
  it("escapes model-written text", () => {
    const w = wizard();
    const days = buildDays(w.startDate, w.nights);
    const venues = buildVenues(brief(), { restaurants: brief().restaurants.map(() => null), activities: brief().activities.map(() => null), stores: [null] });
    const p = { ...plan(), title: '<script>alert("x")</script>' };
    const trip = assembleTrip({ wizard: w, days, brief: brief(), venues, sources: [], plan: p, normalized: normalizePlan(p, days, venues, w), recipes: [], recipeIssues: [], models: [], webSearches: 0 });
    const html = renderTripHtml(trip, { slug: "abc123def456" });
    expect(html).not.toContain('<script>alert("x")</script>');
    expect(html).toContain("&lt;script&gt;");
    expect(html.match(/<script>/g)).toHaveLength(1); // only our own tab script
  });
});

describe("JSON fallback parsing", () => {
  it("accepts plain, fenced, or chatty JSON replies", async () => {
    const { extractJson } = await import("../claude");
    expect(extractJson('{"a":1}')).toEqual({ a: 1 });
    expect(extractJson('```json\n{"a":2}\n```')).toEqual({ a: 2 });
    expect(extractJson('Here you go: {"a":{"b":3}} hope that helps')).toEqual({ a: { b: 3 } });
    expect(() => extractJson("no json here")).toThrow();
  });
});
