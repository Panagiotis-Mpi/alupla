import React from "react";
import { Link, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import i18n from "./i18n";
import Guard from "./components/Guard";
import { getUser, logout } from "./lib/auth";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Graduates from "./pages/Graduates";
import GraduateForm from "./pages/GraduateForm";
import Regions from "./pages/Regions";
import Profile from "./pages/Profile";
import Users from "./pages/Users";
import Logs from "./pages/Logs";
import Map from "./pages/Map";
import Statistics from "./pages/Statistics";
import PublicHome from "./pages/PublicHome";
import Footer from "./components/Footer";
import AcademicData from "./pages/AcademicData";
import AccessibilityMenu from "./components/AccessibilityMenu";

type NavLinkItem = {
  to: string;
  label: string;
};

const AUTH_PATHS = ["/login", "/register", "/forgot", "/reset"];
const COMPACT_WIDTH = 820;
const SUPER_ADMIN_ROLE = "super_admin";

function isCompactViewport() {
  return typeof window !== "undefined" ? window.innerWidth <= COMPACT_WIDTH : false;
}

function isAuthPath(pathname: string) {
  return AUTH_PATHS.some((path) => pathname.startsWith(path));
}

function buildPublicLinks(t: ReturnType<typeof useTranslation>["t"]): NavLinkItem[] {
  return [
    { to: "/statistics", label: t("nav.statistics", { defaultValue: "Στατιστικά" }) },
    { to: "/map", label: t("nav.map") },
  ];
}

function getAcademicDataLabel(
  _role: string | undefined,
  lang: "gr" | "en",
  t: ReturnType<typeof useTranslation>["t"]
) {
  const translated = t("nav.academicPrograms", { defaultValue: "" });
  if (translated && translated !== "nav.academicPrograms") {
    return translated;
  }

  return lang === "en" ? "Academic Programs" : "Ακαδημαϊκά προγράμματα";
}

function buildNavLinks(
  user: ReturnType<typeof getUser>,
  role: string | undefined,
  academicDataLabel: string,
  t: ReturnType<typeof useTranslation>["t"]
): NavLinkItem[] {
  const statisticsLink = { to: "/statistics", label: t("nav.statistics", { defaultValue: "Στατιστικά" }) };
  const mapLink = { to: "/map", label: t("nav.map") };

  if (!user) {
    return [statisticsLink, mapLink];
  }

  const graduateLinks: NavLinkItem[] = [
    { to: "/graduates", label: t("nav.graduates") },
    { to: "/academic-data", label: academicDataLabel },
    statisticsLink,
    mapLink,
    { to: "/regions", label: t("nav.regions", { defaultValue: "Περιοχές" }) },
  ];

  if (role !== SUPER_ADMIN_ROLE) {
    return graduateLinks;
  }

  return [
    graduateLinks[0],
    graduateLinks[1],
    graduateLinks[2],
    graduateLinks[3],
    graduateLinks[4],
    { to: "/users", label: t("nav.users") },
    { to: "/logs", label: t("nav.logs") },
  ];
}

function TopNav() {
  const { t } = useTranslation();
  const user = getUser();
  const role = user?.role;
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [isCompact, setIsCompact] = React.useState(isCompactViewport);

  const authRoute = React.useMemo(() => isAuthPath(location.pathname), [location.pathname]);
  const lang: "gr" | "en" = i18n.language?.startsWith("en") ? "en" : "gr";

  const authLinks = React.useMemo(() => buildPublicLinks(t), [t]);
  const academicDataLabel = React.useMemo(() => getAcademicDataLabel(role, lang, t), [lang, role, t]);
  const navLinks = React.useMemo(
    () => buildNavLinks(user, role, academicDataLabel, t),
    [academicDataLabel, role, t, user]
  );

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
    const compact = isCompactViewport();
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

  const visibleLinks = authRoute ? authLinks : navLinks;

  return (
    <div className="nav">
      <button
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
          <Link key={link.to} className="btn" to={link.to}>
            {link.label}
          </Link>
        ))}
      </div>

      <div className="spacer" />

      <div className="nav-right">
        <div className="lang-switcher">
          <button
            className="btn"
            onClick={() => i18n.changeLanguage("gr")}
            aria-pressed={lang === "gr"}
            title={t("aria.languageGreek")}
          >
            GR
          </button>
          <span className="lang-switcher-separator">|</span>
          <button
            className="btn"
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
              <button className="btn user-profile-btn" onClick={() => navigate("/profile")}>
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

      {isCompact && menuOpen && (
        <button
          className="drawer-backdrop"
          type="button"
          aria-label={t("aria.closeMenu")}
          onClick={closeMenu}
        />
      )}
      <aside id="mobile-drawer" className={`mobile-drawer ${menuOpen ? "open" : ""}`} aria-hidden={!menuOpen}>
        <div className="mobile-drawer-header">
          <button className="brand mobile-drawer-brand" type="button" onClick={closeMenu}>
            ALUPLA
          </button>
        </div>

        <div className="mobile-drawer-section">
          {visibleLinks.map((link) => (
            <Link key={link.to} className="btn" to={link.to}>
              {link.label}
            </Link>
          ))}
        </div>

        {!authRoute && user && (
          <div className="mobile-drawer-section">
            <button className="btn" onClick={() => navigate("/profile")}>
              {`${user.first_name} ${user.last_name}`}
            </button>
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
        <Routes>
          <Route path="/" element={<PublicHome />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot" element={<ForgotPassword />} />
          <Route path="/reset" element={<ResetPassword />} />
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
          <Route
            path="/regions"
            element={
              <Guard allow={["secretariat", "super_admin"]}>
                <Regions />
              </Guard>
            }
          />
          <Route path="*" element={<Login />} />
        </Routes>
      </div>
      <Footer />
      <AccessibilityMenu />
    </div>
  );
}
