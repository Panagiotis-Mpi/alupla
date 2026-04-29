import React from "react";
import { Link, Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import i18n from "./i18n";
import Guard from "./components/Guard";
import { getUser, logout } from "./lib/auth";
import { pingPresence } from "./lib/api";
import Footer from "./components/Footer";
import AccessibilityMenu from "./components/AccessibilityMenu";
import PublicHome from "./pages/PublicHome";

const Login = React.lazy(() => import("./pages/Login"));
const Register = React.lazy(() => import("./pages/Register"));
const Graduates = React.lazy(() => import("./pages/Graduates"));
const GraduateForm = React.lazy(() => import("./pages/GraduateForm"));
const Profile = React.lazy(() => import("./pages/Profile"));
const Users = React.lazy(() => import("./pages/Users"));
const Logs = React.lazy(() => import("./pages/Logs"));
const Map = React.lazy(() => import("./pages/Map"));
const Statistics = React.lazy(() => import("./pages/Statistics"));
const AcademicData = React.lazy(() => import("./pages/AcademicData"));

const COMPACT_WIDTH = 820;

function TopNav() {
  const { t } = useTranslation();
  const user = getUser();
  const role = user?.role;
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [isCompact, setIsCompact] = React.useState(() => (typeof window !== "undefined" ? window.innerWidth <= COMPACT_WIDTH : false));
  const brandRef = React.useRef<HTMLButtonElement | null>(null);
  const drawerRef = React.useRef<HTMLElement | null>(null);

  const authRoute = React.useMemo(() => ["/login", "/register"].some((path) => location.pathname.startsWith(path)), [location.pathname]);
  const lang: "gr" | "en" = i18n.language?.startsWith("en") ? "en" : "gr";

  const visibleLinks = React.useMemo(() => {
    const statistics = { to: "/statistics", label: t("nav.statistics", { defaultValue: "Στατιστικά" }) };
    const map = { to: "/map", label: t("nav.map") };

    if (authRoute || !user) {
      return [statistics, map];
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
        statistics,
        map,
        graduates,
        academicData,
        { to: "/users", label: t("nav.users") },
        { to: "/logs", label: t("nav.logs") },
      ];
    }

    return [statistics, map, graduates, academicData];
  }, [authRoute, lang, role, t, user]);

  const closeMenu = React.useCallback(() => setMenuOpen(false), []);

  const handleLogout = React.useCallback(() => {
    logout();
    navigate("/login");
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
  }, [closeMenu, location.pathname]);

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
        <span>ALUPLA</span>
      </button>

      <div className="nav-links desktop-only">
        {visibleLinks.map((link) => (
          <Link key={link.to} className={"btn " + (location.pathname.startsWith(link.to) ? "nav-link-active" : "")} to={link.to}>
            {link.label}
          </Link>
        ))}
      </div>

      <div className="spacer" />

      <div className="nav-right">
        <div className="lang-switcher">
          <button
            className={"btn " + (lang === "gr" ? "nav-link-active" : "")}
            onClick={() => i18n.changeLanguage("gr")}
            aria-pressed={lang === "gr"}
            title={t("aria.languageGreek")}
          >
            GR
          </button>
          <span className="lang-switcher-separator">|</span>
          <button
            className={"btn " + (lang === "en" ? "nav-link-active" : "")}
            onClick={() => i18n.changeLanguage("en")}
            aria-pressed={lang === "en"}
            title={t("aria.languageEnglish")}
          >
            EN
          </button>
        </div>

        {!authRoute && (
          <div className="nav-actions">
            {user ? (
              <button className={"btn user-profile-btn " + (location.pathname.startsWith("/profile") ? "nav-link-active" : "")} onClick={() => navigate("/profile")}>
                {`${user.first_name} ${user.last_name}`}
              </button>
            ) : null}
            <div className="desktop-only nav-actions-desktop">
              {user ? (
                <button className="btn" onClick={handleLogout}>
                  {t("nav.logout")}
                </button>
              ) : (
                <button className="btn" onClick={() => navigate("/login")}>
                  {t("nav.login", { defaultValue: "Σύνδεση" })}
                </button>
              )}
            </div>
            {!user ? (
              <button className="btn mobile-login" onClick={() => navigate("/login")}>
                {t("nav.login", { defaultValue: "Σύνδεση" })}
              </button>
            ) : null}
          </div>
        )}
      </div>

      <aside id="mobile-drawer" ref={drawerRef} className={`mobile-drawer ${menuOpen ? "open" : ""}`} aria-hidden={!menuOpen}>
        <div className="mobile-drawer-header">
          <button className="brand mobile-drawer-brand" type="button" onClick={closeMenu}>
            ALUPLA
          </button>
        </div>

        <div className="mobile-drawer-section">
          {visibleLinks.map((link) => (
            <Link key={link.to} className={"btn " + (location.pathname.startsWith(link.to) ? "nav-link-active" : "")} to={link.to}>
              {link.label}
            </Link>
          ))}
        </div>

        {!authRoute && user && (
          <div className="mobile-drawer-section">
            <button className="btn" onClick={handleLogout}>
              {t("nav.logout")}
            </button>
          </div>
        )}
      </aside>
    </div>
  );
}

export default function App() {
  return (
    <div className="app-shell">
      <TopNav />
      <div className="container app-content">
        <React.Suspense fallback={<div className="page-loading">{i18n.language?.startsWith("en") ? "Loading" : "Φόρτωση"}</div>}>
          <Routes>
          <Route path="/" element={<PublicHome />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
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
      <AccessibilityMenu />
    </div>
  );
}
