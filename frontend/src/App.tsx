// Ορίζει τα βασικά routes, το header και τη γενική ροή πλοήγησης της εφαρμογής.
import React from "react";
import { Link, Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import i18n from "./i18n";
import Guard from "./components/Guard";
import { getUser, logout } from "./lib/auth";
import { pingPresence } from "./lib/api";
import Footer from "./components/Footer";
import AccessibilityMenu from "./components/AccessibilityMenu";
import Icon from "./components/Icon";
import PublicHome from "./pages/PublicHome";
import aluplaLogo from "./assets/logo_black.svg";
import chartColumnIcon from "./assets/icons/chart-column-big.svg";
import globeIcon from "./assets/icons/globe.svg";
import graduationCapIcon from "./assets/icons/graduation-cap.svg";
import graduatePeopleIcon from "./assets/icons/graduate-people.svg";
import historyIcon from "./assets/icons/history.svg";
import usersIcon from "./assets/icons/users.svg";

const Login = React.lazy(() => import("./pages/Login"));
const Graduates = React.lazy(() => import("./pages/Graduates"));
const GraduateForm = React.lazy(() => import("./pages/GraduateForm"));
const Profile = React.lazy(() => import("./pages/Profile"));
const Users = React.lazy(() => import("./pages/Users"));
const Logs = React.lazy(() => import("./pages/Logs"));
const Map = React.lazy(() => import("./pages/Map"));
const Statistics = React.lazy(() => import("./pages/Statistics"));
const AcademicData = React.lazy(() => import("./pages/AcademicData"));

const COMPACT_WIDTH = 820;

const navIconByRoute: Record<string, string> = {
  "/map": globeIcon,
  "/statistics": chartColumnIcon,
  "/graduates": graduatePeopleIcon,
  "/academic-data": graduationCapIcon,
  "/users": usersIcon,
  "/logs": historyIcon,
};

function TopNav() {
  const { t } = useTranslation();
  const user = getUser();
  const role = user?.role;
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [languageOpen, setLanguageOpen] = React.useState(false);
  const [accountOpen, setAccountOpen] = React.useState(false);
  const [isCompact, setIsCompact] = React.useState(() => (typeof window !== "undefined" ? window.innerWidth <= COMPACT_WIDTH : false));
  const brandRef = React.useRef<HTMLButtonElement | null>(null);
  const drawerRef = React.useRef<HTMLElement | null>(null);
  const languageRef = React.useRef<HTMLDivElement | null>(null);
  const accountRef = React.useRef<HTMLDivElement | null>(null);

  const authRoute = React.useMemo(() => location.pathname.startsWith("/login"), [location.pathname]);
  const lang: "gr" | "en" = i18n.language?.startsWith("en") ? "en" : "gr";

  const visibleLinks = React.useMemo(() => {
    const home = { to: "/", label: t("nav.homepage", { defaultValue: lang === "en" ? "Homepage" : "Αρχική σελίδα" }) };
    const map = { to: "/map", label: t("nav.map") };
    const statistics = { to: "/statistics", label: t("nav.statistics", { defaultValue: "Στατιστικά" }) };

    if (authRoute) {
      return [home, map, statistics];
    }

    if (!user) {
      return [map, statistics];
    }

    const graduates = { to: "/graduates", label: t("nav.graduates") };
    const academicData = {
      to: "/academic-data",
      label: t("nav.academicPrograms", {
        defaultValue: lang === "en" ? "Academic Programs" : "Ακαδημαϊκά προγράμματα",
      }),
    };

    if (role === "super_admin") {
      return [
        map,
        statistics,
        graduates,
        academicData,
        { to: "/users", label: t("nav.users") },
        { to: "/logs", label: t("nav.logs") },
      ];
    }

    return [map, statistics, graduates, academicData];
  }, [authRoute, lang, role, t, user]);

  const isActiveLink = React.useCallback((to: string) => (to === "/" ? location.pathname === "/" : location.pathname.startsWith(to)), [location.pathname]);

  const closeMenu = React.useCallback(() => setMenuOpen(false), []);
  const currentLanguageLabel = lang === "en" ? "EN" : "EL";
  const nextLanguageLabel = lang === "en" ? "EL" : "EN";
  const nextLanguage = lang === "en" ? "gr" : "en";

  const handleLanguageChange = React.useCallback((language: "gr" | "en") => {
    void i18n.changeLanguage(language);
    setLanguageOpen(false);
  }, []);

  const handleLogout = React.useCallback(() => {
    setAccountOpen(false);
    logout();
    navigate("/login");
  }, [navigate]);

  const handleProfileClick = React.useCallback(() => {
    setAccountOpen(false);
    navigate("/profile");
  }, [navigate]);

  const handleBrandClick = React.useCallback(() => {
    if (isCompact) {
      setMenuOpen((open) => !open);
      return;
    }

    navigate(user ? "/graduates" : "/");
  }, [isCompact, navigate, user]);

  const handleResize = React.useCallback(() => {
    const compact = typeof window !== "undefined" ? window.innerWidth <= COMPACT_WIDTH : false;
    setIsCompact(compact);
    if (!compact) {
      setMenuOpen(false);
    }
  }, []);

  React.useEffect(() => {
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [handleResize]);

  React.useEffect(() => {
    closeMenu();
    setLanguageOpen(false);
    setAccountOpen(false);
  }, [closeMenu, location.pathname]);

  React.useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!languageRef.current?.contains(target)) {
        setLanguageOpen(false);
      }
      if (!accountRef.current?.contains(target)) {
        setAccountOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, []);

  React.useEffect(() => {
    if (!isCompact || !menuOpen) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (drawerRef.current?.contains(target) || brandRef.current?.contains(target)) {
        return;
      }
      setMenuOpen(false);
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [isCompact, menuOpen]);

  React.useEffect(() => {
    if (!user) {
      return;
    }

    let stopped = false;

    const sendPresence = async () => {
      if (stopped || document.visibilityState === "hidden") {
        return;
      }

      try {
        await pingPresence();
      } catch {
      }
    };

    void sendPresence();

    const intervalId = window.setInterval(() => {
      void sendPresence();
    }, 30_000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void sendPresence();
      }
    };

    const handleFocus = () => {
      void sendPresence();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleFocus);

    return () => {
      stopped = true;
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleFocus);
    };
  }, [user]);


  return (
    <div className="nav">
      <button
        ref={brandRef}
        className={`brand ${isCompact ? "brand-compact" : ""}`}
        type="button"
        onClick={handleBrandClick}
        aria-label={isCompact ? t("aria.brandMenu") : t("aria.brandHome")}
        aria-expanded={isCompact ? menuOpen : undefined}
        aria-controls={isCompact ? "mobile-drawer" : undefined}
      >
        {isCompact && <span className="brand-burger" aria-hidden="true">☰</span>}
        <img src={aluplaLogo} alt="" className="brand-logo" aria-hidden="true" />
        <span>ALUPLA</span>
      </button>

      <div className="nav-links desktop-only">
        {visibleLinks.map((link) => (
          <Link key={link.to} className={"btn nav-link-with-icon " + (isActiveLink(link.to) ? "nav-link-active" : "")} to={link.to}>
            {navIconByRoute[link.to] && <Icon src={navIconByRoute[link.to]} size={17} className="nav-link-icon" />}
            <span>{link.label}</span>
          </Link>
        ))}
      </div>

      <div className="spacer" />

      <div className="nav-right">
        <div className="nav-dropdown" ref={languageRef}>
          <button
            className="btn nav-dropdown-toggle"
            onClick={() => setLanguageOpen((open) => !open)}
            aria-expanded={languageOpen}
            title={lang === "en" ? t("aria.languageEnglish") : t("aria.languageGreek")}
          >
            <span>{currentLanguageLabel}</span>
            <span className="nav-dropdown-chevron" aria-hidden="true" />
          </button>
          {languageOpen && (
            <div className="nav-dropdown-menu">
              <button className="nav-dropdown-item" type="button" onClick={() => handleLanguageChange(nextLanguage)}>
                {nextLanguageLabel}
              </button>
            </div>
          )}
        </div>

        {!authRoute && (
          <div className="nav-actions">
            {user ? (
              <div className="nav-dropdown" ref={accountRef}>
                <button
                  className={"btn nav-dropdown-toggle user-profile-btn " + (location.pathname.startsWith("/profile") ? "nav-link-active" : "")}
                  onClick={() => setAccountOpen((open) => !open)}
                  aria-expanded={accountOpen}
                >
                  <span>{t("nav.myAccount")}</span>
                  <span className="nav-dropdown-chevron" aria-hidden="true" />
                </button>
                {accountOpen && (
                  <div className="nav-dropdown-menu nav-account-menu">
                    <button className="nav-dropdown-item" type="button" onClick={handleProfileClick}>
                      {t("nav.myProfile")}
                    </button>
                    <button className="nav-dropdown-item nav-dropdown-danger" type="button" onClick={handleLogout}>
                      {t("nav.logout")}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button className="btn nav-login-btn" onClick={() => navigate("/login")}>
                {t("nav.login", { defaultValue: "Σύνδεση" })}
              </button>
            )}
          </div>
        )}
      </div>

      <aside id="mobile-drawer" ref={drawerRef} className={`mobile-drawer ${menuOpen ? "open" : ""}`} aria-hidden={!menuOpen}>
        <div className="mobile-drawer-section">
          {visibleLinks.map((link) => (
            <Link key={link.to} className={"btn nav-link-with-icon " + (isActiveLink(link.to) ? "nav-link-active" : "")} to={link.to}>
              {navIconByRoute[link.to] && <Icon src={navIconByRoute[link.to]} size={17} className="nav-link-icon" />}
              <span>{link.label}</span>
            </Link>
          ))}
        </div>

      </aside>
    </div>
  );
}

function ScrollToTopButton() {
  const [visible, setVisible] = React.useState(false);

  React.useEffect(() => {
    const updateVisibility = () => {
      setVisible(window.scrollY > 420);
    };

    updateVisibility();
    window.addEventListener("scroll", updateVisibility, { passive: true });
    return () => window.removeEventListener("scroll", updateVisibility);
  }, []);

  const handleClick = React.useCallback(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  return (
    <button
      className={`scroll-to-top-button ${visible ? "is-visible" : ""}`}
      type="button"
      onClick={handleClick}
      aria-label={i18n.language?.startsWith("en") ? "Back to top" : "Πίσω στην αρχή"}
      title={i18n.language?.startsWith("en") ? "Back to top" : "Πίσω στην αρχή"}
    >
      <svg aria-hidden="true" viewBox="0 0 24 24" focusable="false">
        <path d="M12 19V5" />
        <path d="M6.5 10.5 12 5l5.5 5.5" />
      </svg>
    </button>
  );
}

export default // Κρατά το global state χρήστη και στήνει τις σελίδες της εφαρμογής.
function App() {
  return (
    <div className="app-shell">
      <TopNav />
      <div className="container app-content">
        <React.Suspense fallback={<div className="page-loading">{i18n.language?.startsWith("en") ? "Loading" : "Φόρτωση"}</div>}>
                  {/* Κάθε Route συνδέει URL με τη σελίδα που θα εμφανιστεί. */}
<Routes>
          <Route path="/" element={<PublicHome />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Navigate to="/login" replace />} />
          <Route path="/map" element={<Map />} />
          <Route path="/statistics" element={<Statistics />} />
          <Route
            path="/graduates"
            element={
              <Guard allow={["secretariat", "super_admin"]}>
                <Graduates />
              </Guard>
            }
          />
          <Route
            path="/graduates/new"
            element={
              <Guard allow={["secretariat", "super_admin"]}>
                <GraduateForm mode="create" />
              </Guard>
            }
          />
          <Route
            path="/graduates/:id"
            element={
              <Guard allow={["secretariat", "super_admin"]}>
                <GraduateForm mode="edit" />
              </Guard>
            }
          />
          <Route
            path="/profile"
            element={
              <Guard allow={["secretariat", "super_admin"]}>
                <Profile />
              </Guard>
            }
          />
          <Route
            path="/users"
            element={
              <Guard allow={["super_admin"]}>
                <Users />
              </Guard>
            }
          />
          <Route
            path="/logs"
            element={
              <Guard allow={["super_admin"]}>
                <Logs />
              </Guard>
            }
          />
          <Route
            path="/academic-data"
            element={
              <Guard allow={["secretariat", "super_admin"]}>
                <AcademicData />
              </Guard>
            }
          />
          <Route path="/regions" element={<Navigate to="/graduates" replace />} />
          <Route path="*" element={<Login />} />
          </Routes>
        </React.Suspense>
      </div>
      <Footer />
      <ScrollToTopButton />
      <AccessibilityMenu />
    </div>
  );
}
