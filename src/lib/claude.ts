import Anthropic from "@anthropic-ai/sdk";
import type {
  BetaContentBlock,
  BetaMessage,
  BetaMessageParam,
  BetaTool,
  BetaToolUnion,
} from "@anthropic-ai/sdk/resources/beta/messages/messages";
import { z } from "zod";
import type { SourceLink } from "@/types/trip";

// ─── Configuration ───────────────────────────────────────────────────────────

export type Effort = "low" | "medium" | "high" | "xhigh" | "max";

/** All model choices live here and can be overridden per environment. */
export const MODELS = {
  /** Research, planning and recipes. */
  planner: process.env.IRIE_MODEL ?? "claude-opus-5-5",
  /** Cheap, latency-sensitive helpers (wizard suggestions). */
  fast: process.env.IRIE_FAST_MODEL ?? "claude-haiku-5-5",
};

function effortFromEnv(name: string, fallback: Effort): Effort {
  const v = process.env[name];
  return v === "low" || v === "medium" || v === "high" || v === "xhigh" || v === "max" ? v : fallback;
}

export const EFFORT = {
  research: effortFromEnv("IRIE_RESEARCH_EFFORT", "medium"),
  plan: effortFromEnv("IRIE_PLAN_EFFORT", "medium"),
  recipes: effortFromEnv("IRIE_RECIPES_EFFORT", "low"),
  packing: effortFromEnv("IRIE_PACKING_EFFORT", "low"),
};

let client: Anthropic | null = null;
function getClient(): Anthropic {
  client ??= new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return client;
}

/**
 * Server-side refusal fallback: if the model's safety classifier declines a
 * request, the API re-runs it on Anthropic's recommended fallback model inside
 * the same call. Haiku-class models don't support it.
 */
function fallbackParams(model: string): { betas: string[]; fallbacks: "default" } | Record<string, never> {
  return /haiku/.test(model) ? {} : { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" };
}

// ─── Errors & usage ──────────────────────────────────────────────────────────

export class GenerationError extends Error {
  constructor(
    message: string,
    readonly code: "refusal" | "truncated" | "invalid_output" | "no_result" | "timeout",
    readonly retryable: boolean
  ) {
    super(message);
    this.name = "GenerationError";
  }
}

export interface Usage {
  inputTokens: number;
  outputTokens: number;
  webSearches: number;
}

export const emptyUsage = (): Usage => ({ inputTokens: 0, outputTokens: 0, webSearches: 0 });

export function addUsage(a: Usage, b: Usage): Usage {
  return {
    inputTokens: a.inputTokens + b.inputTokens,
    outputTokens: a.outputTokens + b.outputTokens,
    webSearches: a.webSearches + b.webSearches,
  };
}

function usageOf(msg: BetaMessage): Usage {
  const u = msg.usage;
  return {
    inputTokens: (u.input_tokens ?? 0) + (u.cache_read_input_tokens ?? 0) + (u.cache_creation_input_tokens ?? 0),
    outputTokens: u.output_tokens ?? 0,
    webSearches: msg.content.filter((b) => b.type === "server_tool_use" && b.name === "web_search").length,
  };
}

function checkStop(msg: BetaMessage, label: string) {
  if (msg.stop_reason === "refusal") {
    throw new GenerationError(`${label}: the model declined this request`, "refusal", false);
  }
  if (msg.stop_reason === "max_tokens") {
    throw new GenerationError(`${label}: output hit max_tokens and was cut off`, "truncated", true);
  }
}

// ─── JSON schema for structured outputs / strict tools ───────────────────────

const SUPPORTED_FORMATS = new Set(["date-time", "time", "date", "duration", "email", "hostname", "uri", "ipv4", "ipv6", "uuid"]);

/**
 * Converts a Zod schema to the JSON-schema subset structured outputs accept:
 * every object closed (`additionalProperties: false`), enums kept as real
 * constraints, numeric/length limits dropped (Zod re-checks them on parse).
 */
export function toStrictJsonSchema(schema: z.ZodType): Record<string, unknown> {
  const raw = z.toJSONSchema(schema, { target: "draft-2020-12", unrepresentable: "any" }) as Record<string, unknown>;
  const walk = (node: unknown): unknown => {
    if (Array.isArray(node)) return node.map(walk);
    if (!node || typeof node !== "object") return node;
    const n = node as Record<string, unknown>;
    // `type: ["string", "null"]` → `anyOf`, which structured outputs document support for.
    if (Array.isArray(n.type)) {
      const { type, description, ...rest } = n;
      const variants = (type as string[]).map((t) => (t === "null" ? { type: "null" } : walk({ ...rest, type: t })));
      return description ? { description, anyOf: variants } : { anyOf: variants };
    }
    const out: Record<string, unknown> = {};
    for (const key of ["type", "description", "enum", "const", "$ref"]) if (key in n) out[key] = n[key];
    if (typeof n.format === "string" && SUPPORTED_FORMATS.has(n.format)) out.format = n.format;
    if (n.anyOf) out.anyOf = walk(n.anyOf);
    if (n.oneOf) out.anyOf = walk(n.oneOf);
    if (n.allOf) out.allOf = walk(n.allOf);
    if (n.items) out.items = walk(n.items);
    if (n.$defs) out.$defs = Object.fromEntries(Object.entries(n.$defs as object).map(([k, v]) => [k, walk(v)]));
    if (n.properties) {
      out.properties = Object.fromEntries(Object.entries(n.properties as object).map(([k, v]) => [k, walk(v)]));
      out.required = n.required ?? [];
      out.additionalProperties = false;
    } else if (n.type === "object") {
      out.properties = {};
      out.required = [];
      out.additionalProperties = false;
    }
    return out;
  };
  return walk(raw) as Record<string, unknown>;
}

function textOf(content: BetaContentBlock[]): string {
  return content
    .filter((b): b is Extract<BetaContentBlock, { type: "text" }> => b.type === "text")
    .map((b) => b.text)
    .join("");
}

function describeZodError(err: z.ZodError): string {
  return err.issues
    .slice(0, 8)
    .map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`)
    .join("; ");
}

// ─── Structured generation (no tools) ────────────────────────────────────────

/**
 * Claude's API compiles strict schemas into a grammar and rejects ones that are
 * too large. When that happens we fall back to prompting for JSON and
 * validating it ourselves with zod — the output is checked just as strictly.
 * Labels that hit the limit skip the doomed first attempt for the rest of the
 * process's life.
 */
const grammarTooLarge = new Set<string>();

export function isGrammarTooLarge(err: unknown): boolean {
  return err instanceof Anthropic.BadRequestError && /grammar is too large|schema is too (large|complex)|too many strict/i.test(err.message);
}

/** Pulls a JSON object out of a reply that may include fences or stray prose. */
export function extractJson(text: string): unknown {
  const unfenced = text.replace(/^\s*```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "");
  try {
    return JSON.parse(unfenced);
  } catch {
    const first = unfenced.indexOf("{");
    const last = unfenced.lastIndexOf("}");
    if (first >= 0 && last > first) return JSON.parse(unfenced.slice(first, last + 1));
    throw new Error("no JSON object found");
  }
}

