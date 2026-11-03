import type { PropertyContext } from "@/types/trip";

/**
 * Listing adapters turn a partner's listing payload into our PropertyContext.
 *
 * Partners can always send PropertyContext directly (`listingFormat: "irie"`).
 * The Airbnb and VRBO adapters accept the field names those platforms use in
 * their listing exports and partner feeds; confirm the exact payload with each
 * partner during onboarding and extend the mappings here — nothing else in the
 * app needs to change.
 */

export type ListingFormat = "irie" | "airbnb" | "vrbo";

type Raw = Record<string, unknown>;

const str = (v: unknown): string | undefined => (typeof v === "string" && v.trim() ? v.trim() : typeof v === "number" ? String(v) : undefined);
const num = (v: unknown): number | undefined => {
  const n = typeof v === "string" ? parseFloat(v) : typeof v === "number" ? v : NaN;
  return Number.isFinite(n) ? n : undefined;
};
const obj = (v: unknown): Raw | undefined => (v && typeof v === "object" && !Array.isArray(v) ? (v as Raw) : undefined);
const list = (v: unknown): string[] =>
  Array.isArray(v)
    ? v
        .map((x) => (typeof x === "string" ? x : str(obj(x)?.name) ?? str(obj(x)?.title) ?? str(obj(x)?.label)))
        .filter((x): x is string => !!x)
    : [];

function joinAddress(a: unknown): string | undefined {
  if (typeof a === "string") return a.trim() || undefined;
  const o = obj(a);
  if (!o) return undefined;
  const parts = [o.street ?? o.addressLine1 ?? o.line1, o.city, o.state ?? o.stateProvince ?? o.region, o.zipcode ?? o.postalCode ?? o.zip, o.country ?? o.countryCode]
    .map(str)
    .filter(Boolean);
  return parts.length ? parts.join(", ") : undefined;
}

function kitchenFrom(amenities: string[]): PropertyContext["kitchen"] {
  const a = amenities.map((x) => x.toLowerCase());
  if (a.some((x) => x.includes("kitchenette"))) return "kitchenette";
  if (a.some((x) => x === "kitchen" || x.includes("full kitchen") || x.includes("oven"))) return "full";
  return undefined;
}

function fromAirbnb(r: Raw): PropertyContext {
  const amenities = list(r.amenities);
  const rules = r.house_rules ?? r.houseRules;
  return {
    source: "airbnb",
    externalId: str(r.id ?? r.listing_id),
    name: str(r.name ?? r.title),
    url: str(r.listing_url ?? r.url),
    address: joinAddress(r.address ?? r.public_address ?? r.smart_location),
    lat: num(r.lat ?? r.latitude),
    lng: num(r.lng ?? r.longitude),
    checkInTime: str(r.check_in_time ?? r.checkin_time),
    checkOutTime: str(r.check_out_time ?? r.checkout_time),
    maxGuests: num(r.person_capacity ?? r.accommodates),
    bedrooms: num(r.bedrooms),
    kitchen: kitchenFrom(amenities),
    amenities,
    houseRules: typeof rules === "string" ? rules.split(/\n+/).map((s) => s.trim()).filter(Boolean) : list(rules),
    description: str(r.description ?? r.summary),
  };
}

function fromVrbo(r: Raw): PropertyContext {
  const amenities = list(r.amenities ?? r.features);
  const geo = obj(r.geoCode) ?? obj(r.location) ?? {};
  const rules = r.houseRules ?? r.rules;
  return {
    source: "vrbo",
    externalId: str(r.listingId ?? r.propertyId ?? r.id),
    name: str(r.headline ?? r.propertyName ?? r.name),
    url: str(r.url ?? r.listingUrl),
    address: joinAddress(r.address),
    lat: num(geo.latitude ?? geo.lat),
    lng: num(geo.longitude ?? geo.lng),
    checkInTime: str(r.checkInTime ?? obj(r.checkIn)?.time),
    checkOutTime: str(r.checkOutTime ?? obj(r.checkOut)?.time),
    maxGuests: num(r.maxOccupancy ?? r.sleeps),
    bedrooms: num(r.bedrooms),
    kitchen: kitchenFrom(amenities),
    amenities,
    houseRules: typeof rules === "string" ? rules.split(/\n+/).map((s) => s.trim()).filter(Boolean) : list(rules),
    description: str(r.description),
  };
}

/** Returns a PropertyContext candidate; validate it with PropertyContextSchema afterwards. */
export function normalizeListing(format: ListingFormat, raw: unknown): PropertyContext | undefined {
  const r = obj(raw);
  if (!r) return undefined;
  if (format === "airbnb") return fromAirbnb(r);
  if (format === "vrbo") return fromVrbo(r);
  return { ...(r as unknown as PropertyContext), source: (r.source as PropertyContext["source"]) ?? "partner", amenities: list(r.amenities) };
}

/** Removes undefined keys so validation doesn't trip on them. */
export function compact<T extends object>(o: T): T {
  return Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined)) as T;
}
