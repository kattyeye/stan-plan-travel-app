import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { addBetaTester, claimBetaPlan, isBetaTester, listBetaTesters, removeBetaTester } from "../beta";
import { __setKVForTests, createMemoryKV } from "../kv";

describe("beta testers", () => {
  beforeEach(() => __setKVForTests(createMemoryKV()));
  afterEach(() => {
    __setKVForTests(null);
    delete process.env.IRIE_BETA_DAILY_LIMIT;
  });

  it("are added, matched across inbox aliases, listed and removed", async () => {
    await addBetaTester("Jane.Doe@gmail.com", { note: "  friend  ", addedBy: "kat@example.com" });
    expect(await isBetaTester("janedoe+trips@gmail.com")).toBe(true);
    expect(await isBetaTester("someone@else.com")).toBe(false);
    await addBetaTester("jane.doe@gmail.com"); // re-adding doesn't duplicate
    expect((await listBetaTesters()).map((t) => t.email)).toEqual(["jane.doe@gmail.com"]);
    await removeBetaTester("JANEDOE@gmail.com");
    expect(await isBetaTester("jane.doe@gmail.com")).toBe(false);
    expect(await listBetaTesters()).toEqual([]);
  });

  it("get free plans up to the daily safety cap", async () => {
    process.env.IRIE_BETA_DAILY_LIMIT = "2";
    expect(await claimBetaPlan("t@x.com")).toBe(false);
    await addBetaTester("t@x.com");
    expect(await claimBetaPlan("t@x.com")).toBe(true);
    expect(await claimBetaPlan("t@x.com")).toBe(true);
    expect(await claimBetaPlan("t@x.com")).toBe(false);
  });
});
