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

  const lang = i18n.language?.startsWith("en") ? "en" : "gr";

  return (
    <div className="nav">
      <strong>ALUPLA</strong>

      {!isAuthRoute && (
        <>
          <Link className="btn" to="/graduates">
            {t("nav.graduates")}
          </Link>
          <Link className="btn" to="/regions">
            {t("nav.regions")}
          </Link>
          <Link className="btn" to="/map">
            {t("nav.map")}
          </Link>
          <Link className="btn" to="/profile">
            {t("nav.profile")}
          </Link>
          {role === "super_admin" && (
            <Link className="btn" to="/users">
              {t("nav.users")}
            </Link>
          )}
          {role === "super_admin" && (
            <Link className="btn" to="/logs">
              {t("nav.logs")}
            </Link>
          )}
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

      {!isAuthRoute && (
        <>
          <span className="badge">
            {user ? `${user.first_name} ${user.last_name} (${user.role})` : "guest"}
          </span>
          <button className="btn" onClick={onLogout}>
            {t("nav.logout")}
          </button>
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
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/verify" element={<Verify />} />
          <Route path="/forgot" element={<ForgotPassword />} />
          <Route path="/reset" element={<ResetPassword />} />

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

          <Route
            path="/map"
            element={
              <Guard allow={["secretariat", "super_admin"]}>
                <Map />
              </Guard>
            }
          />

          <Route path="*" element={<Login />} />
        </Routes>
      </div>
    </>
  );
}