export async function generateStructured<T>(opts: {
  label: string;
  system: string;
  prompt: string;
  schema: z.ZodType<T>;
  maxTokens: number;
  effort: Effort;
  timeoutMs: number;
  model?: string;
}): Promise<{ data: T; usage: Usage; model: string }> {
  const model = opts.model ?? MODELS.planner;
  const jsonSchema = toStrictJsonSchema(opts.schema);

  const run = async (constrained: boolean) => {
    const stream = getClient().beta.messages.stream(
      {
        model,
        max_tokens: opts.maxTokens,
        system: constrained
          ? opts.system
          : `${opts.system}\n\nRespond with only one JSON object — no prose, no code fences — that conforms exactly to this JSON Schema (every listed property is required; use null where allowed):\n${JSON.stringify(jsonSchema)}`,
        messages: [{ role: "user", content: opts.prompt }],
        output_config: constrained
          ? { effort: opts.effort, format: { type: "json_schema", schema: jsonSchema } }
          : { effort: opts.effort },
        ...fallbackParams(model),
      },
      { timeout: opts.timeoutMs, maxRetries: 1 }
    );
    return stream.finalMessage();
  };

  let msg: BetaMessage;
  if (grammarTooLarge.has(opts.label)) {
    msg = await run(false);
  } else {
    try {
      msg = await run(true);
    } catch (err) {
      if (!isGrammarTooLarge(err)) throw err;
      console.warn(`[${opts.label}] schema too large for constrained decoding; falling back to validated JSON prompting`);
      grammarTooLarge.add(opts.label);
      msg = await run(false);
    }
  }
  checkStop(msg, opts.label);

  const text = textOf(msg.content);
  let json: unknown;
  try {
    json = extractJson(text);
  } catch {
    console.error(`[${opts.label}] invalid JSON (first 500 chars):`, text.slice(0, 500));
    throw new GenerationError(`${opts.label}: response was not valid JSON`, "invalid_output", true);
  }
  const parsed = opts.schema.safeParse(json);
  if (!parsed.success) {
    console.error(`[${opts.label}] schema mismatch:`, describeZodError(parsed.error));
    throw new GenerationError(`${opts.label}: ${describeZodError(parsed.error)}`, "invalid_output", true);
  }
  return { data: parsed.data, usage: usageOf(msg), model: msg.model ?? model };
}

