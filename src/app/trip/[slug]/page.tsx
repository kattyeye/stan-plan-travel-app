import { getTripBySlug } from "@/lib/db";
import { notFound } from "next/navigation";
import TripHeader from "@/components/trip/TripHeader";
import TripTabs from "@/components/trip/TripTabs";

interface Props {
  params: { slug: string };
}

export default async function TripPage({ params }: Props) {
  const trip = await getTripBySlug(params.slug);
  if (!trip || trip.status !== "ready" || !trip.generatedData) notFound();
  return (
    <div className="min-h-screen">
      <TripHeader trip={trip.generatedData} />
      <TripTabs trip={trip.generatedData} />
    </div>
  );
}
