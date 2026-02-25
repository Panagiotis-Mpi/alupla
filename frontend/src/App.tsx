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

function TopNav() {
  const { t } = useTranslation();
  const user = getUser();
  const role = user?.role;
  const nav = useNavigate();
  const loc = useLocation();

  const isAuthRoute = ["/login", "/register", "/verify", "/forgot", "/reset"].some((p) =>
    loc.pathname.startsWith(p)
  );

  const onLogout = () => {
    logout();
    nav("/login");
  };

  const onBrandClick = () => {
    // If not logged in, send the user to the public landing page.
    if (!user) {
      nav("/");
      return;
    }
    // If logged in, send the user to the first page based on role.
    if (role === "super_admin") {
      nav("/users");
      return;
    }
    // secretariat
    nav("/graduates");
  };

  const lang = i18n.language?.startsWith("en") ? "en" : "gr";

  // Nav order must match mockups per role.
  // Guest & auth pages:   Στατιστικά, Χάρτης
  // Secretariat user:     Απόφοιτοι, Στατιστικά, Χάρτης
  // Super admin:          Χρήστες, Απόφοιτοι, Στατιστικά, Χάρτης, Logs
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

    // secretariat
    return [
      { to: "/graduates", label: gradsLabel },
      { to: "/statistics", label: statsLabel },
      { to: "/map", label: mapLabel },
    ];
  }, [t, user, role]);

  return (
    <div className="nav">
      <button className="brand" type="button" onClick={onBrandClick} aria-label="ALUPLA Home">
        ALUPLA
      </button>

      {/* In mockups, auth pages also show: Στατιστικά, Χάρτης */}
      {isAuthRoute ? (
        <>
          <Link className="btn" to="/statistics">
            {t("nav.statistics", { defaultValue: "Στατιστικά" })}
          </Link>
          <Link className="btn" to="/map">
            {t("nav.map")}
          </Link>
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

      <div className="spacer" />

      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
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

      {/* Right-side actions */}
      {!isAuthRoute && (
        <>
          <span className="badge">{user ? `${user.first_name} ${user.last_name} (${user.role})` : "guest"}</span>
          {user && (
            <button className="btn" onClick={() => nav("/profile")}>
              {t("nav.profile", { defaultValue: "Προφίλ" })}
            </button>
          )}
          {user ? (
            <button className="btn" onClick={onLogout}>
              {t("nav.logout")}
            </button>
          ) : (
            <button className="btn" onClick={() => nav("/login")}>
              {t("nav.login", { defaultValue: "Σύνδεση" })}
            </button>
          )}
        </>
      )}
    </div>
  );
}

export default function App() {
  return (
    <>
      <TopNav />
      <div className="container">
        <Routes>
          <Route path="/" element={<PublicHome />} />

          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/verify" element={<Verify />} />
          <Route path="/forgot" element={<ForgotPassword />} />
          <Route path="/reset" element={<ResetPassword />} />

          {/* Public anonymous pages (no login required) */}
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
    </>
  );
}
