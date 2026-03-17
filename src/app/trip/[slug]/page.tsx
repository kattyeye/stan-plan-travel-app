import { getTripBySlug } from "@/lib/db";
import { notFound } from "next/navigation";
import TripHeader from "@/components/trip/TripHeader";
import TripTabs from "@/components/trip/TripTabs";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function TripPage({ params }: Props) {
  const { slug } = await params;
  const trip = await getTripBySlug(slug);
  if (!trip || trip.status !== "ready" || !trip.generatedData) notFound();
  return (
    <div style={{ minHeight: "100vh", background: "var(--color-tea-green-50)" }}>
      <TripHeader trip={trip.generatedData} />
      <TripTabs trip={trip.generatedData} />
    </div>
  );
}
