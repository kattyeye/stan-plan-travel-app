"use client";
import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Speech-to-text, with the recognizer behind an interface.
 *
 * The web implementation below wraps the Web Speech API. React Native swaps in
 * @react-native-voice/voice by implementing the same `SpeechRecognizer` shape —
 * nothing else in the intake flow changes, because parsing happens server-side
 * on plain text.
 *
 * Support is NOT universal: Chrome and Safari implement the Web Speech API,
 * Firefox does not. Callers must treat typing as a co-equal input, never as a
 * degraded fallback — check `supported` and always render the textarea.
 */

export interface SpeechRecognizer {
  supported: boolean;
  start(handlers: {
    onResult: (transcript: string, isFinal: boolean) => void;
    onError: (message: string) => void;
    onEnd: () => void;
  }): void;
  stop(): void;
}

// Minimal shape of the vendor-prefixed Web Speech API — it isn't in lib.dom.
interface SpeechRecognitionLike {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
}

interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }>;
}

type RecognitionCtor = new () => SpeechRecognitionLike;

function getRecognitionCtor(): RecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: RecognitionCtor;
    webkitSpeechRecognition?: RecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

const ERROR_MESSAGES: Record<string, string> = {
  "not-allowed": "Microphone access was blocked. You can type instead.",
  "service-not-allowed": "Microphone access was blocked. You can type instead.",
  "no-speech": "Didn't catch that — try again, or type it.",
  network: "Speech recognition needs a connection. You can type instead.",
  aborted: "",
};

export interface UseSpeechInput {
  /** False in Firefox and any browser without the Web Speech API. */
  supported: boolean;
  listening: boolean;
  /** Final transcript plus whatever is currently being spoken. */
  transcript: string;
  error: string | null;
  start(): void;
  stop(): void;
  reset(): void;
  setTranscript(value: string): void;
}

export function useSpeechInput(): UseSpeechInput {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [finalText, setFinalText] = useState("");
  const [interimText, setInterimText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);

  // Feature detection must happen after mount: the server has no `window`, and
  // deciding during render would desync the markup.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSupported(getRecognitionCtor() !== null);
    return () => recognitionRef.current?.stop();
  }, []);

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setListening(false);
  }, []);

  const start = useCallback(() => {
    const Ctor = getRecognitionCtor();
    if (!Ctor) {
      setError("This browser can't do speech input — type it instead.");
      return;
    }

    setError(null);
    setInterimText("");

    const recognition = new Ctor();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = typeof navigator !== "undefined" ? navigator.language || "en-US" : "en-US";

    recognition.onresult = (event) => {
      let interim = "";
      let settled = "";
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i];
        const text = result[0]?.transcript ?? "";
        if (result.isFinal) settled += text;
        else interim += text;
      }
      if (settled) setFinalText((prev) => (prev ? `${prev} ${settled.trim()}` : settled.trim()));
      setInterimText(interim);
    };

    recognition.onerror = (event) => {
      const message = ERROR_MESSAGES[event.error] ?? "Speech input failed — type it instead.";
      if (message) setError(message);
      setListening(false);
    };

    recognition.onend = () => {
      setInterimText("");
      setListening(false);
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
      setListening(true);
    } catch {
      // start() throws if called while already running; treat as already-on.
      setListening(true);
    }
  }, []);

  const reset = useCallback(() => {
    setFinalText("");
    setInterimText("");
    setError(null);
  }, []);

  const transcript = [finalText, interimText].filter(Boolean).join(" ");

  return {
    supported,
    listening,
    transcript,
    error,
    start,
    stop,
    reset,
    setTranscript: (value: string) => {
      setFinalText(value);
      setInterimText("");
    },
  };
}
