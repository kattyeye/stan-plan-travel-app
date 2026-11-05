"use client";
import { useSyncExternalStore } from "react";

const noop = () => () => {};

/** False on the server and during hydration, true once mounted. */
export function useHydrated(): boolean {
  return useSyncExternalStore(noop, () => true, () => false);
}
