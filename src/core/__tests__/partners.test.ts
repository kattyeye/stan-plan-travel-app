import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { buildStayLinks } from "../partners";
import { normalizeReferralCode, referralUrl } from "../referral";

const search = {
  destination: "Outer Banks, NC",
  checkIn: "2026-08-14",
  checkOut: "2026-08-21",
  adults: 4,
  children: 2,
  bedrooms: 3,
};

describe("buildStayLinks", () => {
  it("prefills destination, dates, guests and bedrooms on every partner", () => {
    for (const link of buildStayLinks(search)) {
      const url = new URL(link.url);
      // The destination lands in the path (Airbnb) or a query value (Vrbo,
      // Booking). URLSearchParams encodes spaces as "+", so read the decoded
      // values rather than the raw query string.
      const inPath = decodeURIComponent(url.pathname).includes("Outer Banks");
      const inQuery = [...url.searchParams.values()].some((v) => v.includes("Outer Banks"));
      assert.ok(inPath || inQuery, `${link.id} is missing the destination`);
      assert.ok(url.search.includes("2026-08-14"), `${link.id} is missing the check-in date`);
      assert.ok(url.search.includes("2026-08-21"), `${link.id} is missing the check-out date`);
    }
  });

  it("omits params entirely when dates are unknown, rather than sending junk", () => {
    const links = buildStayLinks({ destination: "Austin, TX", adults: 2 });
    for (const link of links) {
      assert.equal(link.url.includes("undefined"), false, `${link.id} leaked undefined`);
      assert.equal(/checkin=&|arrival=&/.test(link.url), false, `${link.id} sent an empty date`);
    }
  });

  it("adds an affiliate id only where one is configured", () => {
    const links = buildStayLinks(search, { bookingAid: "12345" });
    const booking = links.find((l) => l.id === "booking")!;
    const airbnb = links.find((l) => l.id === "airbnb")!;

    assert.ok(booking.url.includes("aid=12345"));
    assert.equal(booking.earns, true);
    // Airbnb has no public affiliate programme, so it can never earn.
    assert.equal(airbnb.earns, false);
    assert.equal(airbnb.url.includes("aid="), false);
  });

  it("earns nothing when no affiliate ids are set, but still builds links", () => {
    const links = buildStayLinks(search, {});
    assert.equal(links.every((l) => !l.earns), true);
    assert.equal(links.length, 3);
  });

  it("does not map bedrooms onto Booking.com's room count", () => {
    // `no_rooms` means separate bookable rooms, not bedrooms in one unit.
    const booking = buildStayLinks(search).find((l) => l.id === "booking")!;
    assert.ok(booking.url.includes("no_rooms=1"));
  });

  it("guards against nonsense group sizes", () => {
    const links = buildStayLinks({ destination: "Aspen", adults: 0, children: -3 });
    for (const link of links) {
      assert.equal(link.url.includes("-3"), false);
      assert.equal(/adults=0|group_adults=0/.test(link.url), false);
    }
  });
});

describe("normalizeReferralCode", () => {
  it("accepts and lowercases plausible handles", () => {
    assert.equal(normalizeReferralCode("TravelWithSam"), "travelwithsam");
    assert.equal(normalizeReferralCode("sam_travels-2"), "sam_travels-2");
  });

  it("rejects anything that isn't a simple handle", () => {
    for (const bad of ["", "  ", "a", "-nope", "<script>", "has space", "semi;colon", null, undefined]) {
      assert.equal(normalizeReferralCode(bad), null, `should reject ${JSON.stringify(bad)}`);
    }
  });

  it("truncates absurdly long input instead of storing it", () => {
    assert.equal(normalizeReferralCode("a".repeat(200))?.length, 40);
  });
});

describe("referralUrl", () => {
  it("builds a creator share link", () => {
    assert.equal(referralUrl("https://irie.app", "TravelWithSam"), "https://irie.app/?ref=travelwithsam");
  });

  it("omits an invalid code rather than embedding it", () => {
    assert.equal(referralUrl("https://irie.app", "has space"), "https://irie.app/");
  });
});
