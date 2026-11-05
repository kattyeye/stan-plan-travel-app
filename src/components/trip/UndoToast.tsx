"use client";
import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, Check } from "lucide-react";
import type { Toast } from "./useTripEdits";

/** Bottom toast with Undo — sits above the phone tab bar. */
export default function UndoToast({ toast, onDismiss }: { toast: Toast | null; onDismiss: () => void }) {
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(onDismiss, toast.undo ? 6500 : 4000);
    return () => clearTimeout(t);
  }, [toast, onDismiss]);

  return (
    <div aria-live="polite" role="status" className="no-print" style={{ position: "fixed", left: 0, right: 0, bottom: "calc(84px + env(safe-area-inset-bottom))", zIndex: 70, display: "flex", justifyContent: "center", pointerEvents: "none", padding: "0 1rem" }}>
      <AnimatePresence>
        {toast && (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            style={{
              pointerEvents: "auto", display: "flex", alignItems: "center", gap: "0.75rem", maxWidth: 480, width: "100%",
              padding: "0.5rem 0.5rem 0.5rem 1rem", borderRadius: "var(--radius-card)", boxShadow: "var(--shadow-float)",
              background: toast.tone === "error" ? "var(--color-error-bg)" : "var(--color-header-bg)",
              color: toast.tone === "error" ? "var(--color-error-text)" : "var(--color-header-text)",
              border: toast.tone === "error" ? "1px solid var(--color-error-border)" : "none",
              fontSize: "0.875rem", minHeight: 52,
            }}
          >
            {toast.tone === "error" ? <AlertTriangle size={16} aria-hidden="true" /> : <Check size={16} aria-hidden="true" />}
            <span style={{ flex: 1 }}>{toast.message}</span>
            {toast.undo && (
              <button
                type="button"
                onClick={() => {
                  toast.undo?.();
                }}
                style={{ minHeight: 40, padding: "0 0.875rem", borderRadius: "var(--radius-chip)", border: "1px solid currentColor", background: "transparent", color: "inherit", fontWeight: 700, cursor: "pointer" }}
              >
                Undo
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
