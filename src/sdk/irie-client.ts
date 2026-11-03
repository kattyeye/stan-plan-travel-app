/**
 * Irie client SDK — a small, dependency-free wrapper around /api/v1/client
 * for mobile apps (React Native / Expo), browser extensions and other front
 * ends. Works anywhere `fetch` exists.
 *
 *   const irie = new IrieClient({ baseUrl: "https://irietravel.app", clientName: "ios/1.0.0" });
 *   const { suggestions } = await irie.searchPlaces("corf");
 *   const created = await irie.createTrip({ destination: "Corfu, Greece", startDate: "2027-06-10", endDate: "2027-06-15", email: "me@example.com" });
 *   if (created.payment === "checkout") openInAppBrowser(created.checkoutUrl!);
 *   const plan = await irie.waitForTrip(created.id, { onProgress: (t) => render(t.progress) });
 *
 * To use it outside this repo, copy this file together with src/types/trip.ts
 * (the only import, types only) — or publish both as a package.
 */
import type { GeneratedTrip, TripProgress, TripStatus } from "../types/trip";

export type { GeneratedTrip, TripProgress, TripStatus };

// ─── Types ───────────────────────────────────────────────────────────────────

export interface Option<V extends string = string> {
  value: V;
  label: string;
  emoji?: string;
  desc?: string;
}

export interface ClientConfig {
  apiVersion: string;
  pricing: { currency: string; priceCents: number; firstPlanFree: boolean; paymentsEnabled: boolean };
  limits: { maxNights: number; maxAdults: number; maxKids: number; maxKidAge: number };
  options: {
    tripTypes: Option[];
    vibes: Option[];
    planningStyles: Option[];
    budgets: Option[];
    travelMethods: Option[];
    cookInRatios: Option[];
    dietary: string[];
    cuisines: string[];
    amenities: string[];
    sections: Option[];
    defaultSections: string[];
  };
}

export interface DestinationSuggestion {
  id: string;
  label: string;
  mainText: string;
  secondaryText: string;
}

export interface Suggestions {
  tripTypes: string[];
  vibes: string[];
  cuisines: string[];
  amenities: string[];
}

/** Wizard answers. Only destination, dates and email are required; the rest have defaults. */
export interface TripInput {
  destination: string;
  /** YYYY-MM-DD */
  startDate: string;
  /** YYYY-MM-DD */
  endDate: string;
  email: string;
  tripNickname?: string;
  tripType?: string;
  numAdults?: number;
  numKids?: number;
  kidAges?: number[];
  planningStyle?: "structured" | "balanced" | "flexible";
  budget?: "budget" | "moderate" | "splurge";
  vibes?: string[];
  travelMethod?: "car" | "plane" | "train" | "other";
  cookInRatio?: "mostly-in" | "mix" | "mostly-out";
  dietaryRestrictions?: string[];
  cuisinePreferences?: string[];
  propertyDescription?: string;
  propertyAmenities?: string[];
  sections?: string[];
}

export interface CreatedTrip {
  id: string;
  /** "free": generation already started. "checkout": open checkoutUrl first. */
  payment: "free" | "checkout";
  checkoutUrl: string | null;
  urls: { web: string; api: string; download: string };
}

export interface TripStatusView {
  id: string;
  status: TripStatus;
  tripNickname: string;
  destination: string;
  startDate: string;
  endDate: string;
  progress: TripProgress | null;
  errorMessage: string | null;
}

export type IrieErrorType =
  | "invalid_request"
  | "not_found"
  | "payment_required"
  | "rate_limited"
  | "storage_unavailable"
  | "server_error"
  | "network_error"
  | "timeout";

export class IrieApiError extends Error {
  constructor(
    message: string,
    readonly type: IrieErrorType,
    readonly status: number,
    /** Field-level validation messages, e.g. { endDate: "Trips can be up to 21 nights" }. */
    readonly fields?: Record<string, string>,
    readonly retryAfter?: number,
    /** For payment_required: "used" | "ip_limit" | "daily_cap" | "disabled". */
    readonly reason?: string
  ) {
    super(message);
    this.name = "IrieApiError";
  }
}

// ─── Client ──────────────────────────────────────────────────────────────────

export class IrieClient {
  private readonly baseUrl: string;
  private readonly fetchImpl: typeof fetch;
  private readonly clientName?: string;

