"use client";
import { useSyncExternalStore } from "react";

/** One destination value shared by the hero search and the quick-start card. */
let value = "";
const listeners = new Set<() => void>();

export function setDestination(next: string) {
  value = next;
  listeners.forEach((l) => l());
}

export function useDestination(): string {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => value,
    () => ""
  );
}
