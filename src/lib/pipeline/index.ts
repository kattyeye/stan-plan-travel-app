import type { PipelineStage, QualityIssue, Recipe, SourceLink, TripRecord } from "@/types/trip";
import {
  EFFORT,
  GenerationError,
  MODELS,
  addUsage,
  emptyUsage,
  generateStructured,
  researchWithWebSearch,
  todayForPrompt,
  type Usage,
} from "../claude";
import {
  acquireLock,
  getPipelineState,
  getTripBySlug,
  isLocked,
  releaseLock,
  savePipelineState,
  saveTripData,
  setTripProgress,
  updateTrip,
} from "../db";
import { emailEnabled, notifyTripFailed, notifyTripReady, notifyTripStarted } from "../notify";
import { locateDestination, placesEnabled, verifyVenue, type LatLng, type VerifyResult } from "../places";
import { internalHeaders, internalOrigin } from "../security";
import { buildDays, type DaySkeleton } from "./days";
import { assembleTrip, buildVenues, normalizePlan, normalizeRecipes, researchForPrompt, type NormalizedPlan, type Venues } from "./normalize";
import {
  packingPrompt,
  packingSystem,
  planPrompt,
  planSystem,
  recipesPrompt,
  recipesSystem,
  repairNote,
  researchPrompt,
  researchSystem,
  researchTargets,
} from "./prompts";
import {
  PackingResultSchema,
  PlanDraftSchema,
  RecipesResultSchema,
  ResearchBriefSchema,
  type PackingResult,
  type PlanDraft,
  type ResearchBrief,
} from "./schemas";

/**
 * Trip generation pipeline
 * ────────────────────────
 *   research  → web search for real venues + Google Places verification (+ packing in parallel)
 *   plan      → day-by-day itinerary that may only reference verified venues
 *   recipes   → recipes for each cook-in meal, scaled and allergy-checked
 *   finalize  → deterministic assembly, grocery math, quality report, notifications
 *
 * Each stage checkpoints its output, holds a per-trip lock, and (on Vercel)
 * hands the next stage to a fresh function invocation so no single
 * invocation needs more than ~4.5 minutes. If a hand-off is lost, the waiting
 * page's resume call picks the pipeline back up from the last checkpoint.
 */

export const STAGE_BUDGET_MS = 270_000;
const LOCK_TTL_S = 320;
const MAX_ATTEMPTS = 2;
const MAX_SEARCHES = Number(process.env.IRIE_MAX_SEARCHES ?? 12);

interface PipelineState {
  v: 1;
  research?: { brief: ResearchBrief; venues: Venues; sources: SourceLink[] };
  packing?: PackingResult;
  plan?: { draft: PlanDraft; normalized: NormalizedPlan };
  recipes?: { recipes: Recipe[]; issues: QualityIssue[] };
  attempts: Partial<Record<PipelineStage, number>>;
  models: string[];
  usage: Usage;
  lastError?: string;
}

const newState = (): PipelineState => ({ v: 1, attempts: {}, models: [], usage: emptyUsage() });

export function nextStageFor(state: Pick<PipelineState, "research" | "plan" | "recipes"> | null): PipelineStage {
  if (!state?.research) return "research";
  if (!state.plan) return "plan";
  if (!state.recipes) return "recipes";
  return "finalize";
}

const lockName = (slug: string) => `gen:${slug}`;

export async function isGenerationRunning(slug: string) {
  return isLocked(lockName(slug));
}

export async function pipelineNextStage(slug: string): Promise<PipelineStage> {
  return nextStageFor(await getPipelineState<PipelineState>(slug));
}

/** Clears checkpoints so the next run starts from scratch (admin regenerate). */
export async function resetPipeline(slug: string) {
  await savePipelineState(slug, newState());
}

// ─── Orchestration ───────────────────────────────────────────────────────────

/** Runs from `from` until the pipeline finishes or hands off to another invocation. */
export async function runPipeline(slug: string, from?: PipelineStage): Promise<void> {
  let stage: PipelineStage | null = from ?? (await pipelineNextStage(slug));
  while (stage) {
    const next = await runStage(slug, stage);
    if (!next) return;
    // Finalize is quick; locally there's no function time limit.
    if (next === "finalize" || !process.env.VERCEL) {
      stage = next;
      continue;
    }
    await handOff(slug, next);
    return;
  }
}

