"use client";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";

/**
 * Voice-to-text with the browser's built-in speech recognition (Web Speech
 * API): Chrome, Edge and Safari on desktop and iOS. Free, no key, words appear
 * as you speak. Where it isn't available (Firefox) `supported` is false and
 * callers hide the mic — typing always works.
 */

interface SpeechAlternative {
  transcript: string;
}
interface SpeechResult {
  readonly isFinal: boolean;
  readonly length: number;
  [index: number]: SpeechAlternative;
}
interface SpeechResultEvent {
  readonly resultIndex: number;
  readonly results: { readonly length: number; [index: number]: SpeechResult };
}
interface SpeechErrorEvent {
  readonly error: string;
}
interface Recognition {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((e: SpeechResultEvent) => void) | null;
  onerror: ((e: SpeechErrorEvent) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}
type RecognitionCtor = new () => Recognition;

function getCtor(): RecognitionCtor | undefined {
  if (typeof window === "undefined") return undefined;
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition;
}

const noop = () => () => {};
const MAX_MS = 60_000;

export interface SpeechInput {
  supported: boolean;
  listening: boolean;
  /** Words heard so far that may still change. */
  interim: string;
  error: string | null;
  start: () => void;
  stop: () => void;
  toggle: () => void;
}

const ERRORS: Record<string, string> = {
  "not-allowed": "Allow microphone access to use voice.",
  "service-not-allowed": "Voice isn't available in this browser — you can still type.",
  "audio-capture": "No microphone found.",
  network: "Voice needs a connection. You can still type.",
  "no-speech": "Didn't catch that — try again.",
};

/**
 * @param onFinal called with each finished phrase.
 * @param opts.continuous keep listening across pauses (long text) or stop after one phrase (search boxes).
 */
export function useSpeechInput(onFinal: (text: string) => void, opts: { continuous?: boolean } = {}): SpeechInput {
  const supported = useSyncExternalStore(noop, () => !!getCtor(), () => false);
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const [error, setError] = useState<string | null>(null);
  const rec = useRef<Recognition | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onFinalRef = useRef(onFinal);
  useEffect(() => {
    onFinalRef.current = onFinal;
  }, [onFinal]);

  const stop = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    rec.current?.stop();
  }, []);

  const start = useCallback(() => {
    const Ctor = getCtor();
    if (!Ctor || rec.current) return;
    const r = new Ctor();
    r.lang = navigator.language || "en-US";
    r.continuous = !!opts.continuous;
    r.interimResults = true;
    r.maxAlternatives = 1;
    r.onresult = (e) => {
      let live = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const res = e.results[i];
        const text = res[0]?.transcript ?? "";
        if (res.isFinal) {
          const clean = text.trim();
          if (clean) onFinalRef.current(clean);
        } else {
          live += text;
        }
      }
      setInterim(live.trim());
    };
    r.onerror = (e) => {
      if (e.error !== "aborted") setError(ERRORS[e.error] ?? "Voice stopped — you can still type.");
    };
    r.onend = () => {
      rec.current = null;
      if (timer.current) clearTimeout(timer.current);
      setListening(false);
      setInterim("");
    };
    setError(null);
    try {
      r.start();
      rec.current = r;
      setListening(true);
      timer.current = setTimeout(() => r.stop(), MAX_MS);
    } catch {
      setError("Voice couldn't start — you can still type.");
    }
  }, [opts.continuous]);

  useEffect(() => () => rec.current?.abort(), []);

  return { supported, listening, interim, error, start, stop, toggle: () => (rec.current ? stop() : start()) };
}
