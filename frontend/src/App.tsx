import React from "react";
import { Link, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import i18n from "./i18n";
import Guard from "./components/Guard";
import { getUser, logout } from "./lib/auth";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Verify from "./pages/Verify";
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

function TopNav() {
  const { t } = useTranslation();
  const user = getUser();
  const role = user?.role;
  const nav = useNavigate();
  const loc = useLocation();
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [isCompact, setIsCompact] = React.useState(() =>
    typeof window !== "undefined" ? window.innerWidth <= 820 : false
  );

  const isAuthRoute = ["/login", "/register", "/verify", "/forgot", "/reset"].some((p) =>
    loc.pathname.startsWith(p)
  );

  const onLogout = () => {
    logout();
    nav("/login");
  };

  const onBrandClick = () => {
    if (!user) {
      nav("/");
      return;
    }
    nav("/graduates");
  };

  const lang = i18n.language?.startsWith("en") ? "en" : "gr";

  const authLinks = [
    { to: "/statistics", label: t("nav.statistics", { defaultValue: "Στατιστικά" }) },
    { to: "/map", label: t("nav.map") },
  ];

  const academicDataLabel = React.useMemo(() => {
    if (role !== "super_admin") {
      return t("nav.academicData");
    }

    const customLabel = t("nav.academicPrograms", { defaultValue: "" });
    if (customLabel && customLabel !== "nav.academicPrograms") {
      return customLabel;
    }

    return lang === "en" ? "Academic Programs" : "Ακαδημαϊκά προγράμματα";
  }, [lang, role, t]);

  React.useEffect(() => {
    const onResize = () => {
      const compact = window.innerWidth <= 820;
      setIsCompact(compact);
      if (!compact) setMenuOpen(false);
    };
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  React.useEffect(() => {
    setMenuOpen(false);
  }, [loc.pathname]);

  const navLinks: Array<{ to: string; label: string }> = React.useMemo(() => {
    const statsLabel = t("nav.statistics", { defaultValue: "Στατιστικά" });
    const mapLabel = t("nav.map");
    const gradsLabel = t("nav.graduates");
    const usersLabel = t("nav.users");
    const logsLabel = t("nav.logs");

    if (!user) return [{ to: "/statistics", label: statsLabel }, { to: "/map", label: mapLabel }];

    if (role === "super_admin") {
      return [
        { to: "/graduates", label: gradsLabel },
        { to: "/academic-data", label: academicDataLabel },
        { to: "/statistics", label: statsLabel },
        { to: "/map", label: mapLabel },
        { to: "/regions", label: t("nav.regions", { defaultValue: "Περιοχές" }) },
        { to: "/users", label: usersLabel },
        { to: "/logs", label: logsLabel },
      ];
    }

    return [
      { to: "/graduates", label: gradsLabel },
      { to: "/statistics", label: statsLabel },
      { to: "/map", label: mapLabel },
    ];
  }, [academicDataLabel, role, t, user]);

  return (
    <div className="nav">
      <button
        className={`brand ${isCompact ? "brand-compact" : ""}`}
        type="button"
        onClick={() => {
          if (isCompact) {
            setMenuOpen((v) => !v);
            return;
          }
          onBrandClick();
        }}
        aria-label={isCompact ? "ALUPLA menu" : "ALUPLA Home"}
        aria-expanded={isCompact ? menuOpen : undefined}
        aria-controls={isCompact ? "mobile-drawer" : undefined}
      >
        {isCompact && <span className="brand-burger" aria-hidden="true">☰</span>}
        <span>ALUPLA</span>
      </button>

      <div className="nav-links desktop-only">
        {isAuthRoute ? (
          <>
            {authLinks.map((link) => (
              <Link key={link.to} className="btn" to={link.to}>
                {link.label}
              </Link>
            ))}
          </>
        ) : (
          <>
            {navLinks.map((l) => (
              <Link key={l.to} className="btn" to={l.to}>
                {l.label}
              </Link>
            ))}
          </>
        )}
      </div>

      <div className="spacer" />

      <div className="nav-right">
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <button
            className="btn"
            onClick={() => i18n.changeLanguage("gr")}
            aria-pressed={lang === "gr"}
            title="Ελληνικά"
          >
            GR
          </button>
          <span style={{ opacity: 0.6 }}>|</span>
          <button
            className="btn"
            onClick={() => i18n.changeLanguage("en")}
            aria-pressed={lang === "en"}
            title="English"
          >
            EN
          </button>
        </div>

        {!isAuthRoute && (
          <div className="nav-actions">
            {user ? (
              <button className="btn user-profile-btn" onClick={() => nav("/profile")}>
                {`${user.first_name} ${user.last_name}`}
              </button>
            ) : null}
            <div className="desktop-only nav-actions-desktop">
              {user ? (
                <button className="btn" onClick={onLogout}>
                  {t("nav.logout")}
                </button>
              ) : (
                <button className="btn" onClick={() => nav("/login")}>
                  {t("nav.login", { defaultValue: "Σύνδεση" })}
                </button>
              )}
            </div>
            {!user ? (
              <button className="btn mobile-login" onClick={() => nav("/login")}>
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
          aria-label="Close menu"
          onClick={() => setMenuOpen(false)}
        />
      )}
      <aside id="mobile-drawer" className={`mobile-drawer ${menuOpen ? "open" : ""}`} aria-hidden={!menuOpen}>
        <div className="mobile-drawer-header">
          <strong style={{ cursor: "pointer" }} onClick={() => setMenuOpen(false)}>ALUPLA</strong>
        </div>

        <div className="mobile-drawer-section">
          {(isAuthRoute ? authLinks : navLinks).map((l) => (
            <Link key={l.to} className="btn" to={l.to}>
              {l.label}
            </Link>
          ))}
        </div>

        {!isAuthRoute && user && (
          <div className="mobile-drawer-section">
            <button className="btn" onClick={() => nav("/profile")}>
              {`${user.first_name} ${user.last_name}`}
            </button>
            <button className="btn" onClick={onLogout}>
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
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <TopNav />
      <div className="container" style={{ flex: 1, width: "100%" }}>
        <Routes>
          <Route path="/" element={<PublicHome />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/verify" element={<Verify />} />
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
              <Guard allow={["super_admin"]}>
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
    </div>
  );
}
