import { Redis } from "@upstash/redis";

/**
 * The small key-value surface the app needs. Backed by Upstash Redis in
 * production; an in-memory store is used for local development when no Redis
 * credentials are configured, so `npm run dev` works out of the box.
 *
 * Keeping storage behind this interface means a move to Postgres/MySQL later
 * only touches this file and `db.ts`.
 */
export interface KV {
  get<T>(key: string): Promise<T | null>;
  /** Returns true when the value was written (false when `nx` and the key existed). */
  set(key: string, value: unknown, opts?: { ex?: number; nx?: boolean }): Promise<boolean>;
  del(key: string): Promise<void>;
  incr(key: string): Promise<number>;
  expire(key: string, seconds: number): Promise<void>;
  zadd(key: string, score: number, member: string): Promise<void>;
  /** Highest scores first. */
  zrevrange(key: string, start: number, stop: number): Promise<string[]>;
  zcard(key: string): Promise<number>;
  /** Pattern scan — admin/maintenance use only (O(N)). */
  keys(pattern: string): Promise<string[]>;
}

function redisCredentials(): { url: string; token: string } | null {
  const url =
    process.env.PLAN_UPSTASH_KV_REST_API_URL ??
    process.env.UPSTASH_REDIS_REST_URL ??
    process.env.KV_REST_API_URL;
  const token =
    process.env.PLAN_UPSTASH_KV_REST_API_TOKEN ??
    process.env.UPSTASH_REDIS_REST_TOKEN ??
    process.env.KV_REST_API_TOKEN;
  return url && token ? { url, token } : null;
}

class UpstashKV implements KV {
  constructor(private redis: Redis) {}

  get<T>(key: string) {
    return this.redis.get<T>(key);
  }

  async set(key: string, value: unknown, opts: { ex?: number; nx?: boolean } = {}) {
    let result: unknown;
    if (opts.ex && opts.nx) result = await this.redis.set(key, value, { ex: opts.ex, nx: true });
    else if (opts.ex) result = await this.redis.set(key, value, { ex: opts.ex });
    else if (opts.nx) result = await this.redis.set(key, value, { nx: true });
    else result = await this.redis.set(key, value);
    return result === "OK";
  }

  async del(key: string) {
    await this.redis.del(key);
  }

  incr(key: string) {
    return this.redis.incr(key);
  }

  async expire(key: string, seconds: number) {
    await this.redis.expire(key, seconds);
  }

  async zadd(key: string, score: number, member: string) {
    await this.redis.zadd(key, { score, member });
  }

  async zrevrange(key: string, start: number, stop: number) {
    return this.redis.zrange<string[]>(key, start, stop, { rev: true });
  }

  zcard(key: string) {
    return this.redis.zcard(key);
  }

  keys(pattern: string) {
    return this.redis.keys(pattern);
  }
}

class MemoryKV implements KV {
  private data = new Map<string, { value: unknown; expiresAt?: number }>();
  private zsets = new Map<string, Map<string, number>>();

  private live(key: string) {
    const entry = this.data.get(key);
    if (entry?.expiresAt && entry.expiresAt < Date.now()) {
      this.data.delete(key);
      return undefined;
    }
    return entry;
  }

  async get<T>(key: string) {
    const entry = this.live(key);
    return entry ? (structuredClone(entry.value) as T) : null;
  }

  async set(key: string, value: unknown, opts: { ex?: number; nx?: boolean } = {}) {
    if (opts.nx && this.live(key)) return false;
    this.data.set(key, {
      value: structuredClone(value),
      expiresAt: opts.ex ? Date.now() + opts.ex * 1000 : undefined,
    });
    return true;
  }

  async del(key: string) {
    this.data.delete(key);
    this.zsets.delete(key);
  }

  async incr(key: string) {
    const current = Number(this.live(key)?.value ?? 0) + 1;
    const expiresAt = this.data.get(key)?.expiresAt;
    this.data.set(key, { value: current, expiresAt });
    return current;
  }

  async expire(key: string, seconds: number) {
    const entry = this.live(key);
    if (entry) entry.expiresAt = Date.now() + seconds * 1000;
  }

  async zadd(key: string, score: number, member: string) {
    const set = this.zsets.get(key) ?? new Map<string, number>();
    set.set(member, score);
    this.zsets.set(key, set);
  }

  async zrevrange(key: string, start: number, stop: number) {
    const set = this.zsets.get(key);
    if (!set) return [];
    const sorted = [...set.entries()].sort((a, b) => b[1] - a[1]).map(([m]) => m);
    return sorted.slice(start, stop === -1 ? undefined : stop + 1);
  }

  async zcard(key: string) {
    return this.zsets.get(key)?.size ?? 0;
  }

  async keys(pattern: string) {
    const re = new RegExp("^" + pattern.split("*").map((s) => s.replace(/[.+?^${}()|[\]\\]/g, "\\$&")).join(".*") + "$");
    return [...this.data.keys()].filter((k) => re.test(k) && this.live(k));
  }
}

declare global {
  // Survives Next.js dev hot reloads.
  var __irieMemoryKV: MemoryKV | undefined;
}

let instance: KV | null = null;

export function getKV(): KV {
  if (instance) return instance;
  const creds = redisCredentials();
  if (creds) {
    instance = new UpstashKV(new Redis(creds));
    return instance;
  }
  if (process.env.NODE_ENV === "production" && process.env.IRIE_ALLOW_MEMORY_STORE !== "true") {
    throw new Error(
      "Redis is not configured. Set PLAN_UPSTASH_KV_REST_API_URL and PLAN_UPSTASH_KV_REST_API_TOKEN (or UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN)."
    );
  }
  globalThis.__irieMemoryKV ??= new MemoryKV();
  instance = globalThis.__irieMemoryKV;
  return instance;
}

/** For tests. */
export function __setKVForTests(kv: KV | null) {
  instance = kv;
}

export function createMemoryKV(): KV {
  return new MemoryKV();
}
