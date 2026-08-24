/**
 * Claude model ids, in one place.
 *
 * Previously each call site hardcoded its own string, so swapping models meant
 * hunting through routes. Keep these in sync when upgrading.
 */

/** Trip JSON + HTML generation. Swap to a larger model for production quality. */
export const GENERATION_MODEL = "claude-haiku-4-5-20251001";

/** Short, cheap, structured extraction: suggestions and intent parsing. */
export const FAST_MODEL = "claude-haiku-4-5-20251001";
