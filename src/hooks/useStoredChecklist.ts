"use client";
import { useCallback, useEffect, useState } from "react";

const EVENT = "irie:checklist";

/**
 * Checkbox state that survives reloads (per trip, per device). Starts from
 * `initial` on the server render, then hydrates from localStorage. Every copy
 * of the same list on the page stays in step (e.g. Overview's progress and
 * the Lists tab).
 */
export function useStoredChecklist(storageKey: string, initial: () => Record<string, boolean>) {
  const [checked, setChecked] = useState<Record<string, boolean>>(initial);

  useEffect(() => {
    const load = () => {
      try {
        const raw = localStorage.getItem(storageKey);
        setChecked(raw ? { ...initial(), ...JSON.parse(raw) } : initial());
      } catch {
        /* storage unavailable (private mode) — keep in-memory state */
      }
    };
    load();
    const onChange = (e: Event) => {
      if ((e as CustomEvent<string>).detail === storageKey) load();
    };
    const onStorage = (e: StorageEvent) => {
      if (e.key === storageKey) load();
    };
    window.addEventListener(EVENT, onChange);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(EVENT, onChange);
      window.removeEventListener("storage", onStorage);
    };
  }, [storageKey, initial]);

  const save = useCallback(
    (next: Record<string, boolean> | null) => {
      try {
        if (next) localStorage.setItem(storageKey, JSON.stringify(next));
        else localStorage.removeItem(storageKey);
      } catch {
        /* ignore */
      }
      // Let other copies of this list re-read after this render.
      setTimeout(() => window.dispatchEvent(new CustomEvent(EVENT, { detail: storageKey })), 0);
    },
    [storageKey]
  );

  const toggle = useCallback(
    (key: string) =>
      setChecked((prev) => {
        const next = { ...prev, [key]: !prev[key] };
        save(next);
        return next;
      }),
    [save]
  );

  const reset = useCallback(() => {
    setChecked(initial());
    save(null);
  }, [initial, save]);

  return { checked, toggle, reset };
}
