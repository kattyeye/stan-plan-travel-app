"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { EditOp, GeneratedTrip, TripEdits } from "@/types/trip";
import { applyEditOp, emptyEdits, swapKey } from "@/lib/trips/edits";

export interface Toast {
  id: number;
  message: string;
  undo?: () => void;
  tone?: "info" | "error";
}

export interface EditsController {
  edits: TripEdits;
  hidden: ReadonlySet<string>;
  done: ReadonlySet<string>;
  /** False offline or while a change is saving. */
  canEdit: boolean;
  apply: (op: EditOp, label: string) => void;
  toast: Toast | null;
  dismissToast: () => void;
  notify: (message: string, tone?: Toast["tone"]) => void;
}

/** The change that reverses `op`, given the edits before it was applied. */
function inverse(op: EditOp, before: TripEdits, trip: GeneratedTrip): EditOp | null {
  switch (op.type) {
    case "swap_meal": {
      const prev = before.mealSwaps[swapKey(op.day, op.slot)] ?? trip.itinerary.find((d) => d.day === op.day)?.meals[op.slot].restaurantId;
      return prev ? { ...op, restaurantId: prev } : null;
    }
    case "hide_stop":
      return { ...op, type: "unhide_stop" };
    case "unhide_stop":
      return { ...op, type: "hide_stop" };
    case "done_stop":
      return { ...op, type: "undone_stop" };
    case "undone_stop":
      return { ...op, type: "done_stop" };
    default:
      return null;
  }
}

/**
 * Shared group edits with optimistic updates: the page changes immediately,
 * the server validates and stores, and a failed save rolls back with a
 * message. Every change offers Undo. Other people's changes arrive when the
 * tab regains focus and once a minute while it's visible.
 */
export function useTripEdits(slug: string | undefined, trip: GeneratedTrip, initial: TripEdits | undefined, online: boolean): EditsController | null {
  const [edits, setEdits] = useState<TripEdits>(() => initial ?? emptyEdits(""));
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);
  const editsRef = useRef(edits);
  const toastId = useRef(0);
  const commit = useCallback((next: TripEdits) => {
    editsRef.current = next;
    setEdits(next);
  }, []);

  const notify = useCallback((message: string, tone: Toast["tone"] = "info", undo?: () => void) => {
    toastId.current += 1;
    setToast({ id: toastId.current, message, tone, undo });
  }, []);

  const send = useCallback(
    async (op: EditOp): Promise<TripEdits | null> => {
      if (!slug) return null;
      const res = await fetch(`/api/trip/${encodeURIComponent(slug)}/edits`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ op }),
      });
      const json = (await res.json().catch(() => ({}))) as { edits?: TripEdits; error?: string };
      if (!res.ok || !json.edits) throw new Error(json.error ?? "Couldn't save that change.");
      return json.edits;
    },
    [slug]
  );

  // Undo calls back into apply; a ref avoids a self-referencing callback.
  const applyRef = useRef<(op: EditOp, label: string, isUndo?: boolean) => void>(() => {});
  const apply = useCallback(
    (op: EditOp, label: string, isUndo = false) => {
      const before = editsRef.current;
      const local = applyEditOp(trip, before, op);
      if (!local.ok) {
        notify(local.error, "error");
        return;
      }
      commit(local.edits);
      setSaving(true);
      const back = inverse(op, before, trip);
      notify(isUndo ? "Undone" : label, "info", back && !isUndo ? () => applyRef.current(back, label, true) : undefined);
      send(op)
        .then((server) => {
          if (server) commit(server);
        })
        .catch((err: Error) => {
          commit(before);
          notify(`${err.message} Nothing was changed.`, "error");
        })
        .finally(() => setSaving(false));
    },
    [commit, notify, send, trip]
  );
  useEffect(() => {
    applyRef.current = apply;
  }, [apply]);

  // Pick up changes other people in the group made.
  useEffect(() => {
    if (!slug) return;
    let stopped = false;
    const refresh = async () => {
      if (document.visibilityState !== "visible" || !navigator.onLine) return;
      try {
        const res = await fetch(`/api/trip/${encodeURIComponent(slug)}/edits`, { cache: "no-store" });
        if (!res.ok) return;
        const { edits: server } = (await res.json()) as { edits?: TripEdits };
        if (!stopped && server && server.version > editsRef.current.version) {
          commit(server);
          notify("Your group updated the plan");
        }
      } catch {
        /* offline — try again later */
      }
    };
    const t = setInterval(refresh, 60_000);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      stopped = true;
      clearInterval(t);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [slug, notify, commit]);

  const hidden = useMemo<ReadonlySet<string>>(() => new Set(edits.hidden), [edits.hidden]);
  const done = useMemo<ReadonlySet<string>>(() => new Set(edits.done), [edits.done]);

  if (!slug) return null;
  return {
    edits,
    hidden,
    done,
    canEdit: online && !saving,
    apply: (op, label) => apply(op, label),
    toast,
    dismissToast: () => setToast(null),
    notify: (m, tone) => notify(m, tone),
  };
}
