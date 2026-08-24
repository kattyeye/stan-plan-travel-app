/**
 * Lodging partner deep links.
 *
 * ## What is actually possible today
 * There is no general-purpose booking API for short-term rentals:
 *
 * - **Airbnb** — the public affiliate programme ended in 2021 and there is no
 *   public booking API. The "Airbnb Creators" programme is invite-only and runs
 *   through Impact. So we can deep-link, but realistically cannot monetize it.
 * - **Booking.com** — free, open affiliate programme with an `aid` deep-link
 *   parameter and a Demand API for live pricing. This is the realistic revenue
 *   path, and the only partner here that pays without prior approval.
 * - **Vrbo / Expedia** — Expedia Group Affiliate Programme, approval required.
 *
 * So this module builds *prefilled search URLs*, behind a registry, so that
 * when an API or affiliate approval does arrive only the builder changes and no
 * caller does. Affiliate IDs are optional everywhere: links work with none set
 * and start earning the moment one is.
 *
 * ⚠️ Partner URL parameters are undocumented and change without notice. Verify
 * each link actually prefills by clicking it before relying on it.
 *
 * Platform-free — safe to import from React Native.
 */

export interface StaySearch {
  destination: string;
  /** YYYY-MM-DD */
  checkIn?: string;
  checkOut?: string;
  adults: number;
  children?: number;
  bedrooms?: number;
}

export interface AffiliateConfig {
  /** Booking.com affiliate id (`aid`). Free programme, no approval needed. */
  bookingAid?: string;
  /** Expedia Group / Vrbo affiliate id. Requires approval. */
  expediaAffiliateId?: string;
}

export interface Partner {
  id: "airbnb" | "vrbo" | "booking";
  label: string;
  /** Shown in the UI so the traveller knows why these differ. */
  note: string;
  /** Whether a link from this partner currently earns commission. */
  earns(config: AffiliateConfig): boolean;
  buildSearchUrl(search: StaySearch, config: AffiliateConfig): string;
}

function clean(search: StaySearch) {
  return {
    destination: search.destination.trim(),
    adults: Math.max(1, Math.floor(search.adults || 1)),
    children: Math.max(0, Math.floor(search.children ?? 0)),
    bedrooms: search.bedrooms && search.bedrooms > 0 ? Math.floor(search.bedrooms) : undefined,
    checkIn: isIsoDate(search.checkIn) ? search.checkIn : undefined,
    checkOut: isIsoDate(search.checkOut) ? search.checkOut : undefined,
  };
}

function isIsoDate(value: string | undefined): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

/** Append only the params that have values, so we never send `checkin=undefined`. */
function withParams(base: string, params: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") search.set(key, String(value));
  }
  const query = search.toString();
  return query ? `${base}?${query}` : base;
}

export const PARTNERS: Partner[] = [
  {
    id: "airbnb",
    label: "Airbnb",
    note: "Whole homes and private rooms",
    earns: () => false, // No public affiliate programme — see module docs.
    buildSearchUrl(search) {
      const s = clean(search);
      return withParams(`https://www.airbnb.com/s/${encodeURIComponent(s.destination)}/homes`, {
        checkin: s.checkIn,
        checkout: s.checkOut,
        adults: s.adults,
        children: s.children || undefined,
        min_bedrooms: s.bedrooms,
      });
    },
  },
  {
    id: "vrbo",
    label: "Vrbo",
    note: "Whole homes only — good for groups",
    earns: (config) => Boolean(config.expediaAffiliateId),
    buildSearchUrl(search, config) {
      const s = clean(search);
      return withParams("https://www.vrbo.com/search", {
        q: s.destination,
        arrival: s.checkIn,
        departure: s.checkOut,
        adults: s.adults,
        children: s.children || undefined,
        minBedrooms: s.bedrooms,
        // Expedia's affiliate parameter; omitted entirely when unapproved.
        siteid: config.expediaAffiliateId,
      });
    },
  },
  {
    id: "booking",
    label: "Booking.com",
    note: "Hotels plus apartments",
    earns: (config) => Boolean(config.bookingAid),
    buildSearchUrl(search, config) {
      const s = clean(search);
      return withParams("https://www.booking.com/searchresults.html", {
        ss: s.destination,
        checkin: s.checkIn,
        checkout: s.checkOut,
        group_adults: s.adults,
        group_children: s.children || undefined,
        // Deliberately always 1: Booking.com's `no_rooms` means separate
        // bookable rooms, not bedrooms within a unit. Mapping "3 bedrooms" to
        // no_rooms=3 would search for three separate hotel rooms.
        no_rooms: 1,
        aid: config.bookingAid,
      });
    },
  },
];

export interface StayLink {
  id: Partner["id"];
  label: string;
  note: string;
  url: string;
  /** True when the link carries an affiliate id that actually pays. */
  earns: boolean;
}

export function buildStayLinks(search: StaySearch, config: AffiliateConfig = {}): StayLink[] {
  return PARTNERS.map((partner) => ({
    id: partner.id,
    label: partner.label,
    note: partner.note,
    url: partner.buildSearchUrl(search, config),
    earns: partner.earns(config),
  }));
}
