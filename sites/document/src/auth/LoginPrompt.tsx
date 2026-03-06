import { useIsAuthenticated, useMsal } from "@azure/msal-react";
import { useLocation } from "react-router-dom";
import { loginRequest } from "../auth/msalConfig";
import { Button } from "@wps/input";

type LoginPromptProps = {
  title?: string;
  message?: string;
  className?: string;
};

export function LoginPrompt({
  title = "Sign in required",
  message = "Sign in with your Microsoft account to access private tools and documents."
}: LoginPromptProps) {
  const isAuthenticated = useIsAuthenticated();
  const { instance } = useMsal();
  const location = useLocation();

  if (isAuthenticated) {
    return null;
  }

  const state = location.state as { from?: string } | null;
  const from = state?.from ?? "/";
  const returnTo = from === "/login" ? "/" : from;

  const handleLogin = () => {
    instance.loginRedirect({
      ...loginRequest,
      redirectStartPage: returnTo,
    });
  };

  return (
    <div className={`bg-white p-6 text-center`}>
      <h2 className="text-xl font-semibold text-slate-900">{title}</h2>
      <p className="my-2 text-sm text-slate-600">{message}</p>
      <Button
        label="Sign in with Microsoft"
        style="primary"
        size="medium"
        onClick={handleLogin}
      />
    </div>
  );
}
