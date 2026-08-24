import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { sanitizeIntent } from "../../lib/intent";
import { applyDefaults, calcNights, missingRequiredFields } from "../wizard-machine";

describe("sanitizeIntent — the untrusted-model boundary", () => {
  it("keeps recognized values", () => {
    const { data, interpretation } = sanitizeIntent({
      destination: "Nassau, Bahamas",
      nights: 4,
      planningStyle: "flexible",
      bedrooms: 2,
      vibes: ["adventurous", "nature"],
      propertyDescription: "Wants to swim with stingrays",
      interpretation: "4 nights in the Bahamas, flexible.",
    });
    assert.equal(data.destination, "Nassau, Bahamas");
    assert.equal(data.nights, 4);
    assert.equal(data.planningStyle, "flexible");
    assert.equal(data.bedrooms, 2);
    assert.deepEqual(data.vibes, ["adventurous", "nature"]);
    assert.equal(interpretation, "4 nights in the Bahamas, flexible.");
  });

  it("drops enum values that aren't in the allowlist", () => {
    const { data } = sanitizeIntent({
      planningStyle: "whatever",
      budget: "free",
      tripType: "space station",
      travelMethod: "teleport",
      cookInRatio: "never",
      vibes: ["adventurous", "chaotic", "<script>"],
    });
    assert.equal(data.planningStyle, undefined);
    assert.equal(data.budget, undefined);
    assert.equal(data.tripType, undefined);
    assert.equal(data.travelMethod, undefined);
    assert.equal(data.cookInRatio, undefined);
    assert.deepEqual(data.vibes, ["adventurous"], "only the known vibe survives");
  });

  it("rejects malformed and impossible dates", () => {
    assert.equal(sanitizeIntent({ startDate: "next Tuesday" }).data.startDate, undefined);
    assert.equal(sanitizeIntent({ startDate: "2026-13-45" }).data.startDate, undefined);
    assert.equal(sanitizeIntent({ startDate: "2026-08-14" }).data.startDate, "2026-08-14");
  });

  it("rejects out-of-range and non-numeric counts", () => {
    assert.equal(sanitizeIntent({ numAdults: 0 }).data.numAdults, undefined);
    assert.equal(sanitizeIntent({ numAdults: 9999 }).data.numAdults, undefined);
    assert.equal(sanitizeIntent({ numAdults: "four" }).data.numAdults, undefined);
    assert.equal(sanitizeIntent({ numKids: 0 }).data.numKids, 0, "zero kids is meaningful");
  });

  it("omits keys entirely rather than emitting undefined values", () => {
    const { data } = sanitizeIntent({ destination: "Austin" });
    assert.deepEqual(Object.keys(data), ["destination"]);
  });

  it("survives junk input without throwing", () => {
    for (const junk of [null, undefined, 42, "string", [], { vibes: "not-an-array" }]) {
      assert.doesNotThrow(() => sanitizeIntent(junk));
    }
  });

  it("truncates over-long free text instead of storing it", () => {
    const { data } = sanitizeIntent({ propertyDescription: "x".repeat(5000) });
    assert.equal(data.propertyDescription?.length, 600);
  });
});

describe("missingRequiredFields", () => {
  it("lists everything for an empty intake", () => {
    assert.deepEqual(missingRequiredFields({}), [
      "destination", "startDate", "endDate", "numAdults", "email",
    ]);
  });

  it("reports exactly what the Bahamas example is still missing", () => {
    // "4 days in the Bahamas, swim with stingrays, I'm flexible, 2 bedroom place"
    const parsed = sanitizeIntent({
      destination: "Nassau, Bahamas",
      nights: 4,
      planningStyle: "flexible",
      bedrooms: 2,
      vibes: ["adventurous"],
    }).data;
    assert.deepEqual(missingRequiredFields(parsed), [
      "startDate", "endDate", "numAdults", "email",
    ], "must ask for dates rather than invent them");
  });

  it("accepts a complete intake", () => {
    assert.deepEqual(
      missingRequiredFields({
        destination: "Nassau",
        startDate: "2026-08-14",
        endDate: "2026-08-18",
        numAdults: 2,
        email: "a@b.com",
      }),
      [],
    );
  });

  it("rejects a malformed email", () => {
    assert.deepEqual(
      missingRequiredFields({
        destination: "Nassau", startDate: "2026-08-14", endDate: "2026-08-18",
        numAdults: 2, email: "not-an-email",
      }),
      ["email"],
    );
  });
});

describe("applyDefaults", () => {
  it("fills every optional field so generation never sees a gap", () => {
    const full = applyDefaults({ destination: "Nassau", startDate: "2026-08-14", endDate: "2026-08-18" });
    assert.equal(full.planningStyle, "balanced");
    assert.equal(full.budget, "moderate");
    assert.equal(full.cookInRatio, "mix");
    assert.equal(full.numAdults, 2);
    assert.equal(full.nights, 4);
    assert.equal(full.tripNickname, "Nassau", "falls back to the destination");
    assert.equal(full.sections.length, 6);
  });

  it("never overwrites a value the traveller gave", () => {
    const full = applyDefaults({ destination: "Nassau", planningStyle: "flexible", numAdults: 6 });
    assert.equal(full.planningStyle, "flexible");
    assert.equal(full.numAdults, 6);
  });
});

describe("calcNights", () => {
  it("counts whole nights and refuses unusable input", () => {
    assert.equal(calcNights("2026-08-14", "2026-08-18"), 4);
    assert.equal(calcNights("2026-08-14", "2026-08-14"), 0);
    assert.equal(calcNights("nope", "2026-08-18"), 0);
    assert.equal(calcNights(undefined, undefined), 0);
  });
});
