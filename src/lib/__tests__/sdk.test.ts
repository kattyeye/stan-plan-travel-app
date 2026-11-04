import { describe, expect, it, vi } from "vitest";
import { IrieApiError, IrieClient } from "../../sdk/irie-client";

const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

describe("IrieClient", () => {
  it("calls the client API with the right paths and headers", async () => {
    const fetch = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => json(200, { suggestions: [] }));
    const irie = new IrieClient({ baseUrl: "https://irie.test/", fetch, clientName: "ios/1.0" });
    await irie.searchPlaces("corf", "s1");
    const [url, init] = fetch.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://irie.test/api/v1/client/places?q=corf&session=s1");
    expect((init.headers as Record<string, string>)["X-Irie-Client"]).toBe("ios/1.0");
  });

  it("turns error envelopes into typed errors", async () => {
    const fetch = vi.fn(async () => json(402, { error: { type: "payment_required", message: "Used", reason: "used" } }));
    const irie = new IrieClient({ fetch });
    const err = await irie.createTrip({ destination: "x", startDate: "2030-01-01", endDate: "2030-01-02", email: "a@b.co" }).catch((e) => e);
    expect(err).toBeInstanceOf(IrieApiError);
    expect(err).toMatchObject({ type: "payment_required", status: 402, reason: "used" });
  });

  it("waits for a plan, reporting progress and nudging stalled builds", async () => {
    const statuses = ["generating", "generating", "ready"];
    const fetch = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("/resume")) return json(200, { status: "generating", progress: null, started: false });
      const status = statuses.shift()!;
      return json(200, { trip: { id: "t1", status, progress: { stage: "plan", percent: 50 } }, plan: status === "ready" ? { meta: { title: "Done" } } : null });
    });
    const irie = new IrieClient({ fetch });
    const seen: string[] = [];
    const plan = await irie.waitForTrip("t1", { intervalMs: 1, onProgress: (t) => seen.push(t.status) });
    expect(plan).toEqual({ meta: { title: "Done" } });
    expect(seen).toEqual(["generating", "generating", "ready"]);
    expect(fetch.mock.calls.some(([u]) => String(u).endsWith("/t1/resume"))).toBe(true);
  });

  it("rejects when the build errors", async () => {
    const fetch = vi.fn(async () => json(200, { trip: { id: "t1", status: "error", errorMessage: "Nope" }, plan: null }));
    await expect(new IrieClient({ fetch }).waitForTrip("t1", { intervalMs: 1 })).rejects.toMatchObject({ message: "Nope" });
  });
});
