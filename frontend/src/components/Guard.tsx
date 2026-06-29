// Προστατεύει σελίδες που χρειάζονται login ή συγκεκριμένο ρόλο χρήστη.
import React from "react";
import { Navigate } from "react-router-dom";
import { getUser, subscribeSessionChange, type Role } from "../lib/auth";

type GuardProps = {
  children: React.ReactNode;
  allow?: Role[];
};

export default function Guard({ children, allow }: GuardProps) {
  const [role, setRole] = React.useState<Role | null>(() => getUser()?.role ?? null);

  React.useEffect(() => subscribeSessionChange(() => setRole(getUser()?.role ?? null)), []);

  if (!role) {
    return <Navigate to="/login" replace />;
  }

  if (allow && !allow.includes(role)) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
