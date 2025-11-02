import { type ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { getCurrentUser } from "../services/auth";
import type { Role } from "../services/auth";

export default function PrivateRoute({
  children,
  allow,
}: {
  children: ReactNode;
  allow?: Role[]; // ex.: ["parent"] ou ["child"]
}) {
  const location = useLocation();
  const user = getCurrentUser();

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (allow && !allow.includes(user.role)) {
    // redireciona para a home do papel correto
    return <Navigate to={user.role === "parent" ? "/parent" : "/child"} replace />;
  }

  return <>{children}</>;
}
