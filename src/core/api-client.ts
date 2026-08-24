/**
 * Typed client for the Irie v1 API.
 *
 * This is the seam a React Native app builds on: it has no web dependencies,
 * takes its own `baseUrl` and `fetch`, and returns the same types the web uses.
 *
 *   const irie = createIrieClient({ baseUrl: "https://irie.app" });
 *   const { slug, url } = await irie.createTrip({ wizardData });
 *
 * Platform-free — safe to import from React Native.
 */

import type { ParseIntentResult } from "./intent";
import type { StayLink } from "./partners";
import type { NormalizedTrip, TripStatus, WizardData } from "./types";

export interface IrieClientOptions {
  /** e.g. "https://irie.app". No trailing slash required. */
  baseUrl: string;
  /** Defaults to global fetch. Inject for tests or a custom transport. */
  fetch?: typeof fetch;
  /** Merged into every request — auth headers, tracing, etc. */
  headers?: Record<string, string>;
}

export interface CreateTripResponse {
  slug: string;
  /** Send the user here: Stripe Checkout, or the generating page in dev. */
  url: string;
}

export interface TripResponse {
  slug: string;
  status: TripStatus;
  tripNickname: string;
  destination?: string;
  createdAt: string;
  wizardData?: WizardData;
  /** Present only when status is "ready". Already normalized. */
  trip?: NormalizedTrip;
}

export interface GenerateResponse {
  slug: string;
  status: "ready" | "generating";
  alreadyGenerating?: boolean;
}

export interface BookingLinksResponse {
  slug: string;
  destination: string;
  links: StayLink[];
}

export interface SuggestResponse {
  tripTypes: string[];
  vibes: string[];
  cuisines: string[];
  amenities: string[];
}

export class IrieApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly body: unknown,
  ) {
    super(message);
    this.name = "IrieApiError";
  }
}

export function createIrieClient(options: IrieClientOptions) {
  const base = options.baseUrl.replace(/\/+$/, "");
  const doFetch = options.fetch ?? globalThis.fetch;

  async function request<T>(path: string, init?: RequestInit): Promise<T> {
    const res = await doFetch(`${base}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
        ...init?.headers,
      },
    });

    const text = await res.text();
    let body: unknown = null;
    try {
      body = text ? JSON.parse(text) : null;
    } catch {
      body = text;
    }

    if (!res.ok) {
      const message =
        (body && typeof body === "object" && "error" in body && typeof body.error === "string"
          ? body.error
          : null) ?? `Request failed (${res.status})`;
      throw new IrieApiError(message, res.status, body);
    }
    return body as T;
  }

  return {
    /** Create a trip and get a checkout URL. */
    createTrip(input: { wizardData: Partial<WizardData>; referralCode?: string }) {
      return request<CreateTripResponse>("/api/v1/trips", {
        method: "POST",
        body: JSON.stringify(input),
      });
    },

    /** Status, and the normalized plan once ready. Poll this while generating. */
    getTrip(slug: string) {
      return request<TripResponse>(`/api/v1/trips/${encodeURIComponent(slug)}`);
    },

    /** Idempotent — safe to call from more than one place. */
    generateTrip(slug: string) {
      return request<GenerateResponse>(`/api/v1/trips/${encodeURIComponent(slug)}/generate`, {
        method: "POST",
      });
    },

    /**
     * Natural-language intake. Send plain text from whatever recognizer the
     * platform provides — the server never sees audio.
     */
    parseIntent(text: string) {
      return request<ParseIntentResult>("/api/v1/parse-intent", {
        method: "POST",
        body: JSON.stringify({ text }),
      });
    },

    /** Destination-aware option suggestions for the wizard. */
    suggest(input: { destination: string; numKids?: number }) {
      return request<SuggestResponse>("/api/v1/suggest", {
        method: "POST",
        body: JSON.stringify(input),
      });
    },

    /** Prefilled lodging searches for this trip. */
    bookingLinks(slug: string) {
      return request<BookingLinksResponse>(
        `/api/v1/trips/${encodeURIComponent(slug)}/booking-links`,
      );
    },

    /**
     * URL of the .ics file. On React Native, prefer building events locally
     * with buildTripEvents() + expo-calendar — no download, no round trip.
     */
    calendarUrl(slug: string, include: "all" | "activities" | "meals" = "all") {
      return `${base}/api/v1/trips/${encodeURIComponent(slug)}/calendar.ics?include=${include}`;
    },

    /** URL of the self-contained HTML rendering. */
    downloadUrl(slug: string) {
      return `${base}/api/v1/trips/${encodeURIComponent(slug)}/download`;
    },
  };
}

export type IrieClient = ReturnType<typeof createIrieClient>;
