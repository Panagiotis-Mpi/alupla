import React from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { getDashboard, type DashboardActivity, type DashboardResponse } from "../lib/api";
import { getUser } from "../lib/auth";
import Icon from "../components/Icon";
import arrowDownIcon from "../assets/icons/arrow-down-to-line.svg";
import arrowUpIcon from "../assets/icons/arrow-up-to-line.svg";
import bookIcon from "../assets/icons/book-open-check.svg";
import chartIcon from "../assets/icons/chart-column-big.svg";
import fileIcon from "../assets/icons/file-spreadsheet.svg";
import graduateIcon from "../assets/icons/graduate-people.svg";
import graduatePersonIcon from "../assets/icons/graduate-person.svg";
import historyIcon from "../assets/icons/history.svg";
import usersIcon from "../assets/icons/users.svg";
import usersRoundIcon from "../assets/icons/users-round.svg";

type DashboardCardProps = {
  icon: string;
  label: string;
  value: React.ReactNode;
  tone?: "default" | "success" | "warning";
  compact?: boolean;
};

type QuickActionProps = {
  to: string;
  state?: Record<string, string>;
  icon: string;
  title: string;
  hint: string;
};

function numberValue(value: unknown) {
  const number = Number(value ?? 0);
  return Number.isFinite(number) ? number : 0;
}

function DashboardCard({ icon, label, value, tone = "default", compact = false }: DashboardCardProps) {
  return (
    <article className={`dashboard-stat-card tone-${tone}${compact ? " is-compact" : ""}`}>
      <span className="dashboard-stat-icon" aria-hidden="true">
        <Icon src={icon} size={22} />
      </span>
      <div className="dashboard-stat-content">
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
    </article>
  );
}

function QuickAction({ to, state, icon, title, hint }: QuickActionProps) {
  return (
    <Link className="dashboard-quick-action" to={to} state={state}>
      <span className="dashboard-quick-action-icon" aria-hidden="true">
        <Icon src={icon} size={21} />
      </span>
      <span>
        <strong>{title}</strong>
        <small>{hint}</small>
      </span>
      <span className="dashboard-quick-action-arrow" aria-hidden="true">→</span>
    </Link>
  );
}

function activityTitle(activity: DashboardActivity, t: ReturnType<typeof useTranslation>["t"]) {
  return t(`activity.${activity.action}`, {
    defaultValue: activity.action.replace(/_/g, " "),
  });
}

function activityDetail(activity: DashboardActivity, t: ReturnType<typeof useTranslation>["t"]) {
  const details = activity.details ?? {};
  if (activity.action === "import_graduates" || activity.action === "import_study_programs") {
    return t("activityDetails.import", {
      inserted: numberValue(details.inserted),
      updated: numberValue(details.updated),
      skipped: numberValue(details.skipped),
      errors: numberValue(details.errors),
    });
  }

  const format = String(details.format ?? "").trim();
  if (format) {
    return t("activityDetails.format", { format: format.toUpperCase() });
  }

  const actor = activity.actor_name || activity.actor_email;
  return actor ? t("activityDetails.actor", { actor }) : "";
}

function ActivityList({
  items,
  emptyText,
  locale,
  t,
}: {
  items: DashboardActivity[];
  emptyText: string;
  locale: string;
  t: ReturnType<typeof useTranslation>["t"];
}) {
  if (!items.length) {
    return <div className="dashboard-empty-state">{emptyText}</div>;
  }

  return (
    <div className="dashboard-activity-list">
      {items.map((item) => {
        const detail = activityDetail(item, t);
        const date = new Date(item.created_at);
        const formattedDate = Number.isNaN(date.getTime())
          ? ""
          : new Intl.DateTimeFormat(locale, {
              dateStyle: "short",
              timeStyle: "short",
              timeZone: "Europe/Athens",
            }).format(date);

        return (
          <div className="dashboard-activity-item" key={item.id}>
            <span className="dashboard-activity-marker" aria-hidden="true" />
            <div>
              <strong>{activityTitle(item, t)}</strong>
              {detail && <span>{detail}</span>}
            </div>
            <time dateTime={item.created_at}>{formattedDate}</time>
          </div>
        );
      })}
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="dashboard-skeleton-grid" aria-hidden="true">
      {Array.from({ length: 8 }, (_, index) => (
        <div className="dashboard-skeleton-card" key={index} />
      ))}
    </div>
  );
}

