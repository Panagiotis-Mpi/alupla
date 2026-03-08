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

function TopNav() {
  const { t } = useTranslation();
  const user = getUser();
  const role = user?.role;
  const nav = useNavigate();
  const loc = useLocation();
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [isMobileNav, setIsMobileNav] = React.useState(() =>
    typeof window !== "undefined" ? window.innerWidth <= 768 : false
  );

  const isAuthRoute = ["/login", "/register", "/verify", "/forgot", "/reset"].some((p) =>
    loc.pathname.startsWith(p)
  );

  const onLogout = () => {
    logout();
    nav("/login");
  };

  const onBrandClick = () => {
    if (isMobileNav) {
      setMenuOpen((v) => !v);
      return;
    }

    if (!user) {
      nav("/");
      return;
    }

    if (role === "super_admin") {
      nav("/users");
      return;
    }

    nav("/graduates");
  };

  const lang = i18n.language?.startsWith("en") ? "en" : "gr";

  React.useEffect(() => {
    const onResize = () => {
      const mobile = window.innerWidth <= 768;
      setIsMobileNav(mobile);
      if (!mobile) setMenuOpen(false);
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
        { to: "/users", label: usersLabel },
        { to: "/graduates", label: gradsLabel },
        { to: "/statistics", label: statsLabel },
        { to: "/map", label: mapLabel },
        { to: "/logs", label: logsLabel },
      ];
    }

    return [
      { to: "/graduates", label: gradsLabel },
      { to: "/statistics", label: statsLabel },
      { to: "/map", label: mapLabel },
    ];
  }, [t, user, role]);

  const visibleLinks = isAuthRoute
    ? [
        { to: "/statistics", label: t("nav.statistics", { defaultValue: "Στατιστικά" }) },
        { to: "/map", label: t("nav.map") },
      ]
    : navLinks;

  const displayName = user ? `${user.first_name} ${user.last_name}`.trim() : "";

  return (
    <>
      <div className="nav">
        <button
          className={`brand ${isMobileNav ? "brand-mobile" : ""}`}
          type="button"
          onClick={onBrandClick}
          aria-label={isMobileNav ? "ALUPLA menu" : "ALUPLA Home"}
          aria-expanded={isMobileNav ? menuOpen : undefined}
          aria-controls={isMobileNav ? "mobile-drawer" : undefined}
        >
          <span>ALUPLA</span>
        </button>

        {!isMobileNav && (
          <div className="nav-links">
            {visibleLinks.map((l) => (
              <Link key={l.to} className="btn" to={l.to}>
                {l.label}
              </Link>
            ))}
          </div>
        )}

        <div className="spacer" />

        <div className="nav-right">
          <div className="lang-switch">
            <button
              className="btn nav-mini-btn"
              onClick={() => i18n.changeLanguage("gr")}
              aria-pressed={lang === "gr"}
              title="Ελληνικά"
              type="button"
            >
              GR
            </button>
            <span className="lang-sep">|</span>
            <button
              className="btn nav-mini-btn"
              onClick={() => i18n.changeLanguage("en")}
              aria-pressed={lang === "en"}
              title="English"
              type="button"
            >
              EN
            </button>
          </div>

          {!isAuthRoute && (
            <div className="nav-actions">
              {user ? (
                <span className="badge nav-user-name" title={displayName}>{displayName}</span>
              ) : (
                <button className="btn nav-login-btn" onClick={() => nav("/login")} type="button">
                  {t("nav.login", { defaultValue: "Σύνδεση" })}
                </button>
              )}

              {!isMobileNav && user && (
                <>
                  <button className="btn" onClick={() => nav("/profile")} type="button">
                    {t("nav.profile", { defaultValue: "Προφίλ" })}
                  </button>
                  <button className="btn" onClick={onLogout} type="button">
                    {t("nav.logout")}
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {isMobileNav && menuOpen && (
        <>
          <button
            className="drawer-backdrop"
            type="button"
            aria-label="Close menu"
            onClick={() => setMenuOpen(false)}
          />
          <aside id="mobile-drawer" className="mobile-drawer open">
            <div className="mobile-drawer-header">
              <strong>ALUPLA</strong>
              <button className="btn nav-mini-btn" type="button" onClick={() => setMenuOpen(false)}>
                ✕
              </button>
            </div>

            <div className="mobile-drawer-section">
              {visibleLinks.map((l) => (
                <Link key={l.to} className="btn" to={l.to}>
                  {l.label}
                </Link>
              ))}
            </div>

            {!isAuthRoute && user && (
              <div className="mobile-drawer-section">
                <button className="btn" onClick={() => nav("/profile")} type="button">
                  {t("nav.profile", { defaultValue: "Προφίλ" })}
                </button>
                <button className="btn" onClick={onLogout} type="button">
                  {t("nav.logout")}
                </button>
              </div>
            )}
          </aside>
        </>
      )}
    </>
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
                <GraduateForm />
              </Guard>
            }
          />
          <Route
            path="/graduates/:id/edit"
            element={
              <Guard allow={["secretariat", "super_admin"]}>
                <GraduateForm />
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
        </Routes>
      </div>
      <Footer />
    </div>
  );
}