async function handOff(slug: string, stage: PipelineStage) {
  try {
    const res = await fetch(`${internalOrigin()}/api/internal/pipeline`, {
      method: "POST",
      headers: internalHeaders(),
      body: JSON.stringify({ slug, stage }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) throw new Error(`hand-off returned ${res.status}`);
  } catch (err) {
    // The waiting page's resume call will restart from the checkpoint.
    console.error(`[pipeline ${slug}] hand-off to ${stage} failed:`, err);
  }
}

const PROGRESS: Record<PipelineStage, { message: string; percent: number }> = {
  research: { message: "Researching restaurants, activities and events", percent: 8 },
  plan: { message: "Designing your days around opening hours", percent: 45 },
  recipes: { message: "Writing recipes scaled to your group", percent: 68 },
  finalize: { message: "Running final checks", percent: 92 },
};

/** Runs one stage under the trip lock. Returns the stage to run next, or null. */
export async function runStage(slug: string, stage: PipelineStage): Promise<PipelineStage | null> {
  const token = await acquireLock(lockName(slug), LOCK_TTL_S);
  if (!token) return null; // Another invocation is already working on this trip.
  const startedAt = Date.now();
  const deadline = startedAt + STAGE_BUDGET_MS;

  try {
    const trip = await getTripBySlug(slug);
    if (!trip || trip.status === "ready" || trip.status === "pending") return null;

    const state = (await getPipelineState<PipelineState>(slug)) ?? newState();
    const expected = nextStageFor(state);
    if (stage !== expected) stage = expected; // checkpoints are the source of truth

    state.attempts[stage] = (state.attempts[stage] ?? 0) + 1;
    if (state.attempts[stage]! > MAX_ATTEMPTS + 1) {
      await failTrip(trip, state, slug, `Stage ${stage} exceeded its retry budget`);
      return null;
    }

    await updateTrip(slug, (t) => ({
      status: "generating",
      errorMessage: undefined,
      progress: {
        stage,
        ...PROGRESS[stage],
        startedAt: t.progress?.startedAt ?? new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    }));
    await savePipelineState(slug, state);

    // First real start: tell the traveller we're on it, with the link, so they can close the tab.
    if (stage === "research" && state.attempts.research === 1) {
      await notifyTripStarted(trip).catch((err) => console.error(`[pipeline ${slug}] started email failed:`, err));
    }

    try {
      switch (stage) {
        case "research":
          await runResearch(trip, state, deadline);
          break;
        case "plan":
          await runPlan(trip, state, deadline);
          break;
        case "recipes":
          await runRecipes(trip, state, deadline);
          break;
        case "finalize":
          await runFinalize(trip, state);
          return null;
      }
      state.lastError = undefined;
      await savePipelineState(slug, state);
      console.info(`[pipeline ${slug}] ${stage} done in ${Math.round((Date.now() - startedAt) / 1000)}s`, state.usage);
      return nextStageFor(state);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[pipeline ${slug}] ${stage} failed (attempt ${state.attempts[stage]}):`, err);
      state.lastError = `${stage}: ${message}`;
      await savePipelineState(slug, state);
      // A request the API rejects as invalid (4xx other than rate limits/timeouts) fails the same way every time.
      const status = (err as { status?: unknown })?.status;
      const badRequest = typeof status === "number" && status >= 400 && status < 500 && ![408, 409, 429].includes(status);
      const retryable = !badRequest && (!(err instanceof GenerationError) || err.retryable);
      if (retryable && state.attempts[stage]! < MAX_ATTEMPTS) return stage;
      await failTrip(trip, state, slug, message);
      return null;
    }
  } finally {
    await releaseLock(lockName(slug), token).catch(() => {});
  }
}

async function failTrip(trip: TripRecord, _state: PipelineState, slug: string, detail: string) {
  console.error(`[pipeline ${slug}] giving up: ${detail}`);
  const failed = await updateTrip(slug, {
    status: "error",
    errorMessage:
      emailEnabled()
        ? "We couldn't finish your plan this time. You haven't lost anything — tap “Try again”. We've also emailed you a link to come back to."
        : "We couldn't finish your plan this time. You haven't lost anything — tap “Try again”.",
    progress: { ...(trip.progress ?? { stage: "queued", percent: 0 }), message: "Paused", updatedAt: new Date().toISOString() },
  });
  await notifyTripFailed(failed).catch(() => {});
}

// ─── Stages ──────────────────────────────────────────────────────────────────

function daysFor(trip: TripRecord): DaySkeleton[] {
  return buildDays(trip.wizardData.startDate, trip.wizardData.nights);
}

async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let i = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (i < items.length) {
        const idx = i++;
        out[idx] = await fn(items[idx]);
      }
    })
  );
  return out;
}

async function runResearch(trip: TripRecord, state: PipelineState, deadline: number) {
  const w = trip.wizardData;
  const days = daysFor(trip);
  const targets = researchTargets(w, days.length);

  const researchCall = researchWithWebSearch({
    label: "research",
    system: researchSystem(todayForPrompt(), MAX_SEARCHES),
    prompt: researchPrompt(w, days, targets),
    submitTool: {
      name: "submit_research",
      description: "Submit the verified research shortlist for this trip. Call once, after searching.",
      schema: ResearchBriefSchema,
    },
    maxSearches: MAX_SEARCHES,
    maxTokens: 32_000,
    effort: EFFORT.research,
    deadline: deadline - 25_000, // leave time for verification and saving
  });

  const packingCall = state.packing
    ? Promise.resolve(null)
    : generateStructured({
        label: "packing",
        system: packingSystem(),
        prompt: packingPrompt(w, days),
        schema: PackingResultSchema,
        maxTokens: 8_000,
        effort: EFFORT.packing,
        timeoutMs: 120_000,
      });

  const [research, packing] = await Promise.allSettled([researchCall, packingCall]);
  if (packing.status === "fulfilled" && packing.value) {
    state.packing = packing.value.data;
    state.usage = addUsage(state.usage, packing.value.usage);
    state.models.push(packing.value.model);
  } else if (packing.status === "rejected") {
    console.warn(`[pipeline ${trip.slug}] packing failed, will retry in recipes stage:`, packing.reason);
  }
  if (research.status === "rejected") throw research.reason;

  const { data: brief, usage, sources, model } = research.value;
  state.usage = addUsage(state.usage, usage);
  state.models.push(model);

  const venueCount = brief.restaurants.length + brief.activities.length + brief.groceryStores.length;
  await setTripProgress(trip.slug, {
    stage: "research",
    message: placesEnabled() ? `Confirming ${venueCount} places are open with Google` : `Cross-checking ${venueCount} places`,
    percent: 32,
  });

  let lookups: { restaurants: (VerifyResult | null)[]; activities: (VerifyResult | null)[]; stores: (VerifyResult | null)[] } = {
    restaurants: brief.restaurants.map(() => null),
    activities: brief.activities.map(() => null),
    stores: brief.groceryStores.map(() => null),
  };
  if (placesEnabled()) {
    const p = w.property;
    const center: LatLng | undefined =
      p?.lat !== undefined && p?.lng !== undefined
        ? { latitude: p.lat, longitude: p.lng }
        : await locateDestination(p?.address ?? w.destination);
    const check = (v: { name: string; address?: string | null }) => verifyVenue(v, w.destination, center);
    const [restaurants, activities, stores] = await Promise.all([
      mapLimit(brief.restaurants, 6, check),
      mapLimit(brief.activities, 6, check),
      mapLimit(brief.groceryStores, 3, check),
    ]);
    lookups = { restaurants, activities, stores };
  }

  const venues = buildVenues(brief, lookups);
  if (venues.restaurants.length === 0 && w.cookInRatio !== "mostly-in") {
    throw new GenerationError("Research found no restaurants that could be confirmed", "no_result", true);
  }
  state.research = { brief, venues, sources };
}

async function runPlan(trip: TripRecord, state: PipelineState, deadline: number) {
  const w = trip.wizardData;
  const days = daysFor(trip);
  const research = state.research!;
  const checkIn = w.property?.checkInTime ?? "4:00pm";
  const checkOut = w.property?.checkOutTime ?? "10:00am";
  const basePrompt = planPrompt(w, days, researchForPrompt(research.brief, research.venues), checkIn, checkOut);

  const attempt = async (extra: string) => {
    const result = await generateStructured({
      label: "plan",
      system: planSystem(w.planningStyle),
      prompt: basePrompt + extra,
      schema: PlanDraftSchema,
      maxTokens: 32_000,
      effort: EFFORT.plan,
      timeoutMs: Math.max(30_000, deadline - Date.now() - 10_000),
    });
    state.usage = addUsage(state.usage, result.usage);
    state.models.push(result.model);
    return { draft: result.data, normalized: normalizePlan(result.data, days, research.venues, w) };
  };

  let best = await attempt("");
  // One targeted repair if days are missing and there's time for it.
  if (best.normalized.repairable.length && deadline - Date.now() > 130_000) {
    await setTripProgress(trip.slug, { stage: "plan", message: "Tightening up the schedule", percent: 58 });
    try {
      const retry = await attempt(repairNote(best.normalized.repairable));
      if (retry.normalized.repairable.length < best.normalized.repairable.length) best = retry;
    } catch (err) {
      console.warn(`[pipeline ${trip.slug}] plan repair failed; keeping first draft:`, err);
    }
  }
  state.plan = best;
}

async function runRecipes(trip: TripRecord, state: PipelineState, deadline: number) {
  const w = trip.wizardData;
  const days = daysFor(trip);
  const specs = state.plan!.normalized.recipeSpecs;
  const storesNote = state.research!.venues.stores.map((s) => s.name).join(", ");

  await setTripProgress(trip.slug, {
    stage: "recipes",
    message: specs.length ? `Writing ${specs.length} recipes for ${w.numAdults + w.numKids} people` : "Packing list and final details",
    percent: 70,
  });

  const write = async (batch: typeof specs, extra = "") => {
    const result = await generateStructured({
      label: "recipes",
      system: recipesSystem(),
      prompt: recipesPrompt(w, batch, storesNote) + extra,
      schema: RecipesResultSchema,
      maxTokens: 24_000,
      effort: EFFORT.recipes,
      timeoutMs: Math.max(30_000, deadline - Date.now() - 15_000),
    });
    state.usage = addUsage(state.usage, result.usage);
    state.models.push(result.model);
    return result.data.recipes as Recipe[];
  };

  const batches: (typeof specs)[] = [];
  for (let i = 0; i < specs.length; i += 4) batches.push(specs.slice(i, i + 4));

  const packingCall = state.packing
    ? Promise.resolve(null)
    : generateStructured({
        label: "packing",
        system: packingSystem(),
        prompt: packingPrompt(w, days),
        schema: PackingResultSchema,
        maxTokens: 8_000,
        effort: EFFORT.packing,
        timeoutMs: 120_000,
      }).catch((err) => {
        console.warn(`[pipeline ${trip.slug}] packing failed again; shipping without it:`, err);
        return null;
      });

  const [written, packing] = await Promise.all([Promise.all(batches.map((b) => write(b))), packingCall]);
  if (packing) {
    state.packing = packing.data;
    state.usage = addUsage(state.usage, packing.usage);
  }

  const first = normalizeRecipes(written.flat(), specs, w);
  let { recipes, issues } = first;
  const { allergyConflicts } = first;

  // Allergy conflicts get one rewrite with the specific problem spelled out.
  if (allergyConflicts.length && deadline - Date.now() > 90_000) {
    const badIds = new Set(allergyConflicts.map((c) => c.recipeId));
    const redo = specs.filter((s) => badIds.has(s.id));
    if (redo.length) {
      try {
        const rewritten = await write(redo, repairNote(allergyConflicts.map((c) => c.text)));
        const merged = [...written.flat().filter((r) => !badIds.has(r.id)), ...rewritten];
        ({ recipes, issues } = normalizeRecipes(merged, specs, w));
      } catch (err) {
        console.warn(`[pipeline ${trip.slug}] allergy rewrite failed; keeping flagged recipes:`, err);
      }
    }
  }

  state.recipes = { recipes, issues };
}

async function runFinalize(trip: TripRecord, state: PipelineState) {
  const w = trip.wizardData;
  const research = state.research!;
  const generated = assembleTrip({
    wizard: w,
    days: daysFor(trip),
    brief: research.brief,
    venues: research.venues,
    sources: research.sources,
    plan: state.plan!.draft,
    normalized: state.plan!.normalized,
    recipes: state.recipes!.recipes,
    recipeIssues: state.recipes!.issues,
    packing: state.packing,
    models: state.models.length ? state.models : [MODELS.planner],
    webSearches: state.usage.webSearches,
  });
  const saved = await saveTripData(trip.slug, generated);
  console.info(`[pipeline ${trip.slug}] ready`, { usage: state.usage, quality: generated.quality?.venues });
  await notifyTripReady(saved).catch((err) => console.error(`[pipeline ${trip.slug}] notify failed:`, err));
}
