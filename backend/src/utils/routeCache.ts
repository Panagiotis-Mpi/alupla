import type { NextFunction, Request, Response } from "express";
import {
  getMemoryCacheVersion,
  invalidateMemoryCacheScopes,
  readMemoryCache,
  writeMemoryCache,
} from "../services/memoryCache.service";

function cacheKey(scope: string, req: Request) {
  return `${scope}:${req.originalUrl || req.url}`;
}

export function routeCache(scope: string, ttlMs: number) {
  return async function cacheMiddleware(req: Request, res: Response, next: NextFunction) {
    if (req.method !== "GET") return next();

    try {
      const key = cacheKey(scope, req);
      const version = await getMemoryCacheVersion(scope);
      const cached = await readMemoryCache(scope, key, version);

      if (cached !== null) {
        res.setHeader("X-ALUPLA-Cache", "HIT");
        return res.json(cached);
      }

      const originalJson = res.json.bind(res);
      res.json = (body: unknown) => {
        if (res.statusCode >= 200 && res.statusCode < 300 && (body as any)?.ok) {
          void writeMemoryCache(scope, key, version, body, ttlMs).catch((error) => {
            console.error("ALUPLA memory cache write failed:", error);
          });
        }
        res.setHeader("X-ALUPLA-Cache", "MISS");
        return originalJson(body);
      };

      return next();
    } catch (error) {
      return next(error);
    }
  };
}

export async function clearRouteCaches(scopes: string[]) {
  await invalidateMemoryCacheScopes(scopes);
}
