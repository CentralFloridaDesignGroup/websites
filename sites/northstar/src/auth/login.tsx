import { useIsAuthenticated, useMsal } from "@azure/msal-react";
import { Navigate, useLocation } from "react-router-dom";
import { loginRequest } from "./msalConfig";
import {
  NorthstarButton as Button
} from "cfdg/ui/input";


export function LoginPage() {
  const isAuthenticated = useIsAuthenticated();
  const { instance } = useMsal();
  const location = useLocation();
  const state = location.state as { from?: string } | null;
  const returnTo = state?.from && state.from !== "/login" ? state.from : "/";

  if (isAuthenticated) {
    return <Navigate to={returnTo} replace />;
  }

  function handleLogin() {
    void instance.loginRedirect({
      ...loginRequest,
      redirectStartPage: returnTo,
    });
  }

  return (
    <main className="dark:bg-neutral-800">
      <div className="mx-auto grid min-h-screen max-w-xl place-items-center px-6 py-10">
        <section className="w-full rounded-xl border border-neutral-300 dark:bg-neutral-700 bg-white p-6 text-center shadow-md dark:shadow-neutral-700">
          <div className="dark:hidden">
            <img src="/northstar-name.webp" alt="Northstar Logo" className="mx-auto h-[150px] aspect-[3/1]" />
          </div>
          <div className="hidden dark:block">
            <img src="/northstar-name-dark.webp" alt="Northstar Logo" className="mx-auto h-[150px] aspect-[3/1]" />
          </div>
          <h1 className="mt-6 text-3xl font-semibold dark:text-white">Welcome to Northstar</h1>
          <p className="my-2 dark:text-white">Sign in with your White Point Microsoft account to access internal PM and CRM workflows.</p>
          <Button
            type="button"
            onClick={handleLogin}
          >
            <img src="https://upload.wikimedia.org/wikipedia/commons/4/44/Microsoft_logo.svg" alt="Microsoft Logo" className="h-5 w-auto inline-block mr-2" />
            Sign in with Microsoft
          </Button>
        </section>
      </div>
    </main>
  );
}