"use client";
import { useCallback, useEffect, useState } from "react";

/**
 * Checkbox state that survives reloads (per trip, per device). Starts from
 * `initial` on the server render, then hydrates from localStorage.
 */
export function useStoredChecklist(storageKey: string, initial: () => Record<string, boolean>) {
  const [checked, setChecked] = useState<Record<string, boolean>>(initial);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- hydrate from storage after mount
      if (raw) setChecked((prev) => ({ ...prev, ...JSON.parse(raw) }));
    } catch {
      /* storage unavailable (private mode) — keep in-memory state */
    }
  }, [storageKey]);

  const save = useCallback(
    (next: Record<string, boolean>) => {
      try {
        localStorage.setItem(storageKey, JSON.stringify(next));
      } catch {
        /* ignore */
      }
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
    const next = initial();
    setChecked(next);
    try {
      localStorage.removeItem(storageKey);
    } catch {
      /* ignore */
    }
  }, [initial, storageKey]);

  return { checked, toggle, reset };
}
