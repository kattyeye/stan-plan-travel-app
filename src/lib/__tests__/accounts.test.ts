import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/server", async (orig) => ({ ...(await orig<typeof import("next/server")>()), after: vi.fn() }));
vi.mock("../pipeline", () => ({ runPipeline: vi.fn() }));

import { __setKVForTests, createMemoryKV, getKV } from "../kv";
import { createTrip, getTripBySlug, listUserTrips } from "../db";
import { addBetaTester } from "../beta";
import { claimFreePlan } from "../billing";
import { startTrip } from "../trips/start";
import { wizard } from "./fixtures";

describe("accounts", () => {
  beforeEach(() => __setKVForTests(createMemoryKV()));
  afterEach(() => __setKVForTests(null));

  it("lists a traveller's trips across inbox aliases, including trips from before accounts", async () => {
    await createTrip({ slug: "aaaaaa1", email: "Jane.Doe@gmail.com", tripNickname: "One", wizardData: wizard() });
    await createTrip({ slug: "bbbbbb2", email: "someone@else.com", tripNickname: "Other", wizardData: wizard() });
    // A legacy trip that was never added to the per-traveller index:
    const kv = getKV();
    const legacy = { ...(await getTripBySlug("aaaaaa1"))!, slug: "cccccc3", tripNickname: "Legacy" };
    await kv.set("trip:cccccc3", legacy);
    await kv.zadd("trips:index", Date.now() + 1000, "cccccc3");
    const mine = await listUserTrips("janedoe+anything@gmail.com");
    expect(mine.map((t) => t.tripNickname).sort()).toEqual(["Legacy", "One"]);
  });

  it("gives beta testers comp plans without using up their free plan", async () => {
    await addBetaTester("beta@x.com");
    const r = await startTrip({ wizardData: wizard({ email: "beta@x.com" }), ip: "1.2.3.4", origin: "https://irietravel.app" });
    expect(r).toMatchObject({ ok: true, payment: "free" });
    const t = await getTripBySlug((r as { slug: string }).slug);
    expect(t).toMatchObject({ status: "paid", billing: "comp" });
    // Their one free plan is still unclaimed.
    expect(await claimFreePlan("beta@x.com", "5.6.7.8")).toEqual({ free: true });
  });

  it("still gives everyone else exactly one free plan", async () => {
    const first = await startTrip({ wizardData: wizard({ email: "new@x.com" }), ip: "1.1.1.1", origin: "https://irietravel.app" });
    expect(first).toMatchObject({ ok: true, payment: "free" });
    expect((await getTripBySlug((first as { slug: string }).slug))?.billing).toBe("free");
    const second = await startTrip({ wizardData: wizard({ email: "new@x.com" }), ip: "1.1.1.1", origin: "https://irietravel.app" });
    expect(second).toMatchObject({ ok: false, status: 402 });
  });
});
