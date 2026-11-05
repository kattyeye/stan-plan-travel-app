"use client";
import { useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { GeneratedTrip } from "@/types/trip";
import { useStoredChecklist } from "@/hooks/useStoredChecklist";
import GrocerySection from "./GrocerySection";
import PackingSection from "./PackingSection";
import Segmented from "./Segmented";
import { groceryMaster, groceryStorageKey, packingInitial, packingStorageKey } from "./checklists";
import { useTripUI } from "./TripContext";

/** Lists tab: packing and groceries, with live progress in the switch. */
export default function ListsSection({ trip, slug }: { trip: GeneratedTrip; slug?: string }) {
  const { lists, go } = useTripUI();
  const packInit = useMemo(() => () => packingInitial(trip.packingList), [trip.packingList]);
  const groceryInit = useMemo(() => () => ({}) as Record<string, boolean>, []);
  const master = useMemo(() => groceryMaster(trip), [trip]);
  const packing = useStoredChecklist(packingStorageKey(slug, trip), packInit);
  const grocery = useStoredChecklist(groceryStorageKey(slug, trip), groceryInit);
  const packTotal = Object.keys(packing.checked).length;
  const packDone = Object.values(packing.checked).filter(Boolean).length;
  const shopDone = master.filter((m) => grocery.checked[m.item]).length;
  const complete = lists === "packing" ? packTotal > 0 && packDone === packTotal : master.length > 0 && shopDone === master.length;

  return (
    <div>
      <div style={{ marginBottom: "1.25rem" }}>
        <Segmented
          label="Which list"
          value={lists}
          onChange={(v) => go({ tab: "lists", lists: v })}
          options={[
            { value: "packing", label: "Packing", meta: `${packDone}/${packTotal}` },
            { value: "groceries", label: "Groceries", meta: `${shopDone}/${master.length}` },
          ]}
        />
      </div>

      <AnimatePresence>
        {complete && (
          <motion.p
            key={lists}
            role="status"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ type: "spring", stiffness: 420, damping: 22 }}
            style={{ margin: "0 0 1.25rem", padding: "0.875rem 1rem", borderRadius: "var(--radius-card)", background: "var(--color-success-bg)", color: "var(--color-success-text)", fontWeight: 700, textAlign: "center" }}
          >
            {lists === "packing" ? "🎉 All packed — you're ready to go!" : "🛒 Cart's full — the kitchen is set!"}
          </motion.p>
        )}
      </AnimatePresence>

      <div hidden={lists !== "packing"} className="print-show"><PackingSection trip={trip} slug={slug} /></div>
      <div hidden={lists !== "groceries"} className="print-show"><GrocerySection trip={trip} slug={slug} /></div>
    </div>
  );
}
