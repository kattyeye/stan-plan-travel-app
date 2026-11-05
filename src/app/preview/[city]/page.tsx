import { notFound } from "next/navigation";
import { SAMPLE_TRIPS } from "@/lib/sample-trips";
import TripHeader from "@/components/trip/TripHeader";
import TripTabs from "@/components/trip/TripTabs";
import PaywallGate from "@/components/trip/PaywallGate";
import { getCityPhoto } from "@/lib/unsplash";

interface Props {
  params: Promise<{ city: string }>;
}

const CITY_LABELS: Record<string, string> = {
  santorini: "Santorini",
  tokyo: "Tokyo",
  austin: "Austin",
};


export async function generateStaticParams() {
  return Object.keys(SAMPLE_TRIPS).map((city) => ({ city }));
}

export default async function PreviewPage({ params }: Props) {
  const { city } = await params;
  const trip = SAMPLE_TRIPS[city];
  if (!trip) notFound();

  const cityLabel = CITY_LABELS[city] ?? city;
  const cityPhoto = await getCityPhoto(trip.meta.destination);

  // Only Day 1 is open — the rest is behind the paywall.
  const previewTrip = { ...trip, itinerary: trip.itinerary.slice(0, 1) };

  return (
    <div style={{ minHeight: "100vh", background: "var(--color-bg)" }}>
      <TripHeader trip={trip} cityPhoto={cityPhoto} preview />

      <div style={{ maxWidth: "1120px", margin: "0 auto", padding: "1rem 1rem 0" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.75rem 1rem", background: "var(--color-bg-selected)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-input)" }}>
          <span aria-hidden="true" style={{ fontSize: "1rem", color: "var(--color-accent)" }}>✦</span>
          <p style={{ fontSize: "0.875rem", color: "var(--color-text-muted)", margin: 0 }}>
            <strong style={{ color: "var(--color-text)" }}>Sample plan</strong> — a real Irie itinerary for {cityLabel}. Day 1 is open; build your own personalised version in 2 minutes.
          </p>
        </div>
      </div>

      <TripTabs trip={previewTrip} preview>
        <div id="paywall" style={{ maxWidth: "800px", margin: "2rem auto 0", position: "relative", scrollMarginTop: 80 }}>
          <PaywallGate destination={cityLabel} />
        </div>
      </TripTabs>
    </div>
  );
}
