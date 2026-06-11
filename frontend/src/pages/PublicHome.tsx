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

const mapBubbles = [
  { x: "23.75%", y: "54.06%", w: "5.56%", h: "5%" },
  { x: "41.67%", y: "55.78%", w: "6.95%", h: "6.72%" },
  { x: "34.79%", y: "19.71%", w: "5.42%", h: "5.14%" },
  { x: "56.74%", y: "91.12%", w: "4.31%", h: "4.28%" },
  { x: "20.21%", y: "38.14%", w: "4.31%", h: "4.28%" },
  { x: "56.6%", y: "13.65%", w: "2.92%", h: "3%" },
  { x: "85.28%", y: "78.41%", w: "2.78%", h: "2.57%" },
  { x: "67.43%", y: "38.78%", w: "2.92%", h: "2.43%" },
  { x: "27.85%", y: "68.99%", w: "3.2%", h: "3.14%" },
  { x: "35.42%", y: "38.14%", w: "3.61%", h: "3.43%" },
];

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
      <div className="public-home-card">
        <h1 className="public-home-title">{t("home.heroTitle")}</h1>
        <div className="public-home-content">
          <div className="public-home-copy">
            <p className="public-home-text">{t("home.heroLead")}</p>

            <p className="public-home-text public-home-text-spaced">{t("home.heroSublead")}</p>

            <div className="public-home-actions">
              {actions.map((action) => (
                <button
                  key={action.to}
                  type="button"
                  onClick={() => navigate(action.to)}
                  className={action.className}
                >
                  <Icon src={action.icon} size={20} />
                  <span>{action.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="public-home-visual">
            <div className="public-home-counters" aria-label={t("home.counters.label")}>
              {counters.map((counter) => (
                <div className="public-home-counter" key={counter.label}>
                  <span className="public-home-counter-icon"><Icon src={counter.icon} size={20} /></span>
                  <strong>{counter.value}</strong>
                  <span>{counter.label}</span>
                </div>
              ))}
            </div>
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
              {mapBubbles.map((bubble, index) => (
                <span
                  key={index}
                  className="public-home-map-bubble"
                  style={{ left: bubble.x, top: bubble.y, width: bubble.w, height: bubble.h }}
                  aria-hidden="true"
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
