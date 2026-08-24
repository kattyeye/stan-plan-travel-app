import { CalendarDays, Utensils, ShoppingCart, MapPin, Compass, Luggage } from "lucide-react";

/**
 * The trip section tabs.
 *
 * Shared by the live trip view and the sample preview, which previously kept
 * two copies that had to be edited in lockstep.
 */
export const TABS = [
  { id: "itinerary", label: "Itinerary", Icon: CalendarDays },
  { id: "meals", label: "Meals", Icon: Utensils },
  { id: "grocery", label: "Grocery", Icon: ShoppingCart },
  { id: "restaurants", label: "Restaurants", Icon: MapPin },
  { id: "tips", label: "Activities", Icon: Compass },
  { id: "packing", label: "Packing", Icon: Luggage },
] as const;

export type TabId = (typeof TABS)[number]["id"];
