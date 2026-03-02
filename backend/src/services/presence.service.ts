type Presence = {
  user_id: number;
  role: string;
  email: string;
  first_name: string;
  last_name: string;
  last_seen_ms: number;
};

const presence = new Map<number, Presence>();

export function touchPresence(p: Omit<Presence, "last_seen_ms">) {
  presence.set(p.user_id, { ...p, last_seen_ms: Date.now() });
}

export function listOnline(cutoffMs: number) {
  const now = Date.now();
  const items: Presence[] = [];
  for (const v of presence.values()) {
    if (now - v.last_seen_ms <= cutoffMs) items.push(v);
  }
  items.sort((a, b) => b.last_seen_ms - a.last_seen_ms);
  return items;
}
