import React from "react";
import { Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import i18n from "./i18n";
import Guard from "./components/Guard";
import { AuthenticatedShell, PublicHeader } from "./components/AppShell";
import { getUser, logout, subscribeSessionChange } from "./lib/auth";
import { pingPresence } from "./lib/api";
import Footer from "./components/Footer";
import AccessibilityMenu from "./components/AccessibilityMenu";
import PublicHome from "./pages/PublicHome";

const Dashboard = React.lazy(() => import("./pages/Dashboard"));
const Login = React.lazy(() => import("./pages/Login"));
const ForgotPassword = React.lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = React.lazy(() => import("./pages/ResetPassword"));
const Graduates = React.lazy(() => import("./pages/Graduates"));
const GraduateForm = React.lazy(() => import("./pages/GraduateForm"));
const Profile = React.lazy(() => import("./pages/Profile"));
const Users = React.lazy(() => import("./pages/Users"));
const Logs = React.lazy(() => import("./pages/Logs"));
const Map = React.lazy(() => import("./pages/Map"));
const Statistics = React.lazy(() => import("./pages/Statistics"));
const AcademicData = React.lazy(() => import("./pages/AcademicData"));

function ApplicationRoutes() {
  return (
    <Routes>
      <Route path="/" element={<PublicHome />} />
      <Route path="/login" element={<Login />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/register" element={<Navigate to="/login" replace />} />
      <Route path="/map" element={<Map />} />
      <Route path="/statistics" element={<Statistics />} />
      <Route
        path="/dashboard"
        element={
          <Guard allow={["secretariat", "super_admin"]}>
            <Dashboard />
          </Guard>
        }
      />
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
  );
}

function ScrollToTopButton() {
  const [visible, setVisible] = React.useState(false);

  React.useEffect(() => {
    const updateVisibility = () => setVisible(window.scrollY > 420);
    updateVisibility();
    window.addEventListener("scroll", updateVisibility, { passive: true });
    return () => window.removeEventListener("scroll", updateVisibility);
  }, []);

  return (
    <button
      className={`scroll-to-top-button ${visible ? "is-visible" : ""}`}
      type="button"
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
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

export default function App() {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const [user, setUser] = React.useState(() => getUser());
  const authRoute = ["/login", "/forgot-password", "/reset-password"].some((path) => location.pathname.startsWith(path));
  const usePrivateShell = Boolean(user) && !authRoute && location.pathname !== "/";

  React.useEffect(() => subscribeSessionChange(() => setUser(getUser())), []);

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
    const intervalId = window.setInterval(() => void sendPresence(), 30_000);
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void sendPresence();
      }
    };
    const handleFocus = () => void sendPresence();

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleFocus);

    return () => {
      stopped = true;
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleFocus);
    };
  }, [user]);

  const handleLogout = React.useCallback(() => {
    logout();
    navigate("/login");
  }, [navigate]);

  const content = (
    <React.Suspense fallback={<div className="page-loading">{i18n.language?.startsWith("en") ? "Loading" : "Φόρτωση"}</div>}>
      <ApplicationRoutes />
    </React.Suspense>
  );

  return (
    <div className={`app-shell${usePrivateShell ? " app-shell-authenticated" : " app-shell-public"}`}>
      <a className="skip-link" href="#main-content">{t("accessibility.skipToContent")}</a>
      {usePrivateShell && user ? (
        <AuthenticatedShell user={user} onLogout={handleLogout}>
          <main id="main-content" className="app-content private-app-content" tabIndex={-1}>
            {content}
          </main>
          <Footer />
        </AuthenticatedShell>
      ) : (
        <>
          <PublicHeader user={user} onLogout={handleLogout} />
          <main id="main-content" className="container app-content public-app-content" tabIndex={-1}>
            {content}
          </main>
          <Footer />
        </>
      )}
      <ScrollToTopButton />
      <AccessibilityMenu />
    </div>
  );
}