// ─── Research with web search ────────────────────────────────────────────────

/**
 * Lets the model search the web, then hand back its findings through a
 * "submit" tool (structured outputs can't be combined with web-search
 * citations). Handles `pause_turn` continuations and nudges once if the model
 * answers in prose instead of calling the tool.
 *
 * The request prefix (system, tools, earlier turns) is never edited between
 * continuations — only appended to — so replayed thinking blocks stay valid.
 */
export async function researchWithWebSearch<T>(opts: {
  label: string;
  system: string;
  prompt: string;
  submitTool: { name: string; description: string; schema: z.ZodType<T> };
  maxSearches: number;
  maxTokens: number;
  effort: Effort;
  /** Epoch ms by which the whole loop must finish. */
  deadline: number;
  model?: string;
}): Promise<{ data: T; usage: Usage; sources: SourceLink[]; model: string }> {
  const model = opts.model ?? MODELS.planner;
  const tools: BetaToolUnion[] = [
    { type: "web_search_20260209", name: "web_search", max_uses: opts.maxSearches },
    {
      name: opts.submitTool.name,
      description: opts.submitTool.description,
      input_schema: toStrictJsonSchema(opts.submitTool.schema) as BetaTool["input_schema"],
      // Not `strict`: this schema is too large for Claude's grammar compiler
      // ("compiled grammar is too large"). Every submission is validated with
      // zod below, and schema errors go back to the model to fix.
    },
  ];

  const messages: BetaMessageParam[] = [{ role: "user", content: opts.prompt }];
  const sources = new Map<string, SourceLink>();
  let usage = emptyUsage();
  let servedBy = model;
  let nudges = 0;

  for (let turn = 0; turn < 8; turn++) {
    const remaining = opts.deadline - Date.now();
    if (remaining < 15_000) {
      throw new GenerationError(`${opts.label}: ran out of time before research was submitted`, "timeout", true);
    }

    const msg = await getClient()
      .beta.messages.stream(
        {
          model,
          max_tokens: opts.maxTokens,
          system: opts.system,
          messages,
          tools,
          tool_choice: { type: "auto" },
          output_config: { effort: opts.effort },
          ...fallbackParams(model),
        },
        { timeout: remaining, maxRetries: 1 }
      )
      .finalMessage();

    usage = addUsage(usage, usageOf(msg));
    servedBy = msg.model ?? servedBy;

    for (const block of msg.content) {
      if (block.type === "web_search_tool_result" && Array.isArray(block.content)) {
        for (const r of block.content) {
          if (r.type === "web_search_result" && r.url && !sources.has(r.url)) {
            sources.set(r.url, { title: r.title || r.url, url: r.url });
          }
        }
      }
    }

    const submit = msg.content.find(
      (b): b is Extract<BetaContentBlock, { type: "tool_use" }> => b.type === "tool_use" && b.name === opts.submitTool.name
    );
    if (submit) {
      const parsed = opts.submitTool.schema.safeParse(submit.input);
      if (parsed.success) {
        return { data: parsed.data, usage, sources: [...sources.values()], model: servedBy };
      }
      if (nudges >= 2) {
        throw new GenerationError(`${opts.label}: ${describeZodError(parsed.error)}`, "invalid_output", true);
      }
      nudges++;
      messages.push({ role: "assistant", content: msg.content });
      messages.push({
        role: "user",
        content: [
          {
            type: "tool_result",
            tool_use_id: submit.id,
            is_error: true,
            content: `The submission didn't match the schema: ${describeZodError(parsed.error)}. Fix these fields and call ${opts.submitTool.name} again.`,
          },
        ],
      });
      continue;
    }

    if (msg.stop_reason === "pause_turn") {
      // The server-side search loop paused; send the turn back so it resumes.
      messages.push({ role: "assistant", content: msg.content });
      continue;
    }

    checkStop(msg, opts.label);

    if (nudges >= 2) break;
    nudges++;
    messages.push({ role: "assistant", content: msg.content });
    messages.push({
      role: "user",
      content: `Please call ${opts.submitTool.name} now with everything you've confirmed. Don't run more searches unless something essential is missing.`,
    });
  }

  throw new GenerationError(`${opts.label}: research was never submitted`, "no_result", true);
}

// ─── Small helpers ───────────────────────────────────────────────────────────

/** Today's date in a form the model can't misread. */
export function todayForPrompt(): string {
  return new Date().toISOString().slice(0, 10);
}
