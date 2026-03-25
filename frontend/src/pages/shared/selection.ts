export function toggleSelectionValue<T extends string | number>(values: T[], value: T) {
  return values.includes(value) ? values.filter((item) => item !== value) : [...values, value];
}

export function toggleMergedVisibleSelection<T extends string | number>(values: T[], visibleValues: T[], allVisibleSelected: boolean) {
  if (allVisibleSelected) {
    return values.filter((value) => !visibleValues.includes(value));
  }
  return Array.from(new Set([...values, ...visibleValues]));
}

export function toggleExclusiveVisibleSelection<T extends string | number>(visibleValues: T[], allVisibleSelected: boolean) {
  return allVisibleSelected ? [] : [...visibleValues];
}
