import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useIsAuthenticated, useMsal } from "@azure/msal-react";
import { Navigate, Outlet, useLocation, useOutletContext } from "react-router-dom";
import { fetchSignedInUserGroupIds, isGraphInteractionRequired } from "../api/entra";

type GroupLoadStatus = "idle" | "loading" | "loaded" | "requiresInteraction" | "error";

type AuthContextType = {
  isAuthenticated: boolean;
  groupIds: string[];
  groupStatus: GroupLoadStatus;
  groupError: string;
  hasAnyGroup: (allowedGroupIds?: string[]) => boolean;
  refreshGroupIds: (interactive?: boolean) => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

type AuthProviderProps = {
  children: ReactNode;
};

export function AuthProvider({ children }: AuthProviderProps) {
  const isAuthenticated = useIsAuthenticated();
  const { accounts } = useMsal();
  const claims = accounts[0]?.idTokenClaims as Record<string, unknown> | undefined;
  const tokenGroupIds = useMemo(() => Array.isArray(claims?.groups)
    ? claims.groups.map((group) => String(group ?? "").trim()).filter(Boolean)
    : [], [claims]);
  const [graphGroupIds, setGraphGroupIds] = useState<string[]>([]);
  const [groupStatus, setGroupStatus] = useState<GroupLoadStatus>("idle");
  const [groupError, setGroupError] = useState("");
  const groupIds = tokenGroupIds.length > 0 ? tokenGroupIds : graphGroupIds;

  const refreshGroupIds = useCallback(async (interactive = false) => {
    if (!isAuthenticated) {
      setGraphGroupIds([]);
      setGroupStatus("idle");
      setGroupError("");
      return;
    }

    if (tokenGroupIds.length > 0) {
      setGroupStatus("loaded");
      setGroupError("");
      return;
    }

    setGroupStatus("loading");
    setGroupError("");
    try {
      const nextGroupIds = await fetchSignedInUserGroupIds({ interactive });
      setGraphGroupIds(nextGroupIds);
      setGroupStatus("loaded");
    } catch (error) {
      if (isGraphInteractionRequired(error)) {
        setGroupStatus("requiresInteraction");
        setGroupError("Microsoft needs permission to read your Entra group memberships.");
        return;
      }

      setGroupStatus("error");
      setGroupError(String(error));
    }
  }, [isAuthenticated, tokenGroupIds]);

  useEffect(() => {
    void refreshGroupIds(false);
  }, [refreshGroupIds]);

  function hasAnyGroup(allowedGroupIds?: string[]) {
    if (!allowedGroupIds || allowedGroupIds.length === 0) {
      return true;
    }

    const userGroups = new Set(groupIds.map((group) => group.toLowerCase()));
    return allowedGroupIds.some((groupId) => userGroups.has(groupId.toLowerCase()));
  }

  return (
    <AuthContext.Provider value={{ isAuthenticated, groupIds, groupStatus, groupError, hasAnyGroup, refreshGroupIds }}>
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
export function ProtectedRoutes({ allowedGroupIds }: { allowedGroupIds?: string[] }) {
  const isAuthenticated = useIsAuthenticated();
  const { groupError, groupStatus, hasAnyGroup, refreshGroupIds } = useAuth();
  const location = useLocation();
  const outletContext = useOutletContext();

  if (!isAuthenticated) {
    const returnTo = `${location.pathname}${location.search}`;
    return <Navigate to="/login" replace state={{ from: returnTo }} />;
  }

  if (allowedGroupIds && allowedGroupIds.length > 0 && groupStatus === "loading") {
    return <div className="rounded-md border border-gray-200 bg-white p-4 text-sm shadow-sm dark:border-gray-700 dark:bg-gray-800">Checking your Entra group access...</div>;
  }

  if (allowedGroupIds && allowedGroupIds.length > 0 && groupStatus === "requiresInteraction") {
    return (
      <div className="rounded-md border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 shadow-sm dark:border-amber-700 dark:bg-amber-950 dark:text-amber-100">
        <p className="mb-3 font-semibold">Directory permission is required to check your Project Management access.</p>
        <p className="mb-3">{groupError}</p>
        <button
          type="button"
          onClick={() => void refreshGroupIds(true)}
          className="rounded-md bg-primary px-3 py-2 font-semibold text-white"
        >
          Grant directory access
        </button>
      </div>
    );
  }

  if (!hasAnyGroup(allowedGroupIds)) {
    return (
      <div className="rounded-md border border-red-300 bg-red-50 p-4 text-sm text-red-900 shadow-sm dark:border-red-700 dark:bg-red-950 dark:text-red-100">
        <p className="font-semibold">You do not have access to this Project Management route.</p>
        {groupError && <p className="mt-2">{groupError}</p>}
      </div>
    );
  }

  return <Outlet context={outletContext} />;
}
