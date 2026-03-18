import { getTripBySlug } from "@/lib/db";
import { notFound } from "next/navigation";
import TripHeader from "@/components/trip/TripHeader";
import TripTabs from "@/components/trip/TripTabs";
import { getCityPhoto } from "@/lib/unsplash";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function TripPage({ params }: Props) {
  const { slug } = await params;
  const trip = await getTripBySlug(slug);
  if (!trip || trip.status !== "ready" || !trip.generatedData) notFound();
  const cityPhoto = await getCityPhoto(trip.generatedData.meta.destination);
  return (
    <div style={{ minHeight: "100vh", background: "var(--color-bg)" }}>
      <TripHeader trip={trip.generatedData} cityPhoto={cityPhoto} />
      <TripTabs trip={trip.generatedData} />
    </div>
  );
}
