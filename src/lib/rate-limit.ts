import { NextRequest, NextResponse } from "next/server";

// --- Storage abstraction ---

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

export interface RateLimitStore {
  increment(key: string, windowMs: number): Promise<RateLimitEntry>;
}

export class InMemoryStore implements RateLimitStore {
  private store = new Map<string, RateLimitEntry>();

  async increment(key: string, windowMs: number): Promise<RateLimitEntry> {
    const now = Date.now();
    const existing = this.store.get(key);

    if (existing && now < existing.resetAt) {
      existing.count++;
      return { count: existing.count, resetAt: existing.resetAt };
    }

    const entry: RateLimitEntry = { count: 1, resetAt: now + windowMs };
    this.store.set(key, entry);
    return { count: entry.count, resetAt: entry.resetAt };
  }

  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.store) {
      if (now >= entry.resetAt) {
        this.store.delete(key);
      }
    }
  }
}

// --- Singleton store with periodic cleanup ---

let store = new InMemoryStore();

if (typeof setInterval !== "undefined") {
  setInterval(() => store.cleanup(), 60_000).unref();
}

/** Reset the singleton store — test use only */
export function _resetStoreForTesting(): void {
  store = new InMemoryStore();
}

// --- IP extraction ---

export function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();

  const realIp = req.headers.get("x-real-ip");
  if (realIp) return realIp;

  return "unknown";
}

// --- Rate limit check ---

interface RateLimitConfig {
  endpoint: string;
  limit: number;
  windowMs: number;
  keyStrategy: "ip" | "user" | "both";
  userId?: string;
}

export async function rateLimit(
  req: NextRequest,
  config: RateLimitConfig
): Promise<NextResponse | null> {
  const { endpoint, limit, windowMs, keyStrategy, userId } = config;
  const ip = getClientIp(req);

  const checks: string[] = [];

  if (keyStrategy === "ip" || keyStrategy === "both") {
    checks.push(`${endpoint}:${ip}`);
  }
  if ((keyStrategy === "user" || keyStrategy === "both") && userId) {
    checks.push(`${endpoint}:user:${userId}`);
  }

  for (const key of checks) {
    const { count, resetAt } = await store.increment(key, windowMs);

    if (count > limit) {
      const retryAfterSeconds = Math.ceil((resetAt - Date.now()) / 1000);
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        {
          status: 429,
          headers: {
            "Retry-After": String(retryAfterSeconds),
            "X-RateLimit-Limit": String(limit),
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": String(Math.ceil(resetAt / 1000)),
          },
        }
      );
    }
  }

  return null;
}
