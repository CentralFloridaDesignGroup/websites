import { createContext, useContext, type ReactNode } from "react";
import { useIsAuthenticated } from "@azure/msal-react";
import { Navigate, Outlet, useLocation } from "react-router-dom";

type AuthContextType = {
  isAuthenticated: boolean;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

type AuthProviderProps = {
  children: ReactNode;
};

export function AuthProvider({ children }: AuthProviderProps) {
  const isAuthenticated = useIsAuthenticated();

  return (
    <AuthContext.Provider value={{ isAuthenticated }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

// Component that protects all child routes
export function ProtectedRoutes() {
  const isAuthenticated = useIsAuthenticated();
  const location = useLocation();

  if (!isAuthenticated) {
    const returnTo = `${location.pathname}${location.search}`;
    return <Navigate to="/login" replace state={{ from: returnTo }} />;
  }

  return <Outlet />;
}
