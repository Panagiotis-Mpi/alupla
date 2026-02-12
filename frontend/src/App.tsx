import React from "react";
import { Link, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import Guard from "./components/Guard";
import { getUser, logout } from "./lib/auth";
import Login from "./pages/Login";
import Graduates from "./pages/Graduates";
import GraduateForm from "./pages/GraduateForm";
import Regions from "./pages/Regions";
import Profile from "./pages/Profile";
import { presencePing } from "./lib/api";
import Users from "./pages/Users";
import Logs from "./pages/Logs";

function TopNav() {
  const user = getUser();
  const role = user?.role;
  const nav = useNavigate();
  const loc = useLocation();
  const onLogout = () => {
    logout();
    nav("/login");
  };

  React.useEffect(() => {
    if (!user) return;
    // ping presence every 15s
    presencePing().catch(() => {});
    const t = window.setInterval(() => {
      presencePing().catch(() => {});
    }, 15000);
    return () => window.clearInterval(t);
  }, [user?.id]);

  if (loc.pathname === "/login") return null;

  return (
    <div className="nav">
      <strong>ALUPLA</strong>
      <Link className="btn" to="/graduates">Απόφοιτοι</Link>
      <Link className="btn" to="/regions">Περιοχές</Link>
      <Link className="btn" to="/profile">Προφίλ</Link>
      {role === "super_admin" && <Link className="btn" to="/users">Χρήστες</Link>}
      {role === "super_admin" && <Link className="btn" to="/logs">Logs</Link>}
      <div className="spacer" />
      <span className="badge">{user ? `${user.first_name} ${user.last_name} (${user.role})` : "guest"}</span>
      <button className="btn" onClick={onLogout}>Logout</button>
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
