// Μικρά helpers για μετατροπή/περιορισμό page και limit.
export function toInt(v: unknown, fallback: number) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

// Περιορίζει έναν αριθμό μέσα σε ασφαλές min/max.
export function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}
