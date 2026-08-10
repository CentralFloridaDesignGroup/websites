import { InteractionRequiredAuthError } from "@azure/msal-browser";
import { getMsalSilentRedirectUri, msalInstance } from "../auth/msalConfig";

type GraphGroup = { id?: string };
type GraphCollection<T> = { value?: T[]; "@odata.nextLink"?: string };

function normalizeString(value: unknown): string { return String(value ?? "").trim(); }

function getGraphScopes(): string[] {
  const scopes = normalizeString(import.meta.env.VITE_GRAPH_DIRECTORY_SCOPES).split(/[ ,]+/).map((scope) => scope.trim()).filter(Boolean);
  return scopes.length > 0 ? scopes : ["User.Read", "User.Read.All", "GroupMember.Read.All"];
}

function isInteractionRequired(error: unknown): boolean {
  if (error instanceof InteractionRequiredAuthError) return true;
  const code = error && typeof error === "object"
    ? normalizeString((error as { errorCode?: unknown; code?: unknown }).errorCode ?? (error as { code?: unknown }).code)
    : "";
  return code === "timed_out" || code === "monitor_window_timeout";
}

async function getGraphToken(interactive: boolean): Promise<string> {
  const account = msalInstance.getActiveAccount() ?? msalInstance.getAllAccounts()[0];
  if (!account) throw new Error("No active Microsoft account. Please sign in again.");
  const request = { account, scopes: getGraphScopes() };
  const result = await msalInstance.acquireTokenSilent({ ...request, redirectUri: getMsalSilentRedirectUri() }).catch((error: unknown) => {
    if (interactive && isInteractionRequired(error)) return msalInstance.acquireTokenPopup(request);
    throw error;
  });
  const token = normalizeString(result.accessToken);
  if (!token) throw new Error("Microsoft Graph token acquisition did not return an access token.");
  return token;
}

async function graphGet<T>(path: string, interactive: boolean): Promise<T> {
  const response = await fetch(`https://graph.microsoft.com/v1.0${path}`, { headers: { Authorization: `Bearer ${await getGraphToken(interactive)}` } });
  if (!response.ok) throw new Error((await response.text()) || `Microsoft Graph request failed (${response.status}).`);
  return response.json() as Promise<T>;
}

async function graphGetAll<T>(path: string, interactive: boolean): Promise<T[]> {
  const values: T[] = [];
  let nextPath = path;
  while (nextPath) {
    const page = await graphGet<GraphCollection<T>>(nextPath, interactive);
    values.push(...(page.value ?? []));
    nextPath = page["@odata.nextLink"] ?? "";
  }
  return values;
}

/** Returns whether Microsoft Graph requires an interactive sign-in or consent prompt. */
export function isGraphInteractionRequired(error: unknown): boolean { return isInteractionRequired(error); }

/** Fetches the active user’s Entra group IDs for authorization checks. */
export async function fetchSignedInUserGroupIds(options: { interactive?: boolean } = {}): Promise<string[]> {
  const groups = await graphGetAll<GraphGroup>("/me/memberOf/microsoft.graph.group?$select=id&$top=999", options.interactive ?? false);
  return groups.map((group) => normalizeString(group.id)).filter(Boolean);
}
