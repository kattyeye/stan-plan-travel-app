import { NextResponse } from "next/server";
import { listAllTrips } from "@/lib/db";

export async function GET() {
  try {
    const trips = await listAllTrips();
    return NextResponse.json({ trips });
  } catch (error) {
    console.error("Admin trips error:", error);
    return NextResponse.json({ error: "Failed to load trips" }, { status: 500 });
  }
}
