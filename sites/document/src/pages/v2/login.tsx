import { useIsAuthenticated } from "@azure/msal-react";
import { Navigate, useLocation } from "react-router-dom";
import { LoginPrompt } from "../../auth/LoginPrompt";

export function Login() {
  const isAuthenticated = useIsAuthenticated();
  const location = useLocation();
  const state = location.state as { from?: string } | null;
  const from = state?.from ?? "/";
  const returnTo = from === "/login" ? "/" : from;

  if (isAuthenticated) {
    return <Navigate to={returnTo} replace />;
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <LoginPrompt
        title="Sign in to access internal docs"
        message="Use your Microsoft account to unlock private tools, references, and pages."
      />
    </div>
  );
}
