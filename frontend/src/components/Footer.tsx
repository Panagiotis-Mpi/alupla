import { useLocation } from "react-router-dom";

const PINNED_PATHS = new Set(["/", "/login", "/register"]);

export default function Footer() {
  const { pathname } = useLocation();
  const className = PINNED_PATHS.has(pathname) ? "app-footer app-footer-pinned" : "app-footer";

  return <footer className={className} />;
}
