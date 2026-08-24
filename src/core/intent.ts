/**
 * Shapes for natural-language trip intake, shared by the API route, the web UI
 * and a future React Native app.
 *
 * Platform-free — safe to import from React Native.
 */

import type { WizardData } from "./types";
import type { RequiredField } from "./wizard-machine";

export interface ParseIntentRequest {
  text: string;
}

export interface ParseIntentResult {
  /** Everything the model could extract. Never trusted raw — always sanitized. */
  data: Partial<WizardData>;
  /** Required fields still unanswered, in the order to ask for them. */
  missing: RequiredField[];
  /** One-line paraphrase shown back to the user for confirmation. */
  interpretation: string;
  /** Phrases we deliberately did not map to a field, surfaced so nothing looks lost. */
  unmapped: string[];
}

/** Max characters accepted — a long ramble costs tokens and adds nothing. */
export const MAX_INTENT_TEXT = 1200;
