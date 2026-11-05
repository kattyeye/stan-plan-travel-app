"use client";
import { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { useHydrated } from "@/hooks/useHydrated";

interface Props {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}

/** A bottom sheet on phones, a centred dialog on laptops. Escape and the backdrop close it; focus returns to the opener. */
export default function Sheet({ open, onClose, title, subtitle, children }: Props) {
  const wide = useMediaQuery("(min-width: 768px)");
  const titleId = useId();
  const panel = useRef<HTMLDivElement>(null);
  const opener = useRef<Element | null>(null);
  const hydrated = useHydrated();

  useEffect(() => {
    if (!open) return;
    opener.current = document.activeElement;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab" && panel.current) {
        const items = panel.current.querySelectorAll<HTMLElement>("a[href], button:not([disabled]), input, textarea, select, [tabindex]:not([tabindex='-1'])");
        if (!items.length) return;
        const first = items[0];
        const last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    requestAnimationFrame(() => panel.current?.querySelector<HTMLElement>("[data-autofocus], button")?.focus());
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      (opener.current as HTMLElement | null)?.focus?.();
    };
  }, [open, onClose]);

  if (!hydrated) return null;
  return createPortal(
    <AnimatePresence>
      {open && (
        <div style={{ position: "fixed", inset: 0, zIndex: 80, display: "flex", alignItems: wide ? "center" : "flex-end", justifyContent: "center" }}>
          <motion.div
            aria-hidden="true"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ position: "absolute", inset: 0, background: "rgba(10, 12, 6, 0.45)" }}
          />
          <motion.div
            ref={panel}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            initial={wide ? { opacity: 0, scale: 0.97 } : { y: "100%" }}
            animate={wide ? { opacity: 1, scale: 1 } : { y: 0 }}
            exit={wide ? { opacity: 0, scale: 0.97 } : { y: "100%" }}
            transition={{ type: "spring", stiffness: 420, damping: 38 }}
            style={{
              position: "relative", width: "100%", maxWidth: wide ? 480 : "100%", maxHeight: wide ? "80vh" : "85vh", overflowY: "auto",
              background: "var(--color-bg-card)", color: "var(--color-text)", boxShadow: "var(--shadow-float)",
              borderRadius: wide ? "var(--radius-card)" : "20px 20px 0 0",
              padding: `1rem 1.25rem calc(1.25rem + env(safe-area-inset-bottom))`,
            }}
          >
            {!wide && <div aria-hidden="true" style={{ width: 40, height: 4, borderRadius: 4, background: "var(--color-border)", margin: "0 auto 0.75rem" }} />}
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "0.75rem", marginBottom: "0.75rem" }}>
              <div style={{ minWidth: 0 }}>
                <h2 id={titleId} style={{ fontFamily: "var(--font-display)", fontWeight: 400, fontSize: "1.375rem", color: "var(--color-heading)", margin: 0, lineHeight: 1.2 }}>{title}</h2>
                {subtitle && <p style={{ margin: "0.25rem 0 0", fontSize: "0.8125rem", color: "var(--color-text-muted)" }}>{subtitle}</p>}
              </div>
              <button type="button" onClick={onClose} aria-label="Close" style={{ width: 44, height: 44, display: "inline-flex", alignItems: "center", justifyContent: "center", borderRadius: 999, border: "none", background: "var(--color-bg-selected)", color: "var(--color-text)", cursor: "pointer", flexShrink: 0 }}>
                <X size={18} aria-hidden="true" />
              </button>
            </div>
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}
