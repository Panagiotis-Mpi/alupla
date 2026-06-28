// Απλό in-memory cache για endpoints που διαβάζονται συχνά.
import type { NextFunction, Request, Response } from "express";

type CacheEntry = {
  expires: number;
  body: unknown;
};

const MAX_ENTRIES = 200;
const entries = new Map<string, CacheEntry>();

// Φτιάχνει μοναδικό cache key από request URL/query.
function cacheKey(scope: string, req: Request) {
  return `${scope}:${req.originalUrl || req.url}`;
}

function pruneExpired(now: number) {
  for (const [key, entry] of entries.entries()) {
    if (entry.expires <= now) entries.delete(key);
  }
}

function rememberEntry(key: string, entry: CacheEntry) {
  pruneExpired(Date.now());
  if (!entries.has(key) && entries.size >= MAX_ENTRIES) {
    const oldest = entries.keys().next().value;
    if (oldest) entries.delete(oldest);
  }
  entries.set(key, entry);
}

// Επιστρέφει middleware που cache-άρει response συγκεκριμένου route.
export function routeCache(scope: string, ttlMs: number) {
  return function cacheMiddleware(req: Request, res: Response, next: NextFunction) {
    if (req.method !== "GET") return next();

    const key = cacheKey(scope, req);
    const now = Date.now();
    const cached = entries.get(key);

    if (cached && cached.expires > now) {
      res.setHeader("X-ALUPLA-Cache", "HIT");
      return res.json(cached.body);
    }

    if (cached) entries.delete(key);

// Κρατά το response για να αποθηκευτεί στο cache πριν σταλεί.
    const originalJson = res.json.bind(res);
    res.json = (body: unknown) => {
      if (res.statusCode >= 200 && res.statusCode < 300 && (body as any)?.ok) {
        rememberEntry(key, { expires: Date.now() + ttlMs, body });
      }
      res.setHeader("X-ALUPLA-Cache", "MISS");
      return originalJson(body);
    };

    return next();
  };
}

// Καθαρίζει cache για ένα route prefix.
function clearRouteCache(scope?: string) {
  if (!scope) {
    entries.clear();
    return;
  }

  const prefix = `${scope}:`;
  for (const key of entries.keys()) {
    if (key.startsWith(prefix)) entries.delete(key);
  }
}

// Καθαρίζει πολλά route caches μετά από αλλαγή δεδομένων.
export function clearRouteCaches(scopes: string[]) {
  for (const scope of scopes) clearRouteCache(scope);
}
