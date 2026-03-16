import { TripRecord, TripStatus, WizardData, GeneratedTrip } from "@/types/trip";

export async function getTripBySlug(slug: string): Promise<TripRecord | null> {
  throw new Error("Not implemented yet");
}

export async function createTrip(data: {
  slug: string;
  email: string;
  tripNickname: string;
  wizardData: WizardData;
  stripeSessionId?: string;
}): Promise<TripRecord> {
  throw new Error("Not implemented yet");
}

export async function updateTripStatus(slug: string, status: TripStatus): Promise<void> {
  throw new Error("Not implemented yet");
}

export async function saveTripData(slug: string, generatedData: GeneratedTrip): Promise<void> {
  throw new Error("Not implemented yet");
}
