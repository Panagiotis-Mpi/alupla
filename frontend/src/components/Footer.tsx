import React from "react";
import { useLocation } from "react-router-dom";

export default function Footer() {
  const { pathname } = useLocation();

  const pin =
    pathname === "/" ||
    pathname === "/login" ||
    pathname === "/register" ||
    pathname === "/forgot" ||
    pathname === "/reset" ||
    pathname === "/verify";

  const baseStyle: React.CSSProperties = {
    borderTop: "1px solid #e5edff",
    background: "#ffffff",
    padding: "0.9rem 1.5rem",
    textAlign: "center",
    fontSize: "0.95rem",
    color: "#64748b",
  };

  const pinnedStyle: React.CSSProperties = {
    position: "fixed",
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 50,
  };

  return (
    <footer style={{ ...baseStyle, ...(pin ? pinnedStyle : {}) }}>
      Copyright © 2026 All rights reserved
    </footer>
  );
}
