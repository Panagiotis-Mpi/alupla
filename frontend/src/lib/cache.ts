export type CacheEntry<T = unknown> = {
  expires: number;
  value: T;
};

export type CacheStore = Map<string, CacheEntry>;

type CacheValidator<T> = (value: T) => boolean;

function removeStoredValue(key: string) {
  try {
    sessionStorage.removeItem(key);
  } catch {
  }
}

export function readCachedValue<T>(key: string, memory: CacheStore, isUsable?: CacheValidator<T>): T | null {
  const currentTime = Date.now();
  const memoryEntry = memory.get(key) as CacheEntry<T> | undefined;

  if (memoryEntry && memoryEntry.expires > currentTime) {
    return memoryEntry.value;
  }

  if (memoryEntry) {
    memory.delete(key);
  }

  try {
    const stored = sessionStorage.getItem(key);
    if (!stored) return null;

    const parsed = JSON.parse(stored) as CacheEntry<T> | null;
    const valid = Boolean(parsed?.expires && parsed.expires > currentTime && parsed.value && (!isUsable || isUsable(parsed.value)));

    if (valid && parsed) {
      memory.set(key, { expires: parsed.expires, value: parsed.value });
      return parsed.value;
    }
  } catch {
  }

  removeStoredValue(key);
  return null;
}

export function writeCachedValue<T>(key: string, memory: CacheStore, value: T, ttlMs: number) {
  const entry: CacheEntry<T> = { expires: Date.now() + ttlMs, value };
  memory.set(key, entry);

  try {
    sessionStorage.setItem(key, JSON.stringify(entry));
  } catch {
  }
}

export function clearCachedValues(prefixes: string[], stores: CacheStore[]) {
  for (const store of stores) {
    for (const key of Array.from(store.keys())) {
      if (prefixes.some((prefix) => key.startsWith(prefix))) {
        store.delete(key);
      }
    }
  }

  try {
    for (let index = sessionStorage.length - 1; index >= 0; index -= 1) {
      const key = sessionStorage.key(index) || "";
      if (prefixes.some((prefix) => key.startsWith(prefix))) {
        sessionStorage.removeItem(key);
      }
    }
  } catch {
  }
}
