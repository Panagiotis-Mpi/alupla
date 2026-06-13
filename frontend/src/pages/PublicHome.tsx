// Δημόσια αρχική σελίδα για επισκέπτες χωρίς login.
import { useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import greeceMapIllustration from "../assets/home_greece_map.svg";
import greeceMapHighContrastIllustration from "../assets/home_greece_map_high_contrast.svg";
import { getPublicStats } from "../lib/api";
import Icon from "../components/Icon";
import chartIcon from "../assets/icons/chart-column-big.svg";
import globeIcon from "../assets/icons/globe.svg";
import historyIcon from "../assets/icons/history.svg";
import usersIcon from "../assets/icons/users.svg";

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
    { to: "/map", label: t("home.map"), className: "public-home-action primary", icon: globeIcon },
    { to: "/statistics", label: t("home.stats"), className: "public-home-action secondary", icon: chartIcon },
  ];

  useEffect(() => {
    document.body.classList.add("public-home-scroll-lock");
    return () => {
      document.body.classList.remove("public-home-scroll-lock");
    };
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
        icon: usersIcon,
      },
      {
        value: formatCounter(homeStats?.countries ?? null, i18n.language),
        label: t("home.counters.countries"),
        icon: globeIcon,
      },
      {
        value: homeStats?.yearRange ?? "—",
        label: t("home.counters.years"),
        icon: historyIcon,
      },
    ],
    [homeStats, i18n.language, t]
  );

  return (
    <div className="public-home-shell">
      <div className="public-home-card public-home-card-centered">
        <h1 className="public-home-title">{t("home.heroTitle")}</h1>

        <div className="public-home-counters" aria-label={t("home.counters.label")}>
          {counters.map((counter) => (
            <div className="public-home-counter" key={counter.label}>
              <span className="public-home-counter-icon"><Icon src={counter.icon} size={20} /></span>
              <strong>{counter.value}</strong>
              <span>{counter.label}</span>
            </div>
          ))}
        </div>

        <div className="public-home-map-stage">
          <div className="public-home-illustration-frame">
            <img
              src={greeceMapIllustration}
              alt={t("home.map")}
              className="public-home-illustration public-home-illustration-normal public-home-illustration-clickable"
              role="button"
              tabIndex={0}
              onClick={() => navigate("/map")}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  navigate("/map");
                }
              }}
            />
            <img
              src={greeceMapHighContrastIllustration}
              alt={t("home.map")}
              className="public-home-illustration public-home-illustration-high-contrast public-home-illustration-clickable"
              role="button"
              tabIndex={0}
              onClick={() => navigate("/map")}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  navigate("/map");
                }
              }}
            />
          </div>

          <div className="public-home-actions public-home-map-actions">
            {actions.map((action) => (
              <button
                type="button"
                key={action.to}
                onClick={() => navigate(action.to)}
                className={action.className}
              >
                <Icon src={action.icon} size={20} />
                <span>{action.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