  constructor(opts: { baseUrl?: string; fetch?: typeof fetch; clientName?: string } = {}) {
    this.baseUrl = (opts.baseUrl ?? "https://irietravel.app").replace(/\/$/, "");
    this.fetchImpl = opts.fetch ?? fetch.bind(globalThis);
    this.clientName = opts.clientName;
  }

  private async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    let res: Response;
    try {
      res = await this.fetchImpl(`${this.baseUrl}/api/v1/client${path}`, {
        ...init,
        headers: {
          Accept: "application/json",
          ...(init.body ? { "Content-Type": "application/json" } : {}),
          ...(this.clientName ? { "X-Irie-Client": this.clientName } : {}),
          ...(init.headers as Record<string, string> | undefined),
        },
      });
    } catch (err) {
      throw new IrieApiError(err instanceof Error ? err.message : "Network error", "network_error", 0);
    }
    const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (!res.ok) {
      const e = (json.error ?? {}) as { type?: IrieErrorType; message?: string; fields?: Record<string, string>; retryAfter?: number; reason?: string };
      throw new IrieApiError(e.message ?? `HTTP ${res.status}`, e.type ?? "server_error", res.status, e.fields, e.retryAfter, e.reason);
    }
    return json as T;
  }

  /** Wizard options, limits and pricing. Cache for an hour. */
  config(): Promise<ClientConfig> {
    return this.request("/config");
  }

  /** Destination autocomplete. Debounce ~250ms; pass one session id per search box focus. */
  async searchPlaces(query: string, session?: string): Promise<{ suggestions: DestinationSuggestion[] }> {
    const params = new URLSearchParams({ q: query, ...(session ? { session } : {}) });
    return this.request(`/places?${params}`);
  }

  /** Which trip types, vibes, cuisines and amenities fit a destination. */
  suggestions(destination: string, kids = 0): Promise<Suggestions> {
    return this.request(`/suggestions?${new URLSearchParams({ destination, kids: String(kids) })}`);
  }

  createTrip(trip: TripInput, opts: { draftId?: string } = {}): Promise<CreatedTrip> {
    return this.request("/trips", { method: "POST", body: JSON.stringify({ trip, ...(opts.draftId ? { draftId: opts.draftId } : {}) }) });
  }

  getTrip(id: string, opts: { plan?: boolean } = {}): Promise<{ trip: TripStatusView; plan: GeneratedTrip | null }> {
    return this.request(`/trips/${encodeURIComponent(id)}${opts.plan === false ? "?plan=false" : ""}`);
  }

  /** Nudges a stalled build; `retry: true` after an error. Safe to call often. */
  resume(id: string, opts: { retry?: boolean; sessionId?: string } = {}): Promise<{ status: TripStatus; progress: TripProgress | null; started: boolean }> {
    return this.request(`/trips/${encodeURIComponent(id)}/resume`, { method: "POST", body: JSON.stringify(opts) });
  }

  /** URL of the offline HTML export (open or download it once status is "ready"). */
  downloadUrl(id: string): string {
    return `${this.baseUrl}/api/v1/client/trips/${encodeURIComponent(id)}/download`;
  }

  /**
   * Polls until the plan is ready (typically 3–5 minutes), nudging stalled
   * builds every 30s. Rejects with IrieApiError on "error" status or timeout.
   */
  async waitForTrip(
    id: string,
    opts: { onProgress?: (trip: TripStatusView) => void; intervalMs?: number; timeoutMs?: number; signal?: AbortSignal } = {}
  ): Promise<GeneratedTrip> {
    const interval = opts.intervalMs ?? 4000;
    const deadline = Date.now() + (opts.timeoutMs ?? 12 * 60_000);
    let lastNudge = 0;
    while (true) {
      if (opts.signal?.aborted) throw new IrieApiError("Cancelled", "timeout", 0);
      const { trip, plan } = await this.getTrip(id, { plan: true });
      opts.onProgress?.(trip);
      if (trip.status === "ready" && plan) return plan;
      if (trip.status === "error") throw new IrieApiError(trip.errorMessage ?? "Generation failed", "server_error", 200);
      if (Date.now() > deadline) throw new IrieApiError("Timed out waiting for the plan", "timeout", 0);
      if (trip.status !== "pending" && Date.now() - lastNudge > 30_000) {
        lastNudge = Date.now();
        await this.resume(id).catch(() => undefined);
      }
      await new Promise((r) => setTimeout(r, interval));
    }
  }
}
