export type GraduateImportProgress = {
  total: number;
  remaining: number;
  phase: "processing" | "saving" | "completed" | "failed";
};

type StoredGraduateImportProgress = GraduateImportProgress & {
  userId: number;
  updatedAt: number;
};

const progressEntries = new Map<string, StoredGraduateImportProgress>();
const progressLifetimeMs = 15 * 60 * 1000;

function isValidProgressId(value: string) {
  return /^[a-zA-Z0-9_-]{8,100}$/.test(value);
}

function clearExpiredEntries() {
  const cutoff = Date.now() - progressLifetimeMs;
  for (const [id, progress] of progressEntries) {
    if (progress.updatedAt < cutoff) progressEntries.delete(id);
  }
}

export function startGraduateImportProgress(
  id: string,
  userId: number,
  total: number,
) {
  clearExpiredEntries();
  if (!isValidProgressId(id)) return false;
  progressEntries.set(id, {
    userId,
    total,
    remaining: total,
    phase: "processing",
    updatedAt: Date.now(),
  });
  return true;
}

export function setGraduateImportProgressPhase(
  id: string,
  userId: number,
  phase: GraduateImportProgress["phase"],
) {
  const progress = progressEntries.get(id);
  if (!progress || progress.userId !== userId) return;
  progress.phase = phase;
  progress.updatedAt = Date.now();
}

export function completeGraduateImportProgressRow(
  id: string,
  userId: number,
) {
  const progress = progressEntries.get(id);
  if (!progress || progress.userId !== userId) return;
  progress.remaining = Math.max(0, progress.remaining - 1);
  progress.updatedAt = Date.now();
}

export function finishGraduateImportProgress(id: string, userId: number) {
  const progress = progressEntries.get(id);
  if (!progress || progress.userId !== userId) return;
  progress.remaining = 0;
  progress.phase = "completed";
  progress.updatedAt = Date.now();
}

export function failGraduateImportProgress(id: string, userId: number) {
  const progress = progressEntries.get(id);
  if (!progress || progress.userId !== userId) return;
  progress.phase = "failed";
  progress.updatedAt = Date.now();
}

export function getGraduateImportProgress(
  id: string,
  userId: number,
): GraduateImportProgress | null {
  clearExpiredEntries();
  const progress = progressEntries.get(id);
  if (!progress || progress.userId !== userId) return null;
  return {
    total: progress.total,
    remaining: progress.remaining,
    phase: progress.phase,
  };
}
