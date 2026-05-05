export type SortDirection = "asc" | "desc";

export function sortIndicator<T extends string>(activeKey: T, key: T, direction: SortDirection) {
  if (activeKey !== key) return "";
  return direction === "asc" ? " ▲" : " ▼";
}

export function compareSortText(left: string, right: string, direction: SortDirection, locale: string) {
  const result = left.localeCompare(right, locale, { numeric: true, sensitivity: "base" });
  return direction === "asc" ? result : -result;
}

type SortComparable = string | number | boolean | null | undefined;

export function compareSortValues(left: SortComparable, right: SortComparable, direction: SortDirection, locale = "el") {
  if (left == null && right == null) return 0;
  if (left == null) return -1;
  if (right == null) return 1;

  if (typeof left === "string" || typeof right === "string") {
    const result = String(left).localeCompare(String(right), locale, { sensitivity: "base" });
    return direction === "asc" ? result : -result;
  }

  if (left < right) return direction === "asc" ? -1 : 1;
  if (left > right) return direction === "asc" ? 1 : -1;
  return 0;
}
