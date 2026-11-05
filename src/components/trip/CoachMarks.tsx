"use client";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { ghostButton, primaryButton } from "./ui";

const KEY = "irie:coach:v1";
const TIPS = [
  { title: "Swipe through your days", body: "Each day is a timeline with its route on the map. Swipe or tap the day chips to move between them." },
  { title: "Tap “Why this?” on any stop", body: "See how we checked it — Google hours, your answers, our checks — and swap it for another researched spot if it's not your vibe." },
  { title: "Ask, or just say it", body: "Use the search bar to type or speak: “dinner Friday”, “kid-friendly”, “what do I need to book?”" },
];

/** Three quick tips on someone's first visit; returning travellers never see them. */
export default function CoachMarks() {
  const [step, setStep] = useState<number | null>(null);

  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- first-visit check needs localStorage, client only
      if (!localStorage.getItem(KEY)) setStep(0);
    } catch {
      /* storage blocked — skip the tips */
    }
  }, []);

  const close = () => {
    setStep(null);
    try {
      localStorage.setItem(KEY, "1");
    } catch {
      /* ignore */
    }
  };

  const tip = step === null ? null : TIPS[step];
  return (
    <AnimatePresence>
      {tip && (
        <motion.aside
          aria-label="Tips for using your plan"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 24 }}
          className="no-print"
          style={{
            position: "fixed", left: "1rem", right: "1rem", bottom: "calc(84px + env(safe-area-inset-bottom))", zIndex: 60, maxWidth: 420, margin: "0 auto",
            background: "var(--color-bg-card)", border: "1px solid var(--color-border-focus)", borderRadius: "var(--radius-card)", boxShadow: "var(--shadow-float)", padding: "1rem 1rem 0.875rem",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", gap: "0.5rem", alignItems: "flex-start" }}>
            <p style={{ margin: 0, fontSize: "0.6875rem", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--color-text-faint)" }}>Tip {step! + 1} of {TIPS.length}</p>
            <button type="button" onClick={close} aria-label="Dismiss tips" style={{ width: 36, height: 36, marginTop: -8, marginRight: -6, border: "none", background: "transparent", color: "var(--color-text-muted)", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
              <X size={16} aria-hidden="true" />
            </button>
          </div>
          <p style={{ margin: "0 0 0.25rem", fontFamily: "var(--font-display)", fontSize: "1.125rem", color: "var(--color-heading)" }}>{tip.title}</p>
          <p style={{ margin: "0 0 0.75rem", fontSize: "0.875rem", color: "var(--color-text-muted)", lineHeight: 1.5 }}>{tip.body}</p>
          <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
            <button type="button" onClick={close} style={{ ...ghostButton, minHeight: 40 }}>Skip</button>
            <button type="button" onClick={() => (step! < TIPS.length - 1 ? setStep(step! + 1) : close())} style={{ ...primaryButton, minHeight: 40 }}>
              {step! < TIPS.length - 1 ? "Next" : "Got it"}
            </button>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
