export type RegionAncestorNode = {
  id: number;
  type: string;
  parent_id: number | null;
};

export function findRegionAncestor<T extends RegionAncestorNode>(
  regionsById: Map<number, T>,
  value: unknown,
  targetType: string,
) {
  const startId = Number(value);
  if (!Number.isFinite(startId) || startId <= 0) return null;
  let current = regionsById.get(startId) ?? null;
  let steps = 0;

  while (current && steps < 25) {
    if (String(current.type) === targetType) return current;
    const parentId = Number(current.parent_id);
    current =
      Number.isFinite(parentId) && parentId > 0
        ? regionsById.get(parentId) ?? null
        : null;
    steps += 1;
  }

  return null;
}
