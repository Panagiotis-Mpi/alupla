import type { Request, RequestHandler } from "express";
import { consumeSharedRateLimit } from "../services/sharedState.service";

type RateLimitOptions = {
  scope: string;
  windowMs: number;
  max: number;
  keyGenerator?: (req: Request) => string;
};

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
  return async (req, res, next) => {
    try {
      const now = Date.now();
      const key = options.keyGenerator?.(req) || clientKey(req);
      const bucket = await consumeSharedRateLimit(options.scope, key, options.windowMs);
      const remaining = Math.max(0, options.max - bucket.count);
      const resetSeconds = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));

      res.setHeader("RateLimit-Limit", String(options.max));
      res.setHeader("RateLimit-Remaining", String(remaining));
      res.setHeader("RateLimit-Reset", String(resetSeconds));

      if (bucket.count > options.max) {
        res.setHeader("Retry-After", String(resetSeconds));
        return res.status(429).json({
          ok: false,
          error: { message: "Too many requests" },
        });
      }

      return next();
    } catch (error) {
      return next(error);
    }
  };
}
