// Δημόσια αρχική σελίδα για επισκέπτες χωρίς login.
import { useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import connectedWorldIllustration from "../assets/undraw_connected-world_anke.svg";
import { getPublicStats } from "../lib/api";

type HomeStats = {
  total: number;
  countries: number;
  yearRange: string;
};

function formatCounter(value: number | null, language: string) {
  if (value === null) return "—";
  return new Intl.NumberFormat(language?.startsWith("en") ? "en-US" : "el-GR").format(value);
}

export default function PublicHome() {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation("common");
  const [homeStats, setHomeStats] = useState<HomeStats | null>(null);

  const actions = [
    { to: "/map", label: t("home.map"), className: "public-home-action primary" },
    { to: "/statistics", label: t("home.stats"), className: "public-home-action secondary" },
  ];

  useEffect(() => {
    document.body.classList.add("public-home-scroll-lock");
    return () => document.body.classList.remove("public-home-scroll-lock");
  }, []);

  useEffect(() => {
    let active = true;

    getPublicStats()
      .then((stats: any) => {
        if (!active) return;
        const years = Array.isArray(stats?.by_year)
          ? stats.by_year.map((row: any) => Number(row?.year)).filter((year: number) => Number.isFinite(year))
          : [];
        const countries = Array.isArray(stats?.origin_country_distribution)
          ? stats.origin_country_distribution.filter((row: any) => Number(row?.count ?? 0) > 0 && String(row?.name_el ?? row?.name ?? "").trim() !== "Άγνωστη χώρα").length
          : 0;
        const minYear = years.length ? Math.min(...years) : null;
        const maxYear = years.length ? Math.max(...years) : null;

        setHomeStats({
          total: Number(stats?.total ?? 0),
          countries,
          yearRange: minYear && maxYear ? `${minYear}–${maxYear}` : "—",
        });
      })
      .catch(() => {
        if (active) setHomeStats(null);
      });

    return () => {
      active = false;
    };
  }, []);

  const counters = useMemo(
    () => [
      {
        value: formatCounter(homeStats?.total ?? null, i18n.language),
        label: t("home.counters.graduates"),
      },
      {
        value: formatCounter(homeStats?.countries ?? null, i18n.language),
        label: t("home.counters.countries"),
      },
      {
        value: homeStats?.yearRange ?? "—",
        label: t("home.counters.years"),
      },
    ],
    [homeStats, i18n.language, t]
  );

  return (
    <div className="public-home-shell">
      <div className="public-home-card">
        <div className="public-home-content">
          <div className="public-home-copy">
            <h1 className="public-home-title">{t("home.heroTitle")}</h1>

            <p className="public-home-text">{t("home.heroLead")}</p>

            <p className="public-home-text public-home-text-spaced">{t("home.heroSublead")}</p>

            <div className="public-home-counters" aria-label={t("home.counters.label")}>
              {counters.map((counter) => (
                <div className="public-home-counter" key={counter.label}>
                  <strong>{counter.value}</strong>
                  <span>{counter.label}</span>
                </div>
              ))}
            </div>

            <div className="public-home-actions">
              {actions.map((action) => (
                <button
                  key={action.to}
                  type="button"
                  onClick={() => navigate(action.to)}
                  className={action.className}
                >
                  {action.label}
                </button>
              ))}
            </div>
          </div>

          <div className="public-home-visual" aria-hidden="true">
            <img src={connectedWorldIllustration} alt="" className="public-home-illustration" />
          </div>
        </div>
      </div>
    </div>
  );
}
