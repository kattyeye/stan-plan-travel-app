import { getTripBySlug } from "@/lib/db";
import { notFound } from "next/navigation";
import TripHeader from "@/components/trip/TripHeader";
import TripTabs from "@/components/trip/TripTabs";
import { getCityPhoto } from "@/lib/unsplash";
import { normalizeTrip } from "@/core/normalize";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function TripPage({ params }: Props) {
  const { slug } = await params;
  const trip = await getTripBySlug(slug);
  if (!trip || trip.status !== "ready" || !trip.generatedData) notFound();
  const cityPhoto = await getCityPhoto(trip.generatedData.meta.destination);

  // Normalize once here so no component ever sees a legacy prose activity.
  const generated = normalizeTrip(trip.generatedData);

  return (
    <div style={{ minHeight: "100vh", background: "var(--color-bg)" }}>
      <TripHeader trip={generated} cityPhoto={cityPhoto} />
      <TripTabs trip={generated} slug={slug} />
    </div>
  );
}