export default function Dashboard() {
  const { t, i18n } = useTranslation("dashboard");
  const user = getUser();
  const [data, setData] = React.useState<DashboardResponse | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const inFlight = React.useRef(false);
  const lang = i18n.language?.startsWith("en") ? "en" : "gr";
  const locale = lang === "en" ? "en-GB" : "el-GR";

  const load = React.useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    setLoading(true);
    setError(null);
    try {
      setData(await getDashboard());
    } catch (loadError) {
      setError(loadError instanceof Error && loadError.message ? loadError.message : t("error"));
    } finally {
      setLoading(false);
      inFlight.current = false;
    }
  }, [t]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const formatDate = React.useCallback((value: string | null | undefined) => {
    if (!value) return t("cards.noDate");
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return t("cards.noDate");
    return new Intl.DateTimeFormat(locale, {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "Europe/Athens",
    }).format(date);
  }, [locale, t]);

  const totalGraduates = numberValue(data?.summary.total_graduates);
  const quality = data?.data_quality;
  const qualityIssues = numberValue(quality?.missing_program_translations) + numberValue(quality?.missing_region_translations);
  const maxProgramCount = Math.max(1, ...((data?.program_distribution ?? []).map((item) => numberValue(item.count))));

  const quickActions: QuickActionProps[] = [
    {
      to: "/graduates/new",
      icon: graduatePersonIcon,
      title: t("actions.newGraduate"),
      hint: t("actions.newGraduateHint"),
    },
    {
      to: "/graduates",
      state: { dashboardAction: "import" },
      icon: arrowUpIcon,
      title: t("actions.importGraduates"),
      hint: t("actions.importGraduatesHint"),
    },
    {
      to: "/graduates",
      state: { dashboardAction: "export" },
      icon: arrowDownIcon,
      title: t("actions.exportGraduates"),
      hint: t("actions.exportGraduatesHint"),
    },
    {
      to: "/statistics",
      icon: chartIcon,
      title: t("actions.viewStatistics"),
      hint: t("actions.viewStatisticsHint"),
    },
  ];

  if (user?.role === "super_admin") {
    quickActions.push(
      {
        to: "/users",
        icon: usersIcon,
        title: t("actions.manageUsers"),
        hint: t("actions.manageUsersHint"),
      },
      {
        to: "/logs",
        icon: historyIcon,
        title: t("actions.viewLogs"),
        hint: t("actions.viewLogsHint"),
      },
    );
  }

  return (
    <div className="dashboard-page">
      <section className="dashboard-page-header">
        <div>
          <span className="dashboard-eyebrow">{t("welcome", { name: user?.first_name ?? "" })}</span>
          <h1>{t("title")}</h1>
          <p>{t("subtitle")}</p>
        </div>
        <button className="btn secondary dashboard-refresh-button" type="button" onClick={() => void load()} disabled={loading}>
          <Icon src={historyIcon} size={18} />
          <span>{t("refresh")}</span>
        </button>
      </section>

      {error && (
        <section className="dashboard-error-card" role="alert">
          <div>
            <strong>{t("error")}</strong>
            <span>{error}</span>
          </div>
          <button className="btn secondary" type="button" onClick={() => void load()}>{t("retry")}</button>
        </section>
      )}

      {loading && !data ? (
        <DashboardSkeleton />
      ) : data ? (
        <>
          <section className="dashboard-section">
            <div className="dashboard-section-heading">
              <h2>{t("sections.overview")}</h2>
            </div>
            <div className="dashboard-stat-grid">
              <DashboardCard icon={graduateIcon} label={t("cards.totalGraduates")} value={totalGraduates.toLocaleString(locale)} />
              <DashboardCard icon={historyIcon} label={t("cards.currentYearGraduates", { year: data.current_year })} value={numberValue(data.summary.current_year_graduates).toLocaleString(locale)} />
              <DashboardCard icon={bookIcon} label={t("cards.studyPrograms")} value={numberValue(data.summary.study_programs).toLocaleString(locale)} />
              <DashboardCard icon={fileIcon} label={t("cards.lastDataUpdate")} value={formatDate(data.summary.last_data_update)} compact />
            </div>
          </section>

          {data.admin && (
            <section className="dashboard-section">
              <div className="dashboard-section-heading">
                <h2>{t("sections.administration")}</h2>
              </div>
              <div className="dashboard-stat-grid">
                <DashboardCard icon={usersRoundIcon} label={t("cards.totalUsers")} value={numberValue(data.admin.summary.total_users).toLocaleString(locale)} />
                <DashboardCard icon={usersIcon} label={t("cards.activeUsers")} value={numberValue(data.admin.summary.active_users).toLocaleString(locale)} tone="success" />
                <DashboardCard icon={historyIcon} label={t("cards.actions24h")} value={numberValue(data.admin.summary.actions_last_24h).toLocaleString(locale)} />
                <DashboardCard icon={fileIcon} label={t("cards.failedImports")} value={numberValue(data.admin.summary.failed_imports_30d).toLocaleString(locale)} tone={numberValue(data.admin.summary.failed_imports_30d) > 0 ? "warning" : "success"} />
              </div>
            </section>
          )}

          <section className="dashboard-section">
            <div className="dashboard-section-heading">
              <h2>{t("sections.quickActions")}</h2>
            </div>
            <div className="dashboard-quick-actions-grid">
              {quickActions.map((action) => <QuickAction key={`${action.to}-${action.title}`} {...action} />)}
            </div>
          </section>

          <section className="dashboard-content-grid">
            <article className="dashboard-panel">
              <div className="dashboard-panel-heading">
                <h2>{t("sections.programDistribution")}</h2>
                <span>{totalGraduates.toLocaleString(locale)}</span>
              </div>
              <div className="dashboard-program-list">
                {data.program_distribution.map((program) => {
                  const count = numberValue(program.count);
                  const name = lang === "en" && program.name_en ? program.name_en : program.name_el;
                  const width = `${Math.max(4, (count / maxProgramCount) * 100)}%`;
                  return (
                    <div className="dashboard-program-row" key={program.study_program_id}>
                      <div>
                        <strong>{name}</strong>
                        <span>{count.toLocaleString(locale)}</span>
                      </div>
                      <div className="dashboard-program-track" aria-hidden="true">
                        <span style={{ width }} />
                      </div>
                    </div>
                  );
                })}
                {!data.program_distribution.length && <div className="dashboard-empty-state">{t("empty.programs")}</div>}
              </div>
            </article>

            <article className="dashboard-panel">
              <div className="dashboard-panel-heading">
                <h2>{t("sections.recentDataActivity")}</h2>
              </div>
              <ActivityList items={data.recent_data_activity} emptyText={t("empty.activity")} locale={locale} t={t} />
            </article>
          </section>

          <section className={`dashboard-quality-card${qualityIssues ? " has-issues" : " is-clear"}`}>
            <span className="dashboard-quality-icon" aria-hidden="true">
              <Icon src={bookIcon} size={22} />
            </span>
            <div>
              <h2>{t("sections.dataQuality")}</h2>
              <p>{qualityIssues ? t("quality.issues", { count: qualityIssues }) : t("quality.allGood")}</p>
              {qualityIssues > 0 && (
                <ul>
                  {numberValue(quality?.missing_program_translations) > 0 && <li>{t("quality.programTranslations", { count: numberValue(quality?.missing_program_translations) })}</li>}
                  {numberValue(quality?.missing_region_translations) > 0 && <li>{t("quality.regionTranslations", { count: numberValue(quality?.missing_region_translations) })}</li>}
                </ul>
              )}
            </div>
          </section>

          {data.admin && (
            <section className="dashboard-content-grid">
              <article className="dashboard-panel">
                <div className="dashboard-panel-heading"><h2>{t("sections.recentLogins")}</h2></div>
                <ActivityList items={data.admin.recent_logins} emptyText={t("empty.logins")} locale={locale} t={t} />
              </article>
              <article className="dashboard-panel">
                <div className="dashboard-panel-heading"><h2>{t("sections.recentOperations")}</h2></div>
                <ActivityList items={data.admin.recent_operations} emptyText={t("empty.operations")} locale={locale} t={t} />
              </article>
            </section>
          )}
        </>
      ) : null}
    </div>
  );
}
