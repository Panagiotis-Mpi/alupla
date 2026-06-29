import type { Request, RequestHandler } from "express";

type RateLimitOptions = {
  windowMs: number;
  max: number;
  keyGenerator?: (req: Request) => string;
};

type Bucket = {
  count: number;
  resetAt: number;
};

const MAX_KEYS = 5000;

function clientKey(req: Request) {
  return req.ip || req.socket.remoteAddress || "unknown";
}

export function ipAndBodyKey(field: string) {
  return (req: Request) => {
    const value = String(req.body?.[field] ?? "").trim().toLowerCase();
    return `${clientKey(req)}:${value}`;
  };
}

export function rateLimit(options: RateLimitOptions): RequestHandler {
  const buckets = new Map<string, Bucket>();
  let requests = 0;

  return (req, res, next) => {
    const now = Date.now();
    requests += 1;

    if (requests % 100 === 0) {
      for (const [key, bucket] of buckets) {
        if (bucket.resetAt <= now) buckets.delete(key);
      }
    }

    const key = options.keyGenerator?.(req) || clientKey(req);
    let bucket = buckets.get(key);

    if (!bucket || bucket.resetAt <= now) {
      if (!bucket && buckets.size >= MAX_KEYS) {
        const oldestKey = buckets.keys().next().value;
        if (oldestKey) buckets.delete(oldestKey);
      }
      bucket = { count: 0, resetAt: now + options.windowMs };
    }

    bucket.count += 1;
    buckets.delete(key);
    buckets.set(key, bucket);

    const remaining = Math.max(0, options.max - bucket.count);
    const resetSeconds = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));
    res.setHeader("RateLimit-Limit", String(options.max));
    res.setHeader("RateLimit-Remaining", String(remaining));
    res.setHeader("RateLimit-Reset", String(resetSeconds));

    if (bucket.count > options.max) {
      res.setHeader("Retry-After", String(resetSeconds));
      return res.status(429).json({
        ok: false,
        error: { message: "Too many requests" }
      });
    }

    return next();
  };
}
