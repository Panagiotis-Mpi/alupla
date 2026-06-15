// Δημόσια αρχική σελίδα για επισκέπτες χωρίς login.
import { useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState, type KeyboardEvent } from "react";
import { useTranslation } from "react-i18next";
import greeceMapIllustration from "../assets/home_greece_map.svg";
import greeceMapHighContrastIllustration from "../assets/home_greece_map_high_contrast.svg";
import worldMapIllustration from "../assets/home_world_map.svg";
import worldMapHighContrastIllustration from "../assets/home_world_map_high_contrast.svg";
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

type HomeMapSlide = {
  scope: "greece" | "abroad";
  normalSrc: string;
  highContrastSrc: string;
  alt: string;
};

function formatCounter(value: number | null, language: string) {
  if (value === null) return "—";
  return new Intl.NumberFormat(language?.startsWith("en") ? "en-US" : "el-GR").format(value);
}

export default function PublicHome() {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation("common");
  const [homeStats, setHomeStats] = useState<HomeStats | null>(null);
  const [mapSlideStep, setMapSlideStep] = useState(0);
  const [mapSlideTransition, setMapSlideTransition] = useState(true);

  const actions = [
    { to: "/map", label: t("home.map"), className: "public-home-action primary", icon: globeIcon },
    { to: "/statistics", label: t("home.stats"), className: "public-home-action secondary", icon: chartIcon },
  ];

  const homeMapSlides = useMemo<HomeMapSlide[]>(
    () => [
      {
        scope: "greece",
        normalSrc: greeceMapIllustration,
        highContrastSrc: greeceMapHighContrastIllustration,
        alt: t("home.map"),
      },
      {
        scope: "abroad",
        normalSrc: worldMapIllustration,
        highContrastSrc: worldMapHighContrastIllustration,
        alt: i18n.language?.startsWith("en") ? "World map" : "Παγκόσμιος χάρτης",
      },
    ],
    [i18n.language, t]
  );

  const carouselMapSlides = useMemo(
    () => (homeMapSlides.length ? [...homeMapSlides, homeMapSlides[0]] : homeMapSlides),
    [homeMapSlides]
  );
  const activeCarouselMapIndex = Math.min(mapSlideStep, Math.max(carouselMapSlides.length - 1, 0));

  useEffect(() => {
    document.body.classList.add("public-home-scroll-lock");
    return () => {
      document.body.classList.remove("public-home-scroll-lock");
    };
  }, []);

  useEffect(() => {
    homeMapSlides.forEach((slide) => {
      [slide.normalSrc, slide.highContrastSrc].forEach((src) => {
        const image = new Image();
        image.src = src;
      });
    });
  }, [homeMapSlides]);

  useEffect(() => {
    if (homeMapSlides.length <= 1) return undefined;

    const timer = window.setInterval(() => {
      setMapSlideTransition(true);
      setMapSlideStep((current) => current + 1);
    }, 4000);

    return () => window.clearInterval(timer);
  }, [homeMapSlides.length]);

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

  const openMapScope = (scope: HomeMapSlide["scope"]) => {
    navigate(`/map?scope=${scope}`);
  };

  const handleMapSlideTransitionEnd = () => {
    if (mapSlideStep >= homeMapSlides.length) {
      setMapSlideTransition(false);
      setMapSlideStep(0);
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => setMapSlideTransition(true));
      });
    }
  };

  const handleMapSlideKeyDown = (event: KeyboardEvent<HTMLButtonElement>, scope: HomeMapSlide["scope"]) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openMapScope(scope);
    }
  };

  return (
    <div className="public-home-shell">
      <div className="public-home-card public-home-card-split">
        <section className="public-home-left" aria-labelledby="public-home-title">
          <h1 id="public-home-title" className="public-home-title">{t("home.heroTitle")}</h1>

          <div className="public-home-counters" aria-label={t("home.counters.label")}>
            {counters.map((counter) => (
              <div className="public-home-counter" key={counter.label}>
                <span className="public-home-counter-icon"><Icon src={counter.icon} size={20} /></span>
                <strong>{counter.value}</strong>
                <span>{counter.label}</span>
              </div>
            ))}
          </div>

          <div className="public-home-actions public-home-map-actions public-home-side-actions">
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
        </section>

        <section className="public-home-right" aria-label={t("home.map")}>
          <div className="public-home-map-stage">
            <div className="public-home-illustration-frame public-home-illustration-carousel">
              <div
                className={`public-home-illustration-track${mapSlideTransition ? "" : " no-transition"}`}
                style={{ transform: `translateX(-${mapSlideStep * 100}%)` }}
                onTransitionEnd={handleMapSlideTransitionEnd}
              >
                {carouselMapSlides.map((slide, index) => {
                  const isActive = index === activeCarouselMapIndex;

                  return (
                    <button
                      type="button"
                      key={`${slide.scope}-${index}`}
                      className="public-home-illustration-slide public-home-illustration-clickable"
                      onClick={() => openMapScope(slide.scope)}
                      onKeyDown={(event) => handleMapSlideKeyDown(event, slide.scope)}
                      tabIndex={isActive ? 0 : -1}
                      aria-hidden={!isActive}
                      aria-label={slide.alt}
                    >
                      <img
                        src={slide.normalSrc}
                        alt=""
                        className="public-home-illustration public-home-illustration-normal"
                        draggable={false}
                      />
                      <img
                        src={slide.highContrastSrc}
                        alt=""
                        className="public-home-illustration public-home-illustration-high-contrast"
                        draggable={false}
                      />
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
