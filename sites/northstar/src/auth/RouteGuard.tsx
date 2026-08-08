import { useIsAuthenticated } from "@azure/msal-react";
import { Navigate, Outlet, useLocation } from "react-router-dom";

export function RouteGuard() {
  const isAuthenticated = useIsAuthenticated();
  const location = useLocation();

  if (!isAuthenticated) {
    const returnTo = `${location.pathname}${location.search}${location.hash}`;
    return <Navigate to="/login" replace state={{ from: returnTo }} />;
  }

  return <Outlet />;
}
