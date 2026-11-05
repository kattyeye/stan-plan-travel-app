"use client";
import { createContext, useContext } from "react";
import type { GeneratedTrip } from "@/types/trip";
import type { FoodView, HashState, ListsView, TabId } from "@/lib/trip-view";
import type { TripLive } from "@/hooks/useTripLive";
import type { EditsController } from "./useTripEdits";

export interface GoTo extends Partial<HashState> {
  /** Timeline stop key to scroll to and flash. */
  highlight?: string;
}

export interface TripUI {
  /** The plan with the group's edits applied — what everyone sees. */
  trip: GeneratedTrip;
  /** The plan as generated (swap rules are checked against this). */
  original: GeneratedTrip;
  slug?: string;
  mapsKey?: string;
  preview: boolean;
  tab: TabId;
  day: number;
  food: FoodView;
  lists: ListsView;
  highlight?: string;
  go: (to: GoTo) => void;
  live: TripLive;
  edits: EditsController | null;
}

const Ctx = createContext<TripUI | null>(null);
export const TripUIProvider = Ctx.Provider;

export function useTripUI(): TripUI {
  const v = useContext(Ctx);
  if (!v) throw new Error("useTripUI must be used inside <TripTabs>");
  return v;
}
