import { normalizeString } from "cfdg/scripts";
import { getMsalSilentRedirectUri, msalInstance } from "../auth/msalConfig";

function getApiBaseUrl(): string {
  return normalizeString(import.meta.env.VITE_API_BASE_URL) || "https://api.whitepointsurvey.com";
}

function getApiScopes(): string[] {
  const scopes = normalizeString(import.meta.env.VITE_API_AUTH_SCOPES)
    .split(/[ ,]+/)
    .map((scope) => scope.trim())
    .filter(Boolean);

  if (scopes.length === 0) {
    throw new Error("Missing VITE_API_AUTH_SCOPES configuration.");
  }

  return scopes;
}

async function getAccessToken(): Promise<string> {
  const account = msalInstance.getActiveAccount() ?? msalInstance.getAllAccounts()[0];
  if (!account) {
    throw new Error("No active Microsoft account. Please sign in again.");
  }

  const result = await msalInstance.acquireTokenSilent({
    account,
    scopes: getApiScopes(),
    redirectUri: getMsalSilentRedirectUri(),
  });

  const token = normalizeString(result.accessToken);
  if (!token) {
    throw new Error("Microsoft token acquisition did not return an access token.");
  }

  return token;
}

/** Error raised when a Northstar API request returns a non-success status. */
export class NorthstarApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "NorthstarApiError";
    this.status = status;
  }
}

/** Sends an authenticated request to the Northstar API and parses its JSON response. */
export async function requestJson<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${await getAccessToken()}`,
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...init.headers,
    },
  });

  if (!response.ok) {
    const message = await response.text();
    throw new NorthstarApiError(message || `Northstar API request failed (${response.status}).`, response.status);
  }

  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}
