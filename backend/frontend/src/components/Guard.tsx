import React from "react";
import { Navigate } from "react-router-dom";
import { getUser, type Role } from "../lib/auth";

export default function Guard(props: { children: React.ReactNode; allow?: Role[] }) {
  const user = getUser();
  const role = user?.role ?? null;
  if (!role) return <Navigate to="/login" replace />;
  if (props.allow && !props.allow.includes(role)) return <Navigate to="/login" replace />;
  return <>{props.children}</>;
}
