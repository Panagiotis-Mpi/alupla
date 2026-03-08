
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
  const [isCompact, setIsCompact] = React.useState(
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
    if (isCompact) {
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

  const navLinks = React.useMemo(() => {
    const statsLabel = t("nav.statistics", { defaultValue: "Στατιστικά" });
    const mapLabel = t("nav.map");
    const gradsLabel = t("nav.graduates");
    const usersLabel = t("nav.users");
    const logsLabel = t("nav.logs");

    if (!user) return [
      { to: "/statistics", label: statsLabel },
      { to: "/map", label: mapLabel }
    ];

    if (role === "super_admin") {
      return [
        { to: "/users", label: usersLabel },
        { to: "/graduates", label: gradsLabel },
        { to: "/statistics", label: statsLabel },
        { to: "/map", label: mapLabel },
        { to: "/logs", label: logsLabel }
      ];
    }

    return [
      { to: "/graduates", label: gradsLabel },
      { to: "/statistics", label: statsLabel },
      { to: "/map", label: mapLabel }
    ];
  }, [t, user, role]);

  return (
    <div className="nav">

      {/* BRAND */}
      <button
        className={`brand ${isCompact ? "brand-compact" : ""}`}
        type="button"
        onClick={onBrandClick}
      >
        {isCompact && <span className="brand-burger">☰</span>}
        <span>ALUPLA</span>
      </button>

      {/* DESKTOP NAV LINKS */}
      {!isCompact && (
        <div className="nav-links">
          {(isAuthRoute
            ? [
                { to: "/statistics", label: t("nav.statistics", { defaultValue: "Στατιστικά" }) },
                { to: "/map", label: t("nav.map") }
              ]
            : navLinks
          ).map((l) => (
            <Link key={l.to} className="btn" to={l.to}>
              {l.label}
            </Link>
          ))}
        </div>
      )}

      <div className="spacer" />

      {/* RIGHT SIDE */}
      <div className="nav-right">

        {/* LANGUAGE */}
        <button className="btn" onClick={() => i18n.changeLanguage("gr")}>
          GR
        </button>
        <span style={{ opacity: 0.6 }}>|</span>
        <button className="btn" onClick={() => i18n.changeLanguage("en")}>
          EN
        </button>

        {/* USER / LOGIN */}
        {!isAuthRoute && (
          <>
            {user ? (
              <span className="badge">{user.first_name} {user.last_name}</span>
            ) : (
              <button className="btn" onClick={() => nav("/login")}>
                {t("nav.login", { defaultValue: "Σύνδεση" })}
              </button>
            )}

            {/* desktop actions only */}
            {!isCompact && user && (
              <>
                <button className="btn" onClick={() => nav("/profile")}>
                  {t("nav.profile", { defaultValue: "Προφίλ" })}
                </button>
                <button className="btn" onClick={onLogout}>
                  {t("nav.logout")}
                </button>
              </>
            )}
          </>
        )}
      </div>

      {/* BACKDROP */}
      {isCompact && menuOpen && (
        <button className="drawer-backdrop" onClick={() => setMenuOpen(false)} />
      )}

      {/* MOBILE DRAWER */}
      <aside className={`mobile-drawer ${menuOpen ? "open" : ""}`}>
        <div className="mobile-drawer-header">
          <strong>ALUPLA</strong>
          <button className="btn" onClick={() => setMenuOpen(false)}>✕</button>
        </div>

        <div className="mobile-drawer-section">
          {(isAuthRoute
            ? [
                { to: "/statistics", label: t("nav.statistics", { defaultValue: "Στατιστικά" }) },
                { to: "/map", label: t("nav.map") }
              ]
            : navLinks
          ).map((l) => (
            <Link key={l.to} className="btn" to={l.to}>
              {l.label}
            </Link>
          ))}
        </div>

        {!isAuthRoute && user && (
          <div className="mobile-drawer-section">
            <button className="btn" onClick={() => nav("/profile")}>
              {t("nav.profile", { defaultValue: "Προφίλ" })}
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
