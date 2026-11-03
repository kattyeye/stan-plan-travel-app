import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { claimFreePlan, normalizeEmail, releaseFreePlan } from "../billing";
import { __setKVForTests, createMemoryKV } from "../kv";

describe("free first plan", () => {
  beforeEach(() => __setKVForTests(createMemoryKV()));
  afterEach(() => {
    __setKVForTests(null);
    delete process.env.IRIE_FREE_DAILY_CAP;
    delete process.env.IRIE_FREE_FIRST_PLAN;
  });

  it("treats aliases of one inbox as the same email", () => {
    expect(normalizeEmail(" Jane.Doe+trips@GoogleMail.com ")).toBe("janedoe@gmail.com");
    expect(normalizeEmail("jane.doe+x@example.com")).toBe("jane.doe@example.com");
  });

  it("gives each email one free plan, even via aliases", async () => {
    expect(await claimFreePlan("jane.doe@gmail.com", "1.1.1.1")).toEqual({ free: true });
    expect(await claimFreePlan("janedoe+2@gmail.com", "2.2.2.2")).toEqual({ free: false, reason: "used" });
  });

  it("limits free plans per network per day", async () => {
    expect((await claimFreePlan("a@x.com", "9.9.9.9")).free).toBe(true);
    expect((await claimFreePlan("b@x.com", "9.9.9.9")).free).toBe(true);
    expect(await claimFreePlan("c@x.com", "9.9.9.9")).toEqual({ free: false, reason: "ip_limit" });
  });

  it("enforces the site-wide daily cap", async () => {
    process.env.IRIE_FREE_DAILY_CAP = "1";
    expect((await claimFreePlan("a@x.com", "1.1.1.1")).free).toBe(true);
    expect(await claimFreePlan("b@x.com", "2.2.2.2")).toEqual({ free: false, reason: "daily_cap" });
  });

  it("can be released if creating the trip fails, and switched off", async () => {
    await claimFreePlan("a@x.com", "1.1.1.1");
    await releaseFreePlan("a@x.com");
    expect((await claimFreePlan("a@x.com", "3.3.3.3")).free).toBe(true);
    process.env.IRIE_FREE_FIRST_PLAN = "false";
    expect(await claimFreePlan("new@x.com", "4.4.4.4")).toEqual({ free: false, reason: "disabled" });
  });
});
