"use client";
import { motion } from "framer-motion";
import { Mic, MicOff } from "lucide-react";
import type { SpeechInput } from "@/hooks/useSpeechInput";

interface Props {
  speech: SpeechInput;
  /** What's being dictated, for screen readers: "Dictate destination". */
  label: string;
  size?: number;
  style?: React.CSSProperties;
}

/**
 * Round 44px mic. Pulses while listening; hidden where the browser has no
 * speech recognition, so there's never a broken control.
 */
export default function VoiceButton({ speech, label, size = 44, style }: Props) {
  if (!speech.supported) return null;
  const on = speech.listening;
  return (
    <>
      <button
        type="button"
        onClick={speech.toggle}
        aria-pressed={on}
        aria-label={on ? "Stop listening" : label}
        title="Speak instead of typing — your browser turns speech into text"
        style={{
          position: "relative", width: size, height: size, minWidth: size, borderRadius: 999, border: "none", cursor: "pointer",
          display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
          background: on ? "var(--color-brand)" : "var(--color-bg-selected)", color: on ? "var(--color-text-inverse)" : "var(--color-brand)",
          ...style,
        }}
      >
        {on && (
          <motion.span
            aria-hidden="true"
            initial={{ scale: 1, opacity: 0.55 }}
            animate={{ scale: 1.6, opacity: 0 }}
            transition={{ duration: 1.2, repeat: Infinity, ease: "easeOut" }}
            style={{ position: "absolute", inset: 0, borderRadius: 999, background: "var(--color-brand)" }}
          />
        )}
        {on ? <MicOff size={Math.round(size * 0.42)} aria-hidden="true" style={{ position: "relative" }} /> : <Mic size={Math.round(size * 0.42)} aria-hidden="true" />}
      </button>
      <span className="sr-only" aria-live="polite">{on ? "Listening…" : ""}</span>
    </>
  );
}
