import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getTripBySlug } from "@/lib/db";
import TripHeader from "@/components/trip/TripHeader";
import TripTabs from "@/components/trip/TripTabs";
import { getCityPhoto } from "@/lib/unsplash";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const trip = await getTripBySlug(slug);
  const title = trip?.generatedData?.meta.title ?? trip?.tripNickname ?? "Trip plan";
  return {
    title: `${title} — Irie`,
    description: trip ? `A personalised trip plan for ${trip.wizardData.destination}.` : undefined,
    // Trip links are private-by-obscurity; keep them out of search engines.
    robots: { index: false, follow: false },
  };
}

export default async function TripPage({ params }: Props) {
  const { slug } = await params;
  const trip = await getTripBySlug(slug);
  if (!trip) notFound();
  if (trip.status !== "ready" || !trip.generatedData) redirect(`/trip/${slug}/generating`);
  const cityPhoto = await getCityPhoto(trip.generatedData.meta.destination);
  return (
    <div style={{ minHeight: "100vh", background: "var(--color-bg)" }}>
      <TripHeader trip={trip.generatedData} cityPhoto={cityPhoto} slug={slug} />
      <TripTabs trip={trip.generatedData} slug={slug} edits={trip.edits} mapsKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || undefined} />
    </div>
  );
}
