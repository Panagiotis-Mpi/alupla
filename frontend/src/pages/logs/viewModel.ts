import type { TFunction } from "i18next";
import { activityLogsExportUrl, getActivityLogFileSummary, listUsers, type User } from "../../lib/api";
import type { FileSummaryItem, FileSummaryRole } from "./shared";

export function getLogActorLabel(t: TFunction, entry: any) {
  const firstName = String(entry?.user?.first_name ?? "").trim();
  const lastName = String(entry?.user?.last_name ?? "").trim();
  const fullName = `${firstName} ${lastName}`.trim();
  return fullName || t("summary.roles.visitor");
}

export async function loadLogUserOptions(activeLang: "gr" | "en", t: TFunction) {
  const data = await listUsers();
  const users = Array.isArray(data?.items) ? data.items : [];
  const items = users
    .map((user: User) => ({
      value: String(user.id),
      label: `${String(user.first_name ?? "").trim()} ${String(user.last_name ?? "").trim()}`.trim() || String(user.email ?? "").trim(),
    }))
    .filter((user) => user.label)
    .sort((a, b) => a.label.localeCompare(b.label, activeLang === "gr" ? "el" : "en"));

  return [{ value: "visitor", label: t("summary.roles.visitor") }, ...items];
}

export async function loadLogFileSummary(role: FileSummaryRole) {
  const data = await getActivityLogFileSummary({ role });
  return (data.items ?? []) as FileSummaryItem[];
}

export function openLogExport(format: "csv" | "xlsx", params: Record<string, unknown>, lang: string) {
  const url = activityLogsExportUrl(format, params, lang);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `logs-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.${format}`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
}
