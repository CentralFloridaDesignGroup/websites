import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useIsAuthenticated, useMsal } from "@azure/msal-react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { fetchSignedInUserGroupIds, isGraphInteractionRequired } from "../api/entra";

type GroupLoadStatus = "idle" | "loading" | "loaded" | "requiresInteraction" | "error";
type AuthContextValue = {
  isAuthenticated: boolean;
  groupIds: string[];
  groupStatus: GroupLoadStatus;
  groupError: string;
  hasAnyGroup: (allowedGroupIds?: string[]) => boolean;
  refreshGroupIds: (interactive?: boolean) => Promise<void>;
};
const AuthContext = createContext<AuthContextValue | undefined>(undefined);

/** Provides authentication state and Entra group authorization helpers to Northstar pages. */
export function AuthProvider({ children }: { children: ReactNode }) {
  const isAuthenticated = useIsAuthenticated();
  const { accounts } = useMsal();
  const claims = accounts[0]?.idTokenClaims as Record<string, unknown> | undefined;
  const tokenGroupIds = useMemo(() => Array.isArray(claims?.groups) ? claims.groups.map((group) => String(group ?? "").trim()).filter(Boolean) : [], [claims]);
  const [graphGroupIds, setGraphGroupIds] = useState<string[]>([]);
  const [groupStatus, setGroupStatus] = useState<GroupLoadStatus>("idle");
  const [groupError, setGroupError] = useState("");
  const groupIds = tokenGroupIds.length > 0 ? tokenGroupIds : graphGroupIds;

  const refreshGroupIds = useCallback(async (interactive = false) => {
    if (!isAuthenticated) {
      setGraphGroupIds([]); setGroupStatus("idle"); setGroupError(""); return;
    }
    if (tokenGroupIds.length > 0) {
      setGroupStatus("loaded"); setGroupError(""); return;
    }
    setGroupStatus("loading"); setGroupError("");
    try {
      setGraphGroupIds(await fetchSignedInUserGroupIds({ interactive })); setGroupStatus("loaded");
    } catch (error) {
      if (isGraphInteractionRequired(error)) {
        setGroupStatus("requiresInteraction"); setGroupError("Microsoft needs permission to read your Entra group memberships.");
      } else { setGroupStatus("error"); setGroupError(String(error)); }
    }
  }, [isAuthenticated, tokenGroupIds]);

  useEffect(() => { void refreshGroupIds(false); }, [refreshGroupIds]);
  function hasAnyGroup(allowedGroupIds?: string[]) {
    if (!allowedGroupIds?.length) return true;
    const userGroups = new Set(groupIds.map((group) => group.toLowerCase()));
    return allowedGroupIds.some((groupId) => userGroups.has(groupId.toLowerCase()));
  }
  return <AuthContext.Provider value={{ isAuthenticated, groupIds, groupStatus, groupError, hasAnyGroup, refreshGroupIds }}>{children}</AuthContext.Provider>;
}

/** Reads authentication and authorization helpers available to the current page. */
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider.");
  return context;
}

/** Protects a route and optionally requires membership in one of the supplied Entra groups. */
export function ProtectedRoutes({ allowedGroupIds }: { allowedGroupIds?: string[] }) {
  const { isAuthenticated, groupError, groupStatus, hasAnyGroup, refreshGroupIds } = useAuth();
  const location = useLocation();
  if (!isAuthenticated) {
    const returnTo = `${location.pathname}${location.search}${location.hash}`;
    return <Navigate to="/login" replace state={{ from: returnTo }} />;
  }
  if (allowedGroupIds?.length && groupStatus === "loading") return <AccessMessage>Checking your Entra group access...</AccessMessage>;
  if (allowedGroupIds?.length && groupStatus === "requiresInteraction") return <AccessMessage tone="warning"><p className="font-semibold">Directory permission is required to check access.</p><p className="mt-2">{groupError}</p><button type="button" onClick={() => void refreshGroupIds(true)} className="mt-4 rounded-md bg-[#173244] px-3 py-2 font-semibold text-white dark:bg-[#d8eeeb] dark:text-[#10262f]">Grant directory access</button></AccessMessage>;
  if (allowedGroupIds?.length && !hasAnyGroup(allowedGroupIds)) return <AccessMessage tone="danger"><p className="font-semibold">You do not have access to this Northstar route.</p>{groupError && <p className="mt-2">{groupError}</p>}</AccessMessage>;
  return <Outlet />;
}

function AccessMessage({ children, tone = "default" }: { children: ReactNode; tone?: "default" | "warning" | "danger" }) {
  const toneClasses = tone === "warning" ? "border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-100" : tone === "danger" ? "border-red-300 bg-red-50 text-red-900 dark:border-red-700 dark:bg-red-950 dark:text-red-100" : "border-neutral-300 bg-neutral-50 text-neutral-700 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200";
  return <section className={`rounded-md border p-4 text-sm shadow-sm ${toneClasses}`}>{children}</section>;
}
