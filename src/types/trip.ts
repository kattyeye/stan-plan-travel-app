/**
 * Compatibility shim.
 *
 * Types moved to `src/core/types.ts` so a React Native app can import the
 * whole `src/core/` directory without pulling in anything web-specific.
 * Existing `@/types/trip` imports keep working; new code should import
 * from `@/core/types`.
 */
export * from "@/core/types";
