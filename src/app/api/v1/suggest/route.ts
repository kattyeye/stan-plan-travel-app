/**
 * POST /api/v1/suggest — versioned alias of /api/suggest.
 *
 * Only POST is re-exported: Next.js requires route-segment config like
 * `runtime` to be a literal in each route file, not a re-export.
 */
export { POST } from "@/app/api/suggest/route";

export const runtime = "nodejs";
