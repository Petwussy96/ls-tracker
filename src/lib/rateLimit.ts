// Tiny in-memory rate limiter.
//
// Suitable for low-traffic beta on Vercel: each serverless instance keeps its
// own Map of recent attempts. An attacker hitting multiple cold/warm instances
// could in theory bypass it, but for a 700-member private community this is
// "good enough" — the goal is preventing accidental floods and casual abuse,
// not nation-state attackers. Upgrade to Upstash/Redis later if needed.

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  retryAfterSec: number;
};

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): RateLimitResult {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1, retryAfterSec: 0 };
  }

  if (bucket.count >= limit) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterSec: Math.ceil((bucket.resetAt - now) / 1000),
    };
  }

  bucket.count += 1;
  return {
    allowed: true,
    remaining: limit - bucket.count,
    retryAfterSec: 0,
  };
}

// Lightweight periodic cleanup so the Map doesn't grow without bound on a
// long-lived instance. Runs at most once per minute.
let lastSweep = 0;
export function sweepExpiredBuckets() {
  const now = Date.now();
  if (now - lastSweep < 60_000) return;
  lastSweep = now;
  for (const [k, v] of buckets.entries()) {
    if (v.resetAt < now) buckets.delete(k);
  }
}
